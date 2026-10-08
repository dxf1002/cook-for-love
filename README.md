# 为爱下厨 - 点菜小程序 🍳

一个温馨治愈的家庭厨房风格点菜 Web 应用，支持菜谱浏览、智能配餐推荐、菜单管理、菜品收藏等功能。

## ✨ 功能特性

- 🏠 **首页**：温馨氛围图 + 快捷入口 + 今日推荐横滑菜品
- 📖 **菜单浏览**：左侧分类侧边栏 + 右侧菜品列表，一键加入菜单
- 🍽️ **智能点菜**：四种套餐模式（简单吃/两人食/丰盛点/自由选），分类进度一目了然
- 📝 **菜谱详情**：大图展示 + 食材清单 + 分步烹饪步骤 + 小贴士
- 🛒 **已选菜单**：按分类分组，统计菜品数量/总用时/分类覆盖
- ❤️ **菜品收藏**：收藏喜欢的菜品，随时翻看
- 💾 **数据持久化**：本地 SQLite 数据库，刷新不丢失
- 🎯 **智能推荐**：基于已选菜品推荐搭配

## 🛠️ 技术栈

- **前端**：Vue 3 + TypeScript + Tailwind CSS + Vite
- **后端**：NestJS 10 + TypeScript + Drizzle ORM
- **数据库**：SQLite（默认，零配置）/ PostgreSQL（可选）
- **UI 组件**：Radix UI + shadcn/ui 风格

## 📋 环境要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 22.0.0 | 推荐 LTS 版本 |
| npm | >= 10.0.0 | 随 Node.js 一起安装 |
| VS Code | 最新版 | 推荐开发编辑器 |

> 💡 **检查版本**：打开终端（Win+R，输入 cmd，回车），运行 `node -v` 和 `npm -v`

## 🚀 Windows 一键启动

最简单的方式：双击项目根目录下的 **`start.bat`** 文件。

脚本会自动：
1. 检查 Node.js 是否安装
2. 首次运行自动安装依赖（npm install）
3. 同时启动前后端开发服务器
4. 输出访问地址

启动成功后：
- 🌐 **前端页面**：http://localhost:8080
- 🔌 **后端 API**：http://localhost:3000
- 🔍 **调试端口**：9229（后端 inspect）

## 🚀 手动启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动成功后访问 http://localhost:8080

### 3. 其他命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前后端开发服务器 |
| `npm run dev:server` | 仅启动后端（端口 3000） |
| `npm run dev:client` | 仅启动前端（端口 8080） |
| `npm run build` | 构建生产版本 |
| `npm run type:check` | 全量 TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |

## 💾 数据库说明

### 默认：SQLite（零配置）

开箱即用，无需安装任何数据库服务。数据库文件位于：

```
data/app.db
```

首次启动时自动：
- ✅ 创建数据库文件
- ✅ 创建所有数据表
- ✅ 插入 26 道家常菜示例数据

### 可选：PostgreSQL

如果需要使用 PostgreSQL，修改 `.env` 文件：

```env
DB_TYPE=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/cooking_app
```

> ⚠️ PostgreSQL 模式需要自行建表和迁移。推荐日常开发使用默认的 SQLite。

## 🔧 环境变量配置

复制 `.env.example` 为 `.env` 并按需修改：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DB_TYPE` | `sqlite` | 数据库类型：sqlite / postgres |
| `DB_PATH` | `./data/app.db` | SQLite 数据库文件路径 |
| `SERVER_HOST` | `0.0.0.0` | 服务端监听地址 |
| `SERVER_PORT` | `3000` | 服务端端口 |
| `CLIENT_ORIGIN` | `*` | CORS 允许的前端源 |
| `CLIENT_DEV_PORT` | `8080` | 前端开发服务器端口 |
| `NODE_ENV` | `development` | 运行环境 |

## 🐛 VS Code 调试

项目已配置好 VS Code 调试支持。打开调试面板（F5）即可看到三个配置：

| 配置 | 说明 |
|------|------|
| **后端调试 (Attach)** | 附加到运行中的 NestJS 进程（端口 9229） |
| **前端调试 (Chrome)** | 启动 Chrome 并连接前端调试 |
| **全栈调试** | 同时启动前后端调试 |

### 调试步骤

1. 在终端运行 `npm run dev` 启动开发服务器
2. 在 VS Code 中按 `F5`，选择「全栈调试」
3. 在代码行号左侧点击设置断点
4. 在浏览器中操作触发对应逻辑，VS Code 会停在断点处

### 推荐扩展

项目根目录的 `.vscode/extensions.json` 已列出推荐扩展，第一次打开项目时 VS Code 会提示安装。主要包括：

- **Vue.volar** — Vue 3 语法支持
- **dbaeumer.vscode-eslint** — ESLint 代码检查
- **bradlc.vscode-tailwindcss** — Tailwind CSS 智能提示
- **alexcvzz.vscode-sqlite** — SQLite 数据库浏览

## 📁 项目结构

```
├── client/                 # 前端 Vue 应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── api/            # API 请求封装
│   │   ├── utils/          # 工具函数
│   │   └── components/     # 通用组件
│   └── index.html          # HTML 入口
├── server/                 # 后端 NestJS 应用
│   ├── main.ts             # 应用入口
│   ├── app.module.ts       # 根模块
│   ├── modules/
│   │   ├── database/       # 数据库模块
│   │   ├── dishes/         # 菜品业务模块
│   │   └── view/           # 视图渲染模块
│   └── database/
│       ├── schema.sqlite.ts # SQLite schema 定义
│       └── seed-dishes.ts  # 菜品种子数据
├── shared/                 # 前后端共享类型
│   └── api.interface.ts    # API 接口类型定义
├── scripts/                # 构建脚本
│   ├── dev-local.js        # 本地开发启动脚本（跨平台）
│   └── postinstall.js      # postinstall 脚本
├── data/                   # SQLite 数据库文件（自动生成）
├── .vscode/                # VS Code 配置
├── .env.example            # 环境变量示例
├── start.bat               # Windows 一键启动脚本
└── package.json
```

## ❓ 常见问题

### Q: 安装依赖失败 / 卡在某处不动

**原因**：网络问题导致 npm 包下载缓慢。

**解决方法**：

```bash
# 切换到国内镜像源
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install
```

### Q: 端口被占用（EADDRINUSE）

**原因**：3000 或 8080 端口已被其他程序占用。

**解决方法**：
- 方法一：关闭占用端口的程序
- 方法二：修改 `.env` 中的 `SERVER_PORT` 或 `CLIENT_DEV_PORT` 为其他端口

### Q: better-sqlite3 安装失败

**原因**：Windows 下编译原生模块需要 C++ 构建工具。

**解决方法**：

1. 以管理员身份打开 PowerShell，运行：
   ```powershell
   npm install --global windows-build-tools
   ```
   或安装「Visual Studio Build Tools」并勾选「Desktop development with C++」

2. 重新安装依赖：
   ```bash
   npm rebuild better-sqlite3
   ```

### Q: 前端页面空白

**原因**：可能是 Vite 热更新或路由问题。

**解决方法**：
1. 刷新浏览器（F5）
2. 检查控制台是否有报错（F12 → Console）
3. 重启开发服务器

### Q: 数据库数据错乱 / 想重置

**解决方法**：删除 `data/app.db` 文件，重启开发服务器即可重新初始化。

```bash
# Windows (cmd)
rmdir /s /q data

# PowerShell / Linux / macOS
rm -rf data
```

### Q: 后端调试断点不生效

**原因**：可能是 sourceMap 未生成或路径不匹配。

**解决方法**：
1. 确认 `nest-cli.json` 中 `compilerOptions.sourceMap` 为 `true`
2. 确认 launch.json 的 `outFiles` 路径正确
3. 删除 `dist` 目录后重启

## 📝 开发说明

### 数据持久化

用户的菜单选择和收藏数据存储在本地 SQLite 数据库中，通过 `device_id` 标识不同用户（首次访问自动生成，保存在浏览器 localStorage 中）。即使刷新页面或重启服务器，数据也不会丢失。

### API 接口

所有业务接口以 `/api/dishes` 为前缀：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dishes` | 获取菜品列表（支持分类筛选） |
| GET | `/api/dishes/:id` | 获取菜品详情 |
| GET | `/api/dishes/cart/list` | 获取已选菜单 |
| POST | `/api/dishes/cart/:dishId` | 加入菜单 |
| DELETE | `/api/dishes/cart/:dishId` | 从菜单移除 |
| DELETE | `/api/dishes/cart` | 清空菜单 |
| GET | `/api/dishes/favorites/list` | 获取收藏列表 |
| POST | `/api/dishes/favorites/:dishId` | 收藏菜品 |
| DELETE | `/api/dishes/favorites/:dishId` | 取消收藏 |

## 📄 License

MIT
