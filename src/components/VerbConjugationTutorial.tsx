"use client";

// 动词/形容词变位教程组件（学习页"学习"tab 的第一个板块）。
//
// 设计思路：
// - 内容是精心设计的示例 + 动画，相对固定，所以按用户确认的方案写成前端静态组件，
//   不占用数据库，以后要改教程内容就是改这个文件的代码。
// - 每种词类（五段/一段/カ変/サ変/い形容词/な形容词）给一个代表性例词，
//   用户可以点击不同的变形形式按钮，右侧用动画展示变形结果，并高亮"发生变化的部分"，
//   配上中文说明这种变形的意思，以及记忆口诀（来自 conjugation.ts 里的 *_FORM_META）。
// - 高亮逻辑：对比"变形前的读音"和"变形后的读音"，找出它们的最长公共前缀，
//   公共前缀部分是"没变的词干"，之后的部分才是"这次变形改变的地方"，用高亮动画突出显示。

import { useState } from "react";
import {
  ADJ_FORM_META,
  ALL_ADJ_FORMS,
  ALL_VERB_FORMS,
  VERB_FORM_META,
  conjugateAdjective,
  conjugateVerb,
} from "@/lib/conjugation";
import type { AdjForm, VerbForm } from "@/lib/conjugation";
import type { AdjType, VerbType } from "@/lib/types";

/** 每种词类挑一个最常见、最有代表性的例词，方便讲解 */
const VERB_EXAMPLES: Record<VerbType, { surface: string; reading: string; note: string }> = {
  godan: { surface: "話す", reading: "はなす", note: "五段动词：词尾在す行五个假名间变化" },
  ichidan: { surface: "食べる", reading: "たべる", note: "一段动词：词尾固定是る，去掉る词干不变" },
  kahen: { surface: "来る", reading: "くる", note: "カ変动词：仅此一词，读音本身会变（き/く/こ）" },
  sahen: { surface: "勉強する", reading: "べんきょうする", note: "サ変动词：する及〇〇する复合动词" },
};

const ADJ_EXAMPLES: Record<AdjType, { surface: string; reading: string; note: string }> = {
  i: { surface: "忙しい", reading: "いそがしい", note: "い形容词：词尾い本身参与变形" },
  na: { surface: "簡単", reading: "かんたん", note: "な形容词：本质接近名词，靠だ/です变形" },
};

/** 计算两个字符串的最长公共前缀长度，用于定位"变形改变了哪一部分" */
function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** 展示"词干 + 高亮变化部分"的结果文本 */
function ConjugatedReading({ before, after }: { before: string; after: string }) {
  const prefixLen = commonPrefixLength(before, after);
  const stem = after.slice(0, prefixLen);
  const changed = after.slice(prefixLen);
  return (
    <span key={after} className="conjugate-result text-2xl text-white">
      {stem}
      <span className="highlight-pulse text-cyan-200 font-semibold">{changed}</span>
    </span>
  );
}

/** 一个词类的教程卡片：选择变形形式 + 展示结果 + 记忆口诀 */
function VerbTypeCard({ verbType }: { verbType: VerbType }) {
  const [form, setForm] = useState<VerbForm>("masu");
  const example = VERB_EXAMPLES[verbType];
  const result = conjugateVerb({ ...example, verb_type: verbType }, form);
  const meta = VERB_FORM_META[form];

  return (
    <div className="glass-panel rounded-2xl p-6">
      <p className="text-sm text-white/50 mb-1">{example.note}</p>
      <p className="text-3xl text-white font-medium mb-4">{example.surface}</p>

      <div className="flex flex-wrap gap-2 mb-5">
        {ALL_VERB_FORMS.map((f) => (
          <button
            key={f}
            onClick={() => setForm(f)}
            className={`liquid-btn rounded-full px-3 py-1 text-xs ${
              f === form
                ? "text-black font-medium"
                : "border border-white/15 text-white/60 hover:border-white/35 hover:text-white"
            }`}
            style={f === form ? { backgroundColor: "var(--accent)" } : undefined}
          >
            {VERB_FORM_META[f].label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
        <p className="text-xs text-white/40 mb-2">{meta.label}</p>
        <ConjugatedReading before={example.reading} after={result.reading} />

        {/* 语法意义说明：这种变形在什么场合用、表达什么意思 */}
        <p className="mt-3 text-sm text-white/70">{meta.meaningCn}</p>

        {/* 记忆口诀：怎么从辞书形推导出这个变形 */}
        <p className="mt-2 text-sm text-cyan-200/80">💡 {meta.mnemonic}</p>

        {/* 完整例句：把这个变形放进一句真实的日语句子里，帮助理解实际用法 */}
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-white/90">{meta.example.jp}</p>
          <p className="mt-1 text-xs text-white/45">{meta.example.cn}</p>
        </div>
      </div>
    </div>
  );
}

function AdjTypeCard({ adjType }: { adjType: AdjType }) {
  const [form, setForm] = useState<AdjForm>("negative");
  const example = ADJ_EXAMPLES[adjType];
  const result = conjugateAdjective({ ...example, adj_type: adjType }, form);
  const meta = ADJ_FORM_META[form];

  return (
    <div className="glass-panel rounded-2xl p-6">
      <p className="text-sm text-white/50 mb-1">{example.note}</p>
      <p className="text-3xl text-white font-medium mb-4">{example.surface}</p>

      <div className="flex flex-wrap gap-2 mb-5">
        {ALL_ADJ_FORMS.map((f) => (
          <button
            key={f}
            onClick={() => setForm(f)}
            className={`liquid-btn rounded-full px-3 py-1 text-xs ${
              f === form
                ? "text-black font-medium"
                : "border border-white/15 text-white/60 hover:border-white/35 hover:text-white"
            }`}
            style={f === form ? { backgroundColor: "var(--accent)" } : undefined}
          >
            {ADJ_FORM_META[f].label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
        <p className="text-xs text-white/40 mb-2">{meta.label}</p>
        <ConjugatedReading before={example.reading} after={result.reading} />

        <p className="mt-3 text-sm text-white/70">{meta.meaningCn}</p>
        <p className="mt-2 text-sm text-cyan-200/80">💡 {meta.mnemonic}</p>

        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-white/90">{meta.example.jp}</p>
          <p className="mt-1 text-xs text-white/45">{meta.example.cn}</p>
        </div>
      </div>
    </div>
  );
}

export function VerbConjugationTutorial() {
  return (
    <div className="space-y-6">
      <p className="text-white/60 text-sm">
        点击下方的变形按钮，观察例词如何变化——高亮部分就是这次变形实际改变的地方，
        结合旁边的记忆口诀理解规则，而不是死记硬背每一个词形。
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <VerbTypeCard verbType="godan" />
        <VerbTypeCard verbType="ichidan" />
        <VerbTypeCard verbType="kahen" />
        <VerbTypeCard verbType="sahen" />
        <AdjTypeCard adjType="i" />
        <AdjTypeCard adjType="na" />
      </div>
    </div>
  );
}
