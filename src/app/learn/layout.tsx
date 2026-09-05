import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { LearnTabs } from "@/components/LearnTabs";

// "学习"一级 tab 的共享布局：登录校验 + 导航栏 + 二级标签（LearnTabs），
// 写法和 /quiz/layout.tsx 完全对照。原来 /learn 页里"变位教程"和"语法点记忆"
// 挤在同一页展示，现在拆成 /learn/conjugation、/learn/pattern 两个独立页面。
export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  return (
    // 去掉硬编码的 bg-[#05060a]：会盖住根布局里的 AmbientBackground 背景动效层
    <main className="min-h-screen">
      <NavBar email={user.email} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <LearnTabs />
        {children}
      </div>
    </main>
  );
}
