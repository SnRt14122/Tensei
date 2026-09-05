import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PatternCardRunner } from "@/components/PatternCardRunner";
import {
  getUserPatternProgress,
  listSentencePatterns,
  selectDailyPatterns,
} from "@/lib/data/patterns";

// "学习"二级标签之一：语法点记忆。
// 从原来的"一次性网格展示全部语法点"改成参考单词记忆页的"单卡逐个 + 每日约6条"，
// 数据流写法和 /app/memorize/page.tsx 完全对照：查全部语法点 -> 查用户进度 ->
// selectDailyPatterns 选出今天要学的一批 -> 交给 PatternCardRunner 逐条展示。
export default async function LearnPatternPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const patterns = await listSentencePatterns(supabase);
  const progressMap = await getUserPatternProgress(supabase, user.id);
  const dailyPatterns = selectDailyPatterns(patterns, progressMap, user.id, 6);

  return (
    <section>
      <h1 className="text-xl font-semibold text-white mb-1">语法点记忆</h1>
      <p className="text-sm text-white/50 mb-6">
        常用语法点的含义与用法，每日约6条，内容由后端导入接口维护
      </p>
      <PatternCardRunner patterns={dailyPatterns} />
    </section>
  );
}
