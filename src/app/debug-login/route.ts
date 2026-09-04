import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 仅供本地测试使用的免登录入口：
 * 用固定的测试账号自动登录，数据统一挂在这个账号下（可在 Supabase 后台的
 * auth.users / user_word_progress 表里看到，方便管理员统一查看测试数据）。
 *
 * 安全限制：
 * - 生产环境（NODE_ENV === "production"）下直接返回 404，不会生效。
 * - 必须显式设置 ENABLE_DEBUG_LOGIN=true 才会启用，避免误开。
 * - 测试账号的邮箱密码只从服务端环境变量读取，不会暴露给浏览器。
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  if (process.env.ENABLE_DEBUG_LOGIN !== "true") {
    return new NextResponse(
      "调试登录未启用。请在 .env.local 中设置 ENABLE_DEBUG_LOGIN=true，并配置 DEBUG_TEST_EMAIL / DEBUG_TEST_PASSWORD。",
      { status: 403 }
    );
  }

  const email = process.env.DEBUG_TEST_EMAIL;
  const password = process.env.DEBUG_TEST_PASSWORD;
  if (!email || !password) {
    return new NextResponse(
      "缺少 DEBUG_TEST_EMAIL / DEBUG_TEST_PASSWORD 环境变量，请先在 .env.local 中配置测试账号。",
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return new NextResponse(
      `测试账号登录失败：${error.message}\n请确认该账号已在 Supabase 中创建（Authentication -> Users），且邮箱/密码与 .env.local 一致。`,
      { status: 500 }
    );
  }

  return NextResponse.redirect(new URL("/memorize", request.url));
}
