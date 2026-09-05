-- 回填种子数据：给 0001_jlpt_n5.sql 里已有的单词补上结构化的 verb_type / adj_type
-- 需要在 0002_conjugation_patterns_attempts.sql（新增字段）之后执行
--
-- 说明：动词的变格类型不能从汉字表面直接猜出来（比如"帰る"长得像一段动词，
-- 但其实是五段动词的特例——这类词日语里叫"假一段动词"，只能靠背），
-- 所以这里按每个单词手动指定，不用规则批量生成，保证语法正确性。

-- 五段动词（godan）：词尾在う段五个假名间变化
update words set verb_type = 'godan' where bank_id = '00000000-0000-0000-0000-000000000001'
  and surface in ('飲む', '読む', '書く', '聞く', '話す', '買う', '行く', '帰る', '働く', '休む');

-- 一段动词（ichidan）：去掉る，词干不变
update words set verb_type = 'ichidan' where bank_id = '00000000-0000-0000-0000-000000000001'
  and surface in ('食べる', '見る', '起きる', '寝る');

-- カ変动词：只有"来る"一个词，读音变化不规则
update words set verb_type = 'kahen' where bank_id = '00000000-0000-0000-0000-000000000001'
  and surface = '来る';

-- サ変动词：「勉強」本身是名词，但常以「勉強する」形式作动词使用，归入サ変
update words set verb_type = 'sahen' where bank_id = '00000000-0000-0000-0000-000000000001'
  and surface = '勉強';

-- い形容词：词尾"い"本身参与变形
update words set adj_type = 'i' where bank_id = '00000000-0000-0000-0000-000000000001'
  and surface in ('忙しい', '新しい', '大きい', '小さい', '高い', '安い', '面白い', '難しい');

-- な形容词：本质接近名词，靠"だ/です"变形
update words set adj_type = 'na' where bank_id = '00000000-0000-0000-0000-000000000001'
  and surface in ('簡単', '元気');
