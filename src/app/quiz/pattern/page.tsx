import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PatternQuizRunner } from "@/components/PatternQuizRunner";
import { listSentencePatterns } from "@/lib/data/patterns";

export default async function PatternQuizPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const patterns = await listSentencePatterns(supabase);

  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-1">句型意义检测</h1>
      <p className="text-sm text-white/50 mb-6">
        选择该句型正确的中文含义
      </p>
      <PatternQuizRunner patterns={patterns} />
    </>
  );
}
