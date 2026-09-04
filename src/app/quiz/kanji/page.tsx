import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { KanjiQuizRunner } from "@/components/KanjiQuizRunner";
import { listLearnedWordsWithProgress } from "@/lib/data/words";

export default async function KanjiQuizPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const learnedWords = await listLearnedWordsWithProgress(supabase, user.id);

  return (
    <main className="min-h-screen bg-[#05060a]">
      <NavBar email={user.email} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-white mb-1">汉字记忆检测</h1>
        <p className="text-sm text-white/50 mb-6">
          展示汉字，请输入对应的纯假名读音
        </p>
        <KanjiQuizRunner words={learnedWords} />
      </div>
    </main>
  );
}
