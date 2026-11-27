# Proposal

## Why

设计规范要求租客在看房前即可预知房源的看房方式（自助看房或管家带看），当前租客端房源列表与详情未展示该信息，用户预约后才发现部分楼栋需管家带看。

## What Changes

- 房源列表卡片：待租出且已关联楼栋的房源在地址下方新增「看房」行——楼栋支持自助开门展示绿色「自助看房」标签，否则展示橙色「管家带看」标签；已租出卡片不展示该行（按设计稿）。
- 房源详情页：户型/面积/价格标签行下方新增「看房方式」行，待租出与已租出详情均展示（按设计稿），未关联楼栋不展示。
- `BuildingInfo` 类型新增 `selfOpenSupported: boolean`，标识由后端返回的楼栋实时标识驱动。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `property-browsing`: 「浏览房源列表」与「查看房源详情」新增看房方式标识展示。

## Impact

- `src/views/tenant/PropertyList.vue`、`src/views/tenant/PropertyDetail.vue`、`src/api/types.ts`
- 依赖后端同名 change（guoxia_center add-viewing-mode-badge）已上线，`building.selfOpenSupported` 可用
