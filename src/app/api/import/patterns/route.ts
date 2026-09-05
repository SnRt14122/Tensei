// 语法点批量导入接口：POST JSON 数组，批量 upsert 到 sentence_patterns 表（表名沿用原来的命名，未改名）。
//
// 请求示例：
//   POST /api/import/patterns
//   Authorization: Bearer <IMPORT_API_SECRET>
//   Content-Type: application/json
//   {
//     "patterns": [
//       {
//         "pattern": "〜てもいいです",
//         "meaning_cn": "表示许可，……也可以",
//         "explanation": "接动词て形，用于请求或给予许可",
//         "level": "N5",
//         "example": {"segments":[...], "cn": "..."}
//       },
//       ...
//     ]
//   }
//
// 幂等性：用 pattern 文本本身作为去重键（数据库里有唯一约束），重复导入会更新而不是产生重复行。

import { NextRequest, NextResponse } from "next/server";
import { checkImportAuth } from "@/lib/importAuth";
import { createAdminClient } from "@/lib/supabase/admin";

interface ImportPatternInput {
  pattern: string;
  reading?: string | null;
  meaning_cn: string;
  explanation?: string | null;
  example?: unknown;
  level?: string | null;
  lesson?: string | null;
  connection?: string | null;
  usage?: string | null;
  notes?: string | null;
  examples?: unknown;
}

interface ImportPatternsBody {
  patterns: ImportPatternInput[];
}

function validatePattern(p: ImportPatternInput, index: number): string | null {
  if (!p.pattern || typeof p.pattern !== "string") return `第 ${index} 条缺少 pattern`;
  if (!p.meaning_cn || typeof p.meaning_cn !== "string") return `第 ${index} 条缺少 meaning_cn`;
  return null;
}

export async function POST(request: NextRequest) {
  const authError = checkImportAuth(request);
  if (authError) return authError;

  let body: ImportPatternsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.patterns) || body.patterns.length === 0) {
    return NextResponse.json({ error: "patterns 必须是非空数组" }, { status: 400 });
  }

  for (let i = 0; i < body.patterns.length; i++) {
    const err = validatePattern(body.patterns[i], i);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const supabase = createAdminClient();

  const rows = body.patterns.map((p) => ({
    pattern: p.pattern,
    reading: p.reading ?? null,
    meaning_cn: p.meaning_cn,
    explanation: p.explanation ?? null,
    example: p.example ?? null,
    level: p.level ?? null,
    lesson: p.lesson ?? null,
    connection: p.connection ?? null,
    usage: p.usage ?? null,
    notes: p.notes ?? null,
    examples: p.examples ?? (p.example ? [p.example] : []),
  }));

  const { data, error } = await supabase
    .from("sentence_patterns")
    .upsert(rows, { onConflict: "pattern" })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: data?.length ?? 0 });
}
