# Tasks

## 1. API 层

- [x] 1.1 src/api/types.ts：AppointmentInput 增加 `code: string`；验证：vue-tsc 编译通过，所有 submitAppointment 调用点报错已按新契约修正
- [x] 1.2 src/api/index.ts：新增 sendVerificationCode(phone)（POST /api/sms/verification-codes）；验证：mock 测试覆盖 200 成功与错误信封路径
- [x] 1.3 更新 src/api/__tests__：submitAppointment 既有用例载荷断言增加 code，新增 sendVerificationCode 用例；验证：npm test 该目录用例全绿

## 2. 租客端预约表单（PropertyDetail.vue）

- [x] 2.1 手机号 van-field 增加 button 插槽"获取验证码"按钮：点击先校验手机号格式（无效 toast 且不请求），成功后 toast"验证码已发送"并启动 60 秒倒计时（按钮禁用展示剩余秒数，onUnmounted 清理定时器），发送失败 toast 后端 message 不启动倒计时；验证：组件测试覆盖无效手机号不请求、发送成功倒计时（fake timers 推进 60 秒恢复）、倒计时期间禁用、失败提示
- [x] 2.2 表单新增验证码 van-field（type=tel、maxlength=6）；提交校验 6 位数字（不通过 toast 并阻止提交）；提交载荷增加 code；修改手机号时清空验证码；验证：组件测试覆盖校验阻止提交、提交载荷含 code、改手机号清空验证码
- [x] 2.3 提交错误处理：400 验证码错误 toast 后端 message 且保留表单不刷新时段（404/409 处理保持现状）；验证：组件测试覆盖 400 验证码错误提示、表单保留、不触发 loadSlots

## 3. 集成验证

- [x] 3.1 全量 vue-tsc、vitest、vite build 零失败（105 个测试通过；存在一个与本次改动无关的既有偶发问题：Vant 内部 useRect 定时器在跨文件 teardown 后触发 "window is not defined" 的 unhandled error，随机出现在 BuildingList/WechatConfig 等用例文件，单独运行均无此错误）；验证：命令依次执行通过
- [x] 3.2 与后端真实联调走查（依赖后端 change 已实现并部署）：发送验证码 → 倒计时 → 错误验证码提交被拒 → 正确验证码提交成功跳转引导页 → 重复获取限流提示；验证：生产环境走查通过（错误码提交被拒、正确码提交成功跳转 booking-success 页、验证码一次性消费均已在 ECS 实测；真实短信下发待阿里云 RAM 账号获得短信服务权限后复测）

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
