# Tasks

## 1. API 层

- [x] 1.1 types.ts 删除 WechatConfig/WechatConfigInput，新增 Housekeeper 类型（id/name/contact/qrObjectKey/qrUrl），Building 增加 housekeeper 字段（{name,contact,qrUrl}|null）；验证：vue-tsc 构建无类型错误
- [x] 1.2 api/index.ts 删除 getWechatConfig，新增 listHousekeepers/createHousekeeper/updateHousekeeper/deleteHousekeeper（管理端路径 /admin/api/housekeepers）；验证：api.test.ts 更新后用例全绿

## 2. 管家管理页

- [x] 2.1 新增 views/admin/HousekeeperAdmin.vue：管家列表（名称/微信号/二维码缩略图）、新建/编辑表单（名称、微信号必填校验，MediaUploader 二维码可选）、删除二次确认、删除被关联管家时展示后端拒绝提示；验证：新增 HousekeeperAdmin.test.ts 覆盖列表/新建/编辑/删除成功与拒绝/表单校验
- [x] 2.2 路由新增 /admin/housekeepers，删除 /admin/wechat-config 与 WechatConfig.vue；AdminHome.vue 入口替换为「管家管理」；验证：router 相关测试更新后全绿，AdminHome 测试断言新入口且无旧入口

## 3. 楼栋表单与列表

- [x] 3.1 BuildingForm.vue 增加选填管家选择器（listHousekeepers 加载 + picker），提交与回显 housekeeperId（可空）；验证：BuildingForm 测试覆盖选择管家提交、留空提交、编辑回显管家
- [x] 3.2 BuildingList.vue 增加管家列（housekeeper?.name，未关联展示"未配置"）；验证：BuildingList 测试覆盖已关联与未关联两种展示

## 4. 租客端页面

- [x] 4.1 BookingSuccess.vue 移除 getWechatConfig 调用，改从 getProperty 响应的 building.housekeeper 展示管家微信号与二维码，housekeeper 为 null 或内容为空时隐藏管家卡；验证：BookingSuccess.test.ts 覆盖有管家/无管家两种场景
- [x] 4.2 Consultation.vue 移除 wechat 加载与管家联系卡、复制微信号逻辑，仅保留 FAQ 列表；验证：Consultation.test.ts 断言无管家卡、FAQ 正常展示
- [x] 4.3 PropertyDetail.vue 新增管家服务板块（楼栋信息下方，二维码/装饰占位图+管家名称+在线标签+微信号+扫码提示，未关联管家隐藏）；验证：PropertyDetail.test.ts 新增 3 用例全绿

## 5. 验证

- [x] 5.1 全量 vitest 与 npm run build 通过；验证：测试全绿、构建成功
- [x] 5.2 本地走查（后端同批启动）：管理端管家增删改查、删除被关联管家提示、楼栋表单关联/解除管家、楼栋列表管家列、预约成功页按楼栋展示/隐藏管家卡、咨询页仅 FAQ、/admin/wechat-config 路由不存在；验证：浏览器逐项确认
