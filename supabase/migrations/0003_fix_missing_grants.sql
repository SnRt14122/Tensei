-- 迁移 0003：补齐 0001_init.sql 里三张表一直缺失的表级 GRANT 权限
--
-- 背景（真正定位到"提交上传依旧报错"这个 bug 的原因）：
-- 0001_init.sql 给 word_banks / words / user_word_progress 都写了 RLS 策略，
-- 但从头到尾都没写配套的 `grant` 语句。0002 迁移的提交记录里提到
-- "之前 word_banks/words 就踩过这个坑"——但那次修复实际上是在 Supabase 控制台的
-- SQL Editor 里手动执行了 grant 命令，从来没有被写回任何迁移文件，所以只存在于
-- 当时那一个 Supabase 项目的实际状态里，不会随着迁移脚本重新出现（比如换一个新的
-- Supabase 项目、或者有人从头跑一遍所有迁移文件时，这个修复会"消失"）。
-- 0002 迁移只补上了 sentence_patterns / quiz_attempts 这两张新表的 grant，
-- 但同步逻辑（src/app/sync/actions.ts 的 syncQuizAttempts）紧接着还会写入
-- user_word_progress 表——这张老表恰恰是唯一一直没有被任何迁移文件正式授权过的表，
-- 于是即使 quiz_attempts 那步成功了，写 user_word_progress 时依然会报
-- "permission denied for table user_word_progress"，这就是用户反馈"提交上传依旧报错"
-- （在 0002 的 GRANT 修复之后问题还没解决）的真正原因。
--
-- Postgres 的 grant 语句本身是幂等的（重复执行同一条 grant 不会报错，也不会产生副作用），
-- 所以这个迁移可以安全地在任何时候、任何环境重复执行。
grant select on public.word_banks to anon, authenticated;
grant select on public.words to anon, authenticated;
grant select, insert, update, delete on public.user_word_progress to authenticated;

comment on table user_word_progress is
  '每个用户对每个单词的学习状态：是否已学、星标、复习权重（0003：补齐了长期缺失的表级 GRANT，
   之前只有 RLS 策略、没有 GRANT，会导致"同步"功能写入这张表时报 permission denied）';
