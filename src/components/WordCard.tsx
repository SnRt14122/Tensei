"use client";

import { useState, useTransition } from "react";
import { Furigana } from "./Furigana";
import { markWordLearned, toggleStar } from "@/app/memorize/actions";
import type { WordWithProgress } from "@/lib/types";

export function WordCard({ word }: { word: WordWithProgress }) {
  const [learned, setLearned] = useState(word.progress?.learned ?? false);
  const [starred, setStarred] = useState(word.progress?.starred ?? false);
  const [isPending, startTransition] = useTransition();

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
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-xl">
      <button
        onClick={handleToggleStar}
        aria-label={starred ? "取消星标" : "标记星标"}
        className={`absolute right-4 top-4 text-xl transition-colors ${
          starred ? "text-amber-400" : "text-white/25 hover:text-white/50"
        }`}
      >
        ★
      </button>

      <Furigana
        segments={word.segments}
        className="text-3xl font-medium text-white leading-relaxed"
      />

      <div className="mt-2 flex items-center gap-2 text-sm text-white/50">
        {word.pos && <span className="rounded-full bg-white/10 px-2 py-0.5">{word.pos}</span>}
        <span>{word.reading}</span>
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
        className={`mt-5 w-full rounded-lg py-2 text-sm font-medium transition-colors ${
          learned
            ? "bg-emerald-500/20 text-emerald-300 cursor-default"
            : "bg-cyan-500 hover:bg-cyan-400 text-black"
        }`}
      >
        {learned ? "已标记为记住" : "标记为记住"}
      </button>
    </div>
  );
}
