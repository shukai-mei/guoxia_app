# Design

## Context

- 技术栈：Vue 3 + Vite + Vant 4 + axios；无 Pinia、无任何本地存储封装（当前仓库 localStorage 零使用）；无微信身份相关代码。
- 小程序壳极简：`miniprogram/` 仅 `App({})`、`Page({})` 与固定 `web-view src="https://www.qingtinkanfang.com/"`，无任何桥接逻辑。
- 接口约定：统一响应 `{code,message,data}`（`http.ts` 解包，业务错误抛 `ApiError`）；dev 代理 `/api`、`/admin/api`。
- 测试：Vitest + jsdom，页面测试 `vi.mock('../../api')`，现有 15 个测试文件约 105 用例。
- 后端同名 change 提供：`POST /api/wechat/session`、`GET /api/me/appointments`、`POST /api/me/appointments/{id}/open-door`，身份经请求头 `X-Viewer-Identity` 传递；楼栋/房源管理 DTO 新增设备字段。

## Goals / Non-Goals

**Goals:**
- 租客闭环界面：我的预约（记录 + 限时密码 + 开门按钮）、身份静默初始化不打断既有预约流程、小程序壳改动最小化。
- 管理端设备字段可选（不配则维持现状），既有页面行为不回退。

**Non-Goals:**
- 微信 JS-SDK 与原生能力桥接（仅 web-view + URL 参数，壳层只做 wx.login）。
- 登录态 UI（无头像/昵称展示）；我的预约分页 UI；开门历史展示；管理端开门记录页。

## Decisions

### D1 身份标识工具（src/utils/identity.ts）

- 存储键 `viewerIdentity`（localStorage）。
- `getOrCreateIdentity()`：本地已有身份则沿用；否则 `crypto.randomUUID()` 生成全局唯一伪身份并持久化。
- 小程序 openid 换取：检测 URL 查询参数 `wxcode`（小程序壳拼接）→ 调 `POST /api/wechat/session` → 成功将返回 openid 持久化为身份；换取失败或无 code 时走伪身份兜底。**已有身份时不重复换取、不覆盖**：手机号聚合查询保证两种身份查询结果一致，换取失败或身份分裂不影响记录完整性。
- 初始化时机：模块级单例 promise，`main.ts` 启动时触发；请求拦截器 await 该 promise，保证首请求先完成初始化再携带身份头（避免竞态）。
- 携带方式：`http.ts` 请求拦截器统一注入 `X-Viewer-Identity`（仅租客端与所有业务请求，管理端请求同样带也无害，统一注入最简单）。

### D2 我的预约页（src/views/tenant/MyAppointments.vue）

- 路由 `/my-appointments`（项目现状无路由守卫，沿用）。
- 数据来源 `getMyAppointments()`：后端返回数组（含 `passcode?`、`canOpenDoor`、`status` 等），按后端倒序直接渲染。
- UI：Vant `PullRefresh` + 卡片列表 + `Empty` 空态；加载失败提示 + 重试；开门按钮 loading 防连点（见 D3）；密码展示区带复制按钮（`navigator.clipboard.writeText`，失败降级文本选中复制）。
- 入口：房源列表页顶部入口 + 预约成功引导页"查看我的预约"按钮。
- 状态映射：PENDING=待处理、CONFIRMED=已确认、REJECTED=已拒绝（复用后端枚举文案）。

### D3 开门与密码交互

- `canOpenDoor=true` 的记录渲染"开门"按钮；点击调 `openDoor(id)`，成功 `showSuccessToast('已开门')`，失败展示后端 message（"预约未确认"/"未到开门时间"/"开门失败，请联系客服"等）。
- 按钮在请求期间禁用；30 秒内后端侧去重（见后端 design），前端仅做请求中禁用。

### D4 预约提交与引导页改造

- `PropertyDetail` 提交流程不变：身份由拦截器自动携带，无感知。
- `BookingSuccess`：新增"查看我的预约"按钮（`router.push('/my-appointments')`）；开门提示文案由"到楼后联系客服远程开门禁"更新为"预约时间段内可在我的预约中自助开门、查看限时密码"。

### D5 管理端表单字段

- `BuildingForm` 增加可选字段"门禁设备序列号"（`accessDeviceSerial`，≤64 字符），`PropertyForm` 增加可选字段"通通锁锁具编号"（`ttlockLockId`，≤64 字符）；编辑回显，空值即未配置。
- 类型与提交 DTO 同步扩展（`src/api/types.ts`）。

### D6 小程序壳改造

- `miniprogram/pages/index/index.js`：`onLoad` 中 `wx.login` 成功后 `setData` 将 `https://www.qingtinkanfang.com/?wxcode=<code>` 绑定到 web-view src；`index.wxml` 的 `src` 改为数据绑定。
- code 一次性：H5 仅在本地无身份时消费；壳每次加载取新 code。

### D7 API 层与测试

- `src/api/index.ts` 新增 `getMyAppointments()`、`openDoor(id)`、`exchangeWechatSession(code)`；`types.ts` 新增 `MyAppointment` 类型（含 `passcode?`、`canOpenDoor`）。
- 新增测试：`identity.test.ts`（生成/沿用/换取成功/降级、初始化竞态）、`MyAppointments.test.ts`（渲染/空态/错误重试/开门交互/密码展示与复制）、http 拦截器身份头注入测试；更新 `BookingSuccess`、`PropertyDetail`、`BuildingForm`、`PropertyForm`、`api.test.ts` 既有测试。

## Risks / Trade-offs

- [web-view 内无法直接 wx.login，必须改小程序壳并发布新版] → 壳改动最小化（仅 index.js + wxml 绑定）；壳未更新时走伪身份降级，功能仍完整可用。
- [crypto.randomUUID 兼容性] → 现代浏览器与微信 web-view 内核均支持；jsdom 测试中 mock。
- [身份初始化与首请求竞态] → 模块级单例 promise + 拦截器 await，先初始化后携带。
- [剪贴板 API 在非 HTTPS 受限] → 线上为 HTTPS；失败时降级文本选中复制并提示。
- [前端依赖后端新接口] → 与后端 change 同步验收、同步发版（沿用上一期"前后端同步发版"约定）。

## Migration Plan

1. 与后端同名 change 同步实现与联调（本地 dev 代理已验证的既有方式）。
2. 部署：后端先行上线新接口，前端随后发版（旧前端不调新接口，不受影响）。
3. 小程序壳：随前端发版提交微信审核（web-view src 增加 wxcode 参数；审核期间旧壳按伪身份降级运行）。
4. 回滚：前端回退 dist 即可；localStorage 身份与预约数据不受影响。
