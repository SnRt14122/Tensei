-- 内容整理脚本生成的扩展词库。单词本体通过 /api/import/words 导入 JSON。
-- 先执行本文件，再按 supabase/content/manifest.json 中的文件调用导入接口。
insert into word_banks (id, name, description) values
  ('00000000-0000-0000-0001-000000000001', 'JLPT N1', '来源：日语N1单词表（9186个）'),
  ('00000000-0000-0000-0001-000000000002', 'JLPT N2', '来源：日语N2（二级）单词表（4386个）'),
  ('00000000-0000-0000-0001-000000000003', 'JLPT N3-N4', '来源：日语N3-N4词汇表（2108个）')
on conflict (id) do update set name = excluded.name, description = excluded.description;
