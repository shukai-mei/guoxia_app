# Design

## Context

见 proposal.md - Why。后端同名 change 给 `t_building` 加 `self_open_supported` 标识，并在租客预约视图 `TenantAppointmentView` 透出 `selfOpenSupported`（boolean）与 `housekeeper`（复用 `HousekeeperView`，含签名 `qrUrl`）。后端进一步把 escort 块照冻结进预约 `ext_info` 快照，`selfOpenSupported`/`housekeeper` 改由预约创建时快照供数、值随预约冻结（楼栋标识或管家后续变更不影响存量预约）；前端 API 契约与渲染行为不变，仅消费这两个字段。前端当前状态：

- `BuildingForm.vue` 表单 `form` ref 含 `accessDeviceSerial`，`buildInput()` 条件携带各选填字段，`onMounted` 编辑回显；已有 `van-switch`（电梯）与管家 picker 范式可照搬。
- `MyAppointments.vue` 卡片按 `passcodePendingOf`/`passcodeUnconfirmedOf`/`item.passcode` 渲染密码区，按 `canOpenDoor`/`doorPendingOf`/`doorUnconfirmedOf` 渲染「门禁开门」按钮，`goPropertyDetail` 已存在。
- 设计规范文件 `Desktop/guoxia_file/轻享看房-UI设计规范.html` 定义 `.escort-tip`/`.escort-qr`/`.escort-actions` 规格（暖橙 #FFF7EE/#F6DFC4、品牌橙 var(--brand)）。
- 测试 `src/views/__tests__/BuildingForm.test.ts`、`MyAppointments.test.ts` 以 `MyAppointment`/`Building` fixture 驱动，新增必填字段需同步 fixture。

## Goals / Non-Goals

**Goals:**

- 楼栋表单提供「支持自助开门」开关，新建默认关闭、编辑回显、随表单提交。
- 「我的预约」对不支持自助开门楼栋的待处理/已确认记录，按设计规范渲染管家带看引导，替换门禁开门与密码区。
- 引导文案与样式照抄设计规范；「联系管家带看」以 `tel:` 拨打管家联系电话。

**Non-Goals:**

- 不改预约成功引导页文案（与后端 design 一致，列为可选后续）。
- 不改自助开门楼栋（`selfOpenSupported === true`）的现有密码/门禁开门渲染与 `doorSupported` 待处理置灰语义。
- 不在楼栋列表新增标识列（可选后续）。
- 不新增前端路由或 API 端点，仅消费后端新增字段。

## Decisions

### Decision 1: escort 判定用严格 `=== false`，避免后端未上线时误翻转

`isEscortOf(item)` = `(status === 'PENDING' || status === 'CONFIRMED') && item.selfOpenSupported === false && !isAfterWindow(item)`。

- 用严格 `=== false` 而非 `!item.selfOpenSupported`：后端未部署时字段为 `undefined`，严格判定不触发 escort，卡片维持现有渲染，前后端部署顺序解耦、可灰度。
- 排除 `CANCELLED`/`REJECTED`（维持失效/拒绝原因展示）与已过期（`isAfterWindow`，与现有密码/开门区在过期后隐藏的语义一致）。
- 备选：`!selfOpenSupported` 真值判定——被否，旧后端响应会把全部卡片翻成 escort。

### Decision 2: escort 分支替换密码区与门禁开门，保留房源详情

当 `isEscortOf(item)` 为真：

- 隐藏 `passcode-pending`/`passcode-row` 与三个「门禁开门」按钮（`canOpenDoor`/`doorPendingOf`/`doorUnconfirmedOf`）。
- 渲染 `.escort-tip`（暖橙提示条「本楼栋门禁不支持自助开门」+ 副文案「需联系管家带看，请提前添加管家微信或拨打电话预约带看」）。
- 渲染 `.escort-actions`：「联系管家带看」主按钮 + 「房源详情」ghost 按钮（复用 `goPropertyDetail`）。
- 非 escort 记录走原有模板分支，零回归。
- 实现以 `v-if="isEscortOf(item)"` / `v-else` 包裹密码区与按钮区，避免在多个既有 `v-if` 上逐一追加 `&& !isEscortOf`。

### Decision 3: 管家二维码与拨号仅在已关联管家时展示，未关联降级

- `item.housekeeper` 非空：渲染 `.escort-qr`（`qrUrl` 二维码 + 名称 + 「在线」标签 + `contact` 电话），「联系管家带看」为 `<a :href="'tel:' + housekeeper.contact">` 样式按钮。
- `item.housekeeper` 为空：降级为仅 `.escort-tip` + 「房源详情」按钮，不渲染二维码/电话/拨号按钮。
- 用锚点 `tel:` 而非 `window.location.href` 赋值：可被单测断言 `href`，且语义化、无需额外 JS。
- 备选：拨号走 `showDialog` 确认——被否，设计规范主按钮直接拨号，用户已确认「拨打管家电话」。

### Decision 4: 楼栋表单开关照搬电梯 van-switch 范式

- `form` ref 增 `selfOpenSupported: false`（新建默认关闭）。
- 模板在门禁设备序列号字段后增 `van-field name="selfOpenSupported" label="支持自助开门"` + `van-switch v-model="form.selfOpenSupported"`，附说明「关闭表示需管家带看」。
- `onMounted` 编辑回显 `selfOpenSupported: building.selfOpenSupported ?? false`。
- `buildInput()` 无条件携带 `input.selfOpenSupported = f.selfOpenSupported`（开关恒有值，区别于选填文本字段）。
- 开关独立于 `accessDeviceSerial`：有设备号也可关闭（强制带看），与后端标识权威语义一致。

### Decision 5: API 类型与 fixture 同步

- `Building` 增 `selfOpenSupported: boolean`；`BuildingInput` 增 `selfOpenSupported?: boolean`。
- `MyAppointment` 增 `selfOpenSupported: boolean` 与 `housekeeper: Housekeeper | null`（复用既有 `Housekeeper` 类型）。
- 既有测试 fixture（`MyAppointments.test.ts` 的 CONFIRMED/PENDING/REJECTED 等、`BuildingForm.test.ts` 的 building 响应）补 `selfOpenSupported`（默认 true 维持原断言）与 `housekeeper: null`，避免类型报错与误触 escort。

### Decision 6: 样式照抄设计规范，复用 CSS 变量

`.escort-tip`/`.escort-qr`/`.escort-actions` 按设计稿规格落入 `MyAppointments.vue` scoped style，颜色用既有 `var(--brand)`/`var(--brand-strong)`/`var(--brand-light)`/`var(--ink)`/`var(--sub)`/`var(--muted)`/`var(--line)`，提示条底色 #FFF7EE、边框 #F6DFC4。二维码框 76×76，主按钮 flex:1 品牌橙、ghost 白底品牌橙描边。

## Risks / Trade-offs

- [后端字段未上线时前端先部署] → Decision 1 严格 `=== false` 判定，`undefined` 不触发 escort，卡片零变化；仍建议前后端同批部署。
- [生产管家档案存在但未关联楼栋] → Decision 3 降级为提示条 + 房源详情，不报错、不展示空二维码。
- [`tel:` 在桌面浏览器无拨号器] → 目标为移动端 webview，桌面点击无副作用；单测断言 `href` 而非真实拨号。
- [新增必填类型字段导致既有 fixture 编译失败] → Decision 5 同步补字段，`vue-tsc` 与 vitest 全量跑通后再提交。

## Migration Plan

1. 后端同名 change 先实现并部署（提供 `selfOpenSupported`/`housekeeper` 字段）。
2. 前端 `npm run build`（vue-tsc + vite）与 `vitest` 全量通过。
3. 前后端同批生产发布：后端 `clean package` + deploy-backend.sh，前端 deploy-daily.sh/生产构建（部署范围发布前与用户确认）。
4. 回滚：前端为纯增量渲染分支与可选字段，回退前端构建即可恢复旧卡片；后端标识列为可空增量，回滚不影响存量数据。