"use client";

// 顶部导航栏（客户端组件，因为要用 usePathname 判断当前 tab 是否激活）
//
// 一级 tab：记忆 / 学习 / 检测 / 记录。
// 之前的"汉字检测""词义检测"两个独立入口合并进"检测"一级 tab，
// 检测内部的四种题型（汉字/词义/动词变位/语法点意义）用二级标签切换，见 /quiz/layout.tsx。

import PillNav from "./PillNav";
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
  const activeHref = links.find(link => pathname === link.href || pathname.startsWith(`${link.href}/`))?.href ?? "/";

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <PillNav items={links} activeHref={activeHref} ease="power2.out" baseColor="#000000" pillColor="#ffffff" hoveredPillTextColor="#ffffff" pillTextColor="#000000" initialLoadAnimation={false} />
        <div className="app-navbar-actions" aria-label="账户操作">
          <ThemeSettingsPanel />
          <SyncButton />
          {email && <span title={email} className="app-navbar-email">{email}</span>}
          <form action={signOut}>
            <button className="text-xs text-white/50 hover:text-white transition-colors">
              退出
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
