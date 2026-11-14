# Tasks

## 1. 身份标识基础设施

- [x] 1.1 新增 `src/utils/identity.ts`：`getOrCreateIdentity()`（localStorage 沿用/`crypto.randomUUID()` 生成）、`wxcode` 换取 openid（成功持久化、失败降级伪身份）、模块级单例初始化 promise；验证：`identity.test.ts` 覆盖生成/沿用/换取成功/降级全部通过
- [x] 1.2 改造 `src/api/http.ts`：请求拦截器 await 身份初始化并统一注入 `X-Viewer-Identity` 请求头；验证：http 层测试断言请求头注入与初始化竞态（先初始化后携带）通过
- [x] 1.3 `src/api/index.ts` 新增 `getMyAppointments()`、`openDoor(id)`、`exchangeWechatSession(code)`，`types.ts` 新增 `MyAppointment`（含 `passcode?`、`canOpenDoor`）与楼栋/房源表单设备字段；验证：`api.test.ts` 新增用例通过
- [x] 1.4 `main.ts` 启动时触发身份初始化（不阻塞渲染）；验证：既有全部测试无回归

## 2. 我的预约页

- [x] 2.1 新增 `src/views/tenant/MyAppointments.vue`（Vant 卡片列表 + 下拉刷新 + 空态 + 加载失败重试，状态映射 PENDING/CONFIRMED/REJECTED）并注册路由 `/my-appointments`；验证：页面测试覆盖列表渲染/空态/错误重试通过，vue-tsc 干净
- [x] 2.2 实现开门按钮交互（`canOpenDoor` 时展示、请求中禁用、成功/失败 toast 展示后端 message）与限时密码展示/复制（剪贴板失败降级文本选中）；验证：页面测试覆盖开门成功/失败与密码复制通过
- [x] 2.3 添加入口：`PropertyList` 顶部"我的预约"入口，`BookingSuccess` 增加"查看我的预约"按钮并更新开门提示文案；验证：更新后的 `BookingSuccess.test.ts`/`PropertyDetail` 相关测试通过

## 3. 管理端表单字段

- [x] 3.1 `BuildingForm.vue` 增加可选"门禁设备序列号"字段（≤64 字符，编辑回显，随表单提交）；验证：`BuildingForm.test.ts` 覆盖新增字段通过
- [x] 3.2 `PropertyForm.vue` 增加可选"通通锁锁具编号"字段（≤64 字符，编辑回显，随表单提交）；验证：`PropertyForm.test.ts` 覆盖新增字段通过

## 4. 小程序壳

- [x] 4.1 `miniprogram/pages/index/index.js` 在 `onLoad` 中 `wx.login` 成功后以 `?wxcode=<code>` 拼接并绑定 web-view src，`index.wxml` 改为数据绑定；验证：微信开发者工具预览确认 web-view 加载的地址携带 wxcode 参数

## 5. 集成验证

- [x] 5.1 全量 `npm test` 绿、`vue-tsc` 干净、`vite build` 通过
- [x] 5.2 与后端联调浏览器走查：身份初始化静默生效 → 提交预约 → 我的预约展示记录 → 预约时段内开门（后端 mock 模式）→ 限时密码展示与复制 → 管理端楼栋/房源设备字段保存与回显

## Workflow follow-up

- 实现验收后运行 `openspec archive` 归档本 change（delta 同步至主规格库，validate 通过）。
- 与后端 guoxia_center 同名 change 同步发版；小程序壳改动随发版提交微信审核，审核期间按伪身份降级运行。
