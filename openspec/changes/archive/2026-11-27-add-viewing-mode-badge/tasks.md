# Tasks

## 1. 列表看房方式标识

- [x] 1.1 `api/types.ts` 的 `BuildingInfo` 新增 `selfOpenSupported: boolean`（并补齐 BookingSuccess/PropertyDetail 测试 fixture 字段）；验证：`npx vue-tsc --noEmit` 通过。
- [x] 1.2 `PropertyList.vue` 待租出且已关联楼栋的卡片在位置与户型之间新增「看房」行：`building.selfOpenSupported === true` 展示绿色「自助看房」标签，否则展示橙色「管家带看」标签（样式按设计稿 `.visit-row`/`.visit-tag.self`/`.visit-tag.escort`）；已租出或无楼栋不展示该行；验证：本地 dev 走查列表页，造数覆盖绿/橙/已租出三类卡片。
- [x] 1.3 前端单元测试覆盖列表标识渲染分支（自助/带看/已租出不展示）；验证：`npx vitest run src/views/__tests__/PropertyList.test.ts` 通过（11/11）。

## 2. 详情看房方式标识

- [x] 2.1 `PropertyDetail.vue` 详情卡标签行下方新增「看房方式」行，待租出与已租出详情均按楼栋标识展示绿/橙标签，未关联楼栋不展示；验证：本地 dev 走查详情页两态及已租出详情。
- [x] 2.2 前端单元测试覆盖详情标识渲染分支（自助/带看/无楼栋不展示）；验证：`npm run test` 相关用例通过。

## 3. 集成验证

- [x] 3.1 与后端联调走查：列表与详情标识由后端 `building.selfOpenSupported` 驱动，覆盖自助/带看/已租出/无楼栋四类展示；验证：本地端到端走查通过（含造数覆盖条件渲染）。

## Workflow follow-up

- 后端同名 change（guoxia_center add-viewing-mode-badge）上线后方可部署本 change。
- 走查验收通过后归档本 change。
