"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** 将单词标记为"已学"（记过），若进度记录不存在则创建 */
export async function markWordLearned(wordId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("未登录");

  const { error } = await supabase
    .from("user_word_progress")
    .upsert(
      {
        user_id: userId,
        word_id: wordId,
        learned: true,
        learned_at: new Date().toISOString(),
      },
      { onConflict: "user_id,word_id" }
    );
  if (error) throw error;

  revalidatePath("/memorize");
}

/** 切换单词星标状态 */
export async function toggleStar(wordId: string, starred: boolean) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("未登录");

  const { error } = await supabase
    .from("user_word_progress")
    .upsert(
      { user_id: userId, word_id: wordId, starred },
      { onConflict: "user_id,word_id" }
    );
  if (error) throw error;

  revalidatePath("/memorize");
}
