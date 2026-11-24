# Design

## Context

- Vant 4 全局注册，函数式 API（showToast/showSuccessToast/showConfirmDialog）按组件引入；错误处理统一走 `errorMessageOf`（`src/utils/error.ts`），当前所有错误均 toast；仓库无 `van-dropdown-menu` 与列表多选先例。
- 现状文件：`AdminPropertyList.vue`（无筛选无分页、单条上下架、标签「在租/下架」）、`PropertyForm.vue`（无状态字段）、`PropertyList.vue`/`PropertyDetail.vue`（租客端）、`MyAppointments.vue`（开门失败 toast）、`AdminAppointmentList.vue`（状态 tag 与重发入口）。
- 后端同名 change 提供：`GET /admin/api/properties?keyword&status&rentStatus`、`PUT /{id}/rent-status`、`POST /batch-status`、业务错误码 40901（已租出）/40902（已下架）、`Property.rentStatus`、预约的 `cancelReason`/`cancelSmsStatus` 等字段。

## Goals / Non-Goals

**Goals:**

- 管理端筛选、批量上架、出租状态切换；租客端已租出标记与只读详情
- 房源状态类拒绝（40901/40902）在预约提交与开门场景以弹窗拦截
- 已失效预约在前端的状态与原因展示

**Non-Goals:**

- 管理端房源分页；批量下架 UI；小程序独立改动（web-view 壳复用 H5）

## Decisions

**D1 管理端筛选**：`van-search`（房源名称，输入即搜）+ 首次引入 `van-dropdown-menu` 两个下拉（上架状态、出租状态，均含「全部」），下拉变更即重新拉取，支持清除恢复完整列表；请求参数 keyword/status/rentStatus 传入 `adminListProperties(params)`。

**D2 批量上架**：房源卡片增加 `van-checkbox` 多选 + 顶部全选；导航栏/操作区展示「批量上架(N)」按钮（未选中禁用），点击 `showConfirmDialog`（提示所选数量）确认后调 `batchUpdatePropertyStatus(ids, 'AVAILABLE')`，成功 `showSuccessToast` 并重新拉取列表，失败 toast 展示后端消息并保留选中态。

**D3 出租状态行操作**：待租出行显示「标记已租出」、已租出行显示「改回待租出」，均 `showConfirmDialog` 二次确认后调用 `updatePropertyRentStatus`；「标记已租出」确认框文案提示「该房源未结束的预约将失效并短信通知租客」，「改回待租出」确认框提示恢复预约入口；成功后 toast 提示并刷新列表。

**D4 弹窗约定**：`src/utils` 增加判断 `isPropertyUnavailableError(code)`（40901/40902）；`PropertyDetail` 预约提交失败与 `MyAppointments` 开门失败命中时改用 `showDialog({ message })` 弹窗展示后端消息，其余错误保持 toast；`ApiError.code` 由 http.ts 已透传后端原始码，无需改造请求层。

**D5 已租出租客端表现**：`PropertyList` 卡片对 `rentStatus==='RENTED'` 展示「已租出」tag；`PropertyDetail` 依据 rentStatus 隐藏预约表单、不查询可约时段并展示提示条「该房源已租出，暂不支持预约看房」；404 仍走已下架空态（原有逻辑不变）。

**D6 已失效展示**：`MyAppointments`/`AdminAppointmentList` 对 `status==='CANCELLED'` 渲染「已失效」tag + 失效原因；隐藏开门按钮与密码区域；管理端隐藏确认/拒绝；重发入口仅在 `cancelSmsStatus==='FAILED'`（或为空）时提供，沿用 smsText/smsType 展示模式扩展。

**D7 类型与 API 层**：`types.ts` 新增 `RentStatus`、`Property.rentStatus`、管理端列表查询参数与租客端列表查询参数（rentStatus）；预约相关类型增加 CANCELLED 状态与 cancelReason/cancelSmsStatus/cancelSmsSentAt；`api/index.ts` 改造 `adminListProperties` 支持参数、`listProperties` 支持 rentStatus，并新增批量上架与出租状态接口。

**D8 租客端出租状态筛选**：`PropertyList.vue` 筛选区新增出租状态下拉（van-dropdown-menu 一项：全部/待租出/已租出），变更即重新拉取；请求参数 `rentStatus` 经 `listProperties(params)` 透传后端；与既有关键词、租金区间筛选可组合，「清除」一并重置。

## Risks / Trade-offs

- [van-dropdown-menu 首次引入] → 走查覆盖两个下拉的单独与组合筛选、清除动作；样式按 Vant 默认并在走查中确认
- [后端未同步上线时未知错误码] → 未命中 40901/40902 时回落原 toast 行为，无破坏
- [「在租 → 上架」文案调整] → proposal 已标注，上线前与用户确认措辞
- [批量上架含不存在的房源] → 后端整批拒绝，前端 toast 展示后端消息

## Migration Plan

- 与后端同批发布（先后端后前端）；小程序 web-view 壳复用 H5 无需独立改动
- 前端无数据迁移

## Open Questions

- 筛选交互细节（搜索触发方式、下拉样式）可在实现中按走查反馈微调，不影响 spec 行为
