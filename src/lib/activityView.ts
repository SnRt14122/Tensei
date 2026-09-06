import type { ActivityDay } from "./data/activity";

export type ActivityMode = "all" | "learning" | "quiz" | "mistakes";

export function filterActivityDays(days: ActivityDay[], cutoff: string, mode: ActivityMode, search: string) {
  const query = search.trim().toLowerCase();
  const matches = (value: string) => !query || value.toLowerCase().includes(query);
  return days.filter(day => day.key >= cutoff).flatMap(day => {
    const learning = mode === "all" || mode === "learning";
    const quizzes = mode === "all" || mode === "quiz";
    const mistakes = mode === "all" || mode === "mistakes";
    const learnedWords = learning ? day.learnedWords.filter(word => matches(`${word.surface} ${word.reading} ${word.meaning}`)) : [];
    const learnedPatterns = learning ? day.learnedPatterns.filter(pattern => matches(`${pattern.pattern} ${pattern.meaning}`)) : [];
    const errors = mistakes ? day.mistakes.filter(mistake => matches(`${mistake.label} ${mistake.reading} ${mistake.type} ${mistake.answer}`)) : [];
    const hasQuiz = quizzes && day.attempts > 0 && (!query || day.quizTypes.some(matches) || day.reviewedWords.some(word => matches(`${word.surface} ${word.reading}`)));
    if (!learnedWords.length && !learnedPatterns.length && !errors.length && !hasQuiz) return [];
    return [{ ...day, learnedWords, learnedPatterns, mistakes: errors, attempts: hasQuiz ? day.attempts : 0, correct: hasQuiz ? day.correct : 0 }];
  });
}
