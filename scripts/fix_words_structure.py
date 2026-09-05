#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复词汇 payload 里的硬性规范违规（不涉及例句重建，例句另行处理）。

修复项：
  A. reading 必须是完整纯假名 —— 清理 （する）/（だ）/(する)/多读法/汉字残留/乱码
  B. adj_type：纯「形」(い形容词) 补 "i"
  C. verb_type：N2 五段例外动词误标为 ichidan / 缺失
  D. 词形-读音-词义错配（已知白名单）

用法：python scripts/fix_words_structure.py [--apply]
默认 dry-run，加 --apply 才写文件。
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "supabase" / "content"

WORDS = {
    "words_n1": CONTENT / "words_n1.json",
    "words_n2": CONTENT / "words_n2.json",
    "words_n3_n4": CONTENT / "words_n3_n4.json",
}

KANA_ONLY = re.compile(r"^[぀-ヿㇰ-ㇿー々]+$")

# ── A. reading 清理规则 ────────────────────────────────────────────
# 1) 去掉括号标注：いどう（する）→ いどう ／ かいてき（だ）→ かいてき
PAREN = re.compile(r"[(（][^)）]*[)）]")
# 2) 多读法取第一个：ひき、ぴき、びき → ひき ／ あいじゃく,あいちゃく → あいじゃく
SPLIT = re.compile(r"[、,，/／]")
# 3) 显式白名单：无法用规则推导的（乱码、汉字残留、错读）
#    键为 (等级, 词形) —— 必须精确到等级：同一个词形在不同等级里可能只有一份是错的。
#    例：支える 在 N3N4 里完全正确（ささえる/支撑），在 N1、N2 里却错配成 閊える 的音和义。
READING_OVERRIDE = {
    # N1：原始数据损坏或汉字残留
    ("words_n1", "白状する"): "はくじょうする",      # 原值 ｙｔｔｙｙｙする（全角乱码）
    ("words_n1", "検定する"): "けんていする",        # 原值就是汉字本身
    ("words_n1", "愛着"): "あいちゃく",              # 原值 あいじゃく,あいちゃく
    ("words_n1", "後ろ向き"): "うしろむき",          # 原值 うしろ向き
    ("words_n1", "形容動詞"): "けいようどうし",       # 原值 けいよう動詞
    ("words_n1", "所狭し"): "ところせまし",          # 原值 ところ狭し
    ("words_n1", "肌触り"): "はだざわり",            # 原值 はだ触り
    ("words_n1", "破竹の勢い"): "はちくのいきおい",   # 原值 はちくの勢い
    ("words_n1", "ふらり(と)"): "ふらり",            # 原值 ふらり(と)
    ("words_n1", "毛細血管"): "もうさいけっかん",      # 原值 もうさい血管
    ("words_n1", "奴豆腐"): "やっこどうふ",          # 原值 やっこ豆腐
    # N1 / N2：支える 被错配成 閊える（つかえる/堵，塞）的音和义。
    # 注意 N3N4 的 支える 是正确的（ささえる/支撑；抵挡、抵御），不要动。
    ("words_n1", "支える"): "ささえる",
    ("words_n2", "支える"): "ささえる",
}
# 词形-词义错配白名单，同样按 (等级, 词形) 精确定位
MEANING_OVERRIDE = {
    ("words_n1", "支える"): "支撑，支持；抵挡，抵御；维持，担负",
    ("words_n2", "支える"): "支撑，支持；抵挡，抵御；维持，担负",
}
# 源数据词性标错：逃げ足（逃跑速度）被标成「形」，实为名词。
# 这类必须先纠正 pos，否则补 adj_type 会把错标固化成结构化错误。
POS_OVERRIDE = {
    ("words_n1", "逃げ足"): "名",
}

# ── C. N2 五段例外动词 ────────────────────────────────────────────
# 以「る」结尾且る前是い/え段、但实际是五段动词的例外
GODAN_EXCEPTIONS = {
    "湿る", "捻る", "うねる", "返る", "喋る", "しゃべる",
    "限る", "握る", "減る", "帰る", "走る", "知る", "切る",
    "要る", "入る", "練る", "参る", "焦る", "弄る", "嘲る",
    "遮る", "茂る", "蘇る", "毟る", "へたばる", "高ぶる",
}

# ── B. い形容词 ──────────────────────────────────────────────────
I_ADJ_POS = {"形", "形，接尾", "形x", "形，接頭", "形，補助"}


def clean_reading(surface: str, reading: str, level: str = ""):
    """把 reading 规范化为纯假名。返回 (新值, 是否修改)。"""
    if (level, surface) in READING_OVERRIDE:
        new = READING_OVERRIDE[(level, surface)]
        return (new, new != reading)
    if KANA_ONLY.match(reading or ""):
        return (reading, False)
    r = reading or ""
    # 括号里若本身就是假名，说明它是读音标注，取括号内容而不是主体。
    # 例：SF（エスエフ）→ エスエフ，而不是把括号删掉留下 SF。
    for inner in re.findall(r"[(（]([^)）]*)[)）]", r):
        if KANA_ONLY.match(inner.strip()):
            return (inner.strip(), True)
    r = PAREN.sub("", r)          # 去 （する）/（だ）/(する)
    r = SPLIT.split(r)[0]        # 多读法取第一个
    r = r.strip().replace(" ", "").replace("・", "").replace("·", "")
    # 外来语长音符号归一：原文多用半角/全角连字符冒充长音符，デ-タ → データ
    r = re.sub(r"(?<=[ァ-ヶ])\s*[-‐-―−－]\s*(?=[ァ-ヶ])", "ー", r)
    r = r.replace("-", "").replace("－", "")
    r = r.lstrip("~～")           # ~合わせる → あわせる
    # 纯缩写词（无假名可读）给常见拼读
    ABBR = {"IC": "アイシー"}
    if r in ABBR:
        return (ABBR[r], True)
    return (r, r != reading)


def fix_word(w: dict, level: str, log: dict):
    # A. reading
    new_r, changed = clean_reading(w["surface"], w.get("reading", ""), level)
    if changed:
        log["reading"].append((w["surface"], w.get("reading"), new_r))
        w["reading"] = new_r
        # 同步修正 segments 里的 kana
        segs = w.get("segments") or []
        for s in segs:
            if s.get("text") == w["surface"] and s.get("kana"):
                s["kana"] = new_r

    # D. 词义错配
    if (level, w["surface"]) in MEANING_OVERRIDE:
        old = w.get("meaning_cn")
        w["meaning_cn"] = MEANING_OVERRIDE[(level, w["surface"])]
        if old != w["meaning_cn"]:
            log["meaning"].append((w["surface"], old, w["meaning_cn"]))

    # 源数据词性标错（必须先于 adj_type 处理，避免把错标固化成结构化错误）
    if (level, w["surface"]) in POS_OVERRIDE:
        old = w.get("pos")
        w["pos"] = POS_OVERRIDE[(level, w["surface"])]
        if old != w["pos"]:
            log["pos"].append((w["surface"], old, w["pos"]))

    # B. い形容词
    pos = w.get("pos") or ""
    if pos in I_ADJ_POS and not w.get("adj_type") and w["surface"].endswith("い"):
        w["adj_type"] = "i"
        w["verb_type"] = None
        log["adj_i"].append(w["surface"])

    # C. 五段例外动词
    if w["surface"] in GODAN_EXCEPTIONS and w.get("verb_type") != "godan":
        old = w.get("verb_type")
        w["verb_type"] = "godan"
        w["adj_type"] = None
        if level == "words_n2":
            w["pos"] = "五段动词"
        log["verb_godan"].append((w["surface"], old, "godan"))


def main():
    apply = "--apply" in sys.argv
    total = {"reading": [], "meaning": [], "pos": [], "adj_i": [], "verb_godan": []}
    FIXED = {}

    for key, path in WORDS.items():
        data = json.loads(path.read_text(encoding="utf-8"))
        words = data["words"] if isinstance(data, dict) else data
        log = {"reading": [], "meaning": [], "pos": [], "adj_i": [], "verb_godan": []}
        for w in words:
            fix_word(w, key, log)
        FIXED[key] = words
        for k, v in log.items():
            total[k].extend(v)
        print(f"[{key}] {len(words)} 条")
        print(f"    reading 修正 {len(log['reading'])}  "
              f"词义修正 {len(log['meaning'])}  "
f"pos 修正 {len(log['pos'])}  "
              f"adj_type=i 补 {len(log['adj_i'])}  "
              f"verb_type=godan 修 {len(log['verb_godan'])}")
        for s, o, n in log["reading"][:15]:
            print(f"      reading: {s}  {o!r} → {n!r}")
        for s, o, n in log["meaning"]:
            print(f"      meaning: {s}  {o!r} → {n!r}")
        for s, o, n in log["pos"]:
            print(f"      pos:     {s}  {o!r} → {n!r}")
        for s, o, n in log["verb_godan"]:
            print(f"      verb:    {s}  {o} → {n}")
        if apply:
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )

    print()
    print("总计：", {k: len(v) for k, v in total.items()})
    # 残留检查：用内存里已修改的数据，dry-run 也能看到真实结果
    print("\n=== 残留非纯假名 reading ===")
    for key, path in WORDS.items():
        words = FIXED[key]
        bad = [w for w in words if not KANA_ONLY.match(w.get("reading") or "")]
        print(f"  {key}: {len(bad)} 条",
              [(w["surface"], w["reading"]) for w in bad[:10]])

    print("\n" + ("已写入文件。" if apply else "DRY-RUN，未写文件。加 --apply 执行。"))


if __name__ == "__main__":
    main()
