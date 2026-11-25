# Design

## Context

- 管理端编辑页 `src/views/admin/PropertyForm.vue` 在 `onMounted` 中通过 `getProperty(propertyId)` 回显，该函数调用租客端 `GET /api/properties/{id}`；后端 `getAvailableById` 对非「上架」房源返回 404「房源不存在或已下架」，前端将 404 映射为「房源不存在」提示，导致下架房源无法编辑。
- 后端同名 change 新增 `GET /admin/api/properties/{id}`（任意状态返回详情，仅不存在 404），为本次前端改动的依赖。
- 租客端 `getProperty` 仍被 `PropertyDetail.vue`、`BookingSuccess.vue` 使用，语义（仅上架房源）不可变。

## Goals / Non-Goals

**Goals:**

- 编辑页回显走管理端详情接口，下架/已租出房源可正常编辑。

**Non-Goals:**

- 不改动租客端 `getProperty` 及其调用方。
- 不改动编辑提交逻辑（`updateProperty` 已走 `PUT /admin/api/properties/{id}`，无此 bug）。
- 不涉及预约成功通知管理人短信（后端仓库负责）。

## Decisions

**D1 新增管理端详情 API 函数**
`src/api/index.ts` 新增 `adminGetProperty(id)`，请求 `GET /admin/api/properties/{id}`，返回类型复用现有 `Property`。命名与既有 `adminGetBuilding`、`adminListProperties` 一致。
备选：直接在组件内 `http.get` —— 被否，破坏 API 层集中管理约定。

**D2 编辑页切换回显数据源**
`PropertyForm.vue` 的 `isEdit` 分支由 `getProperty` 改为 `adminGetProperty`，其余（表单赋值、媒体转换、404 提示文案）不变；`getProperty` import 移除。租客端页面不动。

**D3 测试**
- `api.test.ts`：新增 `adminGetProperty` 用例（GET `/admin/api/properties/5`）；原 `getProperty` 用例保留。
- `PropertyForm.test.ts`：编辑相关用例的 mock 由 `getProperty` 改为 `adminGetProperty`；新增用例「编辑下架房源正常回显并保存」（mock 返回 status 为 OFF_SHELF 的房源，断言表单回显且提交成功、不出现「房源不存在」提示）。
- 原「编辑不存在的房源」用例（404 → 房源不存在提示）保留，断言改用 `adminGetProperty` mock 拒绝。

**D4 发布顺序**
后端先行发布（提供 `GET /admin/api/properties/{id}`），前端随后发布；旧前端在窗口期内仍调租客端接口，行为与现状一致，无回归。

## Risks / Trade-offs

- [后端接口未及时发布导致编辑页 404] → 发布顺序后端先行，前端发布前用联调环境验证。
- [PropertyForm 测试 mock 切换遗漏导致用例失真] → 以 `PropertyForm.test.ts` 全绿为准，编辑用例逐一核对 mock 函数名。
