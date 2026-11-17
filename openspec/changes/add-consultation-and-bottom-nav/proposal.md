# Proposal

## Why

新版《轻享看房 UI 设计规范》（2026-11-17）重新规划了租客端信息架构：底部 3 图标导航（房源/预约/咨询）取代散落的入口，新增"咨询"页承载常见问题与管家联系，我的预约页顶部增加"看房规则须知"。同时按用户确认，全站移除"联系管家"悬浮窗与首页"我的预约"横幅，联系与预约入口收口至底部导航。FAQ 与看房须知内容需通过后端动态维护（后端同名 change 提供接口）。

## What Changes

- 新增底部 3 图标导航（房源 / 预约 / 咨询），固定底部展示于房源列表、我的预约、预约成功、咨询四个页面，选中态实心图标 + 品牌色；房源详情页与管理端不展示
- 新增咨询页 `/consultation`：常见咨询问题 QA 折叠列表（数据来自后端 `GET /api/config/faq`）+ 管家联系方式卡片（头像、在线标识、客服微信号、复制微信号按钮，数据来自既有 `GET /api/config/wechat`）
- 我的预约页顶部新增"看房规则须知"板块（暖橙渐变 + 品牌竖条 + 「!」徽标，数据来自后端 `GET /api/config/viewing-rules`，加载失败静默隐藏）
- **REMOVED**：删除"联系管家"悬浮窗组件（ContactFloating）及其 App 挂载、样式与测试，联系入口收口至咨询页
- 移除房源列表页"我的预约"横幅入口，进入我的预约改由底部导航「预约」承担
- 预约成功页对齐设计稿：预约信息卡补充"地址"行，温馨提示条改用规范配色（#FFF7EE 底 / #F6DFC4 边）
- 房源列表页标题修正：「轻亭看房」→「轻享看房」
- 管理端新增「咨询内容配置」页（FAQ 与看房须知两个文本域整体编辑保存，对接后端 `GET/PUT /admin/api/config/faq` 与 `/admin/api/config/viewing-rules`），AdminHome 增加入口

## Capabilities

### New Capabilities

- `app-navigation`: 租客端底部图标导航能力，覆盖三 tab 的展示页面范围、选中态、跳转行为与内容区避让
- `consultation`: 咨询能力，覆盖租客端咨询页（FAQ 折叠列表、管家联系方式与复制微信号）与管理端咨询内容配置（文本域整体编辑 FAQ 与看房须知）

### Modified Capabilities

- `viewing-appointment`: 「展示预约成功引导页」需求补充预约信息卡地址行与提示条配色；「查看我的预约列表」需求新增看房规则须知板块、入口改为底部导航；「联系管家悬浮窗」需求移除

## Impact

- 路由：新增 `/consultation`、`/admin/content-config`；App.vue 挂载 TabBar 替代 ContactFloating
- 组件：新增 TabBar.vue、咨询页、AdminContentConfig.vue；删除 ContactFloating.vue 及其测试；更新 App.smoke.test.ts
- 页面：PropertyList.vue（去横幅、改标题）、MyAppointments.vue（须知板块）、BookingSuccess.vue（信息卡与提示条）
- API 层：新增 FAQ/须知/咨询内容配置接口封装与类型
- 依赖后端同名 change 的 4 个新接口（`/api/config/faq`、`/api/config/viewing-rules` 及管理端 GET/PUT）
- 无破坏性变更：既有页面路由与接口不受影响（悬浮窗与横幅移除为预期行为）
