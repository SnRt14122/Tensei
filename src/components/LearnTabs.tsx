"use client";

// "学习"一级 tab 下的二级标签：变位教程 / 语法点记忆，两块内容形态差异较大
// （一个是固定6卡片的静态教程，一个是数据库驱动的单卡逐个学习流），拆成独立路由后
// 用这套二级标签切换，写法和 QuizTabs（/quiz 下的二级标签）完全对照。

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/learn/conjugation", label: "变位教程" },
  { href: "/learn/pattern", label: "语法点记忆" },
];

export function LearnTabs() {
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
