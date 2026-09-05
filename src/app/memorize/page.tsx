import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { BankSelector } from "@/components/BankSelector";
import { MemoryCardRunner } from "@/components/MemoryCardRunner";
import {
  getUserProgressForBank,
  listWordBanks,
  listWordsForBank,
  selectDailyWords,
} from "@/lib/data/words";

export default async function MemorizePage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const banks = await listWordBanks(supabase);
  if (banks.length === 0) {
    // 去掉硬编码的 bg-[#05060a]：会盖住根布局里的 AmbientBackground 背景动效层
    return (
      <main className="min-h-screen">
        <NavBar email={user.email} />
        <div className="mx-auto max-w-4xl px-4 py-16 text-white/60">
          还没有词库，请先在 Supabase 中导入 supabase/seed 下的种子数据。
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const bankId = params.bank && banks.some((b) => b.id === params.bank)
    ? params.bank
    : banks[0].id;

  const words = await listWordsForBank(supabase, bankId);
  // 改用按词库直接查进度（而不是把词库全部单词 id 拼进 IN 列表），
  // 避免大词库（如 N1 九千多词）触发 Supabase 接口的 URL 长度限制导致 400 报错，
  // 详见 getUserProgressForBank 函数内的注释
  const progressMap = await getUserProgressForBank(supabase, user.id, bankId);
  // 每日词库改为约40个（原来是30个），并改成单卡逐个展示，见 MemoryCardRunner
  const dailyWords = selectDailyWords(words, progressMap, user.id, bankId, 40);

  return (
    <main className="min-h-screen">
      <NavBar email={user.email} />
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-white">今日记忆</h1>
          <BankSelector banks={banks} currentBankId={bankId} />
        </div>

        {/*
         * key={bankId}：切换词库时强制重新挂载 MemoryCardRunner，重置它内部
         * "冻结的今日词库顺序"和已翻到第几个的进度，否则组件会一直沿用第一次
         * 挂载时的旧词库数据（详见 MemoryCardRunner 文件头注释里"为什么要冻结顺序"）。
         */}
        <MemoryCardRunner key={bankId} words={dailyWords} />
      </div>
    </main>
  );
}
