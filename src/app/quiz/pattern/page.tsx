import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PatternQuizRunner } from "@/components/PatternQuizRunner";
import { LevelSelector } from "@/components/LevelSelector";
import { listPatternLevels, listSentencePatterns } from "@/lib/data/patterns";

// 语法点意义检测也按难度筛选，写法和 /learn/pattern 页完全对照：
// 先读全部语法点提炼出 level 选项，再按当前选中的 level 过滤后交给检测组件。
export default async function PatternQuizPage({
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
      <p className="text-white/50">
        还没有语法点数据，请先通过 /api/import/patterns 接口导入。
      </p>
    );
  }

  const params = await searchParams;
  const currentLevel = params.level && levels.includes(params.level) ? params.level : levels[0];
  const patterns = allPatterns.filter((p) => p.level === currentLevel);

  return (
    <>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">语法点意义检测</h1>
        <LevelSelector levels={levels} currentLevel={currentLevel} />
      </div>
      <p className="text-sm text-white/50 mb-6">
        选择该语法点正确的中文含义
      </p>
      {/* key={currentLevel}：切换难度时重新生成题目顺序和选项，避免沿用上一个难度的旧题 */}
      <PatternQuizRunner key={currentLevel} patterns={patterns} />
    </>
  );
}
