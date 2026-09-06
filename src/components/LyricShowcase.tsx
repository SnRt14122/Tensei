"use client";

import { useState } from "react";
import type { LyricLine } from "@/lib/data/lyrics";

export function LyricShowcase({ initialLyric }: { initialLyric: LyricLine }) {
  const [lyric, setLyric] = useState(initialLyric);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function changeLyric() {
    setLoading(true);
    setError(false);
    try {
      const { pickRandomLyric } = await import("@/lib/data/lyrics");
      setLyric(pickRandomLyric());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

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
          onClick={changeLyric}
          disabled={loading}
          aria-busy={loading}
          className="text-xs text-cyan-300/80 hover:text-cyan-200 transition-colors"
        >
          换一句 →
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-300">加载失败，请重试</p>}
    </div>
  );
}
