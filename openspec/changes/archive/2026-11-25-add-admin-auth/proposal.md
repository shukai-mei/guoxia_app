# Proposal

## Why

后端为小二端管理接口增加登录鉴权（guoxia_center 同名 change）后，前端小二端页面（`/admin` 路由组）必须配合改造：没有登录页与凭证管理，鉴权上线后所有管理页面将直接 401 不可用。需要为小二端增加登录流程与凭证透传，并与后端同批上线。

## What Changes

- 新增小二端登录页 `/admin/login`：账号密码表单，调用后端登录接口，成功后存储会话凭证并跳转原目标页面
- 新增会话凭证管理工具：token 与过期时间存 localStorage，提供读取/清除/是否有效判断
- 新增路由守卫：`/admin` 下除登录页外的路由未登录一律重定向到登录页
- 请求层改造：对 `/admin/api/**` 请求自动注入 `Authorization: Bearer <token>`（登录接口除外）；响应 code 401 时清除本地凭证并跳转登录页
- 管理后台首页新增「退出登录」入口，调用后端登出接口并清除本地凭证

## Capabilities

### New Capabilities

- `admin-auth`: 小二端登录交互、会话凭证管理与未登录访问控制

### Modified Capabilities

（无）

## Impact

- 文件：`src/router/index.ts`（守卫）、`src/api/http.ts`（token 注入与 401 处理）、新增 `src/utils/adminAuth.ts`、`src/views/admin/LoginView.vue`、`AdminHome.vue`（退出入口）
- 无新增第三方依赖，沿用 vant 表单组件与现有 axios/vue-router 栈
- 兼容性影响：与后端鉴权强绑定，必须与 guoxia_center 后端同批上线；租客端（`/` 路由组）不受影响
