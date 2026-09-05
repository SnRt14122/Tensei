import { signIn, signInAsGuest, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    // 之前这里写死了 bg-[#05060a] 不透明背景色，会盖住挂在根布局里的
    // AmbientBackground 背景动效层（几何漂浮/极光流动），也不会跟随皮肤设置里的
    // "背景色"选项变化。去掉硬编码背景色，让 body 上的 var(--background) 透出来。
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold text-white mb-1">日语单词记忆</h1>
        <p className="text-sm text-white/50 mb-6">登录或注册以同步你的学习进度</p>

        {params.error && (
          <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {params.error}
          </div>
        )}
        {params.message && (
          <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
            {params.message}
          </div>
        )}

        <form action={signIn} className="space-y-4">
          <div>
            <label className="block text-xs text-white/60 mb-1" htmlFor="email">
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-400/60"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-400/60"
              placeholder="至少 6 位"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition-colors text-black font-medium py-2"
            >
              登录
            </button>
            <button
              type="submit"
              formAction={signUp}
              className="flex-1 rounded-lg border border-white/20 hover:border-white/40 transition-colors text-white font-medium py-2"
            >
              注册
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/30">或</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form action={signInAsGuest} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-lg border border-white/10 hover:border-white/30 transition-colors text-white/70 hover:text-white text-sm py-2"
          >
            以游客身份继续
          </button>
          <p className="mt-2 text-center text-xs text-white/30">
            无需注册，学习进度会保存，但清除浏览器数据或更换设备后无法找回
          </p>
        </form>
      </div>
    </main>
  );
}
