// 日语动词/形容词变位规则引擎
//
// 这个文件把"背单词的辞书形，推导出各种变形"这件事写成了纯函数，
// 不依赖数据库和网络请求，答题判分可以完全在浏览器本地完成（这是"检测慢"优化的关键前提之一）。
//
// 日语动词按"变格方式"分三大类，形容词分两类，各自的变形规则完全不同：
//   五段动词 (godan)   —— 词尾假名在 う段五个音（あ/い/う/え/お行）之间切换，例：話す/読む/買う
//   一段动词 (ichidan) —— 词尾固定是「る」，变形时只需去掉る、词干不变，例：食べる/見る
//   カ変动词 (kahen)   —— 只有"来る"一个词，读音本身会变（き/く/こ），必须整词硬编码
//   サ変动词 (sahen)   —— 只有"する"及"〇〇する"复合动词，同样整体硬编码变形后缀
//   い形容词 (i)       —— 词尾"い"本身参与变形，例：忙しい → 忙しくない
//   な形容词 (na)      —— 本质接近名词，靠"だ/です/じゃない"变形，例：簡単 → 簡単じゃない

import type { AdjType, VerbType } from "@/lib/types";

/** 变位结果：同时给出带汉字的写法和纯假名读音（检测题会用到纯假名版本核对答案） */
export interface ConjugationResult {
  surface: string;
  reading: string;
}

/** 参与变位所需的最小单词信息 */
export interface ConjugatableVerb {
  surface: string;
  reading: string;
  verb_type: VerbType;
}

export interface ConjugatableAdjective {
  surface: string;
  reading: string;
  adj_type: AdjType;
}

/** 动词的全部变位形式（辞书形本身不需要变，故不列在内） */
export type VerbForm =
  | "masu" // ます形（礼貌体现在/将来）
  | "nai" // ない形（否定）
  | "nakatta" // なかった形（否定过去）
  | "te" // て形（连接、请求等）
  | "ta" // た形（过去/完了）
  | "potential" // 可能形（能……）
  | "volitional" // 意志形（……吧，表意志/劝诱）
  | "passive" // 被动形（被……）
  | "causative" // 使役形（让/使……）
  | "conditional" // 仮定形・ば形（如果……的话）
  | "imperative"; // 命令形（命令语气，书面/严厉场合）

/** 形容词的全部变位形式（い形容词和な形容词共用这套形式名，具体后缀不同） */
export type AdjForm =
  | "negative" // 否定形（不……）
  | "past" // 过去形（……了，过去时态）
  | "pastNegative" // 否定过去形（（过去）不……）
  | "te" // て形（连接下一句）
  | "conditional" // 仮定形（如果……的话）
  | "politeAffirmative" // 敬体现在（礼貌体，……です）
  | "politePast" // 敬体过去（礼貌体过去）
  | "politeNegative"; // 敬体否定（礼貌体否定）

/**
 * 每种变形的中文名 + 记忆口诀，供"学习"页教程和检测题面板展示用。
 * mnemonic 尽量给一句好记的规则总结，而不是单纯翻译语法术语。
 */
export const VERB_FORM_META: Record<VerbForm, { label: string; mnemonic: string }> = {
  masu: { label: "ます形（礼貌体）", mnemonic: "い段假名 + ます，五段把词尾换成い段，一段去る加ます" },
  nai: { label: "ない形（否定）", mnemonic: "あ段假名 + ない，五段把词尾换成あ段，一段去る加ない" },
  nakatta: { label: "なかった形（否定过去）", mnemonic: "ない形的『い』换成『かった』：〜くない→〜くなかった" },
  te: { label: "て形", mnemonic: "五段按『う/つ/る→って，く/ぐ→いて/いで，む/ぶ/ぬ→んで，す→して』变化，一段去る加て" },
  ta: { label: "た形（过去）", mnemonic: "把て形的『て/で』换成『た/だ』即可，规则完全一致" },
  potential: { label: "可能形（能……）", mnemonic: "五段换成え段+る，一段去る加られる" },
  volitional: { label: "意志形（……吧）", mnemonic: "五段换成お段+う，一段去る加よう" },
  passive: { label: "被动形（被……）", mnemonic: "五段换成あ段+れる，一段去る加られる（和可能形撞形）" },
  causative: { label: "使役形（让/使……）", mnemonic: "五段换成あ段+せる，一段去る加させる" },
  conditional: { label: "仮定形（ば形，如果……）", mnemonic: "五段换成え段+ば，一段去る加れば" },
  imperative: { label: "命令形", mnemonic: "五段换成え段（不加任何词尾），一段去る加ろ" },
};

export const ADJ_FORM_META: Record<AdjForm, { label: string; mnemonic: string }> = {
  negative: { label: "否定形", mnemonic: "い形容词去い加くない；な形容词直接加じゃない" },
  past: { label: "过去形", mnemonic: "い形容词去い加かった；な形容词直接加だった" },
  pastNegative: { label: "否定过去形", mnemonic: "い形容词去い加くなかった；な形容词直接加じゃなかった" },
  te: { label: "て形（连接）", mnemonic: "い形容词去い加くて；な形容词直接加で" },
  conditional: { label: "仮定形（如果……）", mnemonic: "い形容词去い加ければ；な形容词直接加なら" },
  politeAffirmative: { label: "敬体现在（です）", mnemonic: "两类形容词都直接在辞书形后加です" },
  politePast: { label: "敬体过去", mnemonic: "过去形直接加です：い形容词かった+です，な形容词だった→でした" },
  politeNegative: { label: "敬体否定", mnemonic: "否定形直接加です，或な形容词用じゃありません更礼貌" },
};

// ============================================================
// 五段动词变形表
// ============================================================
// 五段动词的辞书形（原形）都以「う/く/ぐ/す/つ/ぬ/ぶ/む/る」这九个假名之一结尾，
// 变形时把这个结尾假名换成同一行（同一个辅音）里不同段位的假名：
//   masuStem —— い段假名，用于「ます形」（礼貌体）
//   naiStem  —— あ段假名，用于「ない形」「被动」「使役」
//               ⚠️ 特例：以"う"结尾的动词，あ段位置历史上用的是"わ"而不是"あ"
//               （例：買う的否定不是"買あない"，而是"買わない"，这是最容易记错的点）
//   eStem    —— え段假名，用于「可能形」「仮定形（ば形）」「命令形」
//   oStem    —— お段假名，用于「意志形」
//   te / ta  —— て形/た形的完整词尾（不是单个假名替换，而是整体替换最后一个假名）
//               这部分的规则俗称"い/っ/ん"变化，是五段动词最容易混淆的部分：
//               く→いて、ぐ→いで、う/つ/る→って、ぬ/ぶ/む→んで、す→して
interface GodanRow {
  masuStem: string;
  naiStem: string;
  eStem: string;
  oStem: string;
  te: string;
  ta: string;
}

const GODAN_TABLE: Record<string, GodanRow> = {
  う: { masuStem: "い", naiStem: "わ", eStem: "え", oStem: "お", te: "って", ta: "った" },
  く: { masuStem: "き", naiStem: "か", eStem: "け", oStem: "こ", te: "いて", ta: "いた" },
  ぐ: { masuStem: "ぎ", naiStem: "が", eStem: "げ", oStem: "ご", te: "いで", ta: "いだ" },
  す: { masuStem: "し", naiStem: "さ", eStem: "せ", oStem: "そ", te: "して", ta: "した" },
  つ: { masuStem: "ち", naiStem: "た", eStem: "て", oStem: "と", te: "って", ta: "った" },
  ぬ: { masuStem: "に", naiStem: "な", eStem: "ね", oStem: "の", te: "んで", ta: "んだ" },
  ぶ: { masuStem: "び", naiStem: "ば", eStem: "べ", oStem: "ぼ", te: "んで", ta: "んだ" },
  む: { masuStem: "み", naiStem: "ま", eStem: "め", oStem: "も", te: "んで", ta: "んだ" },
  る: { masuStem: "り", naiStem: "ら", eStem: "れ", oStem: "ろ", te: "って", ta: "った" },
};

// 五段动词 te/ta 形的"例外单词"：极少数动词不按上表规则变化，只能死记。
// 目前日语教材里最常提到的例外就是"行く"——按く行规则本应是"行いて/行いた"，
// 但实际上和う/つ/る一样变成"行って/行った"。
const GODAN_TE_TA_EXCEPTIONS: Record<string, { te: string; ta: string }> = {
  行く: { te: "って", ta: "った" },
};

/** 五段动词变位：surface/reading 都去掉最后一个假名得到词干，再拼上对应变形的假名 */
function conjugateGodan(word: ConjugatableVerb, form: VerbForm): ConjugationResult {
  const lastKana = word.reading.slice(-1);
  const row = GODAN_TABLE[lastKana];
  if (!row) throw new Error(`不认识的五段动词词尾假名: ${lastKana}（单词: ${word.surface}）`);

  // 词干 = 去掉词尾假名后剩下的部分，汉字表记和假名读音各自独立计算，
  // 因为像"話す"这种词，汉字词干是"話"，假名词干是"はな"，两者字符数不同但逻辑一致
  const surfaceStem = word.surface.slice(0, -1);
  const readingStem = word.reading.slice(0, -1);

  const exception = GODAN_TE_TA_EXCEPTIONS[word.surface];

  switch (form) {
    case "masu":
      return { surface: surfaceStem + row.masuStem + "ます", reading: readingStem + row.masuStem + "ます" };
    case "nai":
      return { surface: surfaceStem + row.naiStem + "ない", reading: readingStem + row.naiStem + "ない" };
    case "nakatta":
      return { surface: surfaceStem + row.naiStem + "なかった", reading: readingStem + row.naiStem + "なかった" };
    case "te": {
      const suffix = exception?.te ?? row.te;
      return { surface: surfaceStem + suffix, reading: readingStem + suffix };
    }
    case "ta": {
      const suffix = exception?.ta ?? row.ta;
      return { surface: surfaceStem + suffix, reading: readingStem + suffix };
    }
    case "potential":
      return { surface: surfaceStem + row.eStem + "る", reading: readingStem + row.eStem + "る" };
    case "volitional":
      return { surface: surfaceStem + row.oStem + "う", reading: readingStem + row.oStem + "う" };
    case "passive":
      return { surface: surfaceStem + row.naiStem + "れる", reading: readingStem + row.naiStem + "れる" };
    case "causative":
      return { surface: surfaceStem + row.naiStem + "せる", reading: readingStem + row.naiStem + "せる" };
    case "conditional":
      return { surface: surfaceStem + row.eStem + "ば", reading: readingStem + row.eStem + "ば" };
    case "imperative":
      return { surface: surfaceStem + row.eStem, reading: readingStem + row.eStem };
  }
}

// ============================================================
// 一段动词变形表
// ============================================================
// 一段动词的辞书形固定以"る"结尾，变形规则比五段简单得多：
// 去掉"る"，词干完全不变，直接在后面加对应的词尾即可（不需要像五段那样换假名段位）。
function conjugateIchidan(word: ConjugatableVerb, form: VerbForm): ConjugationResult {
  const surfaceStem = word.surface.slice(0, -1);
  const readingStem = word.reading.slice(0, -1);

  const suffixMap: Record<VerbForm, string> = {
    masu: "ます",
    nai: "ない",
    nakatta: "なかった",
    te: "て",
    ta: "た",
    potential: "られる",
    volitional: "よう",
    passive: "られる", // 一段动词的可能形和被动形词形相同，需要靠上下文/语境区分
    causative: "させる",
    conditional: "れば",
    imperative: "ろ",
  };

  const suffix = suffixMap[form];
  return { surface: surfaceStem + suffix, reading: readingStem + suffix };
}

// ============================================================
// カ変动词（只有"来る"一个词）
// ============================================================
// 来る的特殊之处：汉字"来"的读音本身会随变形变化（き/く/こ三种），
// 这在五段/一段动词里都不会发生，所以必须整表硬编码，不能套用规则。
// 规律：假名读音的第一个字（き/く/こ）之后的部分，直接对应到汉字后面的假名（okurigana）。
const KAHEN_FORM_READING: Record<VerbForm, string> = {
  masu: "きます",
  nai: "こない",
  nakatta: "こなかった",
  te: "きて",
  ta: "きた",
  potential: "こられる",
  volitional: "こよう",
  passive: "こられる",
  causative: "こさせる",
  conditional: "くれば",
  imperative: "こい",
};

function conjugateKahen(form: VerbForm): ConjugationResult {
  const reading = KAHEN_FORM_READING[form];
  // "来"这个汉字本身占了读音的第一个假名位置，之后的假名原样跟在汉字后面
  const surface = "来" + reading.slice(1);
  return { surface, reading };
}

// ============================================================
// サ変动词（"する"以及"〇〇する"复合动词，如"勉強する"）
// ============================================================
// する本身的变形也不完全规则（尤其可能形是"できる"而不是"される"），需要硬编码整套词尾，
// 但"〇〇する"这类复合动词只需要把词尾"する"替换成对应变形，前面的名词部分原样保留。
const SAHEN_SUFFIX_READING: Record<VerbForm, string> = {
  masu: "します",
  nai: "しない",
  nakatta: "しなかった",
  te: "して",
  ta: "した",
  potential: "できる", // 特例：する的可能形是"できる"，不是按套路推出的"される"
  volitional: "しよう",
  passive: "される",
  causative: "させる",
  conditional: "すれば",
  imperative: "しろ",
};

function conjugateSahen(word: ConjugatableVerb, form: VerbForm): ConjugationResult {
  // 去掉词尾的"する"（2个假名），剩下的就是前缀（可能是空字符串，即单词本身就是"する"）
  const surfacePrefix = word.surface.slice(0, -2);
  const readingPrefix = word.reading.slice(0, -2);
  const suffix = SAHEN_SUFFIX_READING[form];
  return { surface: surfacePrefix + suffix, reading: readingPrefix + suffix };
}

/** 动词变位统一入口：按 verb_type 分派到对应的变形函数 */
export function conjugateVerb(word: ConjugatableVerb, form: VerbForm): ConjugationResult {
  switch (word.verb_type) {
    case "godan":
      return conjugateGodan(word, form);
    case "ichidan":
      return conjugateIchidan(word, form);
    case "kahen":
      return conjugateKahen(form);
    case "sahen":
      return conjugateSahen(word, form);
  }
}

/**
 * "安全版"动词变位：正常情况下和 conjugateVerb 完全一样，
 * 但如果这个词的数据有问题（比如 verb_type 标成五段，但 reading 结尾假名不在
 * 五段词尾表里——这种脏数据只可能来自导入接口写入了不匹配的 verb_type/reading 组合），
 * 不会抛异常炸掉整个检测页面，而是返回 null，调用方（出题逻辑）会跳过这个词。
 * 用于 ConjugationQuizRunner 组装题库时兜底，避免"一条脏数据导致所有人都进不去这个检测页"。
 */
export function tryConjugateVerb(word: ConjugatableVerb, form: VerbForm): ConjugationResult | null {
  try {
    return conjugateVerb(word, form);
  } catch {
    return null;
  }
}

// ============================================================
// い形容词变形
// ============================================================
// い形容词的辞书形以"い"结尾，这个"い"本身就参与变形（去掉后接不同词尾），
// 记忆技巧：把"い"想象成一个"占位符"，否定/过去/连接等各种意思都是把它换成别的词尾。
function conjugateIAdjective(word: ConjugatableAdjective, form: AdjForm): ConjugationResult {
  const surfaceStem = word.surface.slice(0, -1); // 去掉最后的"い"
  const readingStem = word.reading.slice(0, -1);

  const suffixMap: Record<AdjForm, string> = {
    negative: "くない",
    past: "かった",
    pastNegative: "くなかった",
    te: "くて",
    conditional: "ければ",
    politeAffirmative: "いです", // 辞书形本身 + です
    politePast: "かったです",
    politeNegative: "くないです",
  };

  if (form === "politeAffirmative") {
    // 敬体现在形是整个辞书形（含最后的い）+ です，不是词干+词尾
    return { surface: word.surface + "です", reading: word.reading + "です" };
  }

  const suffix = suffixMap[form];
  return { surface: surfaceStem + suffix, reading: readingStem + suffix };
}

// ============================================================
// な形容词变形
// ============================================================
// な形容词的辞书形本身不带"だ"（比如"簡単"、"元気"），本质上更像名词，
// 变形方式几乎和名词一样：直接在后面加"だ/です/じゃない"等，词干本身完全不变。
function conjugateNaAdjective(word: ConjugatableAdjective, form: AdjForm): ConjugationResult {
  const suffixMap: Record<AdjForm, string> = {
    negative: "じゃない",
    past: "だった",
    pastNegative: "じゃなかった",
    te: "で",
    conditional: "なら",
    politeAffirmative: "です",
    politePast: "でした",
    politeNegative: "じゃないです",
  };

  const suffix = suffixMap[form];
  return { surface: word.surface + suffix, reading: word.reading + suffix };
}

/** 形容词变位统一入口：按 adj_type 分派 */
export function conjugateAdjective(word: ConjugatableAdjective, form: AdjForm): ConjugationResult {
  return word.adj_type === "i" ? conjugateIAdjective(word, form) : conjugateNaAdjective(word, form);
}

// ============================================================
// 供检测题随机出题使用的辅助数据/函数
// ============================================================

/** 全部动词变形形式的列表，用于检测题随机抽取"考哪种变形" */
export const ALL_VERB_FORMS: VerbForm[] = [
  "masu",
  "nai",
  "nakatta",
  "te",
  "ta",
  "potential",
  "volitional",
  "passive",
  "causative",
  "conditional",
  "imperative",
];

/** 全部形容词变形形式的列表，用于检测题随机抽取"考哪种变形" */
export const ALL_ADJ_FORMS: AdjForm[] = [
  "negative",
  "past",
  "pastNegative",
  "te",
  "conditional",
  "politeAffirmative",
  "politePast",
  "politeNegative",
];

/** verb_type 枚举值 → 中文显示名，供 WordCard 等展示组件使用 */
export const VERB_TYPE_LABEL: Record<VerbType, string> = {
  godan: "五段动词",
  ichidan: "一段动词",
  kahen: "カ変动词",
  sahen: "サ変动词",
};

/** adj_type 枚举值 → 中文显示名 */
export const ADJ_TYPE_LABEL: Record<AdjType, string> = {
  i: "い形容词",
  na: "な形容词",
};

/**
 * 根据单词的 verb_type/adj_type 得出一个"词类分类标签"用于展示，
 * 优先显示动词分类，其次形容词分类；两者都没有（比如名词）则返回 null，调用方据此不渲染标签。
 */
export function getWordTypeLabel(word: { verb_type: VerbType | null; adj_type: AdjType | null }): string | null {
  if (word.verb_type) return VERB_TYPE_LABEL[word.verb_type];
  if (word.adj_type) return ADJ_TYPE_LABEL[word.adj_type];
  return null;
}

