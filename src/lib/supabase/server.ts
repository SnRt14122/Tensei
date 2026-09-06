import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createUnavailableSupabaseClient, getSupabaseConfig } from "./config";

/** 服务端 Supabase 客户端，用于 Server Component / Route Handler 中读取当前会话 */
export async function createClient() {
  const cookieStore = await cookies();

  const config = getSupabaseConfig();
  if (!config) return createUnavailableSupabaseClient();

  return createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 中调用 setAll 会抛错，
            // 如果中间件负责刷新会话，这里可以忽略。
          }
        },
      },
    }
  );
}
