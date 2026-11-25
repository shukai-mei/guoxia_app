# Tasks

## 1. 会话凭证管理工具

- [x] 1.1 新增 `src/utils/adminAuth.ts`：`saveAdminAuth({token, expiresAt})`、`getAdminAuthToken()`（读取时校验过期，过期即清除并返回 null）、`clearAdminAuth()`，localStorage key `adminAuth`；验证：新增 adminAuth 单测覆盖保存读取、过期视为未登录、清除

## 2. 登录页与退出入口

- [x] 2.1 新增 `src/views/admin/LoginView.vue`（vant 表单，账号密码提交 `POST /admin/api/auth/login`，成功存储凭证并跳转 `redirect` 目标或 `/admin`，失败展示后端提示不跳转）；验证：组件测试（mock http）覆盖登录成功跳转与失败提示
- [x] 2.2 路由注册 `/admin/login` 并在 `AdminHome.vue` 增加「退出登录」入口（调登出接口、清凭证、跳登录页）；验证：`npm run build` 通过 vue-tsc 检查，AdminHome 测试覆盖退出流程

## 3. 路由守卫

- [x] 3.1 `src/router/index.ts` 增加 `beforeEach` 守卫：`/admin` 下除登录页外未登录重定向 `/admin/login?redirect=<目标>`，已登录访问登录页跳转目标或 `/admin`，租客端路由不受影响；验证：守卫测试覆盖未登录拦截、已登录访问登录页、租客端放行

## 4. 请求层改造（src/api/http.ts）

- [x] 4.1 request interceptor 对 `/admin/api` 前缀（登录接口豁免）的请求注入 `Authorization: Bearer <token>`，无 token 不注入；验证：axios-mock-adapter 测试断言已登录请求携带凭证头、登录接口与租客端请求不携带
- [x] 4.2 response interceptor 处理 code 401：登录接口的 401 仅抛错供登录页提示，其余请求清凭证并跳转 `/admin/login`；验证：mock 401 测试覆盖两种分支（对 `window.location` 跳转做 spy 断言）

## 5. 集成验证

- [x] 5.1 全量 `npm test` 与 `npm run build` 通过，既有测试无回归
- [x] 5.2 本地 dev 联调后端走查：未登录访问 `/admin` 重定向登录页 → 登录成功进入管理首页 → 刷新仍保持登录 → 退出后回登录页 → 后端会话失效后任一管理请求 401 自动跳登录页

## Workflow follow-up

- 与 guoxia_center 后端同名 change 同批部署（部署顺序见本 change design.md Migration Plan）
- 部署验证完成后归档本 change 并同步 delta specs 到主 specs
