# Proposal

## Why

管家微信目前是整个平台维度共用的一份企微客服配置，租客端咨询页与预约成功页展示同一个管家。实际业务中不同楼栋由不同管家负责，需要按楼栋配置不同的管家。管理端新增管家档案管理、楼栋表单可选关联管家，租客端预约成功页按楼栋展示对应管家，咨询页改为展示常见问题与客服电话。

## What Changes

- 新增管理端「管家管理」页：管家列表、新建（名称、微信号必填、二维码可选）、编辑、删除（被楼栋关联时展示后端拒绝提示）；管理端首页新增「管家管理」入口，移除「企微客服配置」入口与页面（**BREAKING**：对应后端接口下线）。
- 楼栋登记/编辑表单新增选填管家选择器（从管家列表选择，可留空）；楼栋列表新增管家列（未关联展示"未配置"）。
- 预约成功引导页改为展示该房源所属楼栋关联管家的微信号与二维码；楼栋未关联管家时隐藏管家引导卡。
- 咨询页移除管家联系方式卡与复制微信号按钮，仅保留常见咨询问题。
- API 层：移除 `getWechatConfig`，新增管家档案 CRUD 接口封装；`Building` 类型增加管家字段。

## Capabilities

### New Capabilities

- `building-housekeeper`: 管理端管家档案维护界面（列表、新建、编辑、删除与删除保护提示）及管理端首页入口

### Modified Capabilities

- `consultation`: 移除「展示管家联系方式与复制微信号」
- `building-management`: 登记/维护楼栋表单增加选填管家选择器，楼栋列表展示管家列
- `viewing-appointment`: 预约成功引导页按楼栋展示管家微信卡（未关联隐藏），移除「维护企微客服配置」

## Impact

- 页面：新增 `HousekeeperAdmin.vue`（管家管理页）；修改 `AdminHome.vue`、`BuildingForm.vue`、`BuildingList.vue`、`BookingSuccess.vue`、`Consultation.vue`；删除 `WechatConfig.vue`
- 路由：删除 `/admin/wechat-config`，新增 `/admin/housekeepers`
- API：`src/api/index.ts` 移除 `getWechatConfig`、新增 `listHousekeepers/createHousekeeper/updateHousekeeper/deleteHousekeeper`；`src/api/types.ts` 的 `Building` 增加 `housekeeper` 字段、删除 `WechatConfig` 类型
- 测试：更新 `Consultation.test.ts`、`BookingSuccess.test.ts`、`api.test.ts`、`BuildingForm`/`BuildingList` 相关测试、`AdminHome` 相关测试，删除 `WechatConfig` 相关测试，新增管家管理页测试
- 后端同名 change `add-building-housekeeper` 同步实现（管家档案接口、楼栋关联、平台微信配置接口下线），两端同批部署
