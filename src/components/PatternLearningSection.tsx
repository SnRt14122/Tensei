// 学习页"句型记忆"板块：展示 sentence_patterns 表里的全部句型。
// 数据由后端导入接口批量写入（见 src/app/api/import/patterns/route.ts），
// 这里只负责读取和展示，没有内容时给出引导提示。

import { Furigana } from "./Furigana";
import type { SentencePattern } from "@/lib/types";

export function PatternLearningSection({ patterns }: { patterns: SentencePattern[] }) {
  if (patterns.length === 0) {
    return (
      <p className="text-white/50 text-sm">
        还没有句型数据。句型由你自己整理后，通过 /api/import/patterns 接口批量导入即可在这里显示。
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {patterns.map((p) => (
        <div key={p.id} className="glass-panel rounded-2xl p-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xl text-white font-medium">{p.pattern}</p>
            {p.level && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                {p.level}
              </span>
            )}
          </div>
          <p className="mt-2 text-cyan-200">{p.meaning_cn}</p>
          {p.explanation && <p className="mt-1 text-sm text-white/50">{p.explanation}</p>}
          {p.example && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <Furigana segments={p.example.segments} className="text-white/85" />
              <p className="mt-1 text-sm text-white/50">{p.example.cn}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
