# AGENTS.md

## 项目概览

- 为爱下厨 - 点菜小程序：移动端优先的家庭厨房风格点菜应用（菜谱浏览、智能配餐、菜单/收藏、智能推荐）。
- 目录：`client/`（Vue 3 前端）、**`miniapp/`（微信小程序端，uni-app Vue3，与 Web 端共用后端）**、`server/`（NestJS 10 后端）、`shared/`（前后端共享 API 类型）、`scripts/`（启动/构建/CI 脚本）、`data/`（SQLite 库，自动生成）。
- 技术栈：Vue 3 + TypeScript + Tailwind v4 + Vite 7 / **uni-app Vue3** / NestJS 10 + Drizzle ORM / **SQLite（better-sqlite3，默认）**。

## miniapp 微信小程序端（uni-app）

- 结构：`miniapp/src/pages/`（index 首页 / menu 菜单 / order 点菜 / cart 已选 / recommend 智能推荐 / dish 详情）、`miniapp/src/components/DishCard.vue`、`miniapp/src/api/`（`uni.request` 封装，`request.ts` 里 `BASE_URL` 默认 `http://127.0.0.1:3000`，上线改 HTTPS 域名）、`miniapp/src/utils/`（`device.ts` 用 `uni` storage 存 deviceId）。
- 与 Web 端共用 `server/` 与 `shared/api.interface.ts`（miniapp 内相对导入 `../../../shared/api.interface`）。
- 命令：`cd miniapp && npm run dev:mp-weixin`（产物 `dist/dev/mp-weixin`，微信开发者工具导入，需勾选「不校验合法域名」）/ `npm run build:mp-weixin`（产物 `dist/build/mp-weixin`）。
- 关键差异：无 DOM/window，弹窗用覆盖层 view、确认用 `uni.showModal`、Toast 用 `uni.showToast`、页面跳转 `uni.switchTab`/`navigateTo`；`manifest.json` 填 appid，`uni.request` 的 TS 类型不含 PATCH（运行时传字符串可用）。

## 架构要点（从文件名看不出来）

- **前端是「React 壳 + Vue 3 内核」混合体**：`client/src/index.tsx` 用 React（ErrorBoundary + Toaster）渲染外壳，内部 `client/src/app.tsx` 通过 `createApp()` 挂载 Vue 3 应用（vue-router **hash** 路由）。
- 页面/组件是 **Vue `defineComponent` 渲染函数组件，以 `.ts` 文件存放**（如 `pages/HomePage/HomePage.ts`、`components/DishCard.ts`、`App.ts`），不是 `.vue` SFC。文件顶部统一带 `/* eslint-disable react-hooks/rules-of-hooks */`，新页面照抄此模式。UI 用 `h()` 手写 hyperscript + Tailwind class。
- 前端路由表在 `client/src/app.tsx` 的 `routes` 数组（`/` 下挂 `menu`/`order`/`cart`/`recommend`/`dish/:id`）；底部导航在 `client/src/App.ts`。
- 后端 NestJS：业务模块在 `server/modules/`；`ViewModule` 是兜底路由，**必须最后注册**；`DatabaseModule` 是 `@Global`，提供 `DATABASE` 注入 token（`@Inject(DATABASE)` 使用，类型 `AppDatabase`）。
- **数据库**：默认 SQLite（`data/app.db`），启动时自动建表 + 播种 26 道菜（`seed-dishes.ts`）。**`DB_TYPE=postgres` 未实现，会直接 throw**。
- 前后端共享的接口类型集中在 `shared/api.interface.ts`，改接口先改这里。
- 全局异常过滤器 `server/common/filters/exception.filter.ts` 把所有异常包装成统一信封：`{ error: { code, message, details, timestamp } }`。

## 路径别名

| 别名        | 指向           | 适用            |
| ----------- | -------------- | --------------- |
| `@/*`       | `client/src/*` | client          |
| `@shared/*` | `shared/*`     | client + server |
| `@server/*` | `server/*`     | server          |
| `@client/*` | `client/*`     | client          |

## 常用命令

- 启动：`npm run dev`（`scripts/dev-local.js`，跨平台，用 concurrently 或原生 spawn 同时起前后端）。端口：后端 3000、前端 8080、后端调试 inspect 9229。
- 分开启动：`npm run dev:server` / `npm run dev:client`（均用 `cross-env NODE_ENV=...`，Windows 可直接跑，无需 bash）。
- 验证：`npm run lint`（`scripts/lint.js`，**串行**跑 eslint → type:check → stylelint，全部跑完再聚合退出码）。局部查：`npm run lint -- --files <paths>`。快速自查：`npm run type:check:server` / `npm run type:check:client`。
- 测试：`npm test` / `npm run test:watch`（jest + ts-jest）。**单测**：`npx jest <相对路径>`（testMatch 覆盖 `server/**/*.spec.ts` 与 `test/unit/**/*.spec.ts`，测试文件与源码同目录放置）。
  - 注意：**当前仓库没有任何测试用例**。新增测试放在被测文件旁，如 `server/modules/dishes/dishes.service.spec.ts`。
  - `npm run test:e2e` **是坏的**（指向不存在的 `test/e2e/jest.config.js`），勿用。
- 构建：`npm run build`（= build:prod → build:server + build:client，产物 `dist/`）。`scripts/build.sh` 是完整生产管线（路由生成、并行构建、依赖裁剪）。
- 格式化：`npm run format`（prettier 全量写回）。
- 数据库：`npm run gen:db-schema` 只重新生成**过时的 pg `schema.ts`**；SQLite 的 `schema.sqlite.ts` 是手写的，不受此命令影响。
- `start.bat`：Windows 一键启动（检查 Node → 装依赖 → 起 dev）。`.vscode/` 有调试配置（attach 9229 / 前端 Chrome / 全栈）。

### 测试约定

- jest 配置在 `package.json`：`preset: ts-jest`、`testEnvironment: node`，只匹配 `server/**/*.spec.ts` 与 `test/unit/**/*.spec.ts`（`.e2e-spec.ts` 被 tsconfig 排除，不跑）。
- 单测与被测源码同目录放置；service 依赖 `@Inject(DATABASE)` 时用 `@nestjs/testing` + mock 或内存 SQLite 注入，别起真服务。
- 目前仓库无任何测试，先照 `dishes.service.ts` 的结构补一个最小 spec 验证再批量。

## 目录结构速览

- `server/database/`：`schema.sqlite.ts`（**手写 SQLite schema，实际使用**）、`seed-dishes.ts`（26 道菜种子数据）、`schema.ts`（过时 pg 遗留，勿用）。
- `server/modules/`：`database/`（全局 DB 模块）、`dishes/`（业务示例）、`view/`（兜底）、`hello/`（死代码）。
- `server/common/`：`filters/exception.filter.ts`（全局异常信封）、`interfaces/`（`BusinessException`、`ApiErrorResponse`）、`constants/api_response_code.ts`（`ResponseCode` 枚举 + 映射）。
- `client/src/`：`app.tsx`（路由）、`App.ts`（底部导航）、`pages/`、`components/`（`ui/` shadcn 风格 + 业务组件如 `DishCard.ts`）、`api/dishes.ts`（axios 封装）、`utils/`（`device.ts`、`logger.ts`、`constants.ts`）。

## 代码风格规范

### 格式化（Prettier，`.prettierrc`）

- `semi: true`、`singleQuote: true`、`trailingComma: all`、`printWidth: 80`、2 空格缩进。
- 改完用 `npm run format` 或编辑器保存格式化，别手调缩进/引号。

### Lint（`eslint.config.js`）

- 继承 `@lark-apaas/fullstack-presets` 的 client/server 预设；client 侧额外关掉 `no-console`、`no-restricted-syntax`、`@lark-apaas/require-app-container`。
- `import/resolver` 已配好 `@`/`@client`/`@shared`/`@server` 别名映射，别手改。

### 环境变量（`.env`，参考 `.env.example`）

- `DB_TYPE`（sqlite 默认 / postgres 未实现）、`DB_PATH`（默认 `./data/app.db`）、`SERVER_HOST`/`SERVER_PORT`（默认 `localhost:3000`）、`CLIENT_ORIGIN`（CORS）、`CLIENT_DEV_PORT`（默认 8080）、`CLIENT_BASE_PATH`、`LOG_DIR`。
- `scripts/dev-local.js` 会在启动时手动解析 `.env` 注入 `process.env`（不覆盖已存在变量）。

### 导入（import）

- 顺序：node/外部依赖 → 空行 → 项目别名（`@server`/`@shared`/`@client`/`@`）→ 相对导入。
- 仅类型时用 `import type { ... }`（观察 `dishes.service.ts`、`app.tsx` 的写法）。

### 类型

- 方法/函数显式标注返回类型与参数类型，不依赖隐式推断。
- 前后端共享类型一律进 `@shared/api.interface`；DB 行类型用 `typeof table.$inferSelect` 派生或显式 type 别名（如 `DishSelect`）。
- 避免 `any`（历史渲染代码里传 `h()` 子节点可用 `any[]` 例外）；DTO/请求体定义在 shared 接口里。

### 命名

- 组件/类/接口：PascalCase；函数/变量/参数：camelCase；常量/枚举成员：UPPER_SNAKE（如 `SEED_DISHES`、`ResponseCode.SUCCESS`）。
- 类私有成员用 `private`，不加 `_` 前缀。

### 后端错误处理（重点）

- Service：每个公开方法 try/catch → `this.logger.error(\`...${JSON.stringify(error)}\`)` → **rethrow**（不吞错）。
- Controller：先校验入参（如 `Number()`/`parseInt` + `isNaN`），非法抛 `BadRequestException`；找不到资源抛 `NotFoundException`。
- 业务错误：抛 `BusinessException`（`ResponseCode` + message + httpStatus），由全局过滤器统一转成信封格式。
- 不要在 service 层直接返回 `null` 表示「不存在」——抛异常让全局过滤器兜底。

### 数据库访问（Drizzle + better-sqlite3）

- 同步 API：`.all()`（多条）/ `.get()`（单条）/ `.run()`（写）。
- 幂等插入用 `.onConflictDoNothing({ target: [...] })`；时间戳用 `new Date().toISOString()`；ID 用 `randomUUID()`。
- Service 里用 `mapDish`/`mapCartItem` 之类的私有映射函数把 DB 行转成 shared 类型，别在控制器里做映射。
- 表：`dish`（菜品）、`cart_item`（菜单）、`favorite`（收藏）、`guest_user`（游客）；cart/favorite 均按 `device_id` 维度存储（见下「游客身份」）。
- `DatabaseModule` 初始化 SQLite：`journal_mode = WAL` + `foreign_keys = ON`；建表用 `CREATE TABLE IF NOT EXISTS`；`dish` 表为空时播种 `SEED_DISHES`。

### 前端组件

- 新页面 = Vue `defineComponent` + 渲染函数，复用 `components/ui/`（shadcn 风格）与 `components/DishCard.ts`；图标用 `lucide-vue-next`。
- 参考 `DishCard.ts` 的组件形态：props 用 `Object as PropType<...>` 标注类型，子组件事件用 `emits` 声明 + `emit(...)`。
- 页面取数参考 `HomePage.ts`：`ref` + `onMounted` 拉数据，配 `isMounted` 守卫防止卸载后赋值，loading/error 用 `ref` 驱动渲染分支。
- 样式用 Tailwind 语义类（`bg-primary`、`font-handwriting`、`text-muted-foreground` 等），主题 token 在 `client/src/tailwind-theme.css`；`index.css` 是入口。
- API 调用统一走 `client/src/api/dishes.ts` 里的 axios 实例；游客身份靠 `utils/device.ts` 的 `getDeviceId()`（localStorage），请求头 `x-device-id`。

### 注释与文案

- 业务注释、日志、UI 文案用中文；导出类/常量加 `/** */` docblock（中文）。

## 新增一个业务模块（照抄 dishes 即可）

1. `server/modules/<name>/` 建 `*.module.ts` + `*.service.ts` + `*.controller.ts`（Service try/catch + rethrow，Controller 校验入参）。
2. 在 `server/app.module.ts` 的 `@route-section: business-modules` 区间内注册（**别放 ViewModule 后面**）。
3. 请求/响应类型加进 `shared/api.interface.ts`，DB 行类型从 `schema.sqlite.ts` 派生。
4. 前端 `client/src/api/<name>.ts` 封装 axios 调用，页面挂到 `client/src/app.tsx` 路由表。
5. 数据库表：在 `schema.sqlite.ts` 定义 + `DatabaseModule.createTablesIfNeeded()` 加 `CREATE TABLE IF NOT EXISTS`。

## 菜品管理（dish CRUD + 图片）

- 分类是 6 个英文 id（`meat/veg/cold/soup/staple/dessert`，见 `client/src/utils/constants.ts` 与 `seed-dishes.ts` 的 `CATEGORY_COLORS`），`dish.category` 存的就是这个 id；`seed-dishes.ts` 里 `dish.color` 按分类色赋值，新增/改分类时 service 会自动用 `CATEGORY_COLORS[category]` 赋色。
- 写接口：`POST /api/dishes`（新增）、`PATCH /api/dishes/:id`（改分类/步骤/图片等任意字段）、`DELETE /api/dishes/:id`；`POST /api/dishes/upload`（multer 上传图片到 `data/uploads/`，返回 `/api/dishes/image/<file>`，由 `GET /api/dishes/image/:filename` 流式返回）。
- 前端：菜单页「管理」按钮弹窗新增；详情页「编辑/删除」支持全字段编辑（含烹饪步骤、图片 URL 或本地上传）。
- 图片走 `/api` 前缀而非静态目录：dev 下被 Vite 代理到后端、prod 下与页面同源，别改成 `/uploads` 之类没代理的路径。

## 关键约定与坑

- **当前仓库不是 git 仓库**（无 `.git`）。`.githooks/pre-commit` 会跑全量 `npm run lint`；一旦 init git 生效可用 `SKIP_GIT_HOOKS=1` 或 `--no-verify` 绕过。
- **`server/database/schema.ts`（pg）是过时遗留**，应用实际用 `schema.sqlite.ts`；不要改/用旧的 pg schema。
- `server/modules/hello/` 是模板遗留死代码（未注册进 `app.module.ts`），不要"顺手修复"。
- Node ≥ 22（`engines` 声明）；`.npmrc` 固定 `registry.npmmirror.com`。
- **better-sqlite3 原生绑定强绑定安装时的 Node 版本**：本机 node_modules 在 Node 22.20.0 下安装，**只能在 22.20.0 上运行**。用 nvm 切到其它版本（如 20.19/22.12）后 `new Database()` 会直接**段错误**，表现是 `npm run dev:server` 卡在 `Starting Nest application...` 后无日志（DB 初始化即崩）。切 Node 版本后必须 `npm rebuild better-sqlite3`（或删 node_modules 重装）让 prebuilt 匹配当前版本，并保持运行版本与安装版本一致。
- 若 `dev:server` 启动即"挂起"：优先怀疑 ① 有孤儿 node 进程占着端口/DB（`tasklist` 排查后 taskkill），② Node 版本与原生模块不匹配（如上）。
- `client/src/api/gen/` 为构建期生成的代码（当前不存在），受限目录，不要手改。
- SQLite 数据自动建表 + 播种；想重置就删 `data/app.db`（会重新初始化）。
- `dist/` 是构建产物目录，别手改。
- 样式：Tailwind v4 + shadcn `new-york` 风格（`components.json`）。

## 开发闭环

改完代码以 `npm run lint`（含 type:check）作为验证基准；涉及 SQLite 表结构时删 `data/app.db` 重验启动。
