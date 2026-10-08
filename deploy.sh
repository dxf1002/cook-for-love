#!/usr/bin/env bash
# ============================================================
# 为爱下厨 - 服务器一键部署脚本（幂等，可重复执行）
#
# 用法:
#   bash deploy.sh                     # 默认端口 3000
#   bash deploy.sh 8080                # 指定端口
#   CLIENT_ORIGIN=https://你的域名 bash deploy.sh   # 指定 CORS 白名单
#
# 前置:
#   - Linux + Node.js 22.20.0（better-sqlite3 强绑定安装时的 Node 版本）
#   - 代码已放在本目录（含 package-lock.json）
#
# 流程: 检查环境 → 装依赖 → 重建原生模块 → 生产构建 → 写 PM2 配置 → 启动 → 健康检查
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${1:-3000}"
ORIGIN="${CLIENT_ORIGIN:-*}"
APP_NAME="cooking-app"

log()  { echo -e "\033[1;34m==>\033[0m $*"; }
ok()   { echo -e "\033[1;32m✅\033[0m $*"; }
warn() { echo -e "\033[1;33m⚠️ \033[0m $*"; }

# ───────────────────────── 1/6 环境检查 ─────────────────────────
log "1/6 检查 Node 环境"
command -v node >/dev/null 2>&1 || { echo "❌ 未安装 Node.js（需要 22.20.0）"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ 未安装 npm"; exit 1; }

NODE_VERSION="$(node -p 'process.version')"
NODE_MODULES_ABI="$(node -p 'process.versions.modules')"
echo "   Node ${NODE_VERSION} (ABI ${NODE_MODULES_ABI})"
if [ "$NODE_MODULES_ABI" != "127" ]; then
  warn "better-sqlite3 原生绑定按 ABI 匹配 Node。若安装时的 Node 版本与此不同，第 3 步会重建。"
fi
ok "环境检查完成"

# ───────────────────────── 2/6 安装依赖 ─────────────────────────
log "2/6 安装依赖"
if [ -f package-lock.json ]; then
  npm ci --registry=https://registry.npmmirror.com || npm install --registry=https://registry.npmmirror.com
else
  npm install --registry=https://registry.npmmirror.com
fi
ok "依赖安装完成"

# ───────────────────────── 3/6 重建原生模块 ─────────────────────
log "3/6 重建 better-sqlite3（匹配当前 Node）"
if ! npm rebuild better-sqlite3 --registry=https://registry.npmmirror.com; then
  warn "better-sqlite3 重建失败。Linux 常见原因："
  warn "  - 下载预编译失败 → 需安装编译工具: apt install -y build-essential python3"
  warn "  - GitHub 不可达 → 设置 HTTPS_PROXY 后重试"
  warn "继续执行，但服务可能无法启动，请在修复后重跑本脚本。"
fi
ok "原生模块处理完成"

# ───────────────────────── 4/6 生产构建 ─────────────────────────
log "4/6 生产构建（server + client）"
npm run build:prod
ok "构建完成：dist/"

# ───────────────────────── 5/6 写 PM2 配置 ──────────────────────
log "5/6 生成 PM2 配置（ecosystem.config.js）"
cat > ecosystem.config.js <<EOF
// 由 deploy.sh 生成，可手动修改后执行 pm2 startOrReload ecosystem.config.js
module.exports = {
  apps: [
    {
      name: '${APP_NAME}',
      script: './dist/server/main.js',
      cwd: '${ROOT_DIR}',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      time: true,
      env: {
        NODE_ENV: 'production',
        SERVER_HOST: '0.0.0.0',
        SERVER_PORT: '${PORT}',
        CLIENT_ORIGIN: '${ORIGIN}',
        DB_TYPE: 'sqlite',
        DB_PATH: './data/app.db',
        LOG_DIR: './logs',
        CLIENT_BASE_PATH: '/',
      },
    },
  ],
};
EOF
ok "PM2 配置已生成"

# ───────────────────────── 6/6 启动 + 健康检查 ──────────────────
log "6/6 启动服务（PM2）"
command -v pm2 >/dev/null 2>&1 || npm i -g pm2
pm2 startOrReload ecosystem.config.js
pm2 save >/dev/null 2>&1 || true

echo ""
log "健康检查"
for i in $(seq 1 10); do
  sleep 2
  if curl -sf -m 3 "http://127.0.0.1:${PORT}/api/dishes" -o /dev/null; then
    ok "服务已就绪"
    break
  fi
done
HEALTH="$(curl -s -m 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/dishes" || true)"
if [ "$HEALTH" = "200" ]; then
  echo ""
  ok "部署完成 ✅"
  echo ""
  echo "   后端 API:  http://127.0.0.1:${PORT}/api/dishes"
  echo "   Web 端:    http://127.0.0.1:${PORT}/"
  echo "   进程管理:   pm2 logs ${APP_NAME}  /  pm2 restart ${APP_NAME}"
  echo "   开机自启:   pm2 startup && pm2 save"
  echo ""
  echo "   下一步（HTTPS + 域名，小程序必需）:"
  echo "     nginx 反代 ${PORT} 端口到你的已备案域名 + certbot 签发证书"
  echo "     小程序端: miniapp/src/api/request.ts 的 BASE_URL 改为 https://域名"
  echo "     miniapp 填 appid 后 npm run build:mp-weixin，微信开发者工具上传发布"
else
  warn "健康检查未通过（HTTP ${HEALTH:-无响应}）。请查看日志: pm2 logs ${APP_NAME}"
  exit 1
fi
