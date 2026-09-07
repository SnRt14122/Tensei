"use client";

import { useState, useTransition } from "react";
import { Furigana } from "./Furigana";
import { PitchAccent } from "./PitchAccent";
import { StudyCard } from "./StudyCard";
import { StarButton } from "./StarButton";
import { markWordLearned, toggleStar } from "@/app/memorize/actions";
import { getWordTypeLabel } from "@/lib/conjugation";
import type { WordWithProgress } from "@/lib/types";

export function WordCard({ word }: { word: WordWithProgress }) {
  const [learned, setLearned] = useState(word.progress?.learned ?? false);
  const [starred, setStarred] = useState(word.progress?.starred ?? false);
  const [isPending, startTransition] = useTransition();

  // 根据 verb_type/adj_type 算出"五段动词/一段动词/カ変/サ変/い形容词/な形容词"这类精确标签，
  // 没有分类信息（比如名词）时返回 null，不渲染标签
  const wordTypeLabel = getWordTypeLabel(word);

  function handleMarkLearned() {
    setLearned(true);
    startTransition(() => {
      markWordLearned(word.id).catch(() => setLearned(false));
    });
  }

  function handleToggleStar() {
    const next = !starred;
    setStarred(next);
    startTransition(() => {
      toggleStar(word.id, next).catch(() => setStarred(!next));
    });
  }

  return (
    <StudyCard contentClassName="p-6">
      <div className="absolute right-4 top-4"><StarButton starred={starred} onClick={handleToggleStar} disabled={isPending} /></div>

      <Furigana
        segments={word.segments}
        className="pr-12 text-3xl font-medium text-white leading-relaxed"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/50">
        {word.pos && <span className="rounded-full bg-white/10 px-2 py-0.5">{word.pos}</span>}
        {/* 精确变位分类标签：只有动词/形容词才会有，用高亮色区分于普通的 pos 标签 */}
        {wordTypeLabel && (
          <span className="rounded-full bg-cyan-400/15 text-cyan-200 px-2 py-0.5">
            {wordTypeLabel}
          </span>
        )}
        <PitchAccent word={word} />
      </div>

      <p className="mt-4 text-lg text-cyan-200">{word.meaning_cn}</p>

      {word.example && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <Furigana segments={word.example.segments} className="text-white/85" />
          <p className="mt-1 text-sm text-white/50">{word.example.cn}</p>
        </div>
      )}

      <button
        onClick={handleMarkLearned}
        disabled={learned || isPending}
        className={`liquid-btn mt-5 w-full rounded-lg py-2 text-sm font-medium ${
          learned ? "bg-emerald-500/20 text-emerald-300 cursor-default" : "text-black"
        }`}
        style={learned ? undefined : { backgroundColor: "var(--accent)" }}
      >
        {learned ? "已标记为记住" : "标记为记住"}
      </button>
    </StudyCard>
  );
}
