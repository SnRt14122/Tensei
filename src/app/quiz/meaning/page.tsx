import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { MeaningQuizRunner } from "@/components/MeaningQuizRunner";
import { listLearnedWordsWithProgress } from "@/lib/data/words";

export default async function MeaningQuizPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const learnedWords = await listLearnedWordsWithProgress(supabase, user.id);

  return (
    <main className="min-h-screen bg-[#05060a]">
      <NavBar email={user.email} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-white mb-1">词义检测</h1>
        <p className="text-sm text-white/50 mb-6">
          选择正确的释义，答错的单词会加权并回到记忆页优先复习
        </p>
        <MeaningQuizRunner words={learnedWords} />
      </div>
    </main>
  );
}
