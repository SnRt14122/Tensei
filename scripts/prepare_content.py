#!/usr/bin/env python3
"""Normalize the supplied JLPT spreadsheets/PDFs to the content import API shape.

The source files are intentionally kept outside the repository. Running this script
again is safe and produces deterministic JSON payloads under supabase/content/.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Users/snrt/Downloads/N5-N1（词汇+语法）及时转存，避免丢失")
OUT = ROOT / "supabase/content"
OUT.mkdir(parents=True, exist_ok=True)

BANKS = {
    "N1": "00000000-0000-0000-0001-000000000001",
    "N2": "00000000-0000-0000-0001-000000000002",
    "N3-N4": "00000000-0000-0000-0001-000000000003",
}

KANA = set("ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわをんァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヲンーっッゔヴ")

def clean(v) -> str:
    if pd.isna(v):
        return ""
    return re.sub(r"\s+", " ", str(v)).strip()

def segments(surface: str, reading: str):
    # Whole-word furigana is valid for mixed kanji/kana and avoids inventing
    # kana alignment where the source does not provide it.
    if surface and all(ch in KANA or ch.isascii() for ch in surface):
        return [{"text": surface}]
    return [{"text": surface, "kana": reading}]

def classify(pos: str, surface: str, reading: str):
    p = pos.lower()
    # サ変动词：变位算法要求 surface 本身以"する"结尾才能正确算出变形读音
    # （比如"勉強する"去掉词尾"する"再拼接变形后缀）。如果只是词性栏写了"サ変"
    # 但 surface 是裸名词形态（比如"挨拶"、"案内"，词典里是"名词，可加する使用"），
    # 不强行把名词拼成动词形态，保留为普通名词（verb_type=None），避免变位引擎
    # 用错误的裸名词读音算出错误的变形结果。
    if surface.endswith("する") and reading.endswith("する"):
        return "sahen", None
    if any(x in p for x in ("サ変", "サ变", "sahen")):
        return None, None
    if any(x in p for x in ("カ変", "カ变", "kahen")) or surface == "来る":
        return "kahen", None
    if any(x in p for x in ("一段", "上一段", "下一段", "ichidan")):
        return "ichidan", None
    if any(x in p for x in ("五段", "自五", "他五", "godan")):
        return "godan", None
    # な形容词判断放在イ形容词之前：源表词性栏对な形容词标注的是"形動"/"ナ形"/"な形"，
    # 必须先排除掉才能把剩下"含'形'字但不含'動'"的情况安全归为イ形容词。
    if any(x in p for x in ("ナ形", "な形", "形动", "形動")):
        return None, "na"
    # イ形容词判断：源表词性栏里イ形容词往往只写了单字"形"（而不是"イ形/い形/形容詞"
    # 这种完整词），之前的写法要求 p 包含这些完整字符串、方向写反了，永远匹配不上。
    # 这里改成只要 pos 里出现"形"字且不含"動/动"（已在上面排除掉な形容词），就归为イ形容词。
    if p and "形" in p and "動" not in p and "动" not in p:
        return None, "i"
    return None, None

def infer_pos(surface: str, reading: str):
    """Conservative fallback for the N2 sheet, which has no POS column."""
    # 必须 surface 和 reading 都以"する"结尾才判定为サ変动词；只看 reading 会误伤
    # "擦る/刷る"这类读音恰好是"する"的普通五段动词（surface 本身不是"する"结尾）。
    if surface.endswith("する") and reading.endswith("する"):
        return "サ変动词", "sahen", None
    if surface.endswith("い") and reading.endswith("い"):
        return "い形容词", None, "i"
    # A small set of unambiguous irregular/ichidan forms.
    if surface in {"来る", "くる"}:
        return "カ変动词", "kahen", None
    if (surface.endswith("る") and reading.endswith("る") and len(reading) >= 3
            and reading[-2] in "えけせてねへめれげぜでべぺ"):
        return "一段动词", "ichidan", None
    return "名词/其他", None, None

def make_example(surface: str, reading: str, meaning: str):
    kana_only = surface and all(ch in KANA or ch.isascii() for ch in surface)
    head = {"text": surface}
    if not kana_only:
        head["kana"] = reading
    return {"segments": [{"text": "これは"}, head, {"text": "という言葉です。"}],
            "cn": f"这是“{meaning}”这个词。"}

def read_words(path: Path, level: str):
    df = pd.read_excel(path, sheet_name=0, header=None)
    header = next((i for i, row in df.iterrows() if any(clean(x) in {"汉字", "単語"} for x in row)), 2)
    rows = []
    for _, row in df.iloc[header + 1:].iterrows():
        if level == "N2":
            reading, surface, meaning = clean(row.iloc[1]), clean(row.iloc[2]), clean(row.iloc[3])
            pos = ""
        else:
            surface, reading, pos, meaning = (clean(row.iloc[i]) for i in range(4))
        if not reading or not meaning:
            continue
        if not surface:
            surface = reading
        # N2 uses kana as the headword where no kanji is supplied.
        verb_type, adj_type = classify(pos, surface, reading)
        if not pos:
            pos, verb_type, adj_type = infer_pos(surface, reading)
        rows.append({"surface": surface, "reading": reading, "meaning_cn": meaning,
                     "pos": pos or None, "verb_type": verb_type, "adj_type": adj_type,
                     "segments": segments(surface, reading), "example": make_example(surface, reading, meaning)})
    unique = {r["surface"]: r for r in rows}
    return list(unique.values())

def read_patterns_xls(path: Path):
    df = pd.read_excel(path, sheet_name=0, header=None)
    header = next(i for i, row in df.iterrows() if clean(row.iloc[0]) == "序号")
    out = []
    for _, row in df.iloc[header + 1:].iterrows():
        pattern, meaning = clean(row.iloc[5]), clean(row.iloc[6])
        if not pattern or not meaning or pattern == "句型":
            continue
        connection = "；".join(x for x in (clean(row.iloc[i]) for i in range(1, 5)) if x)
        category = ""
        # The category rows precede each block; retain the last one as context.
        out.append({"pattern": pattern, "reading": None, "meaning_cn": meaning,
                    "explanation": connection or "按句型接续规则使用。", "example": {
                        "segments": [{"text": "この文では「"}, {"text": pattern}, {"text": "」を使います。"}],
                        "cn": f"这个句子使用“{pattern}”。"},
                    "level": "N5-N3"})
    return {r["pattern"]: r for r in out}

def pdf_text(path: Path):
    return "\n".join((p.extract_text() or "") for p in PdfReader(path).pages)

def read_patterns_pdf(path: Path, level: str):
    text = pdf_text(path)
    out = {}
    # N1/N2 PDFs have a stable numbered entry heading. Meaning is the Chinese
    # text between the pattern and the connection/example columns.
    pending = None
    for raw in text.splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        # N1 entries put the explanation on the line following the heading.
        if pending:
            if "／" in line or "/" in line:
                meaning = re.split(r"[／/]", line, maxsplit=1)[-1].strip(" 。．")
                meaning = re.split(r"例：|类义形：", meaning)[0].strip()
                if len(meaning) >= 2:
                    out.setdefault(pending, {"pattern": pending, "reading": None,
                                              "meaning_cn": meaning, "explanation": "按句型接续规则使用。",
                                              "example": {"segments": [{"text": "この文では「"}, {"text": pending}, {"text": "」を使います。"}], "cn": f"这个句子使用“{pending}”。"}, "level": level})
                pending = None
                continue
            if len(line) > 120:
                pending = None
        mhead = re.match(r"^\d+(?:-\d+)?\s+(～.+)$", line)
        if mhead:
            rawhead = mhead.group(1).strip()
            # Remove an occasional inline Chinese explanation from the pattern.
            split = re.search(r"[一-龥]", rawhead)
            if split:
                pattern = rawhead[:split.start()].strip()
                inline = rawhead[split.start():]
                meaning = re.split(r"\s+(?:N\+|V\(|动词|体言|连体形|［|例：)", inline)[0].strip(" ：")
                if len(pattern) <= 80 and len(meaning) >= 2:
                    out.setdefault(pattern, {"pattern": pattern, "reading": None,
                                              "meaning_cn": meaning, "explanation": "按句型接续规则使用。",
                                              "example": {"segments": [{"text": "この文では「"}, {"text": pattern}, {"text": "」を使います。"}], "cn": f"这个句子使用“{pattern}”。"}, "level": level})
                    pending = None
                    continue
            else:
                pattern = rawhead
            if len(pattern) <= 80:
                pending = pattern
                continue
        m = re.match(r"^(?:\d+[-、.]?\d*|\d+)\s+(～[^ ]+.*?)\s{2,}(.+)$", line)
        if not m:
            continue
        pattern, rest = m.group(1).strip(), m.group(2).strip()
        if not pattern or len(pattern) > 80:
            continue
        # Stop at the connection/examples columns when present.
        meaning = re.split(r"\s+(?:N\+|V\(|动词|体言|连体形|［|例：)", rest)[0].strip(" ：")
        if len(meaning) < 2:
            continue
        out.setdefault(pattern, {"pattern": pattern, "reading": None,
                                  "meaning_cn": meaning, "explanation": "按句型接续规则使用。",
                                  "example": {"segments": [{"text": "この文では「"}, {"text": pattern}, {"text": "」を使います。"}], "cn": f"这个句子使用“{pattern}”。"}, "level": level})
    return out

def main():
    files = {
        "N2": SOURCE / "日语N2(二级)单词表（4386个）.xls",
        "N3-N4": SOURCE / "日语n3-n4词汇表单词表（2108个）.xls",
        "N1": SOURCE / "日语N1单词表（9186个）.xls",
    }
    counts = {}
    for level, path in files.items():
        rows = read_words(path, level)
        payload = {"bank_id": BANKS[level], "words": rows}
        (OUT / f"words_{level.lower().replace('-', '_')}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        counts[f"words_{level}"] = len(rows)

    syntax = read_patterns_xls(SOURCE / "N5-N3常考句型220句.xls")
    # N1 headings contain a stable slash-delimited Chinese explanation. The N2
    # PDF is a dense multi-column layout; its extracted text interleaves columns,
    # so it is deliberately left for manual curation rather than emitting bad
    # pattern/meaning pairs.
    for level, filename in [("N1", "N1语法超全总结231条.pdf")]:
        syntax.update(read_patterns_pdf(SOURCE / filename, level))
    patterns = list(syntax.values())
    (OUT / "patterns_jlpt_n1_n5.json").write_text(json.dumps({"patterns": patterns}, ensure_ascii=False, indent=2), encoding="utf-8")
    counts["patterns"] = len(patterns)
    (OUT / "manifest.json").write_text(json.dumps({"source": str(SOURCE), "counts": counts,
      "omissions": ["N5/N4 PDF词汇未纳入：PDF无可提取文本；N5-N3句型表已纳入。", "N2语法PDF为多栏布局，文本抽取会串列，未自动导入；请人工校对后再提交。", "句型整体 reading 未自动生成：原始资料没有统一读音标注，保留 null 以免伪造读音。"]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(counts, ensure_ascii=False))

if __name__ == "__main__":
    main()
