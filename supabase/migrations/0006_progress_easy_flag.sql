-- 迁移 0006：给 user_word_progress 增加"简单词"标记字段
--
-- 背景：记忆页改成卡片式单词流后，新增"标记简单"操作——用户可以把自己已经很熟悉、
-- 不需要再复习的词标记为"简单"。这个标记不等于"已学(learned)"：learned 表示
-- "已经记忆过这张卡片"，easy 表示"这个词我很熟，之后应该少抽到/几乎不再出现"，
-- 两者是独立的维度（可以同时为 true，也可以只有一个为 true）。
--
-- 参考同类项目 nami-console 的设计：标记简单后不是彻底从词库拿掉（万一以后还想复习），
-- 而是在"今日词库"生成时以很低概率（1/6）保留，绝大多数情况会被跳过——
-- 具体的概率筛选逻辑写在应用层 src/lib/data/words.ts 的 selectDailyWords 里，
-- 这个迁移只负责加这一列存储标记本身。
alter table user_word_progress
  add column if not exists easy boolean not null default false;

comment on column user_word_progress.easy is
  '用户标记该词为"简单/已熟练"，不等同于learned；用于降低该词在"今日词库"里被抽中的概率（约保留1/6概率），而不是彻底移除';

-- 不需要新增 GRANT：这张表的表级权限（select/insert/update/delete）已经在
-- 0003_fix_missing_grants.sql（授权给 authenticated）和 0004_grant_service_role.sql
-- （授权给 service_role）里给过了。GRANT 是表级的，新增列不需要再单独授权一次。
