// 词库批量导入接口：POST JSON 数组，批量 upsert 到 words 表。
//
// 请求示例：
//   POST /api/import/words
//   Authorization: Bearer <IMPORT_API_SECRET>
//   Content-Type: application/json
//   {
//     "bank_id": "00000000-0000-0000-0000-000000000001",
//     "words": [
//       {
//         "surface": "話す", "reading": "はなす", "meaning_cn": "说话",
//         "pos": "动词", "verb_type": "godan",
//         "segments": [{"text":"話","kana":"はな"},{"text":"す"}],
//         "example": {"segments":[...], "cn": "..."}
//       },
//       ...
//     ]
//   }
//
// 幂等性：用 (bank_id, surface) 作为去重键——同一个词库里 surface 相同的词视为同一条，
// 重复导入会更新而不是产生重复行（这样脚本可以反复跑同一份数据而不用担心重复）。

import { NextRequest, NextResponse } from "next/server";
import { checkImportAuth } from "@/lib/importAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdjType, VerbType } from "@/lib/types";

const VALID_VERB_TYPES: VerbType[] = ["godan", "ichidan", "kahen", "sahen"];
const VALID_ADJ_TYPES: AdjType[] = ["i", "na"];

interface ImportWordInput {
  surface: string;
  reading: string;
  meaning_cn: string;
  pos?: string | null;
  verb_type?: VerbType | null;
  adj_type?: AdjType | null;
  segments?: unknown;
  example?: unknown;
}

interface ImportWordsBody {
  bank_id: string;
  words: ImportWordInput[];
}

/** 校验单条单词数据的必填字段和枚举取值，返回错误信息（无错误则返回 null） */
function validateWord(w: ImportWordInput, index: number): string | null {
  if (!w.surface || typeof w.surface !== "string") return `第 ${index} 条缺少 surface`;
  if (!w.reading || typeof w.reading !== "string") return `第 ${index} 条缺少 reading`;
  if (!w.meaning_cn || typeof w.meaning_cn !== "string") return `第 ${index} 条缺少 meaning_cn`;
  if (w.verb_type != null && !VALID_VERB_TYPES.includes(w.verb_type)) {
    return `第 ${index} 条 verb_type 取值不合法: ${w.verb_type}`;
  }
  if (w.adj_type != null && !VALID_ADJ_TYPES.includes(w.adj_type)) {
    return `第 ${index} 条 adj_type 取值不合法: ${w.adj_type}`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authError = checkImportAuth(request);
  if (authError) return authError;

  let body: ImportWordsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  if (!body.bank_id || typeof body.bank_id !== "string") {
    return NextResponse.json({ error: "缺少 bank_id" }, { status: 400 });
  }
  if (!Array.isArray(body.words) || body.words.length === 0) {
    return NextResponse.json({ error: "words 必须是非空数组" }, { status: 400 });
  }

  for (let i = 0; i < body.words.length; i++) {
    const err = validateWord(body.words[i], i);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const supabase = createAdminClient();

  const rows = body.words.map((w) => ({
    bank_id: body.bank_id,
    surface: w.surface,
    reading: w.reading,
    meaning_cn: w.meaning_cn,
    pos: w.pos ?? null,
    verb_type: w.verb_type ?? null,
    adj_type: w.adj_type ?? null,
    segments: w.segments ?? [],
    example: w.example ?? null,
  }));

  // 依赖数据库里 (bank_id, surface) 上的唯一约束做 upsert；如果该约束不存在，
  // upsert 会退化成插入新行（不会报错，但会产生重复数据），因此下面额外用迁移里
  // 建的唯一索引来保证幂等——见 0002 迁移追加的 words_bank_surface_key。
  const { data, error } = await supabase
    .from("words")
    .upsert(rows, { onConflict: "bank_id,surface" })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: data?.length ?? 0 });
}
