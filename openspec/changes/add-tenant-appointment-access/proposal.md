# Proposal

## Why

租客提交预约后无法在界面上查看自己的预约记录，到楼后需联系客服远程开门禁，房间密码依赖人工维护。本期为租客提供"我的预约"页面：记录可查、预约时段内一键开门禁、自动获取限时密码（页面展示 + 短信），并引入租客身份标识（小程序 openid / 浏览器伪 openid）作为记录归属的查询凭证。

## What Changes

- 新增租客身份标识机制：小程序壳通过 `wx.login` 传递登录凭证，页面换取 openid 后本地持久化；非小程序端生成全局唯一伪 openid 持久化于本地存储；所有租客端请求自动携带身份标识
- 新增"我的预约"页面：展示当前身份关联手机号的全部预约（房源、日期时段、状态），已派发且时段内的记录展示限时密码（可复制），可开门状态展示"开门"按钮并反馈开门结果；提供空态、加载失败重试与下拉刷新
- 预约提交与预约成功引导页调整：提交时自动携带身份标识；引导页增加"查看我的预约"入口，开门方式提示更新为"预约时段内自助开门/查看限时密码"
- 管理端：楼栋表单增加门禁设备序列号（可选）、房源表单增加通通锁锁具编号（可选）
- 小程序壳（web-view）：加载前获取微信登录凭证并附加到页面地址

## Capabilities

### New Capabilities

- `tenant-identity`: 租客身份标识的前端能力：小程序 openid 换取与伪 openid 生成、本地持久化、请求自动携带，作为"我的预约"查询的身份凭证
- `door-access`: 租客自助开门界面能力：预约记录开门按钮（可用性、结果反馈）、限时密码展示与复制

### Modified Capabilities

- `viewing-appointment`: 新增"我的预约"列表页；提交预约携带身份标识；预约成功引导页增加我的预约入口并更新开门提示文案
- `building-management`: 楼栋表单增加门禁设备序列号字段
- `property-management`: 房源表单增加通通锁锁具编号字段

## Impact

- **新增页面**：`/my-appointments`（我的预约列表）及路由、API 函数与类型
- **身份基础设施**：新增 `src/utils/identity.ts`（伪 openid 生成/存储、小程序 code 换取、读取当前身份），http 层统一注入身份请求头
- **小程序壳**：`miniprogram/pages/index/index.js` 增加 `wx.login` 并拼接登录凭证到 web-view 地址
- **改造页面**：`PropertyList`（我的预约入口）、`PropertyDetail`（提交时携带身份）、`BookingSuccess`（入口与提示文案）、`BuildingForm`/`PropertyForm`（设备字段）
- **测试**：新增身份工具、我的预约页、小程序壳逻辑测试；更新既有页面测试与 API 测试
- **联调依赖**：依赖后端同名 change `add-tenant-appointment-access` 的新接口（session 换取、我的预约查询、远程开门）；前后端同步发版
