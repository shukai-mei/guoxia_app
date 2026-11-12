# Design

## Context

前端仓库 guoxia_app（Vue 3.5 + Vant 4 + vue-router 4 + axios + Vitest），与后端 lease-center 通过统一响应信封 `{code, message, data}` 通信（`src/api/http.ts` 已实现解包与 `ApiError`）。后端 change add-self-guided-viewing 已实现并验收，接口契约已冻结：预约提交改为 `{name, phone, date, slotStart, slotEnd}`，房源媒体类型收敛为 `SURROUNDING|VIDEO`，房源登记必填 `buildingId`，新增楼栋 CRUD、每日密码、企微配置、可约时段查询、短信重发接口。动机与范围见 proposal.md，需求见各 spec delta。

现有前端结构：`src/api/`（index.ts + types.ts + http.ts）、`src/views/tenant/`（PropertyList、PropertyDetail）、`src/views/admin/`（AdminPropertyList、PropertyForm、AdminAppointmentList）、`src/components/MediaUploader.vue`、`src/utils/`（error/validate/format）。测试位于 `src/api/__tests__` 与 `src/views/__tests__`。

## Goals / Non-Goals

**Goals:**
- 前端与后端新契约完全对齐，不留旧字段兼容代码（一次迁移到位）
- 租客端自助看房全流程可用：详情页选时段 → 提交 → 引导页（企微二维码 + 地址参考图 + 开门禁提示）
- 管理端补全新维护入口：楼栋、每日密码、企微配置

**Non-Goals:**
- 不做旧数据/旧字段的显示兼容（后端已处理历史数据迁移）
- 不做登录鉴权（现状无鉴权，沿用）
- 不改动房源列表页筛选逻辑

## Decisions

### 1. API 层整体重写而非增量修补（src/api/index.ts、types.ts）

旧 `preferredTime`、`GUIDE`、无楼栋的 `Property` 全部废弃，直接改类型定义并同步所有调用点（tsc 编译期强制找齐），避免新旧字段并存。新增接口函数：

- 楼栋：`adminListBuildings` / `adminCreateBuilding` / `adminUpdateBuilding` / `adminDeleteBuilding`
- 时段：`getSlots(propertyId, date)`（租客端）
- 每日密码：`getDailyPassword(propertyId, date)` / `upsertDailyPassword(propertyId, date, password)`
- 企微配置：`getWechatConfig`（公开）、`adminGetWechatConfig` / `adminUpdateWechatConfig`
- 短信重发：`resendAppointmentSms(id)`

类型建模：`Appointment` 增加 `slotStart/slotEnd`（ISO 字符串）、`confirmChannel`（`MANUAL|AUTO`）、`bookingSmsStatus/passwordSmsStatus`（`SENT|FAILED|null`）、`passwordSet`；`Property` 增加 `buildingId`、`building?`；新增 `Building`、`Slot`、`DailyPassword`、`WechatConfig`。

**替代方案**：保留旧类型加可选新字段 → 被否决，tsc 无法保证全量迁移，且旧字段会造成阅读噪音。

### 2. 时间展示不做 Date 解析（src/utils/format.ts）

后端返回 `slotStart/slotEnd` 为 ISO LocalDateTime 字符串（如 `2026-11-15T10:00:00`），前端统一用字符串截取展示（`formatDateTime` 已有 `replace('T',' ')` 逻辑，扩展出 `formatTime` 提取 `HH:mm`），避免 `new Date()` 解析带来的时区偏移（后端无时区语义，纯本地时间）。

日期选择产出的 `date` 字段为本地日期字符串 `yyyy-MM-dd`，时段 `slotStart/slotEnd` 直接使用接口返回的 `HH:mm` 文本，全程无 Date 对象参与预约数据。

### 3. 租客端时段选择交互（PropertyDetail.vue）

- 日期：复用现有 `van-date-picker` 弹层（columns-type `['year','month','day']`），最小日期为今天；选定日期后请求 `GET /properties/{id}/slots?date=`。
- 时段：以 chips 网格渲染 `Slot[]`（`start/end/available`），不可约时段置灰禁用；未选日期前不渲染时段区。
- 提交参数：`{name, phone, date, slotStart: 选中时段 HH:mm, slotEnd: 选中时段 HH:mm}`。
- 错误处理：409 提示按 `message` 原文展示（后端已返回中文："该房源当天已预约过"/"该时段已被预约"），随后自动刷新时段列表。
- 未关联楼栋/无时段配置：接口返回空列表，预约区展示"该房源暂不支持预约看房"。

**替代方案**：用 `van-calendar` 展示可选日期 → 被否决，与现有详情页 picker 交互风格一致更重要，且 calendar 的不可选日期语义与"所有日期都可约"的模型不匹配。

### 4. 预约成功引导页为独立路由（/booking-success/:appointmentId）

提交成功后 `router.replace('/booking-success/{id}')`。引导页自行加载数据（预约详情 + 房源详情 + `GET /config/wechat` 公开接口），保证用户刷新页面后仍可恢复展示，而非依赖跳转传参。页面展示：预约成功提示与时间段、企微二维码（`van-image`）、客服微信号、地址参考图网格（复用图片预览）、"到楼后联系客服远程开门禁，看完房请关好房门"提示。

**替代方案**：组件内弹层展示 → 被否决，刷新即丢失，且引导页内容较多不适合弹层。

### 5. MediaUploader 增加自定义 label 支持（组件小改，语义复用）

楼栋地址参考图复用现有上传组件（校验、上传、预览、移除逻辑一致），但固定 `TYPE_LABEL` 文案（"周边图"等）不适用。给 `MediaUploader` 增加可选 `label` prop 覆盖默认文案；地址参考图使用 `type="SURROUNDING"`（上传接口不区分用途，`sortOrder` 语义一致）。企微二维码同样复用（`max=1`）。

### 6. 管理端楼栋管理：列表 + 表单两页

- `BuildingList.vue`：卡片列表（名称、地址、总楼层、时段规则摘要），操作：编辑、删除（`showConfirmDialog` 二次确认，后端 409 提示"该楼栋下存在房源"时原样展示）。
- `BuildingForm.vue`（登记/编辑复用）：表单字段（名称、地址、总楼层、电梯有无、梯户比、快递与生活配套、采光噪音体验、每日开始/结束时间、时段长度、地址参考图 MediaUploader）；时段用 `van-field` + 时间选择弹层或 `type="time"` 简化为文本 `HH:mm`（沿用 PropertyDetail 的 time-picker 模式）；编辑回显与全量替换语义同 PropertyForm。

**替代方案**：楼栋 CRUD 放弹层 → 被否决，字段多（租户看中属性 5 项 + 时段配置 + 图片），弹层滚动体验差。

### 7. 每日密码维护页（/admin/daily-passwords）

按"房源选择（picker 弹层列出全部房源）→ 日期（date-picker，默认今天）→ 密码输入"组织；进入即查询当日状态（`GET /properties/{id}/daily-passwords?date=`），已设置展示遮罩提示并可覆盖；保存调 `POST /properties/{id}/daily-passwords`。密码不展示明文历史，仅展示"已设置/未设置"。

### 8. 企微配置页（/admin/wechat-config）

微信号输入 + 二维码 MediaUploader（max=1）+ 保存（`PUT /config/wechat`，字段 `contact`/`qrObjectKey`——联调实测字段名，类型与接口测试锁定）。打开页面回显既有配置。

### 9. 预约管理列表升级（AdminAppointmentList.vue）

展示 `formatDateTime(slotStart)` ~ `formatTime(slotEnd)`；新增 tag：通过方式（人工/自动）、密码短信状态（成功/失败/未发）、当日密码已设置标记；短信失败的行提供"重发"按钮（`POST /{id}/resend-sms`）。确认操作遇"请先设置当日密码"错误时原样提示并提示去每日密码页。

### 10. 测试策略

- API 层：`axios-mock-adapter` 按新契约更新全部用例，新增楼栋/时段/密码/企微/重发接口用例（含错误信封路径）。
- 组件/视图：PropertyDetail 时段选择与 409 刷新、BookingSuccess 渲染与加载失败重试、BuildingForm 校验、AdminAppointmentList 重发交互。既有 vitest + @vue/test-utils 框架不变。

## Risks / Trade-offs

- [后端契约与前端实现的字段名偏差（如 qrObjectKey）] → 联调阶段以真实接口响应为准修正 types.ts；接口测试用 mock 锁定已确认契约。
- [租客在详情页停留过久，时段被他人抢约] → 提交遇 409 自动刷新时段列表（spec 已要求）。
- [MediaUploader 增加 label prop 影响既有调用] → prop 可选、默认回落到原 TYPE_LABEL，现有三个调用点零改动。
- [预约成功页依赖房源详情与公开企微接口，任一处失败影响体验] → 页面级错误态 + 重试按钮（spec 已要求）。

## Migration Plan

- 后端已部署新接口（change 已实现），前端本次改动完成后 `npm run build` 走 vite 构建产物部署；前后端同批上线，无灰度窗口（旧前端提交旧字段会被新后端拒绝，属于预期 BREAKING）。
- 回滚：前端回滚到上一版本即可（旧前端对旧后端的依赖已不存在，无中间兼容态）。

## Open Questions

无（后端契约已通过真实联调冻结）。
