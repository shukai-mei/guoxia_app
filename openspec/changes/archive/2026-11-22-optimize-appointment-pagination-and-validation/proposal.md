# Proposal

## Why

预约列表随数据增长全量加载，页面首屏与滚动性能下降（租客端接口另有 100 条截断）；后端改为分页接口后，前端需配套下拉加载更多；提交预约校验规则调整（未结束预约拦截 + 5 房源上限）后，表单需展示新的拒绝提示。

## What Changes

- 「我的预约」列表改为分页加载：每页 20 条，按创建时间倒序，滚动到底部自动加载下一页，保留下拉刷新。
- 「预约管理」列表改为分页加载：每页 20 条，保持待处理申请优先（组内按创建时间倒序），滚动到底部自动加载下一页。
- 预约表单提交失败提示更新：移除「该房源当天已预约过」场景，新增「同一房源存在未结束预约」与「已预约房源达到 5 个上限」两类后端拒绝提示的展示（沿用原样展示后端错误文案的方式）。
- 列表接口调用与响应类型适配后端新分页结构（items、page、size、hasMore）。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `viewing-appointment`: 预约列表（租客端与管理端）分页加载交互与排序展示；提交预约失败提示场景更新。

## Impact

- 代码：`src/api/index.ts`、`src/api/types.ts`、`src/views/tenant/MyAppointments.vue`、`src/views/admin/AdminAppointmentList.vue`、`src/views/tenant/PropertyDetail.vue`（如需）。
- 测试：`src/views/__tests__/MyAppointments.test.ts`、`src/views/__tests__/AdminAppointmentList.test.ts`、`src/api/__tests__/api.test.ts` 及 `helpers.ts` 相关用例更新。
- 接口契约：依赖后端两个列表接口的分页响应结构，需与后端 change 同步发布。
