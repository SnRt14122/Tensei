import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserWordProgress, Word, WordBank, WordWithProgress } from "@/lib/types";
import { createSeededRng, todayDateString } from "@/lib/seededRandom";

export async function listWordBanks(supabase: SupabaseClient): Promise<WordBank[]> {
  const { data, error } = await supabase
    .from("word_banks")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listWordsForBank(
  supabase: SupabaseClient,
  bankId: string
): Promise<Word[]> {
  const { data, error } = await supabase
    .from("words")
    .select("*")
    .eq("bank_id", bankId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getUserProgressForWords(
  supabase: SupabaseClient,
  userId: string,
  wordIds: string[]
): Promise<Map<string, UserWordProgress>> {
  if (wordIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("user_word_progress")
    .select("*")
    .eq("user_id", userId)
    .in("word_id", wordIds);
  if (error) throw error;
  const map = new Map<string, UserWordProgress>();
  for (const p of data ?? []) map.set(p.word_id, p);
  return map;
}

/** 获取用户已标记为"已学"的单词（附带进度），可选按权重降序（用于检测优先复习） */
export async function listLearnedWordsWithProgress(
  supabase: SupabaseClient,
  userId: string,
  bankId?: string
): Promise<WordWithProgress[]> {
  let query = supabase
    .from("user_word_progress")
    .select("*, words(*)")
    .eq("user_id", userId)
    .eq("learned", true)
    .order("weight", { ascending: false });

  if (bankId) {
    query = query.eq("words.bank_id", bankId);
  }

  const { data, error } = await query;
  if (error) throw error;

  type ProgressRow = UserWordProgress & { words: Word | null };
  const rows = ((data ?? []) as ProgressRow[]).filter((row) => row.words);
  return rows.map((row) => ({
    ...(row.words as Word),
    progress: {
      id: row.id,
      user_id: row.user_id,
      word_id: row.word_id,
      learned: row.learned,
      starred: row.starred,
      weight: row.weight,
      last_result: row.last_result,
      learned_at: row.learned_at,
      last_reviewed_at: row.last_reviewed_at,
      created_at: row.created_at,
    },
  }));
}

/**
 * 计算"今日30词"：
 * - 优先纳入之前检测答错、被标记回记忆页的单词（learned=false 且 weight 更高的优先）
 * - 剩余名额用当天确定性伪随机数从词库中补齐，保证同一天内多次刷新结果一致
 * - 最多返回 count 个，不重复
 */
export function selectDailyWords(
  words: Word[],
  progressMap: Map<string, UserWordProgress>,
  userId: string,
  bankId: string,
  count = 30
): WordWithProgress[] {
  const withProgress: WordWithProgress[] = words.map((w) => ({
    ...w,
    progress: progressMap.get(w.id) ?? null,
  }));

  const reviewPriority = withProgress
    .filter((w) => w.progress && w.progress.learned === false && w.progress.weight > 1)
    .sort((a, b) => (b.progress!.weight ?? 0) - (a.progress!.weight ?? 0));

  const reviewIds = new Set(reviewPriority.map((w) => w.id));
  const rest = withProgress.filter((w) => !reviewIds.has(w.id));

  const rng = createSeededRng(`${userId}:${bankId}:${todayDateString()}`);
  const shuffled = [...rest];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const combined = [...reviewPriority, ...shuffled];
  return combined.slice(0, count);
}
