import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KanjiQuizRunner } from "@/components/KanjiQuizRunner";
import { listLearnedWordsWithProgress } from "@/lib/data/words";

// 外层的登录校验 + NavBar + QuizTabs 已经提到 src/app/quiz/layout.tsx 里，
// 这个页面只需要专注于"汉字检测"本身的数据获取和展示。
export default async function KanjiQuizPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  // layout.tsx 已经做过一次登录校验，理论上这里不会触发，但保留这层判断作为兜底
  // （比起非空断言 + 矛盾的 if 判断，这样写才是真正生效的类型收窄）
  if (!user) redirect("/login");

  const learnedWords = await listLearnedWordsWithProgress(supabase, user.id);

  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-1">汉字记忆检测</h1>
      <p className="text-sm text-white/50 mb-6">
        展示汉字，请输入对应的纯假名读音
      </p>
      <KanjiQuizRunner words={learnedWords} />
    </>
  );
}
