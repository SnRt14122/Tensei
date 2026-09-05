import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConjugationQuizRunner } from "@/components/ConjugationQuizRunner";
import { listLearnedWordsWithProgress } from "@/lib/data/words";

export default async function ConjugationQuizPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const learnedWords = await listLearnedWordsWithProgress(supabase, user.id);

  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-1">动词/形容词变位检测</h1>
      <p className="text-sm text-white/50 mb-6">
        只给出辞书形和考的变形，不标注振假名，请输入变形后的纯假名读音
      </p>
      <ConjugationQuizRunner words={learnedWords} />
    </>
  );
}
