"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { WordBank } from "@/lib/types";

export function BankSelector({
  banks,
  currentBankId,
}: {
  banks: WordBank[];
  currentBankId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(bankId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bank", bankId);
    router.push(`?${params.toString()}`);
  }

  return (
    <select
      value={currentBankId}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-white/15 bg-black/40 text-white px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
    >
      {banks.map((bank) => (
        <option key={bank.id} value={bank.id} className="bg-black">
          {bank.name}
        </option>
      ))}
    </select>
  );
}
