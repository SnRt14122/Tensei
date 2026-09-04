import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { BankSelector } from "@/components/BankSelector";
import { WordCard } from "@/components/WordCard";
import {
  getUserProgressForWords,
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
    return (
      <main className="min-h-screen bg-[#05060a]">
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
  const progressMap = await getUserProgressForWords(
    supabase,
    user.id,
    words.map((w) => w.id)
  );
  const dailyWords = selectDailyWords(words, progressMap, user.id, bankId, 30);

  const learnedCount = dailyWords.filter((w) => w.progress?.learned).length;

  return (
    <main className="min-h-screen bg-[#05060a]">
      <NavBar email={user.email} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">今日记忆</h1>
            <p className="text-sm text-white/50">
              已标记 {learnedCount} / {dailyWords.length}
            </p>
          </div>
          <BankSelector banks={banks} currentBankId={bankId} />
        </div>

        {dailyWords.length === 0 ? (
          <p className="text-white/50">该词库暂无单词。</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {dailyWords.map((word) => (
              <WordCard key={word.id} word={word} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
