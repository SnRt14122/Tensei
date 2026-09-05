import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LyricShowcase } from "@/components/LyricShowcase";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isLoggedIn = !!data?.user;

  return (
    // 去掉硬编码的 bg-[#05060a]：会盖住根布局里的 AmbientBackground 背景动效层，
    // 也不会跟随皮肤设置里的"背景色"选项变化，让 body 上的 var(--background) 透出来即可。
    <main className="relative min-h-screen overflow-hidden">
      {/* 通用的几何漂浮/极光流动背景已经挂在根布局（AmbientBackground，见 src/app/layout.tsx），
          所有页面共用，不需要在这里重复渲染。这里只保留首页专属的静态渐变叠加层，
          给首页增加一点额外的视觉层次。 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(var(--accent-rgb),0.12),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(168,85,247,0.12),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        {/* 文字错峰入场：每个元素的 --stagger-index 决定它延迟多久开始浮现 */}
        <p
          className="stagger-in text-xs uppercase tracking-[0.25em] text-white/40"
          style={{ "--stagger-index": 0 } as React.CSSProperties}
        >
          Word Memory
        </p>
        <h1
          className="stagger-in mt-4 font-jp text-5xl sm:text-6xl font-medium text-white"
          style={{ "--stagger-index": 1 } as React.CSSProperties}
        >
          単語
        </h1>
        <p
          className="stagger-in mt-3 max-w-md text-white/55"
          style={{ "--stagger-index": 2 } as React.CSSProperties}
        >
          用振假名、例句和检测，把日语单词真正记进脑子里
        </p>

        <div className="mt-10 w-full max-w-lg">
          <LyricShowcase />
        </div>

        <div
          className="stagger-in mt-10 flex gap-4"
          style={{ "--stagger-index": 3 } as React.CSSProperties}
        >
          <Link
            href={isLoggedIn ? "/memorize" : "/login"}
            className="liquid-btn rounded-full px-8 py-3 text-sm font-medium text-black"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {isLoggedIn ? "开始记忆" : "登录 / 注册"}
          </Link>
          {isLoggedIn && (
            <Link
              href="/quiz"
              className="liquid-btn rounded-full border border-white/20 hover:border-white/40 px-8 py-3 text-sm font-medium text-white"
            >
              去检测
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
