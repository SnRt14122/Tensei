import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { VerbConjugationTutorial } from "@/components/VerbConjugationTutorial";
import { PatternLearningSection } from "@/components/PatternLearningSection";
import { listSentencePatterns } from "@/lib/data/patterns";

// "学习"一级 tab：两个板块——动词/形容词变位教程（静态动画组件）+ 句型记忆（读数据库）。
// 按需求，记忆tab只放单词，这里专门存放"讲解型"的学习内容。
export default async function LearnPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const patterns = await listSentencePatterns(supabase);

  return (
    // 去掉硬编码的 bg-[#05060a]：会盖住根布局里的 AmbientBackground 背景动效层，
    // 也不会跟随皮肤设置里的"背景色"选项变化，让 body 上的 var(--background) 透出来即可。
    <main className="min-h-screen">
      <NavBar email={user.email} />
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-12">
        <section>
          <h1 className="text-xl font-semibold text-white mb-1">动词/形容词变位教程</h1>
          <p className="text-sm text-white/50 mb-6">
            按词类分类讲解变形规则，配动画和记忆口诀
          </p>
          <VerbConjugationTutorial />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-1">句型记忆</h2>
          <p className="text-sm text-white/50 mb-6">
            常用句型的含义与用法，内容由后端导入接口维护
          </p>
          <PatternLearningSection patterns={patterns} />
        </section>
      </div>
    </main>
  );
}
