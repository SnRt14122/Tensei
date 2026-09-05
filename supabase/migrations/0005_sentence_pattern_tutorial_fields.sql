-- 为句型学习卡片增加教程化字段；保留旧字段以兼容已有导入内容。
alter table sentence_patterns
  add column if not exists lesson text,
  add column if not exists connection text,
  add column if not exists usage text,
  add column if not exists notes text,
  add column if not exists examples jsonb not null default '[]'::jsonb;

comment on column sentence_patterns.lesson is '教材课次或主题，例如 新标日初级上·第1课';
comment on column sentence_patterns.connection is '接续规则，例如 名词+です/动词ます形';
comment on column sentence_patterns.usage is '中文教程：语义、场景和语用限制';
comment on column sentence_patterns.notes is '易错点、近义句型对比或使用限制';
comment on column sentence_patterns.examples is '一个或多个经过人工校对的例句数组';
