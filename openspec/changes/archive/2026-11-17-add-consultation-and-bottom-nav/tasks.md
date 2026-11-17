# Tasks

## 1. 基础设施与移除

- [x] 1.1 路由新增 `/consultation`（tenant-consultation）与 `/admin/content-config`（admin-content-config）。验证：`npx vue-tsc --noEmit` 通过，路由文件无类型错误
- [x] 1.2 删除 ContactFloating.vue、components/__tests__/ContactFloating.test.ts，App.vue 移除其挂载与导入。验证：`npx vitest run` 全绿（删除后无引用残留），vue-tsc 通过

## 2. 底部导航

- [x] 2.1 新建 src/components/TabBar.vue：useRoute 推导 active tab（/→房源，/my-appointments、/booking-success/:id→预约，/consultation→咨询），仅四个租客路由渲染；输出文档流占位块 + fixed 导航条（图标 wap-home-o/wap-home、todo-list-o/todo-list、smile-o/smile，选中实心+var(--brand)，安全区 padding）；App.vue 挂载。验证：新增 TabBar.test.ts（active 推导各路由、跳转三 tab），App.smoke.test.ts 更新为 TabBar stub（四页面可见、/properties/:id 与 /admin 不可见），相关测试绿

## 3. 咨询页

- [x] 3.1 api/types.ts 新增 FaqItem、FaqListView、ViewingRulesView；api/index.ts 新增 getFaq、getViewingRules、adminGetFaq、adminUpdateFaq、adminGetViewingRules、adminUpdateViewingRules（路径 /api/config/faq、/api/config/viewing-rules 及 /admin/api/config 对应 GET/PUT）。验证：vue-tsc 通过，api/__tests__ 既有用例不回归
- [x] 3.2 新建 src/views/tenant/Consultation.vue：并行加载 FAQ 与企微配置；FAQ 自定义折叠卡片（问徽标、箭头旋转、第一条默认展开）；管家联系卡片（头像、在线标识、微信号、复制微信号按钮，navigator.clipboard + textarea 兜底）；FAQ 失败页面级错误+重试，FAQ 空列表空态，企微未配置隐藏管家卡片。验证：新增 Consultation.test.ts 覆盖渲染/展开切换/复制/空态/隐藏卡片，测试绿
- [x] 3.3 咨询页样式对齐设计稿（.faq 卡片 0.5px 描边圆角 12、QA 布局、管家卡片、复制按钮主色）。验证：浏览器走查见 6.2

## 4. 既有页面调整

- [x] 4.1 MyAppointments.vue 顶部新增"看房规则须知"板块（#FFF7EE→#FEF0E3 渐变、#F6DFC4 描边、左侧品牌竖条、! 徽标、圆点列表），与预约列表并行请求 getViewingRules，失败或空列表静默隐藏。验证：MyAppointments 既有测试更新 + 新增板块展示/失败隐藏用例，测试绿
- [x] 4.2 PropertyList.vue 删除"我的预约"横幅（模板、样式、goMyAppointments），nav-bar 标题改「轻享看房」。验证：PropertyList 测试更新（无横幅断言、标题断言），测试绿
- [x] 4.3 BookingSuccess.vue 成功区改为预约信息卡（看房时间/房源/地址三行，地址取 building.address 兜底 property.location），提示条配色 #FFF7EE/#F6DFC4。验证：BookingSuccess 测试更新（信息卡三行断言），测试绿

## 5. 管理端内容配置

- [x] 5.1 新建 src/views/admin/AdminContentConfig.vue：FAQ 文本域（每行 `问题 | 答案`，按第一个 | 切分）与须知文本域（每行一条）；加载回显 JSON→行；保存行→JSON 前端校验（FAQ 行缺分隔符/问题答案为空、须知空行 → toast 阻止提交），通过后 PUT 后端；接口失败 message toast 且文本域保留。验证：新增 AdminContentConfig.test.ts（回显、非法行拦截不提交、保存提交结构），测试绿
- [x] 5.2 AdminHome.vue 增加「咨询内容配置」入口（标题+描述+路由）。验证：AdminHome 测试更新，测试绿

## 6. 集成验证

- [x] 6.1 全量 `npx vitest run` 绿（既有 160+ 用例与新增用例全部通过）、`npx vue-tsc --noEmit` 无错、`npm run build` 通过。验证：三命令退出码 0
- [x] 6.2 本地后端（后端同名 change 已实现，APP_ENV=DAILY）联调浏览器走查：首页（无横幅、TabBar 房源高亮、标题轻享看房）→ 详情（无 TabBar）→ 提交预约 → 预约成功（信息卡含地址、提示条、TabBar 预约高亮）→ 我的预约（须知板块、TabBar）→ 咨询页（FAQ 折叠、管家卡片、复制、TabBar 咨询高亮）→ 管理端内容配置（回显/保存/非法行拦截）。验证：逐页截图确认与设计稿一致，管理端保存后租客端即时可见新内容

## Workflow follow-up

- 后端同名 change 完成后前后端同步发版（沿用既有发布惯例，前端 dist 构建部署）
- 归档：/opsx:archive（或 openspec sync + archive）将 app-navigation、consultation 新能力与 viewing-appointment delta 同步至主规格库，validate --specs 通过
