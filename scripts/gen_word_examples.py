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
    # 「下一」= 下一段动词、「上一」= 上一段动词，日语传统语法术语里的两类一段动词
    # （现代日语教材一般只提"一段动词"，不分上下一段，但一些辞典 pos 标注仍沿用旧称）。
    # 之前只检查了"下一"，导致 68 条"上一"动词（見る/起きる/信じる 等）被误判定漏到
    # 后面的兜底 noun 分支，生成出「見るは大切です」这种不通的句子（曾是一个 bug）。
    # 「一」单独出现（如"自他一"/"他一"）也是"一段动词"的简写形式，
    # 和"下一段"/"上一段"意思一样，只是省略了"下/上"。
    if '下一' in pos or '上一' in pos or (('自一' in pos) or ('他一' in pos)): return 'ichidan'
    if 'サ変' in pos: return 'sahen'
    if 'カ変' in pos or '来' in pos: return 'kahen'
    if '形動' in pos: return 'na_adj'
    if pos.strip() == '形': return 'i_adj'
    if '副' in pos: return 'adv'
    # 代词/连体词/接续词/感叹词/接尾词/接头词/连语/助动词/助词/造语成分等特殊词类，
    # 语法上不能直接套普通名词模板（比如「あらゆる」是连体词，不能被"を"接续当宾语，
    # 「しかし」是接续词，不能被"は/が"当主语），必须单独处理，返回专属类型交给
    # build_example 里的 FUNC_WORD_EXAMPLES 手写例句表处理。
    FUNC_WORD_POS_MARKERS = (
        '代', '連体', '连体', '連語', '接続', '感', '接尾', '接頭', '補助',
        '助動', '助詞', '造語', '連', '接', '動', '数',
    )
    if any(m in pos for m in FUNC_WORD_POS_MARKERS):
        return 'func_word'
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

# ---------- 功能词（代词/连体词/接续词/感叹词/接尾词/接头词/连语/助动词/助词等）----------
# 这些词类语法上各自接续方式完全不同（代词能当主语/宾语，连体词只能修饰后面的名词，
# 接续词只能放句首连接两句话……），不可能用几个通用模板套出自然的句子，
# 所以这里手写每一条的例句，按 (surface, reading) 精确匹配。
# 值是 (日语例句, 中文翻译) 的元组。
FUNC_WORD_EXAMPLES = {
    ("明くる", "あくる"): ("明くる日、彼はまた来た。", "第二天，他又来了。"),
    ("あそこ", "あそこ"): ("あそこに大きな木がある。", "那里有一棵大树。"),
    ("あちこち", "あちこち"): ("あちこちを探したが見つからなかった。", "到处找了也没找到。"),
    ("あっという間に", "あっというまに"): ("あっという間に一時間が過ぎた。", "一转眼一个小时就过去了。"),
    ("貴方", "あなた"): ("あなたの名前は何ですか。", "你叫什么名字？"),
    ("あの", "あの"): ("あの人は誰ですか。", "那个人是谁？"),
    ("あらゆる", "あらゆる"): ("あらゆる手段を試してみた。", "尝试了所有的手段。"),
    ("ありがとう", "ありがとう"): ("手伝ってくれて、ありがとう。", "谢谢你的帮忙。"),
    ("或る", "ある"): ("或る日、彼から手紙が届いた。", "某一天，收到了他的信。"),
    ("或いは", "あるいは"): ("明日、或いは明後日に伺います。", "明天，或者后天去拜访。"),
    ("あれ", "あれ"): ("あれは富士山です。", "那是富士山。"),
    ("何時", "いつ"): ("いつ日本へ行きますか。", "什么时候去日本？"),
    ("以内", "いない"): ("一週間以内に返事をください。", "请在一周以内回复。"),
    ("所謂", "いわゆる"): ("これがいわゆる「バブル経済」だ。", "这就是所谓的“泡沫经济”。"),
    ("大きな", "おおきな"): ("大きな声で話してください。", "请大声说话。"),
    ("及び", "および"): ("名前及び住所を書いてください。", "请写上姓名及地址。"),
    ("拘わらず", "かかわらず"): ("雨にも拘わらず、彼は出かけた。", "尽管下雨，他还是出门了。"),
    ("かたがた", "かたがた"): ("散歩かたがた、買い物をした。", "散步的同时买了东西。"),
    ("且つ", "かつ"): ("安くて、且つ美味しい店を見つけた。", "找到了一家又便宜又好吃的店。"),
    ("がましい", "がましい"): ("彼の言い方は恩着せがましい。", "他的说话方式带着施恩似的口气。"),
    ("下さい", "ください"): ("水を一杯下さい。", "请给我一杯水。"),
    ("下らない", "くだらない"): ("そんな下らない話はやめよう。", "别说那种无聊的话了。"),
    ("けれども", "けれども"): ("行きたいけれども、時間がない。", "想去，但是没有时间。"),
    ("此処", "ここ"): ("ここに座ってください。", "请坐在这里。"),
    ("此方", "こちら"): ("こちらへどうぞ。", "请往这边走。"),
    ("ごっこ", "ごっこ"): ("子供たちは電車ごっこをしている。", "孩子们在玩“过家家开火车”的游戏。"),
    ("如し", "ごとし"): ("光陰矢の如し。", "光阴似箭。"),
    ("この", "この"): ("この本は面白いです。", "这本书很有趣。"),
    ("此れ，是", "これ"): ("これは私の傘です。", "这是我的雨伞。"),
    ("頃", "ごる"): ("ちょうど良い頃に来た。", "来得正是时候。"),
    ("際して", "さいして"): ("結婚に際して、両親に相談した。", "结婚之际，和父母商量了。"),
    ("さよなら", "さよなら"): ("彼に「さよなら」と言った。", "对他说了“再见”。"),
    ("然る", "さる"): ("然る理由があって、彼は断った。", "因为某种理由，他拒绝了。"),
    ("さん", "さん"): ("田中さんはどこにいますか。", "田中先生在哪里？"),
    ("然し，併し", "しかし"): ("行きたい。しかし、お金がない。", "想去。但是，没有钱。"),
    ("しかも", "しかも"): ("安い。しかも、質が良い。", "便宜，而且质量好。"),
    ("従って", "したがって"): ("雨だ。従って、試合は中止だ。", "下雨了，因此比赛取消。"),
    ("了う", "しまう"): ("宿題を全部やってしまった。", "把作业全部做完了。"),
    ("じみる", "じみる"): ("彼の考えは子供じみている。", "他的想法很孩子气。"),
    ("ずくめ", "ずくめ"): ("彼は黒ずくめの服装をしている。", "他穿着一身黑的服装。"),
    ("即ち", "すなわち"): ("彼は父の兄、即ち私の伯父だ。", "他是我父亲的哥哥，也就是我的伯父。"),
    ("其処", "そこ"): ("そこに鍵を置いた。", "把钥匙放在那里了。"),
    ("そこで", "そこで"): ("道が混んでいた。そこで、電車に乗った。", "路上很堵，于是就坐了电车。"),
    ("そして", "そして"): ("宿題をした。そして、寝た。", "做了作业，然后睡了。"),
    ("そちら", "そちら"): ("そちらのご都合はいかがですか。", "您那边方便吗？"),
    ("其の", "その"): ("その本を取ってください。", "请把那本书拿来。"),
    ("それ", "それ"): ("それは私のかばんです。", "那是我的包。"),
    ("それで", "それで"): ("電車が遅れた。それで、遅刻した。", "电车晚了，所以迟到了。"),
    ("大した", "たいした"): ("大した問題ではない。", "不是什么大问题。"),
    ("だらけ", "だらけ"): ("部屋はゴミだらけだった。", "房间里全是垃圾。"),
    ("誰", "だれ"): ("あの人は誰ですか。", "那个人是谁？"),
    ("小さな", "ちいさな"): ("小さな声で話した。", "小声说了话。"),
    ("就いて", "ついて"): ("この件に就いて相談したい。", "想就这件事商量一下。"),
    ("でも", "でも"): ("行きたい。でも、時間がない。", "想去，可是没有时间。"),
    ("当該", "とうがい"): ("当該地域では雨が続いている。", "该地区一直在下雨。"),
    ("何処", "どこ"): ("トイレはどこですか。", "厕所在哪里？"),
    ("ところが", "ところが"): ("晴れると思った。ところが、雨が降った。", "以为会是晴天，然而却下雨了。"),
    ("所狭し", "ところせまし"): ("店内は商品が所狭しと並んでいる。", "店里的商品摆得满满的。"),
    ("ところで", "ところで"): ("ところで、あの件はどうなった？", "对了，那件事怎么样了？"),
    ("年の瀬", "としのせ"): ("年の瀬が近づいてきた。", "年关近了。"),
    ("どちら", "どちら"): ("どちらへ行きますか。", "您去哪里？"),
    ("どっち", "どっち"): ("どっちが好きですか。", "你喜欢哪个？"),
    ("どなた", "どなた"): ("どなたですか。", "请问是哪位？"),
    ("どの", "どの"): ("どの服を買いますか。", "买哪件衣服？"),
    ("何れ", "どれ"): ("どれが一番安いですか。", "哪个最便宜？"),
    ("どれ", "どれ"): ("どれ、見せてもらおうか。", "哎，让我看看吧。"),
    ("どれどれ", "どれどれ"): ("どれどれ、見せてごらん。", "来来，给我看看。"),
    ("とんだ", "とんだ"): ("とんだ災難に遭った。", "遭遇了意外的灾难。"),
    ("どんな", "どんな"): ("どんな music が好きですか。", "你喜欢什么样的音乐？"),
    ("名", "めい"): ("参加者は十名だった。", "参加者有十名。"),
    ("ない", "ない"): ("お金がない。", "没有钱。"),
    ("ながら", "ながら"): ("音楽を聞きながら勉強する。", "一边听音乐一边学习。"),
    ("莫れ，勿れ", "なかれ"): ("初心忘るべからず。", "不要忘记初心。"),
    ("何", "なん"): ("これは何ですか。", "这是什么？"),
    ("生", "なま"): ("生返事をしないでください。", "请不要含糊地回应。"),
    ("並びに", "ならびに"): ("氏名並びに生年月日を記入する。", "填写姓名以及出生年月日。"),
    ("何だって", "なんだって"): ("何だって、そんなことが起きたのか。", "什么，居然发生了那种事？"),
    ("何でもない", "なんでもない"): ("これは何でもないことです。", "这不算什么事。"),
    ("難い，悪い", "にくい"): ("この字は読みにくい。", "这个字很难读。"),
    ("計り知れない", "はかりしれない"): ("彼の努力は計り知れないものだった。", "他的努力是无法估量的。"),
    ("破竹の勢い", "はちくのいきおい"): ("そのチームは破竹の勢いで勝ち進んだ。", "那支队伍以破竹之势连连获胜。"),
    ("反", "はん"): ("反政府デモが起きた。", "发生了反政府示威。"),
    ("一", "ひと"): ("一雨ごとに暖かくなる。", "每下一场雨就暖和一些。"),
    ("不", "ふ"): ("不許可の場合は連絡します。", "不批准的情况下会联系您。"),
    ("覆水盆に返らず", "ふくすいぼんにかえらず"): ("覆水盆に返らず、もう諦めよう。", "覆水难收，还是放弃吧。"),
    ("ぽい", "ぽい"): ("彼女は忘れっぽい人だ。", "她是个健忘的人。"),
    ("放題", "ほうだい"): ("この店は食べ放題だ。", "这家店可以随便吃到饱。"),
    ("僕", "ぼく"): ("僕は学生です。", "我是学生。"),
    ("程", "ほど"): ("彼ほど頑張った人はいない。", "没有比他更努力的人了。"),
    ("ほら", "ほら"): ("ほら、見てごらん。", "瞧，你看看。"),
    ("毎", "まい"): ("毎月一回、集まる。", "每月聚一次。"),
    ("紛れもない", "まぎれもない"): ("これは紛れもない事実だ。", "这是不容置疑的事实。"),
    # 注：词条本身「又な」疑似原始资料的 OCR/录入误差（标准接续词应为「又は」または，
    # 意为"或者"），但这次任务范围是修复例句生成逻辑，不改动词条本身的
    # surface/reading，例句仍按词条现有标注（读作またな）配一句语法通顺的陈述句。
    ("又な", "またな"): ("又な事情があったのかもしれない。", "或许是有别的原因吧。"),
    ("真っ", "まっ"): ("真っ青な空が広がっている。", "湛蓝的天空一片辽阔。"),
    ("塗れ", "まみれ"): ("彼は泥まみれになった。", "他浑身沾满了泥。"),
    ("水入らず", "みずいらず"): ("家族水入らずで過ごした。", "全家人一起度过了没有外人的时光。"),
    ("見ず知らず", "みずしらず"): ("見ず知らずの人に助けられた。", "得到了素不相识的人的帮助。"),
    ("若しくは", "もしくは"): ("鉛筆若しくはボールペンで書いてください。", "请用铅笔或者圆珠笔写。"),
    ("もしもし", "もしもし"): ("もしもし、田中さんですか。", "喂，是田中先生吗？"),
    ("以て", "もって"): ("これを以て終わりとする。", "就此结束。"),
    ("以ての外", "もってのほか"): ("そんな考えは以ての外だ。", "那种想法太荒唐了。"),
    ("やって来る", "やってくる"): ("春がやって来る。", "春天来了。"),
    ("やれやれ", "やれやれ"): ("やれやれ、やっと終わった。", "哎呀，终于结束了。"),
    ("よいしょ", "よいしょ"): ("よいしょと荷物を持ち上げた。", "嘿呦一声把行李抬起来了。"),
    ("ようこそ", "ようこそ"): ("ようこそ、日本へ。", "欢迎来到日本。"),
    ("翌々", "よくよく"): ("翌々日には出発する。", "在第三天出发。"),
    ("よし", "よし"): ("よし、これで決まりだ。", "好，就这么定了。"),
    ("因って", "よって"): ("これに因って問題が解決した。", "因此问题得到了解决。"),
    ("れっきとした", "れっきとした"): ("彼はれっきとした医者だ。", "他是个正儿八经的医生。"),
    ("碌な", "ろくな"): ("碌な返事もしなかった。", "连个正经的回答都没有。"),
    ("我輩", "わがはい"): ("我輩は猫である。", "我乃是猫。"),
    ("わし", "わし"): ("わしはもう年寄りだ。", "我已经是老人了。"),
    ("私", "わたし"): ("私は日本語を勉強しています。", "我在学习日语。"),
    ("わっしょい", "わっしょい"): ("わっしょい、わっしょいと神輿を担いだ。", "喊着“哎哟嘿”抬起了神轿。"),
    ("我等", "われら"): ("我等の使命を果たそう。", "完成我们的使命吧。"),
    ("我々", "われわれ"): ("我々はこの計画に賛成する。", "我们赞成这个计划。"),
}

# 「〜するのが好きです」模板套到擬态词/心理状态类サ変动词上时，语法合法但语义违和
# （比如"ぐったりするのが好きです"=喜欢筋疲力尽、"ぬるぬるするのが好きです"=喜欢
# 黏糊糊的，没有人会这样说），复查时手动挑出 12 条改写成更自然的说法。
# 这里按 (surface, reading) 精确匹配，优先级高于随机挑选的 VERB_PAT 模板。
SAHEN_ODD_LIKING_FIX = {
    ("うっかりする", "うっかりする"): ("うっかりして、鍵を忘れてしまった。", "一不小心把钥匙忘了。"),
    ("ぐったりする", "ぐったりする"): ("暑さでぐったりしてしまった。", "因为太热而累得筋疲力尽。"),
    ("しっかりする", "しっかりする"): ("もっとしっかりしてください。", "请再振作一点。"),
    ("にやにやする", "にやにやする"): ("彼は一人でにやにやしている。", "他一个人在偷笑。"),
    ("ぬるぬるする", "ぬるぬるする"): ("この魚は表面がぬるぬるする。", "这种鱼表面滑溜溜的。"),
    ("はきはきする", "はきはきする"): ("彼女はいつもはきはきしている。", "她说话总是干脆爽快。"),
    ("ひらひらする", "ひらひらする"): ("花びらが風にひらひらする。", "花瓣在风中飘扬。"),
    ("ぶよぶよする", "ぶよぶよする"): ("お腹がぶよぶよしてきた。", "肚子变得松软虚胖了。"),
    ("ぶるぶるする", "ぶるぶるする"): ("寒さで体がぶるぶるする。", "身体因为寒冷而发抖。"),
    ("ぺこぺこする", "ぺこぺこする"): ("お腹がぺこぺこする。", "肚子饿得咕咕叫。"),
    ("べったりする", "べったりする"): ("子供が母親にべったりする。", "孩子紧紧地依附着母亲。"),
    ("わくわくする", "わくわくする"): ("旅行を考えるとわくわくする。", "一想到旅行就心情激动。"),
}

def build_example(w, kind):
    surf = first_variant(w.get('surface', ''))
    read = w.get('reading', '') or surf
    fix_key = (w.get('surface', ''), w.get('reading', ''))
    if fix_key in SAHEN_ODD_LIKING_FIX:
        return SAHEN_ODD_LIKING_FIX[fix_key]
    if kind == 'func_word':
        # func_word 全部走手写例句表，不需要走下面"取首个中文词义"的通用逻辑，
        # 所以单独放在最前面处理，避免 fallback() 字典里没有 'func_word' 这个 key 报错。
        key = (w.get('surface', ''), w.get('reading', ''))
        if key in FUNC_WORD_EXAMPLES:
            return FUNC_WORD_EXAMPLES[key]
        # 万一未来又混入没有手写例句的功能词，退化成中性陈述句而不是硬套名词模板，
        # 至少语法不会错（虽然不生动），并在 stderr 提示需要补写
        c = cn_word(w.get('meaning_cn', '')) or surf
        print(f"[WARN] func_word 缺少手写例句: {key}", file=sys.stderr)
        return f"「{surf}」という言葉がある。", f"有“{c}”这个词。"
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

# 第三批上线前复查发现的 bug：norm_n1() 早期版本没识别"上一段动词"（旧称"上一"，
# 只检查了"下一"）、也没识别代词/连体词/接续词/感叹词/接尾词/接头词/连语/助动词/
# 助词等特殊词类（统统落到兜底 noun 分支），导致这些词被硬套名词模板生成出
# 「あらゆるを考えています」「私は葦を考えています」这类语法错误或读起来生硬的句子。
#
# 判断"是否需要强制重新生成"不用去匹配句子文本猜测（容易漏判/误判），而是直接看
# norm_n1() 现在（修复后）会把这个词分类成什么：只要是 'func_word'，就一定要重新生成
# （因为旧版本永远不可能正确生成 func_word，之前的 example 一定是坑）；
# 'ichidan' 则要看 pos 是否含"上一/自一/他一"——如果含，说明是本次修复才能正确识别的
# 上一段动词，之前旧版本会把它错判成 noun，example 也一定是坑。
def needs_force_regen(w, kind, pos):
    if kind == 'func_word':
        return True
    if kind == 'ichidan' and ('上一' in pos or '自一' in pos or '他一' in pos):
        return True
    # 12 条"のが好きです"套到擬态词/心理状态类サ変动词导致语义违和的词，见
    # SAHEN_ODD_LIKING_FIX：只要在这张表里，就一定要重新生成（换成手写例句）。
    if (w.get('surface', ''), w.get('reading', '')) in SAHEN_ODD_LIKING_FIX:
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
        kind = norm(w)
        force = needs_force_regen(w, kind, pos)
        if seg and not TEMPL.search(seg) and not has_bug(seg, pos) and not force:
            preserve += 1
            continue  # 已有好例句，保留
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
