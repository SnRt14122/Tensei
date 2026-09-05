"use client";

// "检测"一级 tab 下的二级标签，四种检测题型共用同一套导航样式。
// 用 usePathname 判断当前激活哪个子路由，纯客户端组件，不涉及数据请求。

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/quiz/kanji", label: "汉字" },
  { href: "/quiz/meaning", label: "词义" },
  { href: "/quiz/conjugation", label: "动词/形容词变位" },
  { href: "/quiz/pattern", label: "句型意义" },
];

export function QuizTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`liquid-btn whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${
              active
                ? "text-black font-medium"
                : "border border-white/15 text-white/60 hover:border-white/35 hover:text-white"
            }`}
            style={active ? { backgroundColor: "var(--accent)" } : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
