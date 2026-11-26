# Design

## Context

见 proposal.md - Why。后端以业务码 `40903` 返回上架设备校验拦截，消息为中文缺失明细（单个含房源标题与缺失项，批量汇总全部不合格房源）。管理端 `AdminPropertyList.vue` 的 `toggleStatus`/`onBatchPublish` 当前 catch 统一 `showToast(errorMessageOf(error))`。租客端已有阻塞弹窗先例（`PropertyDetail.vue`/`MyAppointments.vue` 按 `isPropertyUnavailableError` 判定 40901/40902 后 `showDialog`）。

## Goals / Non-Goals

**Goals:**
- 上架/批量上架命中 40903 时以阻塞弹窗展示后端明细，其余错误维持 toast。

**Non-Goals:**
- 不做开关 UI；不改出租状态切换、编辑等其他错误处理；前端不拼接弹窗文案。

## Decisions

**D1 错误判定 helper。** `src/utils/error.ts` 增 `isShelfDeviceBlockedError(code)` 返回 `code === 40903`，对齐既有 `isPropertyUnavailableError`。

**D2 弹窗分支。** `toggleStatus`/`onBatchPublish` 的 catch 改为：`error instanceof ApiError && isShelfDeviceBlockedError(error.code)` → `showDialog({ message: error.message })`（Vant 单按钮阻塞弹窗），否则 `showToast(errorMessageOf(error))`。复用租客端 `showDialog` 模式；`AdminPropertyList.vue` 增 `showDialog`（vant）与 `ApiError`、`isShelfDeviceBlockedError` 导入。alternatives：继续 toast（信息易被忽略，用户已要求弹窗，弃）。

**D3 文案来源。** 弹窗 message 直接用后端 `error.message`（含缺失明细），前端不二次拼接，保证单个/批量文案一致随后端演进。

## Risks / Trade-offs

- [后端未上线 40903 时前端分支不触发] → 前后端同名 change 同批部署；开关默认关闭，未开启时后端不返回 40903，前端行为与现状一致。