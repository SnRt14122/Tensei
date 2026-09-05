// 词库/语法点导入接口的鉴权辅助函数。
//
// 这两个导入接口是"纯后端API + 脚本"的形态（不做管理页面），调用方是你自己写的
// 导入脚本（用 curl/Postman 等直接调用），不是普通登录用户，所以不用 Supabase Auth 的
// session 鉴权，而是用一个单独的密钥（IMPORT_API_SECRET 环境变量）做校验：
// 请求头带上 `Authorization: Bearer <密钥>` 才能通过。
//
// 这样设计的好处：密钥只需要配在服务器环境变量里，不会出现在任何前端代码/浏览器请求里，
// 泄露风险比"暴露 service role key 给某个页面"低很多。

import { NextRequest, NextResponse } from "next/server";

/**
 * 校验导入请求的密钥。校验失败时返回一个可以直接 return 的 401 响应；
 * 校验通过则返回 null（调用方继续往下执行业务逻辑）。
 */
export function checkImportAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.IMPORT_API_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "服务器未配置 IMPORT_API_SECRET，导入接口已禁用" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "");

  if (provided !== expected) {
    return NextResponse.json({ error: "未授权：密钥不正确" }, { status: 401 });
  }

  return null;
}
