# Design

## Context

前端当前通过 `getWechatConfig()`（GET `/api/config/wechat`）在咨询页与预约成功页展示平台级管家微信；管理端 `WechatConfig.vue`（路由 `/admin/wechat-config`）维护该配置；楼栋表单与列表无管家概念。后端同名 change 提供管家档案 CRUD 接口、楼栋 `housekeeper` 关联与视图内嵌管家信息，并下线 `/api/config/wechat`（动机见 proposal.md - Why）。

现有约定：API 封装在 `src/api/index.ts`、类型在 `src/api/types.ts`；管理端页面经 `/admin/*` 路由 + 登录守卫；图片上传走 `MediaUploader`（SURROUNDING 类型）返回对象 key；测试用 vitest + vue/test-utils。

## Goals / Non-Goals

**Goals:**
- 管理端可维护管家档案，楼栋可关联管家，租客端预约成功页按楼栋展示管家
- 平台级微信配置的前端代码完整移除，不残留死代码

**Non-Goals:**
- 不改租客端底部导航与我的预约页
- 不做管家选择器的搜索/分页（管家数量少，一次性加载）

## Decisions

### D1 新增管家管理页，替换企微客服配置页

新增 `HousekeeperAdmin.vue`（路由 `/admin/housekeepers`），列表 + 新建/编辑表单（`van-form` 名称/微信号必填、`MediaUploader` 二维码可选）+ 删除二次确认；`AdminHome.vue` 以「管家管理」入口替换「企微客服配置」入口；删除 `WechatConfig.vue` 与路由。

- 备选：在楼栋表单内联维护管家——管家档案需要在楼栋之外先建好，独立页面更直观，否决。

### D2 楼栋表单管家选择器（选填）

`BuildingForm.vue` 加载管家列表（`listHousekeepers`），用只读 `van-field` + `van-popup` + `van-picker` 选择；表单提交增加可选 `housekeeperId`（编辑时回显既有关联）。不选择时提交 null（解除/留空语义由后端统一处理为空）。

- 备选：`van-radio`/下拉——管家数量不定，picker 与现有日期/时段选择交互一致，采用 picker。

### D3 类型与 API 层调整

`types.ts`：删除 `WechatConfig`/`WechatConfigInput`；`Building` 增加 `housekeeper: { name, contact, qrUrl } | null`；新增 `Housekeeper`（id/name/contact/qrObjectKey/qrUrl）。`api/index.ts`：删除 `getWechatConfig`，新增 `listHousekeepers/createHousekeeper/updateHousekeeper/deleteHousekeeper`。

### D4 预约成功页按楼栋展示管家

`BookingSuccess.vue` 不再调 `getWechatConfig`，改从 `getProperty` 响应的 `building.housekeeper` 取管家（名称、微信号、二维码）；`housekeeper` 为 null 或微信号与二维码均缺失时隐藏「提前添加管家微信」卡。管家信息随房源详情一次加载，无额外请求与失败分支。

### D5 咨询页仅保留 FAQ

`Consultation.vue` 移除 `getWechatConfig` 调用、管家联系卡与复制微信号逻辑，仅保留常见咨询问题列表。

### D6 测试策略

更新 `Consultation.test.ts`、`BookingSuccess.test.ts`、`api.test.ts`、楼栋表单/列表相关测试与 AdminHome 相关测试；删除 WechatConfig 相关测试与 mock；新增 `HousekeeperAdmin.test.ts`（列表/新建/编辑/删除保护提示/表单校验）。

## Risks / Trade-offs

- [前端先行上线或后端接口未就绪时新接口 404] → 与后端同批部署（后端先行、前端紧随），发布窗口内走查管家管理页与预约成功页。
- [楼栋列表展示"未配置"依赖后端 BuildingView 返回 housekeeper 字段] → 后端同批提供，未关联时返回 null，前端兜底展示"未配置"。

## Migration Plan

1. 与后端同名 change 同批部署（后端先发、前端紧随）。
2. 上线后管理员在管家管理页录入管家，并在楼栋列表逐栋关联；过渡期楼栋列表显示"未配置"、预约成功页不展示管家卡（预期行为）。
3. 回滚：恢复旧前端包即可（旧页面仍调 `/api/config/wechat`，故回滚需前后端同时回退）。
