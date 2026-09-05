"use client";

// 语法点意义检测：展示一个语法点（如「〜てもいいです」），四选一选择正确的中文含义。
// 逐题判分逻辑和 MeaningQuizRunner 基本一致（前端选择题、本地缓存答题记录）。

import { useMemo, useState } from "react";
import { addLocalAttempt } from "@/lib/localStore";
import { useEnterToAdvance } from "@/hooks/useEnterToAdvance";
import { Furigana } from "./Furigana";
import type { SentencePattern } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface QuizItem {
  pattern: SentencePattern;
  options: string[];
  correctIndex: number;
}

function buildQuizItems(patterns: SentencePattern[]): QuizItem[] {
  const allMeanings = patterns.map((p) => p.meaning_cn);
  return shuffle(patterns).map((pattern) => {
    const distractorPool = allMeanings.filter((m) => m !== pattern.meaning_cn);
    const distractors = shuffle(distractorPool).slice(0, 3);
    const options = shuffle([pattern.meaning_cn, ...distractors]);
    return {
      pattern,
      options,
      correctIndex: options.indexOf(pattern.meaning_cn),
    };
  });
}

export function PatternQuizRunner({ patterns }: { patterns: SentencePattern[] }) {
  const quizItems = useMemo(() => buildQuizItems(patterns), [patterns]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const current = quizItems[index];
  const finished = index >= quizItems.length;

  function handleSelect(optionIndex: number) {
    if (selected !== null || !current) return;
    setSelected(optionIndex);

    const isCorrect = optionIndex === current.correctIndex;
    if (isCorrect) setCorrectCount((c) => c + 1);

    addLocalAttempt({
      id: crypto.randomUUID(),
      quiz_type: "pattern",
      word_id: null,
      pattern_id: current.pattern.id,
      conjugation_form: null,
      user_answer: current.options[optionIndex],
      correct: isCorrect,
      client_timestamp: new Date().toISOString(),
    });
  }

  function handleNext() {
    setIndex((i) => i + 1);
    setSelected(null);
  }

  useEnterToAdvance(selected !== null, handleNext);

  if (patterns.length < 4) {
    return (
      <p className="text-white/50">
        语法点数量不足（至少需要 4 个）以生成选项，请先在学习页导入更多语法点。
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
      </div>
    );
  }

  return (
    <div key={index} className="glass-panel slide-transition rounded-2xl p-8">
      <p className="text-sm text-white/40 mb-4">
        第 {index + 1} / {quizItems.length} 题
      </p>

      <p className="block text-center text-3xl font-medium text-white mb-8">
        {current.pattern.pattern}
      </p>

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
              disabled={selected !== null}
              onClick={() => handleSelect(i)}
              className={`liquid-btn rounded-lg border px-4 py-3 text-left ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected !== null && current.pattern.example && (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-3 text-left">
          <Furigana segments={current.pattern.example.segments} className="text-white/85" />
          <p className="mt-1 text-sm text-white/50">{current.pattern.example.cn}</p>
        </div>
      )}

      {selected !== null && (
        <button
          onClick={handleNext}
          className="liquid-btn mt-6 w-full rounded-lg border border-white/20 hover:border-white/40 text-white py-2"
        >
          下一题（Enter）
        </button>
      )}
    </div>
  );
}
