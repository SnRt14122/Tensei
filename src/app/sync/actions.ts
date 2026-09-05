"use server";

// 手动同步：把本地 IndexedDB 里缓存的答题记录批量上传到 Supabase。
//
// 同步策略（用户确认过的方案）："本地为准，直接覆盖云端"——
// 意思不是"完全不看云端数据"，而是同步时不做"云端 vs 本地谁更新"的比较判断，
// 直接按本地记录的时间顺序重新推算出最终状态，覆盖写入云端。
// 这样避免了之前"每答一题就读一次云端再写一次"的两次网络往返（性能瓶颈的根源），
// 改成整批同步时只做"一次批量读 + 一次批量写"。

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { QuizAttempt } from "@/lib/types";

/** 单次同步的结果统计，返回给前端用于提示"同步了多少条记录" */
export interface SyncResult {
  attemptsSynced: number;
  wordsUpdated: number;
}

/**
 * 把一批本地答题记录同步到云端。
 * @param attempts 本地缓存的全部待同步记录（来自 src/lib/localStore.ts 的 getAllLocalAttempts）
 */
export async function syncQuizAttempts(attempts: QuizAttempt[]): Promise<SyncResult> {
  if (attempts.length === 0) {
    return { attemptsSynced: 0, wordsUpdated: 0 };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("未登录");

  // ---------- 第一步：把每条答题记录原样写入 quiz_attempts 明细表 ----------
  // 这是一张"仅追加"的流水表，正常情况下不需要覆盖更新。
  // 但这里故意用本地生成的 id（QuizAttempt.id，来自各 Runner 组件的 crypto.randomUUID()）
  // 作为这行记录的主键去 upsert，而不是普通 insert：
  // 如果同步过程中途失败（比如下面第二步 user_word_progress 的写入报错），用户重新点击
  // "同步"按钮会拿同一批本地记录再试一次，upsert 能保证同一条记录不会被重复插入两次，
  // 否则用普通 insert 重试会在 quiz_attempts 里产生重复行，影响以后的错题统计。
  const attemptRows = attempts.map((a) => ({
    id: a.id,
    user_id: userId,
    quiz_type: a.quiz_type,
    word_id: a.word_id,
    pattern_id: a.pattern_id,
    conjugation_form: a.conjugation_form,
    user_answer: a.user_answer,
    correct: a.correct,
    client_timestamp: a.client_timestamp,
  }));

  const { error: insertError } = await supabase
    .from("quiz_attempts")
    .upsert(attemptRows, { onConflict: "id" });
  if (insertError) throw insertError;

  // ---------- 第二步：按单词聚合，重新推算 user_word_progress ----------
  // 只处理带 word_id 的记录（语法点检测记录 pattern_id，不影响单词的复习权重）。
  const wordAttempts = attempts.filter(
    (a): a is QuizAttempt & { word_id: string } => a.word_id !== null
  );

  if (wordAttempts.length === 0) {
    revalidatePath("/memorize");
    revalidatePath("/quiz");
    return { attemptsSynced: attempts.length, wordsUpdated: 0 };
  }

  // 按 word_id 分组，组内按本地时间戳升序排列，保证"回放顺序"和答题的真实先后一致
  const groups = new Map<string, QuizAttempt[]>();
  for (const a of wordAttempts) {
    const list = groups.get(a.word_id) ?? [];
    list.push(a);
    groups.set(a.word_id, list);
  }
  for (const list of groups.values()) {
    list.sort((x, y) => x.client_timestamp.localeCompare(y.client_timestamp));
  }

  const wordIds = Array.from(groups.keys());

  // 一次性批量读取这些单词当前的云端权重/学习状态，作为"回放"的起点
  // （只读一次，不是每题读一次，这是相比旧逻辑最关键的性能改进）
  const { data: existingRows, error: fetchError } = await supabase
    .from("user_word_progress")
    .select("word_id, weight, learned")
    .eq("user_id", userId)
    .in("word_id", wordIds);
  if (fetchError) throw fetchError;

  const existingMap = new Map<string, { weight: number; learned: boolean }>();
  for (const row of existingRows ?? []) {
    existingMap.set(row.word_id, { weight: row.weight, learned: row.learned });
  }

  // 对每个单词，把它这次同步涉及的所有本地答题按顺序"回放"一遍，规则和原来
  // recordMeaningQuizResult 的逻辑保持一致：答对权重归 1 且标记已学，答错权重 +1 且退回未学
  const upsertRows = wordIds.map((wordId) => {
    const existing = existingMap.get(wordId) ?? { weight: 1, learned: false };
    let weight = existing.weight;
    let learned = existing.learned;
    let lastResult: "correct" | "incorrect" = "correct";
    let lastReviewedAt = new Date().toISOString();

    for (const attempt of groups.get(wordId)!) {
      if (attempt.correct) {
        weight = 1;
        learned = true;
        lastResult = "correct";
      } else {
        weight = weight + 1;
        learned = false;
        lastResult = "incorrect";
      }
      lastReviewedAt = attempt.client_timestamp;
    }

    return {
      user_id: userId,
      word_id: wordId,
      learned,
      weight,
      last_result: lastResult,
      last_reviewed_at: lastReviewedAt,
    };
  });

  const { error: upsertError } = await supabase
    .from("user_word_progress")
    .upsert(upsertRows, { onConflict: "user_id,word_id" });
  if (upsertError) throw upsertError;

  revalidatePath("/memorize");
  revalidatePath("/quiz");

  return { attemptsSynced: attempts.length, wordsUpdated: upsertRows.length };
}
