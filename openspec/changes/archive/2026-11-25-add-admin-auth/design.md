# Design

## Context

- Vue 3.5 + vue-router 4.5 + axios + vant，无 pinia，本地状态沿用 localStorage 工具函数模式（见 `src/utils/identity.ts`）
- 小二端页面挂在 `/admin` 路由组，无守卫；请求层 `src/api/http.ts` 已有请求/响应拦截器（身份头注入、`unwrapBody` 解包抛 `ApiError`）
- 后端同名 change 提供 `POST /admin/api/auth/login`（成功返回 `{token, expiresAt}`，失败统一 code 401「用户名或密码错误」）与 `POST /admin/api/auth/logout`；所有 `/admin/api/**`（登录接口除外）要求 `Authorization: Bearer <token>`
- guoxia_center 后端 change 的接口契约见其 design.md，本 change 只负责前端交互（动机见 proposal.md - Why）

## Goals / Non-Goals

**Goals:**
- 登录页 + 守卫 + 凭证透传 + 401 处理闭环，租客端零改动
- 不改动后端接口契约，沿用 vant 组件与现有代码风格

**Non-Goals:**
- 不做记住登录、不做密码找回
- 不改动租客端身份体系（X-Viewer-Identity 保持不变）

## Decisions

### D1：凭证存 localStorage，单 key JSON
新增 `src/utils/adminAuth.ts`：`saveAdminAuth({token, expiresAt})` / `getAdminAuthToken()` / `clearAdminAuth()`，key `adminAuth`，存储 `{token, expiresAt}`。`getAdminAuthToken()` 读取时校验 `expiresAt` 已过则清除并返回 null（视为未登录）。

- 备选：内存变量 + 会话重开即失效 —— 小二每次打开页面都要重登，体验差；localStorage 与现有 identity 模式一致

### D2：全局路由守卫，白名单式放行
`router.beforeEach`：`to.path.startsWith('/admin')` 且非 `/admin/login` 时，`getAdminAuthToken()` 为空 → `redirect: /admin/login?redirect=<to.fullPath>`；已登录访问 `/admin/login` → 跳转 `redirect` 参数目标（无则 `/admin`）。租客端路由不受影响。

- 备选：路由 meta 标记需鉴权路由 —— 守卫逻辑分散到每个路由声明；白名单式判断集中于守卫，管理路由全部受控更不易漏

### D3：请求层按 URL 前缀注入凭证
`http.ts` request interceptor：`config.url` 以 `/admin/api` 开头且不等于 `/admin/api/auth/login` 时，读取 token 并 `config.headers.set('Authorization', 'Bearer ' + token)`（token 为空不设置，交给后端 401）。

- 备选：全局附 header —— 会污染租客端请求；URL 前缀判断与后端拦截范围精确对应

### D4：401 响应统一清凭证并跳转，登录接口豁免
response interceptor 捕获 `ApiError.code === 401`：请求 URL 为 `/admin/api/auth/login` 时仅抛出错误（供登录页展示提示），其余情况 `clearAdminAuth()` 后 `window.location.assign('/admin/login')`（整页跳转，顺带重置内存态）。

- 登录接口豁免原因：登录失败本身就是 401「用户名或密码错误」，若统一处理会误清凭证且登录页原地刷新
- 用 `window.location` 而非 import router：http.ts 被各 view 依赖，反向 import router 易成循环依赖；整页跳转对管理端无体验损失
- 备选：401 时静默仅提示 —— 会话失效后用户会反复失败；主动跳转登录页符合 spec

### D5：登录页与退出入口
- `LoginView.vue`：vant `van-form` + 用户名/密码 `van-field`（密码 type=password），提交调 `http.post('/admin/api/auth/login', {...})`，成功 `saveAdminAuth` 后 `router.replace(redirect || '/admin')`，失败 `showToast`（或 van-notify）展示后端 message
- `AdminHome.vue`：增加「退出登录」入口 → `http.post('/admin/api/auth/logout')` → `clearAdminAuth()` → `router.replace('/admin/login')`

## Risks / Trade-offs

- [前后端上线时序] 前端先于后端上线时登录接口 404、后于后端上线时管理页全 401 → 与后端同批部署，发布说明明确顺序
- [401 全局处理误伤] 未来租客端若引入 401 语义会被误清凭证并跳登录页 → 当前租客端无 401 场景；届时按 URL 前缀收敛处理
- [localStorage 凭证 XSS 风险] token 存 localStorage 可被同源脚本读取 → 与现有 identity 存储同级别风险，不放大攻击面；token 有过期时间且可登出吊销
- [守卫与 401 双重跳转] 会话失效瞬间可能出现先跳后跳重复导航 → 跳转均幂等（目标同一登录页），vant 场景无实际影响

## Migration Plan

1. 与 guoxia_center 后端同批部署（后端先行、同一发布窗口内上前端）
2. 小二首次访问管理页将被重定向到登录页，使用后端初始化的默认账号登录
3. 回滚：回滚前端代码恢复无守卫行为；后端回滚则管理接口恢复开放
