# ============================================================
# 为爱下厨 - 生产镜像（多阶段构建）
#
# 说明:
#   - builder 阶段用完整 node:22.20.0-bookworm（自带编译工具），
#     better-sqlite3 预编译失败时可源码编译兜底，产物与运行镜像 ABI 一致。
#   - runtime 阶段用 slim 镜像，只拷贝构建产物 + 生产依赖，镜像更小。
#   - SQLite 数据/上传图片/logs 走宿主机数据卷（见 docker-compose.yml），
#     重建容器不丢数据。
# ============================================================
FROM node:22.20.0-bookworm AS builder

WORKDIR /app

# 先装依赖（利用 Docker 层缓存；.npmrc 指定 npmmirror 源）
COPY .npmrc package.json package-lock.json ./
RUN npm ci

# 复制源码并构建（server + client -> dist/）
COPY . .
RUN npm run build:prod

# 裁剪开发依赖，只保留运行所需
RUN npm prune --omit=dev

# ────────────────────── 运行阶段 ──────────────────────
# 说明：运行阶段复用与构建一致的 node:22.20.0-bookworm，避免额外拉取 slim 镜像
# （国内网络 Docker Hub 拉取慢/不稳时更省事；镜像略大但功能一致）。
FROM node:22.20.0-bookworm AS runtime

ENV NODE_ENV=production \
    SERVER_HOST=0.0.0.0 \
    SERVER_PORT=3000 \
    DB_PATH=./data/app.db \
    LOG_DIR=./logs \
    CLIENT_ORIGIN=* \
    CLIENT_BASE_PATH=/

WORKDIR /app

# 从 builder 拷贝产物（node_modules 已含匹配 ABI 的 better-sqlite3）
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# SQLite 数据 + 上传图片 + 日志（宿主机卷持久化）
VOLUME ["/app/data", "/app/logs"]

CMD ["node", "dist/server/main.js"]
