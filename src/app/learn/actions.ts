"use server";

// "语法点记忆"板块的进度操作，写法和 src/app/memorize/actions.ts 里
// 单词进度的三个操作（markWordLearned/toggleStar/toggleEasy）完全对照，
// 只是把 word_id 换成 pattern_id、表换成 user_pattern_progress。

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** 将语法点标记为"已记住"，若进度记录不存在则创建 */
export async function markPatternLearned(patternId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("未登录");

  const { error } = await supabase
    .from("user_pattern_progress")
    .upsert(
      {
        user_id: userId,
        pattern_id: patternId,
        learned: true,
        learned_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pattern_id" }
    );
  if (error) throw error;

  revalidatePath("/learn/pattern");
}

/** 切换语法点星标状态 */
export async function togglePatternStar(patternId: string, starred: boolean) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("未登录");

  const { error } = await supabase
    .from("user_pattern_progress")
    .upsert(
      { user_id: userId, pattern_id: patternId, starred },
      { onConflict: "user_id,pattern_id" }
    );
  if (error) throw error;

  revalidatePath("/learn/pattern");
}

/**
 * 切换语法点的"简单"标记。
 * 标记为简单后，这条语法点在以后生成"今日语法点"时只会以很低概率（1/6）出现，
 * 概率筛选逻辑见 src/lib/data/patterns.ts 的 selectDailyPatterns（复用
 * src/lib/data/words.ts 导出的 EASY_KEEP_RATIO，两边保持一致）。
 */
export async function togglePatternEasy(patternId: string, easy: boolean) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("未登录");

  const { error } = await supabase
    .from("user_pattern_progress")
    .upsert(
      { user_id: userId, pattern_id: patternId, easy },
      { onConflict: "user_id,pattern_id" }
    );
  if (error) throw error;

  revalidatePath("/learn/pattern");
}
