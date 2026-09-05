"use client";

// 动词/形容词变位检测：
// 题目例如「行く（否定过去形）」，只显示汉字原形（不给振假名），
// 要求用户输入变形后的纯假名读音（不允许汉字），比如"いかなかった"。
// 这同时考察了两件事：变位规则记得对不对，以及汉字对应的读音记得对不对。

import { useMemo, useState } from "react";
import {
  ALL_ADJ_FORMS,
  ALL_VERB_FORMS,
  ADJ_FORM_META,
  VERB_FORM_META,
  conjugateAdjective,
  tryConjugateVerb,
} from "@/lib/conjugation";
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

/** 一道变位检测题：某个单词 + 随机抽到的一种变形 + 对应的中文形式名 */
interface ConjugationQuizItem {
  word: WordWithProgress;
  formKey: string; // 变形的英文键名（如 'nakatta'），存进答题记录用于统计，比中文标签更稳定
  formLabel: string; // 中文形式名，比如"否定过去形"，用于界面展示
  answerReading: string; // 正确答案的纯假名读音
}

/**
 * 从已学单词里筛出"能变位"的词（verb_type 或 adj_type 不为空），
 * 给每个词随机抽一种变形形式，组装成题目列表。
 * 不能变位的词（比如名词）直接跳过，不出现在题库里。
 *
 * 用 tryConjugateVerb（而不是会抛异常的 conjugateVerb）做兜底：如果某个词的
 * verb_type 和 reading 组合有问题（比如通过导入接口写入了不匹配的脏数据，
 * 读音结尾假名根本不在对应变格表里），这里会跳过这个词而不是让整个检测页崩溃。
 */
function buildQuizItems(words: WordWithProgress[]): ConjugationQuizItem[] {
  const conjugatable = words.filter((w) => w.verb_type || w.adj_type);
  const items: ConjugationQuizItem[] = [];

  for (const word of shuffle(conjugatable)) {
    if (word.verb_type) {
      const form = ALL_VERB_FORMS[Math.floor(Math.random() * ALL_VERB_FORMS.length)];
      const result = tryConjugateVerb(
        { surface: word.surface, reading: word.reading, verb_type: word.verb_type },
        form
      );
      if (!result) continue; // 数据有问题，跳过这个词，不让它影响整个题库
      items.push({ word, formKey: form, formLabel: VERB_FORM_META[form].label, answerReading: result.reading });
    } else {
      const form = ALL_ADJ_FORMS[Math.floor(Math.random() * ALL_ADJ_FORMS.length)];
      const result = conjugateAdjective(
        { surface: word.surface, reading: word.reading, adj_type: word.adj_type! },
        form
      );
      items.push({ word, formKey: form, formLabel: ADJ_FORM_META[form].label, answerReading: result.reading });
    }
  }

  return items;
}

export function ConjugationQuizRunner({ words }: { words: WordWithProgress[] }) {
  const quizItems = useMemo(() => buildQuizItems(words), [words]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const current = quizItems[index];
  const finished = index >= quizItems.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || result) return;

    // 用户答案要求"没有汉字，纯假名"：即使用户不小心输入了汉字，normalizeKana 也不会
    // 把汉字转成假名，所以只要答案里混了汉字，字符串比较自然就会判错，间接强制了"纯假名"的要求。
    const isCorrect = normalizeKana(input) === normalizeKana(current.answerReading);
    setResult(isCorrect ? "correct" : "incorrect");
    if (isCorrect) setCorrectCount((c) => c + 1);

    addLocalAttempt({
      id: crypto.randomUUID(),
      quiz_type: "conjugation",
      word_id: current.word.id,
      pattern_id: null,
      conjugation_form: current.formKey,
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

  useEnterToAdvance(result !== null, handleNext);

  const conjugatableCount = words.filter((w) => w.verb_type || w.adj_type).length;
  if (conjugatableCount === 0) {
    return (
      <p className="text-white/50">
        已学单词中还没有标注了变位分类的动词/形容词，请先在记忆页多学一些动词或形容词。
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

      {/* 题目只显示汉字原形，不给振假名，同时考察读音记忆 */}
      <p className="text-4xl font-medium text-white text-center mb-2">
        {current.word.surface}
      </p>
      <p className="text-center text-cyan-300 mb-8">（{current.formLabel}）</p>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!!result}
          autoFocus
          placeholder="请输入变形后的纯假名（不要写汉字）"
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
            {result === "correct" ? "正确！" : `不对，正确答案是 ${current.answerReading}`}
          </p>
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
