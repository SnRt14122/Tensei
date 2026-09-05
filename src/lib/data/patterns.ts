// 句型数据读取函数（学习页"句型记忆"板块 + "句型意义检测"共用）
//
// 句型内容本身不是这次改动写的（按约定由用户之后通过后端导入接口批量灌入），
// 这里只负责从 sentence_patterns 表读出来，写法和 src/lib/data/words.ts 里的风格保持一致。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SentencePattern } from "@/lib/types";

/** 读取全部句型（按创建时间排序），供学习页展示和检测题抽题使用 */
export async function listSentencePatterns(
  supabase: SupabaseClient
): Promise<SentencePattern[]> {
  const { data, error } = await supabase
    .from("sentence_patterns")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
