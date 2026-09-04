"use client";

import { useState } from "react";
import { pickRandomLyric } from "@/lib/data/lyrics";

export function LyricShowcase() {
  const [lyric, setLyric] = useState(() => pickRandomLyric());

  return (
    <div className="glass-panel rounded-3xl px-8 py-10 sm:px-12 sm:py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/60">
        今日一句
      </p>
      <p className="mt-4 font-jp text-2xl sm:text-3xl text-white leading-relaxed">
        {lyric.jp}
      </p>
      <p className="mt-3 text-base text-white/60">{lyric.cn}</p>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-white/30">{lyric.source}</span>
        <button
          onClick={() => setLyric(pickRandomLyric())}
          className="text-xs text-cyan-300/80 hover:text-cyan-200 transition-colors"
        >
          换一句 →
        </button>
      </div>
    </div>
  );
}
