import type { ActivityDay } from "./data/activity";

export type RecallItem = { id: string; kind: "word" | "pattern"; prompt: string; reading: string; meaning: string };

export function buildRecallDeck(days: ActivityDay[]): RecallItem[] {
  const items = new Map<string, RecallItem>();
  for (const day of days) {
    for (const word of day.learnedWords) {
      const id = `word:${word.id}`;
      if (word.meaning.trim() && !items.has(id)) items.set(id, { id, kind: "word", prompt: word.surface, reading: word.reading, meaning: word.meaning });
    }
    for (const pattern of day.learnedPatterns) {
      const id = `pattern:${pattern.id}`;
      if (pattern.meaning.trim() && !items.has(id)) items.set(id, { id, kind: "pattern", prompt: pattern.pattern, reading: "", meaning: pattern.meaning });
    }
  }
  return [...items.values()];
}

export function activityWeek(days: ActivityDay[], todayKey: string, offset = 0) {
  const today = new Date(`${todayKey}T00:00:00Z`);
  const monday = today.getTime() - ((today.getUTCDay() + 6) % 7) * 86400000 + offset * 7 * 86400000;
  const byDate = new Map(days.map(day => [day.key, day]));
  return Array.from({ length: 7 }, (_, index) => {
    const key = new Date(monday + index * 86400000).toISOString().slice(0, 10);
    const day = byDate.get(key);
    const words = day?.learnedWords.length ?? 0;
    const patterns = day?.learnedPatterns.length ?? 0;
    const attempts = day?.attempts ?? 0;
    return { key, words, patterns, attempts, total: words + patterns + attempts, future: key > todayKey };
  });
}
