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

/** 单词 */
export interface Word {
  id: string;
  bank_id: string;
  surface: string;
  segments: FuriganaSegment[];
  reading: string;
  meaning_cn: string;
  pos: string | null;
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
