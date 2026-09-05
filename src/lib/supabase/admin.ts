// 管理员权限的 Supabase 客户端：使用 service role key，绕过行级安全策略（RLS）。
//
// 为什么需要这个：words/sentence_patterns 表的 RLS 策略只允许所有登录用户"读取"，
// 没有开放"写入"给普通用户（写入被限定为"仅服务端用 service role 维护"，
// 见 0001_init.sql 和 0002_conjugation_patterns_attempts.sql 里的注释）。
// 词库/句型批量导入接口跑在服务端，需要用这个特权客户端才能写入。
//
// ⚠️ service role key 拥有绕过所有 RLS 的权限，绝不能暴露给浏览器，
// 只能在 server-only 的代码里使用（本文件不加 "use client"，且只应被 route.ts/actions.ts 引用）。

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "缺少 SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_URL 环境变量，无法创建管理员客户端"
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
