#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
合并分批翻译结果，重写 src/lib/data/lyrics.ts。

用法：python scripts/build_lyrics.py
输入：/tmp/lyrics_work/src.json（原始去重条目）+ /tmp/lyrics_work/cn_*.json（分批译文）
标记 __DROP__ 的条目会被剔除（LRC 占位行、制作署名、中文歌词等）。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LYRICS_TS = ROOT / "src" / "lib" / "data" / "lyrics.ts"
WORK = Path("/tmp/lyrics_work")

src = json.loads((WORK / "src.json").read_text(encoding="utf-8"))

cn = {}
for p in sorted(WORK.glob("cn_*.json")):
    part = json.loads(p.read_text(encoding="utf-8"))
    for k, v in part.items():
        cn[int(k)] = v
    print(f"  载入 {p.name}: {len(part)} 条")

missing = [x["i"] for x in src if x["i"] not in cn]
if missing:
    raise SystemExit(f"缺少译文的条目: {missing[:20]} ... 共 {len(missing)} 条")

KANA = re.compile(r"[぀-ヿ]")
HANGUL = re.compile(r"[가-힯]")
CYRILLIC = re.compile(r"[Ѐ-ӿ]")

kept, dropped = [], []
for x in src:
    t = cn[x["i"]]
    if t == "__DROP__":
        dropped.append((x["jp"], x["source"]))
        continue
    # 质量门禁：中文翻译不得含假名，也不得与原文重复
    if KANA.search(t):
        raise SystemExit(f"译文含假名（伪翻译）: {x['i']} {t!r}")
    if t == x["jp"]:
        raise SystemExit(f"译文与原文重复: {x['i']} {t!r}")
    kept.append({"jp": x["jp"], "cn": t, "source": x["source"]})


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


lines = [
    "/** 从本地网易云音乐 LRC 歌词中整理的随机展示库；每首歌最多摘录三行。 */",
    "",
    "/**",
    " * 2026-09-05 全量重译：原有 588 条（去重后）译文无一合格——169 条是「歌词意境：+原句」",
    " * 占位、82 条译文里混着假名（伪翻译）、456 条译文直接等于原文。现逐条重译。",
    " *",
    " * 剔除规则：",
    " * - LRC 占位行（「纯音乐，请欣赏」「暂无歌词」）",
    " * - 制作署名与版权声明（出品人/监制/混音/乐手/合作邮箱/广告语）",
    " * - 中文歌词：规范禁止「用原文重复充当中文翻译」，中文歌词无法给出不重复的译文",
    " */",
    "export interface LyricLine {",
    "  jp: string;",
    "  cn: string;",
    "  source: string;",
    "}",
    "",
    "export const placeholderLyrics: LyricLine[] = [",
]
for item in kept:
    lines.append(
        f'  {{ jp: "{esc(item["jp"])}", cn: "{esc(item["cn"])}", '
        f'source: "{esc(item["source"])}" }},'
    )
lines.append("];")
lines.append("")
lines.extend(
    [
        "/** 随机取一条歌词；供 LyricShowcase 组件使用。 */",
        "export function pickRandomLyric(): LyricLine {",
        "  const i = Math.floor(Math.random() * placeholderLyrics.length);",
        "  return placeholderLyrics[i];",
        "}",
        "",
    ]
)

LYRICS_TS.write_text("\n".join(lines), encoding="utf-8")

print()
print(f"原始（去重后）: {len(src)} 条")
print(f"保留并翻译    : {len(kept)} 条")
print(f"剔除          : {len(dropped)} 条")
print(f"输出          : {LYRICS_TS}")

import collections

lang = collections.Counter()
for k in kept:
    if KANA.search(k["jp"]):
        lang["日语"] += 1
    elif HANGUL.search(k["jp"]):
        lang["韩语"] += 1
    elif CYRILLIC.search(k["jp"]):
        lang["俄语"] += 1
    else:
        lang["其他（拉丁语系/吟唱）"] += 1
print("语种分布:", dict(lang))
