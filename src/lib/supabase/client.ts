import { createBrowserClient } from "@supabase/ssr";
import { createUnavailableSupabaseClient, getSupabaseConfig } from "./config";

/** 浏览器端 Supabase 客户端，用于客户端组件中的数据读写和鉴权 */
export function createClient() {
  const config = getSupabaseConfig();
  if (!config) return createUnavailableSupabaseClient();

  return createBrowserClient(
    config.url,
    config.anonKey
  );
}
