"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 记录词义检测结果：
 * - 答对：重置权重为 1，记录最近结果为 correct
 * - 答错：权重 +1（权重越高，之后复习/检测越优先），
 *         并将 learned 置为 false，使其重新回到记忆页作为次日的记忆点
 */
export async function recordMeaningQuizResult(wordId: string, correct: boolean) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("未登录");

  const { data: existing, error: fetchError } = await supabase
    .from("user_word_progress")
    .select("weight")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const currentWeight = existing?.weight ?? 1;

  const { error } = await supabase.from("user_word_progress").upsert(
    {
      user_id: userId,
      word_id: wordId,
      learned: correct ? true : false,
      weight: correct ? 1 : currentWeight + 1,
      last_result: correct ? "correct" : "incorrect",
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,word_id" }
  );
  if (error) throw error;

  revalidatePath("/memorize");
  revalidatePath("/quiz/meaning");
}
