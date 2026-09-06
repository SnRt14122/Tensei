"use client";

// 顶部导航栏（客户端组件，因为要用 usePathname 判断当前 tab 是否激活）
//
// 一级 tab：记忆 / 学习 / 检测 / 记录。
// 之前的"汉字检测""词义检测"两个独立入口合并进"检测"一级 tab，
// 检测内部的四种题型（汉字/词义/动词变位/语法点意义）用二级标签切换，见 /quiz/layout.tsx。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { SyncButton } from "@/components/SyncButton";
import { ThemeSettingsPanel } from "@/components/ThemeSettingsPanel";

const links = [
  { href: "/memorize", label: "记忆" },
  { href: "/learn", label: "学习" },
  { href: "/quiz", label: "检测" },
  { href: "/progress", label: "记录" },
];

export function NavBar({ email }: { email?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="主导航" className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex w-full shrink-0 items-center justify-between gap-4 whitespace-nowrap sm:w-auto sm:gap-6">
          <Link href="/" className="text-white font-semibold">
            単語
          </Link>
          {links.map((l) => {
            // 当前路径以这个 tab 的 href 开头就算激活（例如 /quiz/meaning 也算激活"检测"）
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`text-sm transition-colors ${
                  active ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex w-full items-center justify-between gap-4 whitespace-nowrap sm:w-auto">
          <ThemeSettingsPanel />
          <SyncButton />
          {email && <span title={email} className="hidden max-w-48 truncate text-xs text-white/40 md:inline-block">{email}</span>}
          <form action={signOut}>
            <button className="text-xs text-white/50 hover:text-white transition-colors">
              退出
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
