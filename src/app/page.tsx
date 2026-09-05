import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LyricShowcase } from "@/components/LyricShowcase";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isLoggedIn = !!data?.user;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a]">
      {/* 背景几何装饰（drift 模式）+ 极光流动层（aurora 模式，由皮肤设置里的 backgroundEffect 控制显隐） */}
      <div className="pointer-events-none absolute inset-0">
        <div className="shard shard-hex drift absolute -left-16 top-24 h-56 w-56 sm:h-72 sm:w-72" />
        <div className="shard shard-diamond drift absolute right-[-4rem] top-[8rem] h-40 w-40 sm:h-56 sm:w-56" />
        <div className="shard shard-hex drift absolute bottom-[-3rem] left-1/3 h-64 w-64 opacity-70" />
        <div className="aurora-layer" />
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
