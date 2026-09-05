import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PatternCardRunner } from "@/components/PatternCardRunner";
import { LevelSelector } from "@/components/LevelSelector";
import {
  getUserPatternProgress,
  listPatternLevels,
  listSentencePatterns,
  selectDailyPatterns,
} from "@/lib/data/patterns";

// "学习"二级标签之一：语法点记忆。
// 从原来的"一次性网格展示全部语法点"改成参考单词记忆页的"单卡逐个 + 每日约6条"，
// 数据流写法和 /app/memorize/page.tsx 完全对照：查全部语法点 -> 查用户进度 ->
// selectDailyPatterns 选出今天要学的一批 -> 交给 PatternCardRunner 逐条展示。
//
// 难度筛选（?level=xxx）：写法对照 memorize 页的 ?bank=xxx，语法点没有独立的
// "库"表，难度就是 sentence_patterns.level 字段本身，所以直接从已读出的全部
// 语法点里提炼出出现过的 level 集合（listPatternLevels），不需要单独查表。
export default async function LearnPatternPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const allPatterns = await listSentencePatterns(supabase);
  const levels = listPatternLevels(allPatterns);

  if (levels.length === 0) {
    return (
      <section>
        <h1 className="text-xl font-semibold text-white mb-1">语法点记忆</h1>
        <p className="text-sm text-white/50">
          还没有语法点数据，请先通过 /api/import/patterns 接口导入。
        </p>
      </section>
    );
  }

  const params = await searchParams;
  const currentLevel = params.level && levels.includes(params.level) ? params.level : levels[0];

  const patterns = allPatterns.filter((p) => p.level === currentLevel);
  const progressMap = await getUserPatternProgress(supabase, user.id);
  const dailyPatterns = selectDailyPatterns(patterns, progressMap, user.id, 6);

  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">语法点记忆</h1>
        <LevelSelector levels={levels} currentLevel={currentLevel} />
      </div>
      <p className="text-sm text-white/50 mb-6">
        常用语法点的含义与用法，每日约6条，内容由后端导入接口维护
      </p>
      {/*
       * key={currentLevel}：切换难度时强制重新挂载 PatternCardRunner，重置它内部
       * 冻结的"今日语法点顺序"和已翻到第几条的进度，理由和 MemoryCardRunner
       * 切换词库时 key={bankId} 完全一致。
       */}
      <PatternCardRunner key={currentLevel} patterns={dailyPatterns} />
    </section>
  );
}
