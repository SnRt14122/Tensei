-- 迁移 0007：新增“用户语法点学习进度”表 user_pattern_progress
--
-- 背景：语法点记忆板块从"一次性网格展示全部语法点"改成参考单词记忆页的"单卡逐个
-- 展示 + 每日约6个"模式，需要像 user_word_progress 一样持久记录每个用户对每条
-- 语法点的学习状态（记住了/简单/星标），否则每次刷新页面都会丢失进度，也无法做
-- "优先复习还没记住的语法点"。
--
-- 表结构完全对照 user_word_progress（0001_init.sql）+ easy 字段（0006_progress_easy_flag.sql），
-- 只是外键从 word_id 换成 pattern_id，这样应用层的选词/选语法点算法可以复用几乎一样的思路
-- （见 src/lib/data/patterns.ts 的 selectDailyPatterns，对照 src/lib/data/words.ts 的 selectDailyWords）。
create table if not exists user_pattern_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern_id uuid not null references sentence_patterns(id) on delete cascade,
  learned boolean not null default false,   -- 是否已在学习页标记为"记住了"
  starred boolean not null default false,   -- 星标
  -- 用户标记该语法点为"简单/已熟练"，不等同于 learned，语义和 user_word_progress.easy 完全一致：
  -- 标记后不会被彻底移除，只是在"今日语法点"生成时以很低概率（1/6）保留。
  easy boolean not null default false,
  weight integer not null default 1,        -- 权重，语法点意义检测答错时可用于提高复习优先级
  last_result text,                         -- 'correct' | 'incorrect'，最近一次检测结果
  learned_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, pattern_id)
);

create index if not exists user_pattern_progress_user_idx on user_pattern_progress(user_id);
create index if not exists user_pattern_progress_pattern_idx on user_pattern_progress(pattern_id);

comment on table user_pattern_progress is '每个用户对每条语法点(sentence_patterns)的学习状态：是否记住、星标、简单标记、复习权重';

-- ========== RLS 策略：仅本人可读写，和 user_word_progress 完全一致 ==========
alter table user_pattern_progress enable row level security;

create policy "pattern_progress_select_own" on user_pattern_progress
  for select using (auth.uid() = user_id);

create policy "pattern_progress_insert_own" on user_pattern_progress
  for insert with check (auth.uid() = user_id);

create policy "pattern_progress_update_own" on user_pattern_progress
  for update using (auth.uid() = user_id);

create policy "pattern_progress_delete_own" on user_pattern_progress
  for delete using (auth.uid() = user_id);

-- ========== 表级 GRANT（踩过的坑：光有 RLS 不够，还要给角色基础表权限） ==========
grant select, insert, update, delete on public.user_pattern_progress to authenticated;
grant select, insert, update, delete on public.user_pattern_progress to service_role;
