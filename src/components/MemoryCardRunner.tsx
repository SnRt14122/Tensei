"use client";

// 记忆页的"单卡"记忆流：一次只展示今日词库里的一个词，而不是原来的网格铺开。
//
// 交互设计（参考同类项目 nami-console 的抽认卡模式，并结合本项目已有的
// "本地优先"风格做了取舍）：
// - 星标：单纯的持久标记，切换后卡片停留在原地，不自动前进
//   （星标是"我想额外关注这个词"，用户可能想接着看它的例句/继续琢磨，不适合被强行推走）
// - 标记简单：表示"这个词我已经很熟了"，标记后自动跳到下一张——
//   语义上和"记住了"一样是"这张卡片处理完了"，不需要用户再多点一次"下一个"
// - 记住了：主操作，标记为已学并自动跳到下一张
// - 跳过：不改变任何状态，只是移动到下一张（给"暂时不想对这个词做任何标记"的情况用），
//   这个按钮原来的网格 UI 里不需要（网格可以随意跳着看任意一个词），但单卡顺序流
//   如果没有这个按钮，用户在不想点"记住了"或"简单"时就会卡在原地，所以补上。
//
// 关于服务端状态刷新的一个重要处理：markWordLearned/toggleStar/toggleEasy 这几个
// server action 内部都调用了 revalidatePath("/memorize")，这会让父级 Server Component
// 重新渲染并传入新的 words 数组——如果每次都用最新的 prop 重新计算"今日词库"的顺序，
// 会出现"刚标记完一个词，后面的卡片顺序全变了"的诡异体验（因为 selectDailyWords 内部
// 用同一个种子随机数依次消耗，reviewPriority 分组的成员一旦变化，后续洗牌结果就会跟着变）。
// 所以这里故意只在组件首次挂载时用 useState 把 words "冻结"成本次会话的固定顺序，
// 之后父组件重新渲染传入的新 words 一律忽略，只在本地维护每个词的最新学习状态。
import { useMemo, useState, useTransition } from "react";
import { Furigana } from "./Furigana";
import { PitchAccent } from "./PitchAccent";
import { markWordLearned, toggleEasy, toggleStar } from "@/app/memorize/actions";
import { getWordTypeLabel } from "@/lib/conjugation";
import type { WordWithProgress } from "@/lib/types";

/** 单个词在本次会话中的本地状态覆盖（乐观更新，失败时回滚） */
interface LocalOverride {
  learned: boolean;
  starred: boolean;
  easy: boolean;
}

function overrideFromWord(word: WordWithProgress): LocalOverride {
  return {
    learned: word.progress?.learned ?? false,
    starred: word.progress?.starred ?? false,
    easy: word.progress?.easy ?? false,
  };
}

export function MemoryCardRunner({ words }: { words: WordWithProgress[] }) {
  // 冻结本次会话的词序，见文件头注释
  const [snapshot] = useState(words);
  const [index, setIndex] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, LocalOverride>>(() => {
    const map: Record<string, LocalOverride> = {};
    for (const w of snapshot) map[w.id] = overrideFromWord(w);
    return map;
  });
  const [isPending, startTransition] = useTransition();

  const current = snapshot[index];
  const finished = index >= snapshot.length;

  const currentState = current ? overrides[current.id] : undefined;
  const wordTypeLabel = current ? getWordTypeLabel(current) : null;

  // 完成后的统计：本次会话里被标记为"记住了"的数量
  const learnedThisSession = useMemo(
    () => Object.values(overrides).filter((o) => o.learned).length,
    [overrides]
  );

  function patchOverride(wordId: string, patch: Partial<LocalOverride>) {
    setOverrides((prev) => ({ ...prev, [wordId]: { ...prev[wordId], ...patch } }));
  }

  function goNext() {
    setIndex((i) => i + 1);
  }

  function handleMarkLearned() {
    if (!current) return;
    patchOverride(current.id, { learned: true });
    startTransition(() => {
      markWordLearned(current.id).catch(() => patchOverride(current.id, { learned: false }));
    });
    goNext();
  }

  function handleMarkEasy() {
    if (!current) return;
    patchOverride(current.id, { easy: true });
    startTransition(() => {
      toggleEasy(current.id, true).catch(() => patchOverride(current.id, { easy: false }));
    });
    goNext();
  }

  function handleToggleStar() {
    if (!current) return;
    const next = !currentState?.starred;
    patchOverride(current.id, { starred: next });
    startTransition(() => {
      toggleStar(current.id, next).catch(() => patchOverride(current.id, { starred: !next }));
    });
    // 星标不自动前进：用户可能只是想给当前这个词做个记号，接着继续看它
  }

  if (snapshot.length === 0) {
    return <p className="text-white/50">该词库暂无单词。</p>;
  }

  if (finished) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <p className="text-2xl text-white font-semibold">今日完成！</p>
        <p className="mt-2 text-white/60">
          本次记住 {learnedThisSession} / {snapshot.length}
        </p>
        <p className="mt-1 text-xs text-white/40">
          刷新页面可以从头再看一遍今天的词库（已记住/简单标记的状态会保留）
        </p>
      </div>
    );
  }

  return (
    <div key={index} className="glass-panel slide-transition relative rounded-2xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-white/40">
          第 {index + 1} / {snapshot.length} 个{isPending && <span className="ml-2 text-white/25">保存中…</span>}
        </p>
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

      <div className="text-center">
        <Furigana
          segments={current.segments}
          className="text-4xl font-medium text-white leading-relaxed"
        />

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-white/50">
          {current.pos && <span className="rounded-full bg-white/10 px-2 py-0.5">{current.pos}</span>}
          {wordTypeLabel && (
            <span className="rounded-full bg-cyan-400/15 text-cyan-200 px-2 py-0.5">
              {wordTypeLabel}
            </span>
          )}
          <PitchAccent word={current} />
        </div>

        <p className="mt-4 text-lg text-cyan-200">{current.meaning_cn}</p>

        {current.example && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-left">
            <Furigana segments={current.example.segments} className="text-white/85" />
            <p className="mt-1 text-sm text-white/50">{current.example.cn}</p>
          </div>
        )}
      </div>

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
    </div>
  );
}
