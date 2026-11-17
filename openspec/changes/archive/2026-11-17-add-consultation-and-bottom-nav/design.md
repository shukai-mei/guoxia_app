# Design

## Context

租客端现为单页路由（Vue 3 + Vant 4 + vue-router），入口分散：App.vue 全局挂载可拖动 ContactFloating 悬浮窗，PropertyList 顶部有"我的预约"横幅卡片，我的预约页仅能从横幅与预约成功页进入。新设计规范要求底部 3 图标导航（房源/预约/咨询）+ 新咨询页 + 我的预约页须知板块，并删除悬浮窗与横幅。FAQ 与须知内容由后端同名 change 提供接口（t_system_config JSON），管理端以文本域整体维护。动机见 proposal.md - Why。

约束：
- 用户已确认：完全移除悬浮窗；FAQ/须知后端存 JSON、管理端文本域整体编辑
- 设计规范指定样式细节（暖橙渐变须知块、QA 卡片、底部导航实心/描边区分选中态）
- 前端仓库既有约定：全量 vitest 测试 + vue-tsc + vite build 通过才算完成；artifacts 用中文

## Goals / Non-Goals

**Goals:**
- 底部导航成为租客端主入口体系，悬浮窗与横幅彻底移除
- 咨询页、须知板块、管理端内容配置页与后端接口端到端打通
- 保持既有页面（房源详情、预约流程、开门/密码交互）行为不变

**Non-Goals:**
- 不做用户体系与"我的"tab（规范明确 3 tab 无"我的"）
- 不改管理端既有页面配色（设计稿只覆盖租客端，沿用既有约定）
- FAQ/须知不做逐条增删改与排序 UI（后端接口即整体覆盖）

## Decisions

### D1: TabBar 挂载与避让

新建 `src/components/TabBar.vue`，在 App.vue 全局挂载（替代 ContactFloating 的原位置）。组件内用 `useRoute()` 计算：仅 4 个租客路由（`/`、`/my-appointments`、`/booking-success/:id`、`/consultation`）展示；active tab 由路径推导（`/`→房源，`/my-appointments`、`/booking-success`→预约，`/consultation`→咨询）。结构上组件同时输出一个与导航同高的占位块（文档流内）+ `position:fixed` 的导航条，占位块置于 router-view 之后即可让各页面内容自然避让，无需逐页改样式。

备选：每页内嵌组件——四处重复且易漏，否决；放在各页面 scoped 内 fixed——避让需逐页处理，否决。

### D2: 图标选择

Vant 内置图标对（描边/实心区分选中态）：房源 `wap-home-o`/`wap-home`，预约 `todo-list-o`/`todo-list`，咨询 `smile-o`/`smile`（设计稿咨询图标为笑脸；若 smile 实心变体不存在则退回 `chat-o`/`chat`）。选中态实心 + `var(--brand)`，未选中描边 + `var(--hint)`。文字标签 10px。

### D3: 咨询页实现

新建 `src/views/tenant/Consultation.vue`，路由 `/consultation`。FAQ 用自定义卡片实现（不用 van-collapse，便于精确还原设计稿：问徽标、右侧箭头 180° 旋转、展开答案区），默认展开第一条。数据 `Promise.all([getFaq(), getWechatConfig()])`：FAQ 失败 → 页面级错误 + 重试；wechat 失败或未配置 → 仅隐藏管家卡片，不影响 FAQ。复制微信号沿用 MyAppointments 的 `navigator.clipboard` + textarea 兜底模式。页面底部 TabBar「咨询」高亮。

### D4: 我的预约页须知板块

MyAppointments.vue 顶部（nav-bar 与列表之间）新增须知板块：暖橙渐变底（#FFF7EE→#FEF0E3）、#F6DFC4 描边、左侧 3px 品牌竖条、「!」徽标 +「看房规则须知」标题、逐条圆点罗列。`onMounted` 与列表并行请求 `getViewingRules()`，失败静默隐藏（与 ContactFloating 既有降级策略一致），空列表同样隐藏。

### D5: 管理端内容配置页行格式约定

新建 `src/views/admin/AdminContentConfig.vue`（路由 `/admin/content-config`，AdminHome 加入口）。两个文本域：
- FAQ：每行一条，格式 `问题 | 答案`，按行内**第一个** `|` 切分（含 `|` 的内容落在答案侧），问题/答案 trim 后非空
- 须知：每行一条，trim 后非空

加载时 JSON → 行（`question | answer` join），保存时行 → JSON，前端先校验（非法行 toast 提示并阻止提交），通过后 PUT 后端；后端校验失败（超长/超量）的 message 直接 toast 展示，文本域内容保留。

### D6: 首页与预约成功页调整

- PropertyList：删除 `my-entry` 横幅模板/样式与 `goMyAppointments`；nav-bar 标题「轻亭看房」→「轻享看房」（设计稿文案）；页面纳入 TabBar（房源高亮）
- BookingSuccess：成功卡下方改信息卡样式（看房时间/房源/地址三行，地址取 `property.building?.address ?? property.location`）；提示条配色改为 #FFF7EE 底 / #F6DFC4 边（替换现 #fffbe8/#ed6a0c 硬编码）；页面纳入 TabBar（预约高亮）

### D7: API 层与类型

types.ts 新增 `FaqItem`、`FaqListView`、`ViewingRulesView`；index.ts 新增 `getFaq`、`getViewingRules`、`adminGetFaq`、`adminUpdateFaq`、`adminGetViewingRules`、`adminUpdateViewingRules`（管理端 PUT 请求体即结构化列表，与后端契约一致）。

### D8: 测试与移除清单

- 删除：`ContactFloating.vue`、`components/__tests__/ContactFloating.test.ts`
- 更新：`App.smoke.test.ts`（ContactFloating stub → TabBar stub，断言四页面可见/详情页与管理端不可见）
- 新增：TabBar 单测（active 推导、跳转）、Consultation 单测（FAQ 渲染/第一条展开/切换/复制/管家卡片隐藏）、MyAppointments 须知板块用例（展示/失败隐藏/空隐藏）、PropertyList 横幅移除断言、AdminContentConfig 单测（回显行格式/非法行拦截/保存提交结构）
- 全量：vitest 全绿、vue-tsc 无错、vite build 通过

## Risks / Trade-offs

- [TabBar fixed 在 iPhone 底部安全区遮挡] → 导航条与占位块均加 `env(safe-area-inset-bottom)` padding
- [smile 实心图标不存在导致选中态不一致] → 退回 chat/chat-o，仅图标语义微差，不影响行为
- [FAQ 内容含 `|` 导致管理端回显切分错位] → 按第一个 `|` 切分 + 答案侧可含 `|`，仅当内容以 `|` 开头等极端情形需人工注意；后端契约不受影响
- [jsdom 下 vant nav-bar 定时器 teardown 噪音] → 既有已知噪音，不影响测试结果与退出码
- [须知接口失败静默隐藏可能让用户无感知] → 与既有悬浮窗降级策略一致（内容非核心路径，宁缺毋乱）

## Migration Plan

1. 后端同名 change 先实现并本地启动，前端联调（Vite 5173 代理到本地后端）
2. 浏览器走查：首页（无横幅、TabBar 房源高亮）→ 详情 → 提交预约 → 预约成功（信息卡+TabBar）→ 我的预约（须知板块+TabBar）→ 咨询页（FAQ+管家卡片+复制）→ 管理端内容配置（回显/保存/非法行拦截）
3. 前后端同步发版（既有 ecs-deploy.sh 流程，前端 dist 构建）
4. 回滚：前端回退上一版 dist 即可；新接口对旧前端无影响

## Open Questions

（无）
