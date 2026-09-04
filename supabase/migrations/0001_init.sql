-- 日语单词记忆 App 数据库结构
-- 依赖: Supabase (Postgres + Auth)

-- ========== 词库表 ==========
create table if not exists word_banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- 词库名称，例如 "JLPT N5"
  description text,                  -- 词库描述
  created_at timestamptz not null default now()
);

comment on table word_banks is '词库分类，方便以后扩充多套词库（N5/N4/自定义等）';

-- ========== 单词表 ==========
create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references word_banks(id) on delete cascade,
  surface text not null,             -- 单词原形，含汉字，例如 "忙しい"
  -- segments: 按汉字/假名分段的振假名标注数据
  -- 例: [{"text":"忙","kana":"いそが"},{"text":"しい"}]
  -- 没有 kana 字段的分段表示原文本身是假名，不需要注音
  segments jsonb not null default '[]'::jsonb,
  reading text not null,             -- 完整假名读音，例如 "いそがしい"，用于检测答案判定
  meaning_cn text not null,          -- 中文释义
  pos text,                          -- 词性，可为空，例如 "い形容词"
  -- example: 例句，含分段振假名和中文翻译
  -- 例: {"segments":[{"text":"今日","kana":"きょう"},{"text":"は忙","kana":null},...],"cn":"今天很忙。"}
  example jsonb,
  created_at timestamptz not null default now()
);

create index if not exists words_bank_id_idx on words(bank_id);

comment on table words is '单词及其振假名分段、释义、例句';

-- ========== 用户单词学习进度表 ==========
create table if not exists user_word_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  learned boolean not null default false,   -- 是否已在记忆页标记为"记过"
  starred boolean not null default false,   -- 星标
  weight integer not null default 1,        -- 权重，检测答错时增加，用于优先复习排序
  last_result text,                         -- 'correct' | 'incorrect'，最近一次检测结果
  learned_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, word_id)
);

create index if not exists user_word_progress_user_idx on user_word_progress(user_id);
create index if not exists user_word_progress_word_idx on user_word_progress(word_id);

comment on table user_word_progress is '每个用户对每个单词的学习状态：是否已学、星标、复习权重';

-- ========== 行级安全策略 (RLS) ==========

-- 词库与单词：所有登录用户可读，写入仅限服务端（用 service role key 维护词库内容）
alter table word_banks enable row level security;
alter table words enable row level security;

create policy "word_banks_select_all" on word_banks
  for select using (true);

create policy "words_select_all" on words
  for select using (true);

-- 用户进度：仅本人可读写
alter table user_word_progress enable row level security;

create policy "progress_select_own" on user_word_progress
  for select using (auth.uid() = user_id);

create policy "progress_insert_own" on user_word_progress
  for insert with check (auth.uid() = user_id);

create policy "progress_update_own" on user_word_progress
  for update using (auth.uid() = user_id);

create policy "progress_delete_own" on user_word_progress
  for delete using (auth.uid() = user_id);
