# Design

## Context

- 后端同名 change（guoxia_center add-viewing-mode-badge）在房源列表/详情响应的 `building` 内新增 `selfOpenSupported`（boolean，楼栋实时标识，NULL 归一为 false）。
- 设计规范（轻享看房-UI设计规范.html）定义样式：`.visit-row`（flex、12px、间距 6px）+ `.lab`（muted）+ `.visit-tag`（10px 圆角小标签）；`.visit-tag.self` 绿色（#2D5F3F/#EAF3EE），`.visit-tag.escort` 橙色（#C75E18/品牌浅橙）；列表卡片行为「看房」，详情页为「看房方式」；已租出列表卡片无此行。
- `PropertyList.vue` 卡片结构：标题+状态 → 位置 → 户型·面积 → 租金；`PropertyDetail.vue` 详情卡结构：标题+状态 → 位置 → 标签行（户型/面积/价格）→ 描述 → 联系方式。

## Goals / Non-Goals

**Goals:**

- 列表待租卡片与详情页按设计稿展示看房方式标识，由后端 `building.selfOpenSupported` 驱动。

**Non-Goals:**

- 不改预约流程与「我的预约」卡片。
- 不加按看房方式筛选。
- 不改管理端页面。

## Decisions

1. **标识行以 `property.building` 存在为前提**：`v-if` 楼栋信息，未关联楼栋隐藏整行（与「未关联楼栋不展示预约入口」现状一致），无楼栋时无数据来源。
2. **列表仅待租出卡片展示**：`rentStatus !== 'RENTED'` 且有关联楼栋时展示（与设计稿一致，用户已确认）。
3. **详情页待租/已租出均展示**：与设计稿「已租出房源详情」一致。
4. **不抽公共组件**：仅两处小标签，模板内联 + scoped 样式即可，避免过度抽象；样式类名与设计稿对齐（`visit-row`/`lab`/`visit-tag self|escort`）。
5. **文案**：列表 lab「看房」、详情 lab「看房方式」、标签「自助看房」/「管家带看」，全部按设计稿原文。

## Risks / Trade-offs

- [后端字段未上线时前端先行发布] → 部署顺序后端先、前端后；旧数据（building 无该字段）下 `undefined` 走 `=== true` 判断失败展示「管家带看」，不会崩溃。
- [楼栋实时标识与预约快照不一致] → 浏览标识仅为预告，预约流程以快照为准（后端上一 change 已落地），不做额外处理。

## Migration Plan

- 前端部署依赖后端字段已上线；列表/详情接口已配置 no-cache，无缓存迁移。
- 回滚：前端回滚即可恢复原样，后端字段为纯新增可保留。
