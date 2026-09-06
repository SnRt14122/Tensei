// 全局类型定义

/** 振假名分段：一段文本 + 可选的假名注音（没有 kana 表示这段本身就是假名/符号，无需注音）*/
export interface FuriganaSegment {
  text: string;
  kana?: string;
}

/** 例句结构：分段振假名 + 中文翻译 */
export interface ExampleSentence {
  segments: FuriganaSegment[];
  cn: string;
}

/** 词库 */
export interface WordBank {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

/**
 * 动词变格分类（日语动词按变位规则分三大类）：
 * - godan（五段动词）：词尾假名在「う段」五个音之间变化，如 話す/読む/買う，数量最多、规则最复杂
 * - ichidan（一段动词）：词尾固定是「る」，变形时只需去掉る，词干不变，如 食べる/見る
 * - kahen（カ変动词）：仅"来る"一词，读音变化不规则（例如ます形是"来[き]ます"，读音都变了），单独一类
 * - sahen（サ変动词）：仅"する"及"〇〇する"复合动词，变形规则也自成一类
 */
export type VerbType = "godan" | "ichidan" | "kahen" | "sahen";

/**
 * 形容词分类（决定变位规则完全不同）：
 * - i（い形容词）：词尾"い"本身参与变形，如 忙しい → 忙しくない（否定）
 * - na（な形容词）：本质接近名词，靠"だ/です"变形，如 簡単 → 簡単じゃない（否定）
 */
export type AdjType = "i" | "na";

/** 单词 */
export interface Word {
  id: string;
  bank_id: string;
  surface: string;
  segments: FuriganaSegment[];
  reading: string;
  meaning_cn: string;
  /** 词形和读音精确匹配的东京式词典音调；未收录时为 null。 */
  pitch_accents?: number[] | null;
  pos: string | null;
  /** 动词变格分类，仅动词有值，其余词性为 null（用于驱动变位规则引擎） */
  verb_type: VerbType | null;
  /** 形容词分类，仅形容词有值，其余词性为 null（用于驱动变位规则引擎） */
  adj_type: AdjType | null;
  example: ExampleSentence | null;
  created_at: string;
}

/** 用户对单个单词的学习进度 */
export interface UserWordProgress {
  id: string;
  user_id: string;
  word_id: string;
  learned: boolean;
  starred: boolean;
  /**
   * 用户标记该词为"简单/已熟练"，不等同于 learned：
   * learned 表示"已经在记忆卡片流里过了一遍"，easy 表示"这个词我很熟，
   * 之后应该少抽到"。两者是独立维度，可以同时为 true。
   * 生成"今日词库"时，标记为 easy 的词只会以很低概率（1/6）被保留，
   * 详见 src/lib/data/words.ts 的 selectDailyWords。
   */
  easy: boolean;
  weight: number;
  last_result: "correct" | "incorrect" | null;
  learned_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
}

/** 记忆页展示用的合并数据 */
export interface WordWithProgress extends Word {
  progress: UserWordProgress | null;
}

/** 语法点（学习页"语法点记忆"板块 + "语法点意义检测"共用的数据结构，数据库表名/字段名沿用原来的 sentence_patterns，未改名） */
export interface SentencePattern {
  id: string;
  pattern: string;
  reading: string | null;
  meaning_cn: string;
  explanation: string | null;
  lesson: string | null;
  connection: string | null;
  usage: string | null;
  notes: string | null;
  example: ExampleSentence | null;
  examples: ExampleSentence[];
  level: string | null;
  created_at: string;
}

/**
 * 用户对单条语法点的学习进度，字段设计对照 UserWordProgress（见上方），
 * 语义完全一致：learned=已记住、starred=星标、easy=简单不用再学、weight=复习权重。
 * 对应数据库表 user_pattern_progress（迁移 0007_pattern_progress.sql）。
 */
export interface UserPatternProgress {
  id: string;
  user_id: string;
  pattern_id: string;
  learned: boolean;
  starred: boolean;
  easy: boolean;
  weight: number;
  last_result: "correct" | "incorrect" | null;
  learned_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
}

/** 学习页"语法点记忆"单卡展示用的合并数据 */
export interface PatternWithProgress extends SentencePattern {
  progress: UserPatternProgress | null;
}

/** 四种检测类型的统一标识 */
export type QuizType = "kanji" | "meaning" | "conjugation" | "pattern";

/**
 * 一次答题记录（对应数据库 quiz_attempts 表的一行）。
 * "本地优先"策略下，答题时先在本地生成这个对象存进 IndexedDB 队列，
 * 点击"同步"后才批量上传，client_timestamp 用于同步时判定覆盖顺序。
 */
export interface QuizAttempt {
  /** 本地生成的临时 id（如 crypto.randomUUID()），同步成功后会被服务端 id 替换 */
  id: string;
  quiz_type: QuizType;
  word_id: string | null;
  pattern_id: string | null;
  /** 仅 quiz_type = 'conjugation' 时有值，记录具体考的是哪种变形，如 'nakatta'（否定过去形） */
  conjugation_form: string | null;
  user_answer: string;
  correct: boolean;
  /** 答题发生的本地时间（ISO 字符串），同步时以它为准，而不是上传时间 */
  client_timestamp: string;
}
