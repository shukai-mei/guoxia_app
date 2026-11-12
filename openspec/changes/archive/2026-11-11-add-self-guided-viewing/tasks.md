# Tasks

## 1. API 层迁移与工具

- [x] 1.1 重写 src/api/types.ts：Appointment 改为 slotStart/slotEnd/confirmChannel/bookingSmsStatus/passwordSmsStatus/passwordSet，Property 增 buildingId/building，PropertyInput 增 buildingId，MediaType 收敛为 SURROUNDING|VIDEO，新增 Building/Slot/DailyPassword/WechatConfig 类型；验证：vue-tsc 编译通过，所有旧字段引用报错已按新契约修正
- [x] 1.2 重写 src/api/index.ts：更新 createProperty/updateProperty/submitAppointment 为新字段，新增 getSlots、楼栋 CRUD（adminListBuildings/adminCreateBuilding/adminUpdateBuilding/adminDeleteBuilding）、每日密码（getDailyPassword/upsertDailyPassword）、企微配置（getWechatConfig/adminGetWechatConfig/adminUpdateWechatConfig）、resendAppointmentSms；验证：对应 mock 测试全部通过
- [x] 1.3 src/utils/format.ts 新增 formatTime（ISO 字符串截取 HH:mm）等时段展示辅助；验证：format 单元测试覆盖
- [x] 1.4 更新 src/api/__tests__ 为后端新契约（含错误信封 code/409 路径），补齐楼栋/时段/密码/企微/重发接口用例；验证：npm test 该目录用例全绿

## 2. 租客端自助看房

- [x] 2.1 PropertyDetail.vue 展示楼栋信息（名称、地址、租户看中属性）与地址参考图（复用签名 URL 过期刷新），未关联楼栋时预约区展示"该房源暂不支持预约看房"；验证：组件测试覆盖楼栋信息渲染、参考图展示、未关联楼栋提示
- [x] 2.2 PropertyDetail.vue 预约表单改造：日期选择（最小今天）→ 查询并渲染时段 chips（不可约禁用）→ 提交新字段（date/slotStart/slotEnd）→ 409 展示后端提示并自动刷新时段 → 成功跳转引导页；验证：组件测试覆盖时段禁用、每日一次/时段冲突 409 刷新、成功跳转
- [x] 2.3 新增 src/views/tenant/BookingSuccess.vue：预约成功提示与时间段、企微二维码与客服微信号、地址参考图、联系客服开门禁与关门提示、加载失败重试；验证：组件测试覆盖渲染与失败重试
- [x] 2.4 src/router/index.ts 新增 /booking-success/:appointmentId 路由；验证：npm run dev 手动访问与从详情页跳转正常

## 3. 管理端楼栋管理

- [x] 3.1 MediaUploader.vue 增加可选 label prop（默认回落原 TYPE_LABEL）；验证：既有三个调用点组件测试不回归，新增 label 覆盖测试通过
- [x] 3.2 新增 BuildingList.vue：楼栋列表（名称、地址、时段摘要）、删除二次确认、删除遇"该楼栋下存在房源"提示展示、编辑入口；验证：组件测试覆盖列表渲染、删除确认与失败提示
- [x] 3.3 新增 BuildingForm.vue（登记/编辑复用）：字段校验（必填项、时段结束晚于开始）、时段配置输入、地址参考图上传（label=地址参考图）、编辑回显与全量替换提交；验证：组件测试覆盖校验失败阻止提交、回显、提交载荷
- [x] 3.4 src/router/index.ts 新增 /admin/buildings、/admin/buildings/new、/admin/buildings/:id/edit 路由；验证：npm run dev 手动走查登记→列表→编辑→删除全流程

## 4. 管理端房源与每日密码

- [x] 4.1 PropertyForm.vue：新增楼栋选择器（必填，加载楼栋列表，编辑回显），移除 GUIDE 找房指引图上传组，提交载荷含 buildingId；验证：组件测试覆盖楼栋必填校验、回显、提交载荷，旧 GUIDE 引用全部移除
- [x] 4.2 新增 DailyPasswordList.vue：房源选择（picker 列出全部房源）、日期选择（默认今天）、当日密码状态查询、设置/覆盖提交；验证：组件测试覆盖状态展示与设置/覆盖流程
- [x] 4.3 src/router/index.ts 新增 /admin/daily-passwords 路由与入口；验证：npm run dev 手动走查查询与设置流程

## 5. 管理端预约与企微配置

- [x] 5.1 AdminAppointmentList.vue 升级：展示日期与时段（start~end）、通过方式 tag（人工/自动）、密码短信状态 tag（成功/失败/未发）、当日密码已设置标记，短信失败行提供重发按钮并刷新状态，确认遇"请先设置当日密码"原样提示；验证：组件测试覆盖各状态渲染与重发交互
- [x] 5.2 新增 WechatConfig.vue：客服微信号输入、二维码上传（max=1）、配置回显、保存（PUT /config/wechat）；验证：组件测试覆盖回显与保存载荷
- [x] 5.3 src/router/index.ts 新增 /admin/wechat-config 路由与入口；验证：npm run dev 手动走查保存与租客端引导页展示一致性

## 6. 集成验证

- [x] 6.1 全量 vue-tsc、vitest、lint、vite build 零失败；验证：命令依次执行通过
- [x] 6.2 与后端真实联调走查：租客端（列表→详情楼栋信息→选时段→提交→引导页企微二维码与地址参考图）、管理端（楼栋 CRUD、房源录入选楼栋、每日密码、预约确认/重发、企微配置）；验证：走查清单全部通过

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
