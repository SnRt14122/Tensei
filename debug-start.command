#!/bin/bash
# 双击此文件：启动开发服务器并自动用测试账号登录打开网页。
# 仅用于本地测试，不要在生产环境使用。

set -e
cd "$(dirname "$0")"

if [ ! -f .env.local ]; then
  echo "未找到 .env.local，请先复制 .env.local.example 并填入 Supabase 配置，"
  echo "同时加入 ENABLE_DEBUG_LOGIN=true / DEBUG_TEST_EMAIL / DEBUG_TEST_PASSWORD。"
  read -p "按回车关闭窗口..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "首次运行，正在安装依赖..."
  npm install
fi

PORT=3000
URL="http://localhost:$PORT/debug-login"

# 后台启动开发服务器
npm run dev -- -p $PORT &
DEV_PID=$!

# 等待服务器就绪后再打开浏览器
echo "等待开发服务器启动..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:$PORT"; then
    break
  fi
  sleep 1
done

open "$URL"

echo "已打开 $URL"
echo "关闭此窗口或按 Ctrl+C 可停止开发服务器。"
wait $DEV_PID
