# XIAOJUSURVEY（小桔调研）

## 项目概览

XIAOJUSURVEY 是滴滴开源的一套轻量、安全的调研系统（Apache License 2.0），用于构建各类问卷、考试、测评和复杂表单。仓库地址：`didi/xiaoju-survey`。官方文档：https://xiaojusurvey.didi.cn。

这是一个**前后端分离的单仓（monorepo）**项目，无根级 `package.json`，两个独立子工程各自管理依赖：

- `server/` — 服务端：NestJS 10 + TypeORM + MongoDB（Node >= 18，npm >= 8.6）
- `web/` — 前端：Vue 3 + Vite 5 + ElementPlus + Pinia（多页应用 MPA，含 B 端管理端和 C 端渲染端）

其他顶层内容：

- `Dockerfile` / `Dockerfile.full` / `docker-compose.yaml` / `docker-run.sh` / `nginx/nginx.conf` — Docker 化部署方案
- `.github/workflows/` — CI（server-lint.yml、web-lint.yml、codecov.yml）
- `README.md`（中文）/ `README_EN.md`

## 服务端（server/）

### 技术栈与运行架构

- NestJS 10 + Express（`@nestjs/platform-express`），TypeScript 5.5
- MongoDB 通过 TypeORM（`typeorm@0.3`）连接，连接串来自环境变量 `XIAOJU_SURVEY_MONGO_URL`（见 `server/src/app.module.ts`）
- 配置加载：`ConfigModule` 按 `NODE_ENV` 动态加载对应的 `.env.{NODE_ENV}` 文件（`.env`、`.env.development`、`.env.production`，含密钥，勿提交或泄露）
- 默认端口 3000（`PORT` 环境变量可覆盖）；Swagger 文档挂在 `/swagger`
- `ServeStaticModule` 托管 `server/public/` 下的静态页面（management.html、render.html 等，生产构建时由 Docker 复制 web 产物）
- 日志：log4js，统一封装在 `server/src/logger/`
- AI 生成问卷能力通过环境变量 `AImodel_API_URL` / `AImodel_API_KEY` / `AImodel_MODEL` 接入外部 LLM

### 常用命令（在 server/ 目录下执行）

```bash
npm install
npm run local        # 本地开发推荐：自动启动 mongodb-memory-server 内存数据库 + nest start --watch（无需本地装 MongoDB）
npm run start:dev    # 开发模式（需要自行提供 XIAOJU_SURVEY_MONGO_URL）
npm run build        # nest build，产物在 dist/
npm run start:prod   # NODE_ENV=production node dist/main
npm run lint         # eslint --fix
npm run format       # prettier --write
npm test             # jest
npm run test:cov     # jest --coverage
```

### 代码组织（server/src/）

标准 NestJS 分层，入口 `main.ts` → `app.module.ts`：

- `modules/` — 业务模块，每个模块内含 `controllers/`、`services/`、`dto/`、`__test/` 及 `*.module.ts`：
  - `auth` — 登录注册、验证码（svg-captcha）、JWT 鉴权
  - `survey` — 问卷核心：元信息、配置、历史、分组、协作、回收站、数据统计、下载任务、AI 生成（含 `template/` 问卷模板物料）
  - `surveyResponse` — 答卷回收与响应 schema
  - `workspace` — 空间/团队协同与多角色权限
  - `channel` — 投放渠道
  - `message` — 消息推送任务与日志（自定义 Hook 集成）
  - `file` — 文件上传下载（local / ali-oss / minio / qiniu 多种存储 handler）
  - `appManager` — 应用配置
  - `upgrade` — 数据升级脚本
- `models/` — TypeORM 实体（`*.entity.ts`），新实体必须在 `app.module.ts` 的 `entities` 数组中注册
- `enums/` — 枚举，含 `exceptionCode.ts` 统一异常码
- `exceptions/` — `HttpException` 及各业务异常 + 全局 `HttpExceptionsFilter`（经 `APP_FILTER` 注册）
- `guards/` — 鉴权守卫（`Authentication`、`SurveyGuard`、`WorkspaceGuard` 等），配合 `@SetMetadata` 声明权限
- `securityPlugin/` — 安全插件机制（`PluginManager` + 可插拔插件，如响应加密 `ResponseSecurityPlugin`），在 `AppModule.onModuleInit` 中注册
- `interfaces/`、`middlewares/`（请求日志中间件）、`utils/`

### 服务端编码约定

- 控制器路由统一以 `/api` 前缀（如 `@Controller('/api/survey')`）
- 入参校验用 Joi schema；DTO 放在模块 `dto/` 目录
- 业务错误抛 `HttpException`（`src/exceptions/httpException`）并携带 `EXCEPTION_CODE` 枚举码，不要直接抛 NestJS 内置异常
- 路径别名 `src/*` 可用（tsconfig paths，Jest 也配置了对应 `moduleNameMapper`）
- 鉴权接口加 `@UseGuards(Authentication)`，问卷/空间级权限分别用 `SurveyGuard`（配合 `SURVEY_PERMISSION`）和 `WorkspaceGuard`

## 前端（web/）

### 技术栈与运行架构

- Vue 3（`<script setup>` 风格为主）+ Vite 5 + vue-router 4 + Pinia 2 + ElementPlus（按需自动引入，`unplugin-vue-components` + `unplugin-auto-import` + `unplugin-icons`）
- 使用 `vite-plugin-virtual-mpa` 构建**两个独立页面应用**（`appType: 'mpa'`）：
  - **B 端管理端** `src/management/`（入口 `main.js`，路由前缀 `/management`）：登录、问卷列表、创建、编辑、发布、数据分析、下载
  - **C 端渲染端** `src/render/`（路由前缀 `/render/:surveyPath`）：答题页，B 端预览 `/management/preview/` 也复用渲染端页面
- **题型物料库** `src/materials/`（两端共用）：`questions/`（题目物料，含 B/C 端容器与各类题型 Module）、`setters/`（设置器物料）、`communals/`。题目和设置器通过 `questionLoader.js` / `setterLoader.js` 动态装载，是二次开发扩展题型的核心位置
- `src/common/` — 公共逻辑（逻辑编排引擎 `logicEngine`、富文本 Editor、XSS 过滤等）
- 路径别名：`@` → `src`，`@management`、`@materials`、`@render` → 对应子目录
- 开发服务器端口 8080，`/api`、`/exportfile`、`/userUpload` 代理到 `http://127.0.0.1:3000`（本地 server）
- 样式使用 SCSS，全局注入 `management/styles/element-variables.scss`
- 前端代码以 JavaScript 为主、TypeScript 混用；`npm run build` 会强制跑 `vue-tsc` 类型检查

### 常用命令（在 web/ 目录下执行）

```bash
npm install
npm run dev          # 即 npm run serve，启动 vite 开发服务器（端口 8080）
npm run build        # 类型检查 + 生产构建（产物在 web/dist/）
npm run type-check   # vue-tsc
npm run lint         # eslint --fix
npm run format       # prettier
```

本地开发完整流程（先起 server 再起 web）：

```bash
cd server && npm install && npm run local
cd web && npm install && npm run serve
# B端 http://localhost:8080/management
# C端 http://localhost:8080/render/:surveyPath
```

## 代码风格

- **服务端**：Prettier（单引号、trailingComma: all）+ ESLint（`@typescript-eslint/recommended` + prettier 插件），允许 `any`
- **前端**：Prettier（无分号、单引号、printWidth 100、trailingComma: none）+ ESLint（vue3-essential + @vue/eslint-config-typescript）；配置了 husky + lint-staged，提交时自动 prettier + eslint --fix
- 注释与文档主要使用中文；仓库中的代码注释、commit message 跟随项目现有风格
- CI（`.github/workflows/`）在 push/PR 时分别对 server 和 web 跑 lint（web 还跑 type-check），提交前请本地先跑 `npm run lint`（web 加 `npm run type-check`）

## 测试

- **仅服务端有测试**：Jest + ts-jest + supertest，配置内嵌在 `server/package.json` 的 `jest` 字段
- 测试文件放在被测代码同级的 `__test/`（部分为 `__tests__` 或 `_test`）目录，命名 `*.spec.ts`
- 运行：`cd server && npm test`；覆盖率 `npm run test:cov`（排除 `*.module.ts` 和 `upgrade.*.ts`）
- 前端无单元测试框架，改动 web 后至少通过 `npm run type-check` 和 `npm run lint` 验证

## 安全注意事项

- `.env*` 文件含数据库连接串、JWT 密钥（`XIAOJU_SURVEY_JWT_SECRET`）、响应加密密钥（`XIAOJU_SURVEY_RESPONSE_AES_ENCRYPT_SECRET_KEY`）和 LLM API Key（`AImodel_API_KEY`），**绝不可提交到仓库或在输出中泄露**；`.gitignore` 已排除
- 系统内建安全能力：传输加密（`XIAOJU_SURVEY_HTTP_DATA_ENCRYPT_TYPE`）、敏感词检测（`Word` 实体 + `contentSecurity.service.ts`）、发布审查、投票防刷；改动相关链路时注意保持这些校验不被绕过
- 前端对富文本做 XSS 过滤（`xss` 包，见 `web/src/common/xss.js`），渲染用户输入内容时必须沿用
- 新增接口默认应当挂鉴权/权限守卫，不要暴露无防护的管理接口

## 部署

- 推荐 Docker 部署：`docker-compose.yaml` 一键拉起 `mongo:4` + 应用镜像（`xiaojusurvey/xiaoju-survey:<version>-slim` 生产版 / `-full` 开发调试版），对外端口 8080
- `Dockerfile` 为多阶段构建：先构建 web 产物和 server dist，运行时镜像内用 nginx（配置见 `nginx/nginx.conf`，监听 8080）托管前端静态文件并把 `/api`、`/exportfile`、`/userUpload` 反代到本机 3000 端口的 NestJS 服务；`docker-run.sh` 同时启动 nginx 和 `npm run start:prod`
- 数据库连接等通过环境变量注入（`XIAOJU_SURVEY_MONGO_URL`、`XIAOJU_SURVEY_MONGO_AUTH_SOURCE`、`XIAOJU_SURVEY_MONGO_DB_NAME` 等）

## 贡献与协作

- PR 目标分支一般为 `develop` / `main` / `releases/**` / `feature/**`（见 CI 触发配置）；`.github/` 下有 ISSUE_TEMPLATE 和 PULL_REQUEST_TEMPLATE
- `CONTRIBUTING.md` 为空，贡献指南见官方文档：https://xiaojusurvey.didi.cn/docs/next/share/如何参与贡献
