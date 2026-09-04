"use client";

import { useMemo, useState } from "react";
import { Furigana } from "./Furigana";
import { recordMeaningQuizResult } from "@/app/quiz/meaning/actions";
import type { WordWithProgress } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface QuizItem {
  word: WordWithProgress;
  options: string[];
  correctIndex: number;
}

function buildQuizItems(words: WordWithProgress[]): QuizItem[] {
  const allMeanings = words.map((w) => w.meaning_cn);
  return shuffle(words).map((word) => {
    const distractorPool = allMeanings.filter((m) => m !== word.meaning_cn);
    const distractors = shuffle(distractorPool).slice(0, 3);
    const options = shuffle([word.meaning_cn, ...distractors]);
    return {
      word,
      options,
      correctIndex: options.indexOf(word.meaning_cn),
    };
  });
}

export function MeaningQuizRunner({ words }: { words: WordWithProgress[] }) {
  const quizItems = useMemo(() => buildQuizItems(words), [words]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const current = quizItems[index];
  const finished = index >= quizItems.length;

  async function handleSelect(optionIndex: number) {
    if (selected !== null || !current) return;
    setSelected(optionIndex);
    setSubmitting(true);

    const isCorrect = optionIndex === current.correctIndex;
    if (isCorrect) setCorrectCount((c) => c + 1);

    try {
      await recordMeaningQuizResult(current.word.id, isCorrect);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setIndex((i) => i + 1);
    setSelected(null);
  }

  if (words.length < 4) {
    return (
      <p className="text-white/50">
        已学单词数量不足（至少需要 4 个）以生成选项，请先在记忆页多标记一些单词。
      </p>
    );
  }

  if (finished) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-2xl text-white font-semibold">完成！</p>
        <p className="mt-2 text-white/60">
          正确 {correctCount} / {quizItems.length}
        </p>
        <p className="mt-1 text-xs text-white/40">
          答错的单词已回到记忆页，权重会更高，明天会优先复习
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8">
      <p className="text-sm text-white/40 mb-4">
        第 {index + 1} / {quizItems.length} 题
      </p>

      <Furigana
        segments={current.word.segments}
        className="block text-center text-4xl font-medium text-white mb-8"
      />

      <div className="grid gap-3">
        {current.options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrectOption = i === current.correctIndex;
          let style = "border-white/15 hover:border-white/35 text-white";
          if (selected !== null) {
            if (isCorrectOption) {
              style = "border-emerald-400/60 bg-emerald-400/10 text-emerald-300";
            } else if (isSelected) {
              style = "border-red-400/60 bg-red-400/10 text-red-300";
            } else {
              style = "border-white/10 text-white/40";
            }
          }
          return (
            <button
              key={i}
              disabled={selected !== null || submitting}
              onClick={() => handleSelect(i)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button
          onClick={handleNext}
          className="mt-6 w-full rounded-lg border border-white/20 hover:border-white/40 text-white py-2"
        >
          下一题
        </button>
      )}
    </div>
  );
}
