"use client";

import { useMemo, useRef, useState } from "react";
import { Furigana } from "./Furigana";
import { normalizeKana } from "@/lib/kana";
import { addLocalAttempt } from "@/lib/localStore";
import { useEnterToAdvance } from "@/hooks/useEnterToAdvance";
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

  // 记录输入框当前是否正在"输入法拼字中"（比如打拼音还没敲出候选词就按了 Enter）。
  // 用 ref 而不是 state：这个值只在事件回调里读取判断，不需要触发重渲染。
  const isComposingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current || result) return;

    // 防止"输入法拼字过程中确认候选词"的那次 Enter 被误当成提交答案：
    // 如果用拼音/罗马音输入法打假名，敲完拼音后第一次按 Enter 往往是
    // "把候选词上屏"，不是"提交表单"，但浏览器仍会把这次 keydown 传导成
    // form 的 submit 事件。isComposingRef 由输入框的 onCompositionStart/
    // onCompositionEnd 维护，如果此刻还在拼字状态，直接放弃这次提交
    // （不判分、不清空输入），等上屏完成后用户再按一次 Enter 才是真正提交。
    if (isComposingRef.current) return;

    // 判分本身一直就是纯前端逻辑（字符串比较），这部分没有性能问题。
    const isCorrect = normalizeKana(input) === normalizeKana(current.reading);
    setResult(isCorrect ? "correct" : "incorrect");
    if (isCorrect) setCorrectCount((c) => c + 1);

    // 把这次答题记录写入本地 IndexedDB 缓存，不等待网络，界面立即可以继续下一题。
    // 云端同步交给导航栏的"同步"按钮统一处理。
    addLocalAttempt({
      id: crypto.randomUUID(),
      quiz_type: "kanji",
      word_id: current.id,
      pattern_id: null,
      conjugation_form: null,
      user_answer: input,
      correct: isCorrect,
      client_timestamp: new Date().toISOString(),
    });
  }

  function handleNext() {
    setIndex((i) => i + 1);
    setInput("");
    setResult(null);
  }

  // 已经显示出对错结果时，允许按 Enter 直接进入下一题，不用每次都用鼠标点按钮
  useEnterToAdvance(result !== null, handleNext);

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
    <div key={index} className="glass-panel slide-transition rounded-2xl p-8">
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
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          disabled={!!result}
          autoFocus
          placeholder="请输入纯假名读音"
          className="w-full max-w-sm rounded-lg border border-white/15 bg-black/40 px-4 py-2 text-center text-lg text-white outline-none focus:border-[var(--accent)] disabled:opacity-60"
        />

        {!result && (
          <button
            type="submit"
            className="liquid-btn rounded-lg text-black font-medium px-6 py-2"
            style={{ backgroundColor: "var(--accent)" }}
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
            className="liquid-btn mt-5 rounded-lg border border-white/20 hover:border-white/40 text-white px-6 py-2"
          >
            下一题（Enter）
          </button>
        </div>
      )}
    </div>
  );
}
