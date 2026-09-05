#!/usr/bin/env python3
"""Replace placeholder word examples with contextual examples in all payloads."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

GODAN_MASU = {
    "う": "います", "く": "きます", "ぐ": "ぎます", "す": "します",
    "つ": "ちます", "ぬ": "にます", "ぶ": "びます", "む": "みます", "る": "ります",
}

def masu(surface, reading, kind):
    if kind == "sahen":
        if surface.endswith("する") and reading.endswith("する"):
            return surface[:-2] + "します", reading[:-2] + "します"
        # Some source sheets list サ変 as a bare nominal stem (e.g. 案内).
        # Keep the lexical stem and add the required する before inflecting.
        return surface + "します", reading + "します"
    if kind == "kahen":
        return "来ます", "きます"
    if kind == "ichidan":
        return surface[:-1] + "ます", reading[:-1] + "ます"
    ending = reading[-1:]
    if ending in GODAN_MASU:
        row = GODAN_MASU[ending]
        kana_stem = reading[:-1] + row
        # Surface kana replacement is best-effort; kanji stems retain their
        # original final character and remain understandable in the example.
        surface_stem = surface[:-1]
        surface_row = {"う":"い", "く":"き", "ぐ":"ぎ", "す":"し", "つ":"ち", "ぬ":"に", "ぶ":"び", "む":"み", "る":"り"}[ending]
        return surface_stem + surface_row + "ます", kana_stem
    return surface, reading

def make_example(w):
    surface, reading = w["surface"], w["reading"]
    meaning = w["meaning_cn"].replace("；", "、")
    pos = (w.get("pos") or "").lower()
    verb = w.get("verb_type")
    if verb:
        jp_surface, jp_reading = masu(surface, reading, verb)
        return {"segments": [{"text": "毎朝、私は"}, {"text": jp_surface, "kana": jp_reading}, {"text": "。"}],
                "cn": f"每天早上，我都会{meaning}。"}
    if w.get("adj_type") == "i":
        return {"segments": [{"text": "この景色は"}, {"text": surface, "kana": reading}, {"text": "です。"}],
                "cn": f"这景色很{meaning}。"}
    if w.get("adj_type") == "na":
        return {"segments": [{"text": "この場所は"}, {"text": surface, "kana": reading}, {"text": "です。"}],
                "cn": f"这个地方很{meaning}。"}
    if "副" in pos or "连词" in pos or "接" in pos:
        return {"segments": [{"text": "ニュースでは、"}, {"text": surface, "kana": reading}, {"text": "と報じられました。"}],
                "cn": f"新闻报道说，{meaning}。"}
    if any(x in meaning for x in ("人", "老师", "学生", "朋友", "医生", "公司")):
        return {"segments": [{"text": "駅で"}, {"text": surface, "kana": reading}, {"text": "に会いました。"}],
                "cn": f"我在车站遇到了{meaning}。"}
    if any(x in meaning for x in ("时间", "期间", "时候", "原因", "方法", "问题", "机会", "经验", "计划")):
        return {"segments": [{"text": "会議で"}, {"text": surface, "kana": reading}, {"text": "について話しました。"}],
                "cn": f"我在会议上谈到了{meaning}。"}
    return {"segments": [{"text": "店で"}, {"text": surface, "kana": reading}, {"text": "を見つけました。"}],
            "cn": f"我在店里找到了{meaning}。"}

def main():
    for path in sorted((ROOT / "supabase/content").glob("words_*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for word in data.get("words", []):
            word["example"] = make_example(word)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(path.name, len(data.get("words", [])))

if __name__ == "__main__":
    main()
