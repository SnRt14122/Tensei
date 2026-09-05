#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为 N2 / N1 词汇文件生成「词性感知」的自然日语例句 + 中文翻译。
- 仅覆盖当前仍为垃圾模板句（5 个废模板正则）或缺失 example 的条目；
  已存在的非模板好例句一律保留。
- 动词按 reading 末假名正确活用（五段/一段/サ変/カ変）。
- 中文翻译由 meaning_cn 提取首义，匹配所生成句式。
用法: python3 scripts/gen_word_examples.py [n2|n1|all]
"""
import json, re, os, sys, hashlib, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "supabase", "content")

# 5 个前任脚本产出的废模板
TEMPL = re.compile(r'店で|毎朝、私は|この場所は|ニュースでは|会議で')

GODAN_ROW = {'く':'き','ぐ':'ぎ','ぶ':'び','む':'み','ぬ':'に','つ':'ち','る':'り','う':'い','す':'し','ふ':'ひ'}

def godan_masu(surf, read):
    last = read[-1]
    if last in GODAN_ROW:
        return surf[:-1] + GODAN_ROW[last] + 'ます'
    return surf + 'ます'

def ichidan_masu(surf):
    return surf[:-1] + 'ます'

def sahen_masu(surf, read):
    if read.endswith('ずる'):
        return surf[:-2] + 'ずます'
    if read.endswith('する'):
        return surf[:-2] + 'します'
    return surf + 'します'

def kahen_masu(surf, read):
    return '来ます' if ('来' in surf or read.startswith('き')) else surf + 'ます'

def first_variant(s):
    """surface / meaning 可能含异体：遭う，遇う / 写、画 / 慈爱、（对异性的）爱情。取首选。"""
    if not s:
        return ""
    s = re.split(r'[，,、/｜|]', s)[0]
    return s.strip()

def cn_word(mean):
    """从词典释义里取首个中文词义，去掉括号与分隔符。"""
    if not mean:
        return ""
    mean = re.sub(r'[（(].*?[）)]', '', mean)      # 去括号内容
    for sep in ['、', '，', ',', '；', ';', '/', '｜', '|', '・', '等', '：', '─', '~', '～', '·', '…']:
        mean = mean.split(sep)[0]
    mean = mean.strip(' 。.，,（）()「」『』（）　 ')
    return mean[:16]

def fallback(kind):
    return {"noun": "它", "i_adj": "这样", "na_adj": "这样", "adv": "那样", "verb": "做"}[kind]

def norm_n2(w):
    pos = w.get('pos', ''); vt = w.get('verb_type'); at = w.get('adj_type')
    if at == 'i': return 'i_adj'
    if vt in ('ichidan', 'godan', 'sahen', 'kahen'): return vt
    if '動' in pos or '动词' in pos:
        if '五' in pos: return 'godan'
        if '一' in pos: return 'ichidan'
        if 'サ' in pos: return 'sahen'
        return 'godan'
    if '形容' in pos:
        return 'i_adj' if 'い' in pos else 'na_adj'
    return 'noun'

def norm_n1(w):
    pos = w.get('pos', ''); vt = w.get('verb_type'); at = w.get('adj_type')
    if '名' in pos:                       # 名/名，サ変/名，形動/名，副 → 以名词为主，最安全
        if at == 'na' or '形動' in pos: return 'na_adj'
        return 'noun'
    if at == 'i': return 'i_adj'
    if at == 'na': return 'na_adj'
    if vt in ('godan', 'ichidan', 'sahen', 'kahen'): return vt
    if '五' in pos: return 'godan'
    if '下一' in pos: return 'ichidan'
    if 'サ変' in pos: return 'sahen'
    if 'カ変' in pos or '来' in pos: return 'kahen'
    if '形動' in pos: return 'na_adj'
    if pos.strip() == '形': return 'i_adj'
    if '副' in pos: return 'adv'
    return 'noun'

# ---------- N2 词性恢复（janome 形态分析，解决 名词/其他 桶的词性污染）----------
_JT = None
def _get_janome():
    global _JT
    if _JT is not None:
        return _JT
    try:
        from janome.tokenizer import Tokenizer
        _JT = Tokenizer()
    except Exception:
        _JT = False
    return _JT

def norm_n2_janome(w):
    """用 janome 对 surface 做形态判定，恢复真实词性；失败回退到原 norm_n2。"""
    jt = _get_janome()
    surf = w.get('surface', '')
    if not jt or not surf:
        return norm_n2(w)
    try:
        toks = list(jt.tokenize(surf))
    except Exception:
        return norm_n2(w)
    if not toks:
        return norm_n2(w)
    tk = next((t for t in toks if t.surface == surf), toks[0])
    pos = tk.part_of_speech or ''
    infl = tk.infl_type or ''
    if pos.startswith('動詞'):
        if '一段' in infl: return 'ichidan'
        if 'サ変' in infl: return 'sahen'
        if 'カ変' in infl: return 'kahen'
        return 'godan'
    if pos.startswith('形容詞'):
        return 'i_adj'
    if pos.startswith('名詞'):
        if '形容動詞語幹' in pos: return 'na_adj'
        if 'サ変接続' in pos: return 'sahen'      # サ変名詞按サ変动词生成，更自然
        return 'noun'
    if pos.startswith('副詞'):
        return 'adv'
    return norm_n2(w)                            # 未知語/助詞等 → 回退

# ---------- 模板池 ----------
NOUN_PAT = [
    ("{s}は大切です。", "{c}很重要。"),
    ("私は{s}が好きです。", "我喜欢{c}。"),
    ("{s}があります。", "有{c}。"),
    ("{s}は役に立ちます。", "{c}很有用。"),
    ("その{s}は有名です。", "那个{c}很有名。"),
    ("両親に{s}をもらいました。", "我从父母那里得到了{c}。"),
    ("昨日、{s}について話しました。", "昨天聊了关于{c}的事。"),
    ("{s}を使ってください。", "请使用{c}。"),
    ("{s}は必要です。", "{c}是必要的。"),
    ("私は{s}を考えています。", "我在考虑{c}。"),
]
VERB_PAT = [
    ("私は毎日{m}。", "我每天{c}。"),
    ("彼は{m}。", "他{c}。"),
    # 注意：{m} 已含「ます」，此处只能接词干 {ms} + 「ませんか」，
    # 否则会拼成「食べますませんか」这种错误活用（曾是一个 bug）。
    ("一緒に{ms}ませんか。", "要一起{c}吗？"),
    ("昨日、{mp}。", "昨天{c}了。"),
    ("{d}のが好きです。", "喜欢{c}。"),
    ("あした{d}つもりです。", "明天打算{c}。"),
    ("友達と{d}。", "和朋友{c}。"),
    ("{d}時に気をつけてください。", "{c}时请注意。"),
]
IADJ_PAT = [
    ("これは{s}です。", "这很{c}。"),
    ("{s}くて、気持ちがいいです。", "很{c}，心情好。"),
    ("昨日は{s}でした。", "昨天很{c}。"),
    ("あの人は{s}ですね。", "那个人很{c}呢。"),
    ("{stem}すぎることもあります。", "有时候太{c}。"),
    ("もっと{stem}かったらいいのに。", "要是更{c}就好了。"),
]
NADJ_PAT = [
    ("彼は{s}な人です。", "他是{c}的人。"),
    ("その場所は{s}です。", "那个地方很{c}。"),
    ("{s}な気持ちになります。", "感到{c}。"),
    ("{s}な計画を立てました。", "制定了{c}的计划。"),
    ("それは{s}ですね。", "那是{c}呢。"),
    ("とても{s}な日でした。", "是非常{c}的一天。"),
]
ADV_PAT = [
    ("{s}話します。", "{c}地说。"),
    ("{s}歩きます。", "{c}地走。"),
    ("{s}食べます。", "{c}地吃。"),
    ("{s}考えます。", "{c}地想。"),
]

def pick(pats, key):
    h = int(hashlib.md5(key.encode('utf-8')).hexdigest(), 16)
    return pats[h % len(pats)]

def build_example(w, kind):
    surf = first_variant(w.get('surface', ''))
    read = w.get('reading', '') or surf
    is_verb = kind in ('godan', 'ichidan', 'sahen', 'kahen')
    c = cn_word(w.get('meaning_cn', '')) or fallback('verb' if is_verb else kind)
    if kind == 'noun':
        # 名・サ変 名词去掉词尾 する/ずる，使名词句式更自然（委託する→委託は）
        ns = surf[:-2] if surf.endswith(('する', 'ずる')) else surf
        jp, cn = pick(NOUN_PAT, surf)
        return jp.format(s=ns), cn.format(c=c)
    if kind == 'i_adj':
        stem = surf[:-1] if surf.endswith('い') else surf
        jp, cn = pick(IADJ_PAT, surf)
        return jp.format(s=surf, stem=stem), cn.format(c=c)
    if kind == 'na_adj':
        jp, cn = pick(NADJ_PAT, surf)
        return jp.format(s=surf), cn.format(c=c)
    if kind == 'adv':
        jp, cn = pick(ADV_PAT, surf)
        return jp.format(s=surf), cn.format(c=c)
    # verbs
    # d = 辞书形（用于「友達とXXX。」「XXXのが好きです。」等直接接词典形的模板）
    #   サ変名词的 surface 有两种情况：
    #   - 本身已是「◯◯する/ずる」（如 達する）→ d 直接用 surf
    #   - 只是裸名词（如 延長/暗記，pos=サ変名詞）→ 辞书形需补上「する」，
    #     否则会生成「あした延長つもりです」这种缺动词的错句（曾是一个 bug）。
    if kind == 'godan':
        m = godan_masu(surf, read); mp = godan_masu(surf, read)[:-2] + 'ました'
        d = surf
    elif kind == 'ichidan':
        m = ichidan_masu(surf); mp = ichidan_masu(surf)[:-2] + 'ました'
        d = surf
    elif kind == 'sahen':
        m = sahen_masu(surf, read); mp = sahen_masu(surf, read)[:-2] + 'ました'
        d = surf if surf.endswith(('する', 'ずる')) else surf + 'する'
    else:
        m = kahen_masu(surf, read); mp = '来ました'
        d = surf if surf.endswith('来る') else '来る'
    ms = m[:-2]  # 「ます」去掉后的连用形词干，供「一緒に{ms}ませんか」使用
    jp, cn = pick(VERB_PAT, surf)
    return jp.format(m=m, mp=mp, d=d, ms=ms), cn.format(c=c)

def fix_kizu_pos(words):
    """修复孤立数据错误：「傷」（伤/瑕疵）原始词性被误标为『他下一』（动词），
    实际应为名词，否则会生成不完整的动词句「友達と傷。」。"""
    fixed = 0
    for w in words:
        if w.get('surface') == '傷' and w.get('reading') == 'きず' and w.get('pos') == '他下一':
            w['pos'] = '名'
            fixed += 1
    return fixed

# 上线前复查发现的两个模板 bug 的特征正则，用于定位需要「强制重新生成」的旧条目
# （这些条目当时不是「模板残留」TEMPL，而是本脚本自身生成逻辑的 bug，
#  所以旧的 process() 不会重新处理它们，需要单独识别并强制重跑一次）
BUG_MASENKA = re.compile(r'ますませんか')
BUG_NODESURU_PATS = [
    re.compile(r'^友達と(.+)。$'),
    re.compile(r'^(.+)のが好きです。$'),
    re.compile(r'^あした(.+)つもりです。$'),
    re.compile(r'^(.+)時に気をつけてください。$'),
]
U_ROW = set("うくぐすずつぬふぶむるぅ")

def has_bug(jp, pos):
    if BUG_MASENKA.search(jp):
        return True
    if 'サ変' in pos:  # サ変名词裸词干缺する的 bug 只发生在サ変名词身上
        for pat in BUG_NODESURU_PATS:
            m = pat.match(jp)
            if m and m.group(1) and m.group(1)[-1] not in U_ROW:
                return True
    return False

def process(level):
    fn = f"words_{level}.json"
    path = os.path.join(CONTENT, fn)
    bak = path + f".bak_{level}_gen"
    data = json.load(open(path, encoding='utf-8'))
    words = data['words'] if isinstance(data, dict) and 'words' in data else data
    norm = norm_n2_janome if level == 'n2' else norm_n1

    kizu_fixed = fix_kizu_pos(words)

    gen_count = 0
    preserve = 0
    bug_fixed = 0
    for i, w in enumerate(words):
        ex = w.get('example') or {}
        seg = "".join(s.get('text', '') for s in ex.get('segments', []))
        pos = w.get('pos', '') or ''
        if seg and not TEMPL.search(seg) and not has_bug(seg, pos):
            preserve += 1
            continue  # 已有好例句，保留
        kind = norm(w)
        jp, cn = build_example(w, kind)
        w['example'] = {"segments": [{"text": jp}], "cn": cn}
        if seg and not TEMPL.search(seg):
            bug_fixed += 1  # 属于本次修复的 bug 条目，非模板残留
        else:
            gen_count += 1

    shutil.copy(path, bak)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 质检：模板残留、缺失、以及两个已知 bug 是否清零
    residue = sum(1 for w in words if TEMPL.search("".join(s.get('text', '') for s in (w.get('example') or {}).get('segments', []))))
    missing = sum(1 for w in words if not (w.get('example') or {}).get('segments'))
    remaining_bugs = sum(1 for w in words if has_bug("".join(s.get('text', '') for s in (w.get('example') or {}).get('segments', [])), w.get('pos','') or ''))
    print(f"[{level}] total={len(words)} generated={gen_count} bug_fixed={bug_fixed} kizu_pos_fixed={kizu_fixed} preserved={preserve} | template_residue={residue} missing={missing} remaining_bugs={remaining_bugs}")
    print(f"        backup -> {os.path.basename(bak)}")
    return residue == 0 and missing == 0 and remaining_bugs == 0

def main():
    levels = sys.argv[1:] or ['all']
    if 'all' in levels:
        levels = ['n2', 'n1']
    ok = True
    for lv in levels:
        ok = process(lv) and ok
    print("ALL GREEN ✅" if ok else "ISSUES ❌")

if __name__ == '__main__':
    main()
