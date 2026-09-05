-- 迁移 0008：补齐 quiz_attempts 表对 authenticated 角色缺失的 UPDATE 权限
--
-- 背景（本次排查"点同步就报错"定位到的第三处 GRANT 坑，前两处分别在
-- 0003_fix_missing_grants.sql 补 user_word_progress、0004_grant_service_role.sql 补
-- service_role）：
--
-- src/app/sync/actions.ts 的 syncQuizAttempts 用的是
--   supabase.from("quiz_attempts").upsert(attemptRows, { onConflict: "id" })
-- 而不是普通 insert，目的是让"同步中途失败、用户重新点同步"时不会在这张流水表里
-- 插入重复行（同一条本地记录用同一个 id 重试，upsert 会更新而不是新建）。
--
-- 但 Postgres 层面，"upsert" 的本质是 INSERT ... ON CONFLICT DO UPDATE 这一条语句，
-- 即使实际触发的是插入分支，Postgres 也会要求执行者同时具备 INSERT 权限和 UPDATE 权限
-- 才能解析这条语句，这是和"业务上这张表要不要真的被更新"完全无关的、纯语法层面的要求。
--
-- 0002_conjugation_patterns_attempts.sql 当时给 quiz_attempts 只 grant 了
-- `select, insert`，没有 update，于是每次点击"同步"按钮，第一步写 quiz_attempts
-- 就会先失败，报错信息形如：
--   permission denied for table quiz_attempts
--   hint: Grant the required privileges to the current role with:
--         GRANT UPDATE ON public.quiz_attempts TO authenticated;
-- 已用临时测试账号直连 Supabase REST API 复现并确认了这条报错。
--
-- 这条迁移只补 update 这一个缺失的权限，delete 依然不给普通登录用户
-- （这张表设计上仍然是"仅追加"，用户不应该能删除自己的答题历史，
-- 避免以后错题统计被篡改）。
grant update on public.quiz_attempts to authenticated;

-- ========== RLS 策略也要补一条 update_own，否则光有表级 GRANT 还不够 ==========
-- GRANT 和 RLS 是两层独立的权限检查（这个项目已经在别的表上踩过一次这个坑，
-- 见 0003_fix_missing_grants.sql 的注释）：GRANT 只解决"这个角色有没有资格执行
-- UPDATE 语句"，RLS 策略解决"这一行数据允不允许被这个用户更新"。
-- 0002 迁移当时只写了 select_own / insert_own 两条策略，没有 update_own，
-- 实测在补齐上面的表级 GRANT 之后，重新用同一个 id upsert（模拟"同步失败后重试"
-- 这个官方设计场景）依然会报错，但报错内容变成了：
--   new row violates row-level security policy (USING expression) for table "quiz_attempts"
-- 说明必须两层权限都补齐，upsert 重试才能真正走通。
create policy "quiz_attempts_update_own" on quiz_attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table quiz_attempts is
  '答题历史明细，仅追加写入；本地作答后先缓存，手动同步时批量插入这里
   （0008：补齐了 authenticated 角色缺失的 UPDATE 权限——upsert(onConflict) 语法本身
   要求同时具备 INSERT 和 UPDATE 权限，即使实际只走插入分支，缺 UPDATE 会导致
   "同步"功能一点就报 permission denied for table quiz_attempts）';
