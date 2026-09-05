"use client";

// 语法点的"难度"选择器：写法完全对照 BankSelector（单词记忆页的词库选择器），
// 用 URL 查询参数 ?level=xxx 记住当前选择，切换后由父级 Server Component 重新按
// level 过滤数据——这样刷新页面、分享链接都能保留选中的难度，不用额外存状态。

import { useRouter, useSearchParams } from "next/navigation";

export function LevelSelector({
  levels,
  currentLevel,
}: {
  levels: string[];
  currentLevel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(level: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("level", level);
    router.push(`?${params.toString()}`);
  }

  return (
    <select
      value={currentLevel}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-white/15 bg-black/40 text-white px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
    >
      {levels.map((level) => (
        <option key={level} value={level} className="bg-black">
          {level}
        </option>
      ))}
    </select>
  );
}
