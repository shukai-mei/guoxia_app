# Proposal

## Why

管理端房源一旦下架，点击「编辑」会提示"房源不存在"，无法修改下架房源的信息，只能先重新上架再编辑，操作倒挂。根因是编辑页回显复用了租客端详情接口 `GET /api/properties/{id}`，该接口只返回上架房源，下架房源返回 404。

## What Changes

- 新增管理端房源详情 API `adminGetProperty`（`GET /admin/api/properties/{id}`，由后端同名 change 提供），返回任意状态（上架/下架/已租出）的房源详情。
- 房源编辑页（`PropertyForm.vue`）编辑回显改用 `adminGetProperty`，租客端 `getProperty` 及其调用方保持不变。
- 后端新增的详情接口为增量，前端发布需在后端发布之后。

## Capabilities

### New Capabilities

<!-- 无新增能力 -->

### Modified Capabilities

- `property-management`: 「编辑房源（含媒体回显与全量替换）」需求变更：编辑回显使用管理端详情接口，已下架或已租出的房源同样可正常回显与保存。

## Impact

- 前端代码：`src/api/index.ts`（新增 `adminGetProperty`）、`src/views/admin/PropertyForm.vue`（编辑分支改用新接口）。
- 测试：`src/api/__tests__/api.test.ts`（新增 `adminGetProperty` 用例）、`src/views/__tests__/PropertyForm.test.ts`（编辑用例 mock 切换 + 新增下架房源回显用例）。
- 依赖：guoxia_center 后端同名 change（`GET /admin/api/properties/{id}`）需先发布。
