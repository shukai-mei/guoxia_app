# Design

## Context

前端仓库 guoxia_app（Vue 3.5 + Vant 4 + vue-router 4 + axios + Vitest），与后端 lease-center 通过统一响应信封 `{code, message, data}` 通信（`src/api/http.ts` 已实现解包与 `ApiError`）。当前租客端预约表单（`src/views/tenant/PropertyDetail.vue`）提交 `{name, phone, date, slotStart, slotEnd}`（`AppointmentInput`），手机号仅前端格式校验（`PHONE_RE = /^1[3-9]\d{9}$/`）。

后端现状（guoxia_center）：已有阿里云短信通用发送服务 `SmsService.send(phone, templateCode, params)`（`AliyunSmsServiceImpl`），模板 code 经配置注入（`aliyun.sms.template-booking` / `template-password`，env 注入凭证与模板）；**尚无验证码发送接口，预约提交接口（`POST /api/properties/{id}/appointments`）无验证码参数**。本次前端 change 依赖的后端验证码能力需在 guoxia_center 另行规划后端 change 实现（见「后端契约」）。动机与范围见 proposal.md，需求见 specs delta。

## Goals / Non-Goals

**Goals:**
- 租客提交预约前必须通过短信验证码校验，过滤虚假/无效手机号
- 前端交互完整：发送验证码（含倒计时与限流提示）、提交校验、验证码错误保留表单可重试
- 与后端契约对齐（`AppointmentInput` 增加 `code`），一次迁移到位

**Non-Goals:**
- 不做登录鉴权（现状无鉴权，沿用）
- 不改动管理端预约列表与确认/拒绝流程
- 不做图形验证码/滑块等人机校验（短信限流由后端负责）
- 不在前端实现验证码有效时长倒计时展示（有效期以后端判定为准，前端仅展示后端 message）

## Decisions

### 1. 验证码字段并入预约表单，提交载荷增加 `code`（而非独立验证页）

在 PropertyDetail.vue 的预约表单手机号字段下方增加"验证码"输入与"获取验证码"按钮；`AppointmentInput` 增加 `code: string`。提交时后端原子校验（校验通过即创建预约），无需独立的"先验证后预约"两段式状态管理。

**替代方案**：独立验证码弹层/页面先行验证 → 被否决，多一次跳转且需要跨页面传递验证状态，表单内嵌与 Vant 表单交互风格一致。

### 2. 后端契约（本 change 的假定依赖，最终以 guoxia_center 后端 change 为准）

- 发送验证码：`POST /api/sms/verification-codes`，body `{phone}`；成功返回 200 空 data；失败按信封返回 message（如"发送过于频繁，请稍后再试"、"短信服务不可用"）
- 预约提交：`AppointmentRequest` 增加必填 `code`；后端校验 phone+code 匹配且未过期未使用，失败返回 400 + message（如"验证码错误或已过期"）；验证通过后该 code 立即作废；校验顺序在时段冲突/每日限约等 409 业务规则之前（验证码错误不消耗时段占用逻辑）
- 验证码规则（后端实现，前端按此对齐交互）：6 位数字、5 分钟有效、同一手机号 60 秒内不可重发、单日发送上限（次数由后端 change 定）；短信模板 code `SMS_339645406`，经新配置项（如 `aliyun.sms.template-verify`）env 注入，沿用 `templateBooking/templatePassword` 的配置模式
- 错误码约定：验证码相关失败统一走 400（业务校验失败）或 500（短信服务异常），message 中文原文展示；前端仅对 404/409 保留现有特殊处理（刷新房源/刷新时段）

### 3. 获取验证码交互（PropertyDetail.vue）

- "获取验证码"按钮嵌入手机号 `van-field` 的 button 插槽（Vant 表单风格）；点击时先校验 `isValidPhone(phone)`，无效 toast"请输入有效的手机号"且不请求
- 发送成功后 toast"验证码已发送"，启动 60 秒倒计时（`countdown` ref + `setInterval`，`onUnmounted` 清理防泄漏），按钮文案"重新获取(60s)"并禁用；倒计时归零恢复
- 发送失败 toast 后端 message，不启动倒计时
- 修改手机号时清空已填验证码（`watch` phone 变化），避免旧号码验证码误用；倒计时不受手机号修改影响（频率限制绑定号码，后端判定）

### 4. 验证码输入与提交校验

- 输入 `type="tel"`、`maxlength="6"`，提交前校验 `/^\d{6}$/`，不通过 toast"请输入 6 位验证码"并阻止提交（沿用现有 name/phone/date/slot 的 toast 校验风格）
- 提交载荷在 `submitAppointment` 调用处增加 `code: appointment.code`
- 提交遇 400 验证码错误：toast 展示后端 message，**不触发** loadSlots/load 刷新，表单（姓名/手机号/日期/时段/验证码）全部保留，租客重新获取验证码后可再次提交；409 处理保持现状（时段冲突/每日限约 → 刷新时段）

### 5. API 层与类型

- `types.ts`：`AppointmentInput` 增加 `code: string`
- `index.ts`：新增 `sendVerificationCode(phone: string): Promise<void>` → `http.post('/api/sms/verification-codes', { phone })`
- 无需新工具函数（6 位数字校验内联在组件或用 `CODE_RE` 常量）

### 6. 测试策略

- API 层：`axios-mock-adapter` 新增 sendVerificationCode 用例（200 成功、400/500 错误信封路径）；submitAppointment 既有用例载荷断言增加 `code`
- 组件层（PropertyDetail.test.ts）：手机号无效点击发送不请求；发送成功进入倒计时（vitest fake timers 推进 60 秒恢复）；倒计时期间按钮禁用；提交载荷含 code；验证码非 6 位阻止提交；后端 400 验证码错误 toast message 且表单保留、不刷新时段；修改手机号清空验证码
- 既有 vitest + @vue/test-utils 框架不变

## Risks / Trade-offs

- [后端验证码接口尚未实现，契约未冻结] → 本 change 按上述假定契约实现并 mock 测试；后端 change 规划/实现后联调修正（发送端点路径与错误码集中在 `api/index.ts` 单点，修正面小）
- [验证码增加一步操作，预约转化摩擦] → 产品目标即过滤真实手机号，摩擦为预期成本；发送失败场景均给明确中文提示与重试路径
- [倒计时定时器泄漏] → `onUnmounted` 清理 + fake timers 测试覆盖
- [旧前端不传 code 提交被新后端拒绝] → 前后端同批上线（后端先行），与上次 add-self-guided-viewing 的 BREAKING 发布节奏一致
- [短信未配置时验证码无法发送，预约完全阻塞] → 属后端 change 的降级决策（阻塞预约 vs 开发环境放行）；前端按"展示后端 message"实现，不自行降级放行

## Migration Plan

- 后端（guoxia_center）：先行规划并实现验证码发送接口与提交校验（含模板配置 `SMS_339645406`），部署上线
- 前端（本 change）：按假定契约实现，`npm run build` 产出部署；前后端同批生效，无灰度窗口
- 回滚：前端回滚上一版本（旧前端提交不含 code，若后端仍强制校验则预约不可用——因此回滚需前后端一起回）

## Open Questions

- 后端 change（guoxia_center）尚未创建：发送端点路径、验证码有效期/频率限制参数、短信未配置时的降级策略，以后端 change 的设计为准；前端契约修正点集中在 `sendVerificationCode` 与提交载荷
- 短信模板 `SMS_339645406` 的具体文案与参数名（预计 `${code}`）以阿里云审核通过的模板为准，前端不渲染短信内容，无影响
