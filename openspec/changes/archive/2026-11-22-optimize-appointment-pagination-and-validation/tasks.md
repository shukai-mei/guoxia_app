# Tasks

## 1. API 层适配

- [x] 1.1 `src/api/types.ts` 新增 `PageResult<T>`（items、page、size、hasMore）；`getMyAppointments` 与 `adminListAppointments` 的返回类型改为分页结构对应的类型。验证：`npm run build` 类型检查通过
- [x] 1.2 `src/api/index.ts` 为两个列表函数增加 `page` 参数（拼接查询参数），返回类型对齐 1.1。验证：更新 `src/api/__tests__/api.test.ts`（分页参数与响应解析）后 `npm run test` 通过

## 2. 我的预约列表

- [x] 2.1 `src/views/tenant/MyAppointments.vue`：在 `van-pull-refresh` 内接入 `van-list`，实现分页状态（items/page/finished/error）与 `onLoad` 追加逻辑，加载更多失败置 error 状态支持重试、已加载内容保留；下拉刷新统一走 `resetPage()`（清空并回第一页后经 `check()` 重新触发）。验证：`MyAppointments.test.ts` 新增用例（首屏第一页、加载更多追加、hasMore=false 后 finished、加载更多失败保留已加载内容、刷新后回到第一页并可继续翻页）通过
- [x] 2.2 确认列表展示顺序为创建时间倒序（由后端排序，前端直接渲染），空态/须知板块/限时密码/开门按钮等既有逻辑不受分页影响。验证：`npm run test` 全量通过，`npm run build` 通过

## 3. 预约管理列表

- [x] 3.1 `src/views/admin/AdminAppointmentList.vue`：接入 `van-list` 实现分页加载（待处理优先由后端排序保证），保持加载中、空态、加载失败重试；确认/拒绝/重发成功后由 `load()` 全量重载改为 `resetPage()` 回第一页重载。验证：`AdminAppointmentList.test.ts` 更新（分页首屏、加载更多、加载更多失败、操作成功后回第一页）通过

## 4. 表单提示与集成验证

- [x] 4.1 `src/views/tenant/PropertyDetail.vue`：确认新拒绝文案经 `errorMessageOf` 原样透出（无代码改动则仅更新 `PropertyDetail.test.ts` 中旧的"当天已预约"相关断言为新场景）。验证：`npm run test` 通过
- [x] 4.2 本地联调：`npm run dev` 配合已发布分页接口的后端联调，走查我的预约与预约管理两个列表的分页交互、表单三类拒绝提示（重复房源、时段占用、5 房源上限）。验证：页面行为符合 spec 场景，`npm run build` 通过

## Workflow follow-up

- 与后端 change 同窗口发布（先后端后前端），按 design.md Migration Plan 执行并验证。
- 归档前与用户确认两条新拒绝提示的最终文案。
- 实施完成后按项目流程 archive 本 change 并同步 delta 至主 spec。
