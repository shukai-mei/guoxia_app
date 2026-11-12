# Proposal

## Why

后端已完成"租客自主看房"升级（change add-self-guided-viewing，21/21 任务验收通过），预约、楼栋、每日密码、企微配置与短信通知的新接口均已就绪。前端仍停留在旧交互：租客自由填写期望看房时间、媒体里混着找房指引图、没有楼栋概念、预约成功后没有任何引导。需要前端同步升级，把后端的自主看房能力落到移动端与后台界面上。

## What Changes

- 租客端预约流程升级：房源详情页按"日期 + 时段"提交预约，可约时段按房源所属楼栋配置生成并展示占用状态；提交前校验姓名、手机号，并处理同房源同手机号每日一次、时段冲突等后端错误提示
- 新增预约成功引导页：预约提交成功后跳转，展示企微客服二维码（引导租客添加）、楼栋地址参考图、联系客服远程开门禁提示与看完关门的温馨提示
- 房源详情页展示所属楼栋信息（楼栋名称、地址、租户看中属性）与地址参考图
- 后台新增楼栋管理页面：登记（名称、地址、总楼层、租户看中属性、看房时段配置、地址参考图上传）、编辑、删除
- 后台新增房源每日临时密码维护页面：按房源按日期查看/设置临时密码
- 后台新增企微客服配置页面：配置客服微信号与二维码图片（OSS 上传）
- 后台预约管理列表升级：展示日期与时段（替换期望看房时间）、确认渠道（人工/自动）、短信发送状态、密码已设置标记
- **BREAKING**：预约提交字段由 `preferredTime` 改为 `date + slotStart + slotEnd`；房源媒体类型移除 `GUIDE`（找房指引图废弃）；房源登记/编辑新增必填楼栋 `buildingId`

## Capabilities

### New Capabilities

- `building-management`: 后台楼栋管理界面——楼栋的登记、编辑、删除，地址参考图上传与预览，租户看中属性与看房时段配置的维护

### Modified Capabilities

- `property-browsing`: 房源详情页展示所属楼栋信息与地址参考图；媒体区不再展示找房指引图
- `property-management`: 房源登记/编辑表单新增必填楼栋选择，媒体类型收敛为周边图与内屋视频；新增房源每日临时密码维护界面
- `viewing-appointment`: 租客端预约改为日期 + 时段选择；新增预约成功引导页；管理端预约列表展示时段、确认渠道、短信状态与密码设置标记；新增企微客服配置界面

## Impact

- **src/api/**：`index.ts` 新增楼栋、每日密码、企微配置、可约时段、重发短信等接口函数；`types.ts` 改造 `Appointment`（slotStart/slotEnd/confirmChannel/短信状态/passwordSet）、`Property`（buildingId/building）、`PropertyInput`（buildingId、媒体类型收敛）、新增 `Building`、`DailyPassword`、`WechatConfig`、`Slot` 等类型
- **src/router/**：新增楼栋管理、每日密码维护、企微配置、预约成功引导页路由
- **src/views/tenant/**：`PropertyDetail.vue` 预约表单改造（日期 + 时段网格选择）并展示楼栋信息；新增 `BookingSuccess.vue` 引导页
- **src/views/admin/**：`PropertyForm.vue` 新增楼栋选择、移除找房指引图上传组；`AdminAppointmentList.vue` 展示时段/渠道/短信状态；新增 `BuildingList.vue`、`BuildingForm.vue`、`DailyPasswordList.vue`、`WechatConfig.vue`
- **src/components/**：`MediaUploader.vue` 复用为楼栋地址参考图上传组件
- **src/utils/**：新增日期/时段展示格式化辅助
- **测试**：`src/api/__tests__`、`src/views/__tests__` 同步更新与新增，覆盖新接口封装与关键交互（时段选择、每日一次/时段冲突错误提示、引导页渲染）
- **后端契约**：依赖后端 change add-self-guided-viewing 已实现的接口（楼栋 CRUD、每日密码、企微配置、可约时段查询、预约提交新字段、短信状态字段），响应统一为 `{code, message, data}` 信封
