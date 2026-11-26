# Proposal

## Why

后端同名 change 新增上架设备校验：开关开启时，缺楼栋门禁设备号或房源锁设备号的房源上架会被拦截并返回业务码 `40903`。管理端当前上架/批量上架的所有错误均以短暂 toast 提示，拦截信息一闪而过、不易察觉，管理员可能误以为已上架。需对 `40903` 改为阻塞弹窗，明确展示缺失设备明细，引导管理员补齐后再上架。

## What Changes

- `src/utils/error.ts` 新增 `40903` 判定 helper（对齐既有 `isPropertyUnavailableError`）。
- `AdminPropertyList.vue` 单个上架（`toggleStatus`）与批量上架（`onBatchPublish`）的错误处理：识别 `40903` 时改用 `showDialog` 阻塞弹窗展示后端返回的缺失明细（单按钮「知道了」），其余错误维持现有 toast。
- 补充 `AdminPropertyList.test.ts` 断言：`40903` 弹阻塞弹窗、其他错误仍 toast。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `property-management`: 「上下架房源」「批量上架房源」两项要求增加设备校验拦截（`40903`）时以阻塞弹窗展示明细的行为。

## Impact

- 前端代码：`src/utils/error.ts`、`src/views/admin/AdminPropertyList.vue`、`src/views/__tests__/AdminPropertyList.test.ts`。
- 契约依赖：后端同名 change `add-shelf-device-check` 提供的业务码 `40903` 与中文缺失明细消息；弹窗文案由后端消息承载，前端不拼接。
- 范围：仅管理端上架/批量上架两处错误分支；不做开关 UI（开关由后端 SQL/API 人工控制），不改其他错误处理。