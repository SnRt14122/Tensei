-- 迁移 0004：补齐 service_role 角色一直缺失的表级 GRANT 权限
--
-- 背景：0001/0002/0003 三次迁移里的 grant 语句都只写给了 anon、authenticated 两个角色，
-- 从来没有显式 grant 给 service_role。Supabase 的 service_role 默认带有 BYPASSRLS 属性，
-- 能绕过行级安全策略（RLS），但 BYPASSRLS 只影响"行级"检查，不代替 Postgres 最基础的
-- "表级"访问权限（GRANT/REVOKE）——这是两套独立的权限层。本项目所有迁移文件都只手动
-- grant 过 anon/authenticated，service_role 自己反而从没被显式授权过，这次是第一次真正
-- 使用 /api/import/words、/api/import/patterns（内部用 service role key 走
-- src/lib/supabase/admin.ts 的 createAdminClient）才触发暴露：
--   permission denied for table word_banks
--   hint: Grant the required privileges to the current role with: GRANT SELECT ON public.word_banks TO service_role;
--
-- 这条迁移把 service_role 需要用到的表级权限一次性补齐：词库/单词/句型三张表需要
-- 完整的增删改查权限（导入接口要能新增词库以外的单词/句型，且未来可能需要修正/清理数据），
-- 答题记录表也一起补上（虽然目前导入接口不碰这张表，但作为管理员角色理应有完整权限，
-- 避免以后再踩同样的坑）。
grant select, insert, update, delete on public.word_banks to service_role;
grant select, insert, update, delete on public.words to service_role;
grant select, insert, update, delete on public.sentence_patterns to service_role;
grant select, insert, update, delete on public.user_word_progress to service_role;
grant select, insert, update, delete on public.quiz_attempts to service_role;
