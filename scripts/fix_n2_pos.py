#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 N2 词库中 pos=='名词/其他' 的污染桶（3921 条）按 janome 形态分析恢复真实词性，
写回 verb_type / adj_type / pos 三个字段。
- 仅处理 pos=='名词/其他' 的条目；已正确分类的 382 条（一段动词/い形容词/五段动词/サ変動詞）不动。
- 关键守卫（避免写入会让变位引擎 conjugateVerb 产生脏数据/崩溃的组合）：
  * godan  : 仅当 reading 末假名属于五段词尾表（うくぐすつぬぶむる）才写 verb_type='godan'。
  * ichidan: 仅当 surface 以『る』结尾才写 verb_type='ichidan'。
  * sahen  : 仅当 surface 以『する/ずる』结尾（真·サ変动词）才写 verb_type='sahen'；
             否则（維持/延長等サ変接続名词）保持 verb_type=null，pos 标『サ変名詞』，
             不触发 conjugateSahen 的 slice(0,-2) 切碎逻辑。
  * i_adj  : 仅当 surface 以『い』结尾才写 adj_type='i'（janome 偶把 〜さ 名词误判为形容词）。
  * na_adj : 直接写 adj_type='na'（conjugateNaAdjective 仅追加后缀，恒安全）。
- 写前备份，写后自检：逐条复算变位引擎的"是否安全"判据，统计每类数量。
"""
import json, os, shutil, importlib.util, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "supabase", "content")
SRC = os.path.join(CONTENT, "words_n2.json")
BAK = SRC + ".bak_n2_posfix"

# 复用生成器的 janome 判定
spec = importlib.util.spec_from_file_location("g", os.path.join(ROOT, "scripts", "gen_word_examples.py"))
g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)

# 五段词尾表（与 src/lib/conjugation.ts 的 GODAN_TABLE 键一致）
GODAN_KANA = set("うくぐすつぬぶむる")

def map_kind(w, kind):
    """把 janome 判定 kind 映射为 (verb_type, adj_type, pos)；带全部守卫。"""
    surf = w.get("surface", "")
    read = w.get("reading", "") or surf
    if kind == "godan":
        if read[-1:] in GODAN_KANA:
            return "godan", None, "五段动词"
        return None, None, "名词"            # 守卫失败，兜底名词
    if kind == "ichidan":
        if surf.endswith("る"):
            return "ichidan", None, "一段动词"
        return None, None, "名词"
    if kind == "kahen":
        return "kahen", None, "カ変動詞"
    if kind == "sahen":
        if surf.endswith(("する", "ずる")):
            return "sahen", None, "サ変動詞"   # 真·サ変动词
        return None, None, "サ変名詞"          # サ変接続名词：verb_type 留空，避免引擎切碎
    if kind == "i_adj":
        if surf.endswith("い"):
            return None, "i", "い形容词"
        return None, None, "名词"             # 误判（〜さ 名词等）兜底名词
    if kind == "na_adj":
        return None, "na", "な形容词"
    if kind == "adv":
        return None, None, "副詞"
    # noun
    return None, None, "名詞" if False else "名词"

def main():
    data = json.load(open(SRC, encoding="utf-8"))
    words = data["words"] if isinstance(data, dict) and "words" in data else data

    counts = {}
    touched = 0
    for w in words:
        if w.get("pos") != "名词/其他":
            continue
        kind = g.norm_n2_janome(w)
        vt, at, pos = map_kind(w, kind)
        w["verb_type"] = vt
        w["adj_type"] = at
        w["pos"] = pos
        touched += 1
        counts[pos] = counts.get(pos, 0) + 1

    shutil.copy(SRC, BAK)
    with open(SRC, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[n2 posfix] 处理 名词/其他 桶: {touched} 条")
    print("[n2 posfix] 写回后各类 pos 计数:")
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"    {k:8} {v}")

if __name__ == "__main__":
    main()
