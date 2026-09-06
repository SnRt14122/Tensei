import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

/** 在中间件中刷新 Supabase 会话，并对未登录用户跳转到登录页 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const config = getSupabaseConfig();
  if (!config) return supabaseResponse;

  const supabase = createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isDebugLogin = request.nextUrl.pathname.startsWith("/debug-login");
  const isPublicPage = request.nextUrl.pathname === "/";
  // 词库/语法点批量导入接口（/api/import/words、/api/import/patterns）用的是
  // 独立的 Bearer 密钥鉴权（见 src/lib/importAuth.ts），不依赖 Supabase 登录会话。
  // 之前这里没有把它排除在外，导致任何未登录的请求（包括导入脚本用 curl 发的
  // POST 请求）都会先被这层中间件当成"未登录访客"重定向到 /login，
  // 接口自身的鉴权逻辑根本没机会执行——这是一个必须排除的误拦截。
  const isImportApi = request.nextUrl.pathname.startsWith("/api/import/");

  if (!user && !isAuthPage && !isDebugLogin && !isPublicPage && !isImportApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/memorize";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
