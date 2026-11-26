# Tasks

## 1. API 类型与测试 fixture

- [x] 1.1 `src/api/types.ts`：`Building` 增 `selfOpenSupported: boolean`，`BuildingInput` 增 `selfOpenSupported?: boolean`，`MyAppointment` 增 `selfOpenSupported: boolean` 与 `housekeeper: Housekeeper | null`（复用既有 `Housekeeper`）。验证：`npx vue-tsc --noEmit` 通过（fixture 补齐后）。
- [x] 1.2 同步既有测试 fixture：`MyAppointments.test.ts` 各 `MyAppointment` 常量补 `selfOpenSupported: true` 与 `housekeeper: null`；`BuildingForm.test.ts` 的 building 响应补 `selfOpenSupported`。验证：`npx vitest run src/views/__tests__/MyAppointments.test.ts src/views/__tests__/BuildingForm.test.ts` 既有用例全绿（无回归）。

## 2. 楼栋表单「支持自助开门」开关

- [x] 2.1 `BuildingForm.vue`：`form` ref 增 `selfOpenSupported: false`；`onMounted` 编辑回显 `building.selfOpenSupported ?? false`；`buildInput()` 无条件携带 `input.selfOpenSupported = f.selfOpenSupported`。验证：`BuildingForm.test.ts` 新增用例断言新建提交 `selfOpenSupported=false`、编辑回显既有值并随提交携带，`npx vitest run src/views/__tests__/BuildingForm.test.ts` 通过。
- [x] 2.2 `BuildingForm.vue` 模板：门禁设备序列号字段后增 `van-field name="selfOpenSupported" label="支持自助开门"` + `van-switch v-model="form.selfOpenSupported" size="20px"`，附「关闭表示需管家带看」说明。验证：`BuildingForm.test.ts` 断言开关存在、默认关闭、切换后提交值随之变化；`npx vue-tsc --noEmit` 通过。

## 3. 我的预约管家带看引导

- [x] 3.1 `MyAppointments.vue`：新增 `isEscortOf(item)` = `(status==='PENDING'||status==='CONFIRMED') && item.selfOpenSupported === false && !isAfterWindow(item)`（严格 `=== false`，后端未上线时 `undefined` 不触发）。验证：`MyAppointments.test.ts` 新增用例断言 `selfOpenSupported:false` 的待处理/已确认记录命中 escort、`true`/`undefined`/已失效/已过期记录不命中，`npx vitest run src/views/__tests__/MyAppointments.test.ts` 通过。
- [x] 3.2 `MyAppointments.vue` 模板：escort 分支以 `v-if="isEscortOf(item)"` 渲染 `.escort-tip`（「本楼栋门禁不支持自助开门」+ 副文案）与 `.escort-actions`（「联系管家带看」+「房源详情」），`v-else` 保留原密码区与门禁开门按钮；escort 时隐藏 `passcode-pending`/`passcode-row` 与三个门禁开门按钮。验证：`MyAppointments.test.ts` 断言 escort 卡片含提示条文案、不含「门禁开门」与「房门密码」，非 escort 卡片渲染不变。
- [x] 3.3 `MyAppointments.vue`：`item.housekeeper` 非空时渲染 `.escort-qr`（`qrUrl` 二维码 + 名称 + 「在线」标签 + `contact`），「联系管家带看」为 `<a :href="'tel:' + housekeeper.contact">` 样式按钮；`housekeeper` 为空时降级为仅提示条 + 「房源详情」。验证：`MyAppointments.test.ts` 断言有管家时二维码/电话/`tel:` href 存在、无管家时降级且无拨号按钮，`npx vitest run src/views/__tests__/MyAppointments.test.ts` 通过。
- [x] 3.4 `MyAppointments.vue` scoped style：照设计规范落入 `.escort-tip`/`.escort-qr`/`.escort-actions`（暖橙 #FFF7EE/#F6DFC4、`var(--brand)`/`var(--brand-strong)` 等、二维码框 76×76、主按钮 flex:1 品牌橙、ghost 白底描边）。验证：`npm run build` 通过；DAILY 走查 escort 卡片视觉与设计稿一致（提示条/二维码/双按钮）。

## 4. 集成验证

- [x] 4.1 全量类型与单测：`npx vue-tsc --noEmit` 与 `npx vitest run` 全绿。验证：命令退出码 0，无既有回归。
- [x] 4.2 DAILY 端到端走查（依赖后端同名 change 已部署）：造一个 `selfOpenSupported=false` 且关联管家的楼栋 + 房源 + 预约，租客「我的预约」展示管家带看引导（提示条/二维码/拨号/房源详情），无密码与门禁开门；再造未关联管家的 escort 楼栋验证降级；造 `selfOpenSupported=true` 楼栋验证原自助开门渲染不变。验证：浏览器逐项对照设计规范截图确认，记录走查结论。

## Workflow follow-up

- 前后端同批生产发布（发布范围与用户确认）：后端 `clean package` + deploy-backend.sh，前端生产构建部署。
- 项目评审要求满足后归档本 change（`/opsx:archive add-building-escort-guidance`），并校验归档结果与主 spec 同步。