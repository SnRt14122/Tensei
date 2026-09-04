import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LyricShowcase } from "@/components/LyricShowcase";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isLoggedIn = !!data?.user;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a]">
      {/* 背景几何装饰 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="shard shard-hex drift absolute -left-16 top-24 h-56 w-56 sm:h-72 sm:w-72" />
        <div className="shard shard-diamond drift absolute right-[-4rem] top-[8rem] h-40 w-40 sm:h-56 sm:w-56" />
        <div className="shard shard-hex drift absolute bottom-[-3rem] left-1/3 h-64 w-64 opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(103,232,249,0.12),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(168,85,247,0.12),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">
          Word Memory
        </p>
        <h1 className="mt-4 font-jp text-5xl sm:text-6xl font-medium text-white">
          単語
        </h1>
        <p className="mt-3 max-w-md text-white/55">
          用振假名、例句和检测，把日语单词真正记进脑子里
        </p>

        <div className="mt-10 w-full max-w-lg">
          <LyricShowcase />
        </div>

        <div className="mt-10 flex gap-4">
          <Link
            href={isLoggedIn ? "/memorize" : "/login"}
            className="rounded-full bg-cyan-500 hover:bg-cyan-400 transition-colors px-8 py-3 text-sm font-medium text-black"
          >
            {isLoggedIn ? "开始记忆" : "登录 / 注册"}
          </Link>
          {isLoggedIn && (
            <Link
              href="/quiz/meaning"
              className="rounded-full border border-white/20 hover:border-white/40 transition-colors px-8 py-3 text-sm font-medium text-white"
            >
              去检测
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
