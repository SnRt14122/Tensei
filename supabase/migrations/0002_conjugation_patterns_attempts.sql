-- 迁移 0002：为「动词/形容词变位检测」「句型记忆」「本地优先答题记录」新增的数据库结构
-- 依赖: Supabase (Postgres + Auth)，在 0001_init.sql 之后执行

-- ========== 1. words 表：新增结构化词类字段 ==========
-- 之前 pos 只是自由文本（比如"动词"/"い形容词"），无法被变位规则引擎读取判断。
-- 这里新增两个枚举字段，专门给"能变位的词类"用：
--   verb_type：动词的变格类型（日语动词按变格分三大类，其中五段最多、规则最复杂）
--     godan   = 五段动词（词尾在 う段五个假名间变化，如 話す/読む/買う）
--     ichidan = 一段动词（词尾只有 る，去掉る加对应词尾，如 食べる/見る）
--     kahen   = カ変动词（只有一个词"来る"，读音变化不规则，单独一类）
--     sahen   = サ変动词（只有一个词"する"以及"〇〇する"复合动词，单独一类）
--   adj_type：形容词的类型（决定了变位规则完全不同）
--     i  = い形容词（如 忙しい/新しい，词尾"い"本身参与变形）
--     na = な形容词（如 简单/元气，本质上像名词，接"だ/です"变形）
-- 名词等不参与变位的词，这两个字段都留 null。
do $$
begin
  if not exists (select 1 from pg_type where typname = 'verb_type_enum') then
    create type verb_type_enum as enum ('godan', 'ichidan', 'kahen', 'sahen');
  end if;
  if not exists (select 1 from pg_type where typname = 'adj_type_enum') then
    create type adj_type_enum as enum ('i', 'na');
  end if;
end $$;

alter table words
  add column if not exists verb_type verb_type_enum,
  add column if not exists adj_type adj_type_enum;

comment on column words.verb_type is '动词变格分类：godan五段/ichidan一段/kahen カ変(来る)/sahen サ変(する及〇〇する)，非动词为 null';
comment on column words.adj_type is '形容词分类：i=い形容词/na=な形容词，非形容词为 null';

-- 给 (bank_id, surface) 加唯一约束：
-- 一方面业务上同一词库不应该有重复的单词，另一方面这是词库导入接口
-- （/api/import/words）做"幂等 upsert"所依赖的冲突判定键，重复导入同一份数据
-- 会更新已有行而不是产生重复记录。
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'words_bank_surface_key'
  ) then
    alter table words add constraint words_bank_surface_key unique (bank_id, surface);
  end if;
end $$;

-- ========== 2. 句型表：句型记忆功能的数据来源 ==========
-- 句型内容由用户之后通过导入接口批量灌入，这里只建结构。
create table if not exists sentence_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern text not null,              -- 句型本身，例如 "〜てもいいです"
  reading text,                       -- 句型整体的假名读音标注（若含固定汉字词，可选）
  meaning_cn text not null,           -- 句型的中文含义/用法说明，例如 "表示许可，……也可以"
  explanation text,                   -- 更详细的语法说明（接续方式、使用场景等），可为空
  -- example: 例句，结构复用 words.example 的形态：{"segments":[...],"cn":"..."}
  example jsonb,
  level text,                         -- 难度分级，例如 "N5"/"N4"，方便筛选，可为空
  created_at timestamptz not null default now()
);

comment on table sentence_patterns is '日语句型记忆库：句型、含义、例句，内容由后端导入接口批量写入';

-- 给 pattern 文本加唯一约束，作为句型导入接口幂等 upsert 的冲突判定键
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sentence_patterns_pattern_key'
  ) then
    alter table sentence_patterns add constraint sentence_patterns_pattern_key unique (pattern);
  end if;
end $$;

-- ========== 3. 答题记录明细表：支撑"本地优先 + 手动同步"策略 ==========
-- 设计要点：
-- - 这是一张"仅追加"的流水表，每答一题在本地生成一条记录，暂存本地（IndexedDB），
--   用户点击"同步"后才批量 insert 到这里，不做覆盖式更新，可用于以后统计错题趋势。
-- - client_timestamp 记录的是"答题发生的本地时间"（而不是同步时间），
--   同步逻辑以它为准："本地为准覆盖云端"体现在：
--   同步时会用本地重新聚合出的 weight/learned/last_result 直接覆盖
--   user_word_progress 对应行（见应用层同步逻辑），而不是先读云端再比较。
-- - quiz_type 区分四种检测，word_id/pattern_id 二选一（取决于题型），
--   conjugation_form 只在动词/形容词变位检测时使用，记录具体考的是哪种变形，
--   方便以后做"哪种变形我最常错"的统计。
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_type text not null check (quiz_type in ('kanji', 'meaning', 'conjugation', 'pattern')),
  word_id uuid references words(id) on delete cascade,
  pattern_id uuid references sentence_patterns(id) on delete cascade,
  conjugation_form text,              -- 例如 'nai'（否定形）/'nakatta'（否定过去形），仅 quiz_type='conjugation' 时使用
  user_answer text,                   -- 用户实际输入/选择的答案，便于复盘错题
  correct boolean not null,
  client_timestamp timestamptz not null,  -- 答题发生时的本地时间（同步策略以此为准，而非服务器写入时间）
  created_at timestamptz not null default now() -- 这条记录实际写入服务器的时间
);

create index if not exists quiz_attempts_user_idx on quiz_attempts(user_id);
create index if not exists quiz_attempts_word_idx on quiz_attempts(word_id);
create index if not exists quiz_attempts_pattern_idx on quiz_attempts(pattern_id);

comment on table quiz_attempts is '答题历史明细，仅追加写入；本地作答后先缓存，手动同步时批量插入这里';

-- ========== 4. RLS 策略 ==========

-- 句型表：所有登录用户只读，写入仅限服务端（service role，通过导入接口维护）
alter table sentence_patterns enable row level security;

create policy "sentence_patterns_select_all" on sentence_patterns
  for select using (true);

-- 答题记录：仅本人可读写（同步时以当前登录用户身份 insert）
alter table quiz_attempts enable row level security;

create policy "quiz_attempts_select_own" on quiz_attempts
  for select using (auth.uid() = user_id);

create policy "quiz_attempts_insert_own" on quiz_attempts
  for insert with check (auth.uid() = user_id);

-- ========== 5. 表级权限（GRANT）==========
-- 光有 RLS 策略还不够：Postgres 要求角色本身先有对这张表的基础权限，
-- 否则即使 RLS 允许，也会报 "permission denied for table"（之前 word_banks/words 就踩过这个坑）。
-- sentence_patterns 所有登录用户只读；quiz_attempts 允许本人读和写（插入）。
grant select on public.sentence_patterns to anon, authenticated;
grant select, insert on public.quiz_attempts to authenticated;
