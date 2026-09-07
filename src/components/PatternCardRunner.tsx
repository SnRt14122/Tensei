"use client";

// 语法点记忆的"单卡"学习流：一次只展示今日语法点里的一条，交互设计和
// MemoryCardRunner（单词记忆页）完全对照——
// - 星标：单纯持久标记，切换后卡片停留在原地，不自动前进
// - 标记简单：表示"这条我已经很熟了"，标记后自动跳到下一张
// - 记住了：主操作，标记为已学并自动跳到下一张
// - 跳过：不改变任何状态，只是移动到下一张
//
// 同样"冻结本次会话的语法点顺序"：markPatternLearned/togglePatternStar/togglePatternEasy
// 内部都调用了 revalidatePath("/learn/pattern")，会让父级 Server Component 重新渲染并
// 传入新的 patterns 数组——如果每次都用最新 prop 重新计算"今日语法点"的顺序，会出现
// "刚标记完一条，后面卡片顺序全变了"的诡异体验，原因和 MemoryCardRunner 文件头注释
// 里解释的完全一样（selectDailyPatterns 内部用同一个种子随机数依次消耗）。

import { useMemo, useState, useTransition } from "react";
import { Furigana } from "./Furigana";
import { StudyCard } from "./StudyCard";
import {
  markPatternLearned,
  togglePatternEasy,
  togglePatternStar,
} from "@/app/learn/actions";
import type { PatternWithProgress } from "@/lib/types";

/** 单条语法点在本次会话中的本地状态覆盖（乐观更新，失败时回滚） */
interface LocalOverride {
  learned: boolean;
  starred: boolean;
  easy: boolean;
}

function overrideFromPattern(pattern: PatternWithProgress): LocalOverride {
  return {
    learned: pattern.progress?.learned ?? false,
    starred: pattern.progress?.starred ?? false,
    easy: pattern.progress?.easy ?? false,
  };
}

export function PatternCardRunner({ patterns }: { patterns: PatternWithProgress[] }) {
  // 冻结本次会话的语法点顺序，见文件头注释
  const [snapshot] = useState(patterns);
  const [index, setIndex] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, LocalOverride>>(() => {
    const map: Record<string, LocalOverride> = {};
    for (const p of snapshot) map[p.id] = overrideFromPattern(p);
    return map;
  });
  const [isPending, startTransition] = useTransition();

  const current = snapshot[index];
  const finished = index >= snapshot.length;

  const currentState = current ? overrides[current.id] : undefined;

  const learnedThisSession = useMemo(
    () => Object.values(overrides).filter((o) => o.learned).length,
    [overrides]
  );

  function patchOverride(patternId: string, patch: Partial<LocalOverride>) {
    setOverrides((prev) => ({ ...prev, [patternId]: { ...prev[patternId], ...patch } }));
  }

  function goNext() {
    setIndex((i) => i + 1);
  }

  function handleMarkLearned() {
    if (!current) return;
    patchOverride(current.id, { learned: true });
    startTransition(() => {
      markPatternLearned(current.id).catch(() => patchOverride(current.id, { learned: false }));
    });
    goNext();
  }

  function handleMarkEasy() {
    if (!current) return;
    patchOverride(current.id, { easy: true });
    startTransition(() => {
      togglePatternEasy(current.id, true).catch(() => patchOverride(current.id, { easy: false }));
    });
    goNext();
  }

  function handleToggleStar() {
    if (!current) return;
    const next = !currentState?.starred;
    patchOverride(current.id, { starred: next });
    startTransition(() => {
      togglePatternStar(current.id, next).catch(() =>
        patchOverride(current.id, { starred: !next })
      );
    });
    // 星标不自动前进，理由和单词记忆页一致：用户可能只是想标记一下，接着继续看它
  }

  if (snapshot.length === 0) {
    return (
      <p className="text-white/50 text-sm">
        还没有语法点数据。语法点由你自己整理后，通过 /api/import/patterns 接口批量导入即可在这里显示。
      </p>
    );
  }

  if (finished) {
    return (
      <StudyCard contentClassName="p-8 text-center">
        <p className="text-2xl text-white font-semibold">今日完成！</p>
        <p className="mt-2 text-white/60">
          本次记住 {learnedThisSession} / {snapshot.length}
        </p>
        <p className="mt-1 text-xs text-white/40">
          刷新页面可以从头再看一遍今天的语法点（已记住/简单标记的状态会保留）
        </p>
      </StudyCard>
    );
  }

  return (
    <StudyCard key={index} className="slide-transition" contentClassName="p-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-white/40">
          第 {index + 1} / {snapshot.length} 条{isPending && <span className="ml-2 text-white/25">保存中…</span>}
        </p>
        <div className="flex items-center gap-2">
          {current.lesson && <span className="text-xs text-white/35">{current.lesson}</span>}
          {current.level && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
              {current.level}
            </span>
          )}
          <button
            onClick={handleToggleStar}
            aria-label={currentState?.starred ? "取消星标" : "标记星标"}
            className={`liquid-btn text-xl ${
              currentState?.starred ? "text-amber-400" : "text-white/25 hover:text-white/50"
            }`}
          >
            ★
          </button>
        </div>
      </div>

      <p className="text-center text-3xl font-medium text-white mb-2">{current.pattern}</p>
      <p className="text-center text-lg text-cyan-200 mb-4">{current.meaning_cn}</p>

      {current.connection && (
        <p className="text-sm text-white/55">
          <span className="text-white/35">接续：</span>
          {current.connection}
        </p>
      )}
      {current.usage && (
        <p className="mt-1 text-sm leading-6 text-white/70">
          <span className="text-white/35">用法：</span>
          {current.usage}
        </p>
      )}
      {current.notes && (
        <p className="mt-1 text-sm leading-6 text-amber-200/70">
          <span className="text-amber-200/45">易错：</span>
          {current.notes}
        </p>
      )}
      {current.explanation && !current.usage && (
        <p className="mt-1 text-sm text-white/50">{current.explanation}</p>
      )}

      {(current.examples?.length ? current.examples : current.example ? [current.example] : []).map(
        (example, i) => (
          <div
            key={`${current.id}-example-${i}`}
            className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <Furigana segments={example.segments} className="text-white/85" />
            <p className="mt-1 text-sm text-white/50">{example.cn}</p>
          </div>
        )
      )}

      <div className="mt-6 grid grid-cols-3 gap-2">
        <button
          onClick={goNext}
          className="liquid-btn rounded-lg border border-white/15 hover:border-white/35 text-white/60 py-2 text-sm"
        >
          跳过
        </button>
        <button
          onClick={handleMarkEasy}
          className="liquid-btn rounded-lg border border-white/15 hover:border-white/35 text-white/80 py-2 text-sm"
        >
          简单，不用再学
        </button>
        <button
          onClick={handleMarkLearned}
          className="liquid-btn rounded-lg py-2 text-sm font-medium text-black"
          style={{ backgroundColor: "var(--accent)" }}
        >
          记住了
        </button>
      </div>
    </StudyCard>
  );
}
