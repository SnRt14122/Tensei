import type { SupabaseClient } from "@supabase/supabase-js";

type LearnedWordRow = {
  word_id: string;
  learned: boolean;
  weight: number;
  learned_at: string | null;
  words: { surface: string; reading: string; meaning_cn: string } | { surface: string; reading: string; meaning_cn: string }[] | null;
};

type LearnedPatternRow = {
  pattern_id: string;
  learned: boolean;
  learned_at: string | null;
  sentence_patterns: { pattern: string; meaning_cn: string } | { pattern: string; meaning_cn: string }[] | null;
};

type AttemptRow = {
  quiz_type: "kanji" | "meaning" | "conjugation" | "pattern";
  correct: boolean;
  user_answer: string | null;
  client_timestamp: string;
  words: { surface: string; reading: string; meaning_cn: string } | { surface: string; reading: string; meaning_cn: string }[] | null;
  sentence_patterns: { pattern: string; meaning_cn: string } | { pattern: string; meaning_cn: string }[] | null;
};

export type ActivityDay = {
  key: string;
  label: string;
  learnedWords: { id: string; surface: string; reading: string; meaning: string }[];
  learnedPatterns: { id: string; pattern: string; meaning: string }[];
  reviewedWords: { surface: string; reading: string }[];
  attempts: number;
  correct: number;
  quizTypes: string[];
  mistakes: { label: string; reading: string; type: string; answer: string }[];
};

export type ReviewItem = { id: string; surface: string; reading: string; meaning: string; weight: number };

const QUIZ_LABELS: Record<AttemptRow["quiz_type"], string> = {
  kanji: "汉字检测",
  meaning: "词义检测",
  conjugation: "变位检测",
  pattern: "语法检测",
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

const activityDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});

function localDate(timestamp: string) {
  const parts = activityDateFormatter.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { key: `${values.year}-${values.month}-${values.day}`, label: `${values.year}年${Number(values.month)}月${Number(values.day)}日` };
}

export async function getLearningActivity(supabase: SupabaseClient, userId: string): Promise<{ days: ActivityDay[]; reviewQueue: ReviewItem[]; todayKey: string }> {
  const [wordsResult, patternsResult, attemptsResult] = await Promise.all([
    supabase.from("user_word_progress")
      .select("word_id, learned, weight, learned_at, words(surface, reading, meaning_cn)")
      .eq("user_id", userId).not("learned_at", "is", null).order("learned_at", { ascending: false }),
    supabase.from("user_pattern_progress")
      .select("pattern_id, learned, learned_at, sentence_patterns(pattern, meaning_cn)")
      .eq("user_id", userId).not("learned_at", "is", null).order("learned_at", { ascending: false }),
    supabase.from("quiz_attempts")
      .select("quiz_type, correct, user_answer, client_timestamp, words(surface, reading, meaning_cn), sentence_patterns(pattern, meaning_cn)")
      .eq("user_id", userId).order("client_timestamp", { ascending: false }).limit(1000),
  ]);
  if (wordsResult.error) throw wordsResult.error;
  if (patternsResult.error) throw patternsResult.error;
  if (attemptsResult.error) throw attemptsResult.error;

  const days = new Map<string, ActivityDay>();
  const reviewQueue: ReviewItem[] = [];
  function dayFor(timestamp: string) {
    const date = localDate(timestamp);
    const existing = days.get(date.key);
    if (existing) return existing;
    const day: ActivityDay = { key: date.key, label: date.label, learnedWords: [], learnedPatterns: [], reviewedWords: [], attempts: 0, correct: 0, quizTypes: [], mistakes: [] };
    days.set(date.key, day);
    return day;
  }

  for (const row of (wordsResult.data ?? []) as LearnedWordRow[]) {
    const word = first(row.words);
    if (!word) continue;
    if (!row.learned && row.weight > 1 && !reviewQueue.some(item => item.id === row.word_id)) reviewQueue.push({ id: row.word_id, surface: word.surface, reading: word.reading, meaning: word.meaning_cn, weight: row.weight });
    if (!row.learned_at || !row.learned) continue;
    const day = dayFor(row.learned_at);
    if (!day.learnedWords.some(item => item.id === row.word_id)) day.learnedWords.push({ id: row.word_id, surface: word.surface, reading: word.reading, meaning: word.meaning_cn });
  }
  for (const row of (patternsResult.data ?? []) as LearnedPatternRow[]) {
    const pattern = first(row.sentence_patterns);
    if (!row.learned_at || !pattern) continue;
    const day = dayFor(row.learned_at);
    if (!day.learnedPatterns.some(item => item.id === row.pattern_id)) day.learnedPatterns.push({ id: row.pattern_id, pattern: pattern.pattern, meaning: pattern.meaning_cn });
  }
  for (const row of (attemptsResult.data ?? []) as AttemptRow[]) {
    const day = dayFor(row.client_timestamp);
    day.attempts += 1;
    if (row.correct) day.correct += 1;
    if (!row.correct) {
      const word = first(row.words);
      const pattern = first(row.sentence_patterns);
      day.mistakes.push({ label: word?.surface ?? pattern?.pattern ?? "未命名题目", reading: word?.reading ?? "", type: QUIZ_LABELS[row.quiz_type], answer: row.user_answer || "未填写" });
    }
    const type = QUIZ_LABELS[row.quiz_type];
    if (!day.quizTypes.includes(type)) day.quizTypes.push(type);
    const word = first(row.words);
    if (word && !day.reviewedWords.some(item => item.surface === word.surface && item.reading === word.reading)) day.reviewedWords.push({ surface: word.surface, reading: word.reading });
  }
  const todayKey = localDate(new Date().toISOString()).key;
  return { days: [...days.values()].sort((a, b) => b.key.localeCompare(a.key)), reviewQueue: reviewQueue.sort((a, b) => b.weight - a.weight).slice(0, 30), todayKey };
}
