# Tasks

## 1. 错误判定与拦截弹窗

- [x] 1.1 `src/utils/error.ts` 增 `isShelfDeviceBlockedError(code)`（`code === 40903`），验证：`npm run build` 类型检查通过
- [x] 1.2 `AdminPropertyList.vue` 增 `showDialog`/`ApiError`/`isShelfDeviceBlockedError` 导入；`toggleStatus` 与 `onBatchPublish` 的 catch 识别 40903 → `showDialog({ message: error.message })`，其余维持 `showToast(errorMessageOf(error))`，验证：`npm run build` 通过
- [x] 1.3 补 `src/views/__tests__/AdminPropertyList.test.ts`：mock `showDialog`，断言单个上架与批量上架命中 40903 弹阻塞弹窗（message 为后端明细）、其他错误仍 toast，验证：`npm test` 相关用例通过

## 2. 集成验证

- [x] 2.1 全量前端测试与构建：`npm test` + `npm run build`，验证：用例无回归、构建成功

## Workflow follow-up

- 配合后端 DAILY 走查：开关开启后缺设备房源上架/批量上架弹阻塞弹窗、补齐后上架成功、关闭开关恢复现状。
- 走查通过后归档 change（delta 同步主 spec），前后端同名 change 一并归档。
- 部署范围届时与用户确认；与后端同批部署。