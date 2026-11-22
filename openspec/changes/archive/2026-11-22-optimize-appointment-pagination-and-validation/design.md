# Design

## Context

前端现状（见 proposal.md - Why）：「我的预约」`MyAppointments.vue` 一次全量加载并已有 `van-pull-refresh` 下拉刷新；「预约管理」`AdminAppointmentList.vue` 一次全量加载，确认/拒绝/重发成功后调用 `load()` 全量重载；两个列表接口经 `src/api/index.ts` 直接返回数组，无分页语义；项目未使用过 `van-list` 组件。预约表单 `PropertyDetail.vue` 提交失败时用 `errorMessageOf` 原样展示后端错误文案（409 时额外刷新可约时段），新校验文案可自动透出、无需改表单逻辑。

约束：后端 change（同仓库对端 guoxia_center）将两个列表接口改为分页响应（items、page、size、hasMore），响应结构 BREAKING，需同窗口发布。

## Goals / Non-Goals

**Goals:**
- 两个列表页改为"下拉加载更多"交互：每页 20 条、滚动到底自动加载、全部加载完停止。
- 「我的预约」排序展示切换为创建时间倒序；「预约管理」保持待处理优先（后端保证）。
- 表单提交失败的新拒绝提示正常展示（沿用原样展示后端文案）。

**Non-Goals:**
- 不新增筛选、搜索、分组等列表能力。
- 不做虚拟列表 / 性能级优化（单列表数据量在百级）。
- 不修改预约表单本身的交互结构（仅 spec 文案场景更新）。

## Decisions

### 1. 列表组件选型：Vant `van-list` + 现有 `van-pull-refresh`

- 「我的预约」：在现有 `van-pull-refresh` 内层包裹 `van-list`，`@load` 触发加载下一页；`finished` 表示无更多；`loading` 由 van-list 托管。
- 「预约管理」：直接用 `van-list` 承载列表（当前页面无下拉刷新，保持现状，不新增）。
- 替代方案：手写滚动监听 + IntersectionObserver。放弃原因：van-list 已提供加载防抖、loading/finished/error 状态机与底部提示，手写重复且易错。

### 2. 分页状态管理

- 每页维护统一状态：`items`（累积）、`page`（当前页码）、`finished`、`errorText`。
- `onLoad` 回调：请求 `page` 页 → 成功则追加 items、`page+1`、`finished = !hasMore`；失败则置 van-list 的 error 状态供重试，已加载内容保留。
- 重载入口（首次加载、下拉刷新、确认/拒绝/重发成功后）统一走 `resetPage()`：清空 items、page=1、finished=false、重新触发加载；刷新场景通过 `van-list` 实例的 `check()` 方法重新触发 `@load`（避免用 v-if 重新挂载丢失滚动位置）。
- 替代方案：刷新时 `v-if` 重挂 van-list。放弃原因：组件重建会丢失滚动位置与展开态。

### 3. API 层适配

- `src/api/index.ts`：`getMyAppointments(page)` 与 `adminListAppointments(page)` 增加 `page` 查询参数，返回 `PageResult<T>`。
- `src/api/types.ts`：新增 `PageResult<T>`（items、page、size、hasMore），两个列表函数的返回类型由数组改为 `PageResult<...>`。
- 响应字段与后端 `PageView` 对齐，避免字段名分叉。

### 4. 操作成功后重置而非全量刷新

- 管理端确认/拒绝/重发成功后，由 `load()`（全量重载）改为 `resetPage()`（回到第一页重载），保证操作结果即时可见且列表回到待处理优先的最新第一页。

## Risks / Trade-offs

- [van-list 与 pull-refresh 组合下，刷新后若未重置 finished/page 状态，会导致后续翻页错乱或"没有更多了"误判] → 所有重载入口统一走 `resetPage()`，并新增刷新后继续翻页的测试用例。
- [前后端响应结构 BREAKING，单侧先发布会白屏/接口报错] → 与后端 change 同窗口发布，发布前双方联调通过。
- [加载更多请求失败后用户可能重复点击触发并发请求] → 复用 van-list 的 error/loading 状态机，重试前保持 loading 防抖。

## Migration Plan

1. 与后端 change 同窗口发布（先发布后端服务，再发布前端静态资源）。
2. 发布后走查：我的预约（首屏、加载更多、刷新、空态、须知板块）、预约管理（待处理优先、加载更多、确认/拒绝/重发后回到第一页）、预约表单三类新拒绝提示。
3. 回滚：前端回滚需与后端同步回滚（响应结构不兼容）。

## Open Questions

（无）
