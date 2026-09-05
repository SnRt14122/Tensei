import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { QuizTabs } from "@/components/QuizTabs";

// "检测"一级 tab 的共享布局：登录校验 + 导航栏 + 二级标签（QuizTabs），
// 四个具体检测页面（kanji/meaning/conjugation/pattern）只需要各自实现题目内容，
// 不用重复写登录校验和外层容器，这也是把四种检测题型"集合在一个检测tab下"的实现方式。
export default async function QuizLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  return (
    // 去掉硬编码的 bg-[#05060a]：会盖住根布局里的 AmbientBackground 背景动效层
    <main className="min-h-screen">
      <NavBar email={user.email} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <QuizTabs />
        {children}
      </div>
    </main>
  );
}
