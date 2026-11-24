# Tasks

## 1. 类型与 API 层

- [x] 1.1 `src/api/types.ts`：新增 `RentStatus`（'PENDING_RENT' | 'RENTED'）与 `Property.rentStatus`；管理端列表查询参数（keyword/status/rentStatus）与租客端列表查询参数（rentStatus）；预约相关类型增加 'CANCELLED' 状态与 cancelReason/cancelSmsStatus/cancelSmsSentAt——验证：`npm run type-check` 通过
- [x] 1.2 `src/api/index.ts`：`adminListProperties` 支持查询参数、`listProperties` 支持 rentStatus 参数；新增 `batchUpdatePropertyStatus(ids, status)` 与 `updatePropertyRentStatus(id, rentStatus)`——验证：`src/api/__tests__/api.test.ts` 更新断言通过

## 2. 管理端房源列表（筛选/批量上架/出租状态）

- [x] 2.1 `AdminPropertyList.vue`：van-search（名称）+ van-dropdown-menu（上架状态/出租状态）筛选，可组合、可清除，变更即重新拉取——验证：组件测试更新通过并走查筛选组合与清除
- [x] 2.2 `AdminPropertyList.vue`：状态标签拆分为「上架/下架」与「待租出/已租出」两组（文案在租 → 上架）——验证：走查两个状态独立展示
- [x] 2.3 `AdminPropertyList.vue`：van-checkbox 多选 + 全选 + 「批量上架(N)」按钮（未选中禁用），二次确认，成功刷新列表、失败 toast 保留选中态——验证：组件测试新增用例通过并走查全选/部分选择
- [x] 2.4 `AdminPropertyList.vue`：行操作新增「标记已租出 / 改回待租出」（二次确认，「标记已租出」确认文案提示未结束的预约将失效并短信通知租客，调用 updatePropertyRentStatus）——验证：组件测试新增用例通过并走查双向切换

## 3. 租客端房源浏览（标记/筛选/只读/弹窗）

- [x] 3.1 `PropertyList.vue`：已租出房源卡片展示「已租出」标记——验证：走查含已租出数据的列表（条件渲染造数）
- [x] 3.2 `PropertyList.vue`：新增出租状态筛选（全部/待租出/已租出，van-dropdown-menu），与关键词、租金区间筛选组合，清除时一并重置；参数 rentStatus 透传 `listProperties`——验证：组件测试新增用例通过并走查三个选项
- [x] 3.3 `PropertyDetail.vue`：rentStatus==='RENTED' 时隐藏预约表单与时段查询，展示「该房源已租出，暂不支持预约看房」提示条——验证：组件测试新增用例通过并走查只读详情
- [x] 3.4 `PropertyDetail.vue`：提交预约失败且 code 为 40901/40902 时改用 showDialog 弹窗展示后端消息——验证：组件测试新增用例通过并走查弹窗

## 4. 预约状态展示与开门弹窗

- [x] 4.1 `MyAppointments.vue`：已失效记录展示「已失效」tag 与失效原因，隐藏开门按钮与密码区域——验证：组件测试新增用例通过并走查
- [x] 4.2 `MyAppointments.vue`：开门失败 code 为 40901/40902 时 showDialog 弹窗拦截——验证：组件测试新增用例通过并走查
- [x] 4.3 `AdminAppointmentList.vue`：已失效状态 tag 与原因展示，隐藏确认/拒绝操作；失效短信失败时提供重发入口——验证：组件测试更新通过并走查

## 5. 集成验证

- [x] 5.1 全量 `npm test` 与 `npm run build` 通过——验证：命令全绿
- [x] 5.2 与后端 DAILY 联调走查全场景（录入默认下架 → 批量上架 → 租客可见 → 出租状态筛选 → 已租出只读 → 标记已租出 → 失效短信与已失效展示 → 开门弹窗）——验证：对照 spec 场景逐项确认

## Workflow follow-up

- 归档 change（archive）并同步 delta 到主 spec
- 部署范围（仅前端/全量）与用户确认后发布
