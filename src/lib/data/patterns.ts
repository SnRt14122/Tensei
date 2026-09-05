// 语法点数据读取函数（学习页"语法点记忆"板块 + "语法点意义检测"共用）
//
// 语法点内容本身不是这次改动写的（按约定由用户之后通过后端导入接口批量灌入），
// 这里只负责从 sentence_patterns 表读出来，写法和 src/lib/data/words.ts 里的风格保持一致。
//
// "语法点记忆"板块从"一次性网格展示全部"改成参考单词记忆页的"单卡逐个 + 每日约6个"
// 模式后，这个文件也补充了对应的 getUserPatternProgress / selectDailyPatterns，
// 写法和 src/lib/data/words.ts 的 getUserProgressForBank / selectDailyWords 完全对照。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PatternWithProgress, SentencePattern, UserPatternProgress } from "@/lib/types";
import { createSeededRng, todayDateString } from "@/lib/seededRandom";
import { EASY_KEEP_RATIO } from "@/lib/data/words";

/** 读取全部语法点（按创建时间排序），供学习页展示和检测题抽题使用 */
export async function listSentencePatterns(
  supabase: SupabaseClient
): Promise<SentencePattern[]> {
  const { data, error } = await supabase
    .from("sentence_patterns")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * 语法点的"难度"筛选，和单词记忆页的词库选择器（BankSelector/word_banks）作用一致，
 * 但语法点本身没有独立的"库"表——难度信息就存在 sentence_patterns.level 字段里
 * （导入数据时按 N5/N4/N3/N2/N1 分文件写入），所以这里直接从已有数据里"提炼"出
 * 所有出现过的 level 取值，作为下拉选择器的选项，不需要额外建表。
 *
 * 排序固定为 N5→N4→N3→N2→N1（由易到难），而不是取到什么顺序就用什么顺序，
 * 因为 JS 的 Set/数组遍历顺序取决于数据库返回顺序，不一定符合直觉。
 */
const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1"] as const;

export function listPatternLevels(patterns: SentencePattern[]): string[] {
  const present = new Set(patterns.map((p) => p.level).filter((l): l is string => !!l));
  const ordered = LEVEL_ORDER.filter((l) => present.has(l));
  // 万一未来导入了不在预设顺序里的取值（比如历史上出现过的 "N5-N3" 合并级别），
  // 追加在后面，保证不会被静默丢弃
  const extra = [...present].filter((l) => !LEVEL_ORDER.includes(l as typeof LEVEL_ORDER[number]));
  return [...ordered, ...extra];
}

/**
 * 获取某个用户的全部语法点学习进度，返回 pattern_id -> 进度 的映射。
 * 语法点总量（目前几百条，远小于单词的上万条）不会触发 URL 长度限制，
 * 所以这里不需要像 getUserProgressForBank 那样绕开 IN 查询，直接按 user_id 查询即可。
 */
export async function getUserPatternProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<Map<string, UserPatternProgress>> {
  const { data, error } = await supabase
    .from("user_pattern_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  const map = new Map<string, UserPatternProgress>();
  for (const p of (data ?? []) as UserPatternProgress[]) map.set(p.pattern_id, p);
  return map;
}

/**
 * 计算"今日语法点"（默认约6条），选取逻辑对照 selectDailyWords：
 * - 先按 EASY_KEEP_RATIO 概率筛掉大部分"标记为简单"的语法点（当天固定种子，结果稳定）
 * - 优先纳入之前检测答错、被标记回来的语法点（learned=false 且 weight 更高的优先）
 * - 剩余名额用确定性伪随机数补齐，保证同一天内多次刷新结果一致
 * - 种子里额外加上 "pattern" 前缀，避免和同一用户同一天的"今日词库"种子撞在一起
 *   （两边如果种子完全相同，用户在两个页面看到的"随机顺序"会诡异地高度相关）
 */
export function selectDailyPatterns(
  patterns: SentencePattern[],
  progressMap: Map<string, UserPatternProgress>,
  userId: string,
  count = 6
): PatternWithProgress[] {
  const withProgress: PatternWithProgress[] = patterns.map((p) => ({
    ...p,
    progress: progressMap.get(p.id) ?? null,
  }));

  const rng = createSeededRng(`pattern:${userId}:${todayDateString()}`);

  const easyFiltered = withProgress.filter(
    (p) => !p.progress?.easy || rng() < EASY_KEEP_RATIO
  );
  const pool = easyFiltered.length > 0 ? easyFiltered : withProgress;

  const reviewPriority = pool
    .filter((p) => p.progress && p.progress.learned === false && p.progress.weight > 1)
    .sort((a, b) => (b.progress!.weight ?? 0) - (a.progress!.weight ?? 0));

  const reviewIds = new Set(reviewPriority.map((p) => p.id));
  const rest = pool.filter((p) => !reviewIds.has(p.id));

  const shuffled = [...rest];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const combined = [...reviewPriority, ...shuffled];
  return combined.slice(0, count);
}
