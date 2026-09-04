"use client";

import { useMemo, useState } from "react";
import { Furigana } from "./Furigana";
import { normalizeKana } from "@/lib/kana";
import type { WordWithProgress } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function KanjiQuizRunner({ words }: { words: WordWithProgress[] }) {
  const quizWords = useMemo(() => shuffle(words), [words]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const current = quizWords[index];
  const finished = index >= quizWords.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || result) return;

    const isCorrect = normalizeKana(input) === normalizeKana(current.reading);
    setResult(isCorrect ? "correct" : "incorrect");
    if (isCorrect) setCorrectCount((c) => c + 1);
  }

  function handleNext() {
    setIndex((i) => i + 1);
    setInput("");
    setResult(null);
  }

  if (words.length === 0) {
    return (
      <p className="text-white/50">
        还没有已学的单词，请先在记忆页标记一些单词为&ldquo;记住&rdquo;。
      </p>
    );
  }

  if (finished) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-2xl text-white font-semibold">完成！</p>
        <p className="mt-2 text-white/60">
          正确 {correctCount} / {quizWords.length}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8">
      <p className="text-sm text-white/40 mb-4">
        第 {index + 1} / {quizWords.length} 题
      </p>

      <p className="text-4xl font-medium text-white text-center mb-8">
        {current.surface}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!!result}
          autoFocus
          placeholder="请输入纯假名读音"
          className="w-full max-w-sm rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-center text-lg text-white outline-none focus:border-cyan-400/60 disabled:opacity-60"
        />

        {!result && (
          <button
            type="submit"
            className="rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-6 py-2"
          >
            提交
          </button>
        )}
      </form>

      {result && (
        <div className="mt-6 text-center">
          <p
            className={
              result === "correct"
                ? "text-emerald-400 text-lg font-medium"
                : "text-red-400 text-lg font-medium"
            }
          >
            {result === "correct" ? "正确！" : `不对，正确读音是 ${current.reading}`}
          </p>
          <p className="mt-2 text-cyan-200">{current.meaning_cn}</p>
          {current.example && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-left">
              <Furigana segments={current.example.segments} className="text-white/85" />
              <p className="mt-1 text-sm text-white/50">{current.example.cn}</p>
            </div>
          )}
          <button
            onClick={handleNext}
            className="mt-5 rounded-lg border border-white/20 hover:border-white/40 text-white px-6 py-2"
          >
            下一题
          </button>
        </div>
      )}
    </div>
  );
}
