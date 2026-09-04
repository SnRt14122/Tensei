# 日语单词记忆 App

技术栈：Next.js 16 (App Router, TypeScript, Tailwind CSS v4) + Supabase (Auth + Postgres)，部署到 Vercel。

## 目录结构速览

- `src/app/page.tsx` — 主页：赛博液态玻璃风格 + 随机日语歌词展示（占位数据，见下文）
- `src/app/login` — 登录 / 注册
- `src/app/memorize` — 页面一：记忆页（词库选择、每日30词、振假名、星标）
- `src/app/quiz/kanji` — 页面二：汉字记忆检测（输入纯假名）
- `src/app/quiz/meaning` — 页面三：词义检测（选择题 + 权重复习）
- `src/lib/data/words.ts` — 单词/进度数据读取与"每日30词"选词逻辑
- `src/lib/data/lyrics.ts` — 首页歌词占位数据（**待你补充真实来源**）
- `supabase/migrations/0001_init.sql` — 数据库表结构 + RLS 策略
- `supabase/seed/jlpt_n5.json` / `0001_jlpt_n5.sql` — 示例词库（JLPT N5，44词）

## 部署步骤

### 1. 创建 Supabase 项目

1. 前往 https://supabase.com/dashboard 创建新项目。
2. 打开 SQL Editor，依次执行：
   - `supabase/migrations/0001_init.sql`（建表 + RLS）
   - `supabase/seed/0001_jlpt_n5.sql`（导入示例词库，可选）
3. 在 Project Settings → API 中获取：
   - `Project URL` → 对应 `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → 对应 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. （可选，多用户注册体验更完整）在 Authentication → Providers 中确认 Email 登录已启用；如需免邮箱验证，可在 Authentication → Settings 关闭 "Confirm email"。

### 2. 本地开发

```bash
cp .env.local.example .env.local
# 编辑 .env.local，填入上一步获取的 URL 和 anon key
npm install
npm run dev
```

### 3. 部署到 Vercel

1. 将本仓库推送到 GitHub / GitLab。
2. 在 https://vercel.com/new 导入该仓库。
3. 在 Vercel 项目的 Environment Variables 中添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 部署。Vercel 会自动识别 Next.js 项目并执行 `next build`。

### 4. 扩充词库

`word_banks` / `words` 两张表已预留扩展接口：往 `word_banks` 插入一行新词库，再往 `words` 插入对应 `bank_id` 的单词即可，无需改代码。`words.segments` / `example.segments` 字段的格式约定见 `supabase/migrations/0001_init.sql` 中的注释。

### 5. 替换首页歌词数据

当前 `src/lib/data/lyrics.ts` 中是占位的日语歌词示例。等你确定好真实的歌词来源（歌词API、自建表、静态文件等）后，替换该文件的实现即可，`LyricLine` 接口保持不变，首页组件无需改动。

## 本地测试免登录入口（仅供开发测试）

为了方便本地反复测试而不用每次手动登录，提供了一个仅测试用的免登录入口：

1. 在 Supabase 控制台 Authentication → Users 里手动创建一个测试账号（邮箱密码任意）。
2. 在 `.env.local` 中加入：
   ```
   ENABLE_DEBUG_LOGIN=true
   DEBUG_TEST_EMAIL=你创建的测试邮箱
   DEBUG_TEST_PASSWORD=对应密码
   ```
3. 双击项目根目录下的 `debug-start.command`（macOS），会自动启动 `npm run dev` 并打开浏览器直达 `/debug-login`，该路由会用测试账号自动登录后跳转到记忆页。
4. 所有测试产生的学习进度都会挂在这个共享测试账号下，可以在 Supabase 控制台的 `user_word_progress` 表里统一查看/清理。

安全说明：
- `/debug-login` 路由在 `NODE_ENV=production` 时会直接返回 404，Vercel 生产部署不会受影响。
- 必须显式设置 `ENABLE_DEBUG_LOGIN=true` 才会生效，避免误开；不设置的话该路由返回 403。
- 测试账号密码只存在于本地 `.env.local`（已被 `.gitignore` 排除），不会进入代码仓库。
- 这仍然是通过 Supabase 正常登录流程签发的会话，并不会绕过数据库的行级安全策略（RLS）——测试账号也只能读写自己名下的数据，只是这份"自己的数据"是公用的。

## 已验证

- `npm run build`：通过（在使用占位 Supabase 环境变量的情况下）。
- `npm run lint`：无错误。
- 由于当前环境没有真实的 Supabase 项目，登录注册、数据读写等功能尚未做端到端联调，需要你按上方步骤创建真实项目后自行验证一次登录 → 记忆 → 检测的完整流程。
