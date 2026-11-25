# Tasks

## 1. 新增管理端房源详情 API

- [x] 1.1 `src/api/index.ts` 新增 `adminGetProperty(id)`（GET `/admin/api/properties/{id}`，返回 `Property`）——验证：`npx vitest run src/api/__tests__/api.test.ts` 新增用例通过

## 2. 编辑页回显切换数据源

- [x] 2.1 `src/views/admin/PropertyForm.vue` 编辑分支由 `getProperty` 改为 `adminGetProperty`，移除未使用的 `getProperty` import，其余逻辑不变——验证：`npx vitest run src/views/__tests__/PropertyForm.test.ts` 编辑相关用例通过

## 3. 测试修正与新增

- [x] 3.1 `api.test.ts` 新增 `adminGetProperty` 用例；`PropertyForm.test.ts` 编辑用例 mock 改为 `adminGetProperty`，新增「下架房源回显并保存成功」用例，保留「编辑不存在的房源提示房源不存在」用例——验证：`npx vitest run` 全绿
- [x] 3.2 类型检查与构建——验证：`npm run build`（或项目既有 type-check 脚本）通过

## 4. 联调与部署

- [x] 4.1 后端同名 change 部署后，联调环境走查：编辑一个已下架房源回显正常且保存成功；编辑不存在房源仍提示房源不存在——验证：浏览器走查通过（2026-11-25 生产环境实测）
- [x] 4.2 生产发布前端，走查管理端编辑下架房源与租客端房源详情页无回归——验证：生产环境实测通过（2026-11-25）

## Workflow follow-up

- 归档本 change（`/opsx:archive`）并把 delta specs 同步到主 specs；guoxia_center 同名 change 一并归档。
