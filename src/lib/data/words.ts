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

/**
 * 获取某个用户在某个词库下的全部学习进度记录，返回 word_id -> 进度 的映射。
 *
 * 【重要】这里故意不用"把词库里所有单词 id 拼成 IN 列表去查进度"的写法（即
 * `.in("word_id", wordIds)`，wordIds 来自词库全部单词）。原因：
 * 词库变大后（比如 N1 有 9063 个词），拼出来的 URL 会超过 Supabase 的
 * PostgREST 接口（背后经过 Cloudflare）对单次请求 URL 长度的限制，
 * 实测大约 670 个 id、URL 长度 2.5 万字符左右就会被直接拒绝，返回 400 Bad Request，
 * 导致"记忆"页打开大词库直接崩溃；而且"同步"按钮成功后会调用
 * `revalidatePath("/memorize")` 让当前页重新渲染，如果当时正停留在大词库页面，
 * 会再次触发同样的 400，看起来就像"同步"这个操作本身报错了——这两个现象是同一个根因。
 *
 * 改成反过来查：以 user_word_progress 表为主表，用 join 过滤 words.bank_id，
 * 这样请求体量只取决于"这个用户在这个词库里已经产生过进度记录的单词数"，
 * 而不是"词库总共有多少单词"，词库再大也不会让 URL 变长。
 */
export async function getUserProgressForBank(
  supabase: SupabaseClient,
  userId: string,
  bankId: string
): Promise<Map<string, UserWordProgress>> {
  const { data, error } = await supabase
    .from("user_word_progress")
    // !inner 表示这是一次内连接：只用 words.bank_id 做过滤条件，
    // 但不需要把 words 表的字段一起选出来（用 "*" 只取 user_word_progress 自身的列）
    .select("*, words!inner(bank_id)")
    .eq("user_id", userId)
    .eq("words.bank_id", bankId);
  if (error) throw error;
  const map = new Map<string, UserWordProgress>();
  for (const p of data ?? []) map.set(p.word_id, p as UserWordProgress);
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
      easy: row.easy,
      weight: row.weight,
      last_result: row.last_result,
      learned_at: row.learned_at,
      last_reviewed_at: row.last_reviewed_at,
      created_at: row.created_at,
    },
  }));
}

// 标记为"简单"的词在生成"今日词库"时，只以这个概率被保留，其余情况直接跳过。
// 参考同类项目（nami-console）的做法：不是彻底移除简单词（万一以后还想复习/巩固），
// 只是让它出现的概率大幅降低（1/6），几乎不影响每日新词/复习词的学习节奏。
// 导出给 src/lib/data/patterns.ts 的 selectDailyPatterns 复用，两边"简单词保留概率"
// 保持完全一致，避免以后各改各的导致体验不统一。
export const EASY_KEEP_RATIO = 1 / 6;

/**
 * 计算"今日词库"（默认约40词）：
 * - 先按 EASY_KEEP_RATIO 概率筛掉大部分"标记为简单"的词（用当天种子，保证同一天结果稳定）
 * - 从筛选后的池子里，优先纳入之前检测答错、被标记回记忆页的单词（learned=false 且 weight 更高的优先）
 * - 剩余名额用当天确定性伪随机数从词库中补齐，保证同一天内多次刷新结果一致
 * - 最多返回 count 个，不重复
 *
 * 兜底：如果"简单词概率筛选"筛得太狠导致候选池为空（比如整个词库都标了简单，
 * 概率上又恰好全部被筛掉），退回未筛选的完整池子，避免"今日词库"直接清空。
 */
export function selectDailyWords(
  words: Word[],
  progressMap: Map<string, UserWordProgress>,
  userId: string,
  bankId: string,
  count = 40
): WordWithProgress[] {
  const withProgress: WordWithProgress[] = words.map((w) => ({
    ...w,
    progress: progressMap.get(w.id) ?? null,
  }));

  // 种子固定到"用户+词库+当天日期"，保证同一天内无论刷新多少次，
  // 简单词筛选和后面的洗牌顺序都完全一致（这也是为什么下面共用一个 rng 实例，
  // 而不是各自 new 一个：保持"同一天调用顺序固定 -> 结果固定"这条链路）。
  const rng = createSeededRng(`${userId}:${bankId}:${todayDateString()}`);

  const easyFiltered = withProgress.filter(
    (w) => !w.progress?.easy || rng() < EASY_KEEP_RATIO
  );
  const pool = easyFiltered.length > 0 ? easyFiltered : withProgress;

  const reviewPriority = pool
    .filter((w) => w.progress && w.progress.learned === false && w.progress.weight > 1)
    .sort((a, b) => (b.progress!.weight ?? 0) - (a.progress!.weight ?? 0));

  const reviewIds = new Set(reviewPriority.map((w) => w.id));
  const rest = pool.filter((w) => !reviewIds.has(w.id));

  const shuffled = [...rest];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const combined = [...reviewPriority, ...shuffled];
  return combined.slice(0, count);
}
