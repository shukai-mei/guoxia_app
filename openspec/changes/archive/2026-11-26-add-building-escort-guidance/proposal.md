# Proposal

## Why

部分楼栋门禁无法自助开门、需管家带看。后端将给楼栋加「支持自助开门」标识并据此调整预约引导（见后端同名 change）。前端需要在楼栋表单提供该标识的开关，并在租客「我的预约」中按 UI 设计规范把不支持自助开门楼栋的预约卡片改为管家带看引导，避免租客看到无法使用的「门禁开门」与房门密码。

## What Changes

- 楼栋登记/编辑表单新增「支持自助开门」开关（`van-switch`），新建默认关闭（需管家带看），编辑回显既有值；随表单提交 `selfOpenSupported`。
- 「我的预约」卡片：当记录 `selfOpenSupported` 为 false 时，按设计规范渲染管家带看引导——暖橙提示条「本楼栋门禁不支持自助开门 / 需联系管家带看，请提前添加管家微信或拨打电话预约带看」+ 管家二维码/名称/「在线」标签/电话 + 「联系管家带看」（`tel:` 拨打管家联系方式）与「房源详情」按钮；替换原「门禁开门」按钮，隐藏房门密码与密码待下发提示。
- 楼栋未关联管家时降级：仅展示提示条与「房源详情」按钮，不展示二维码/拨号。
- 「联系管家带看」主按钮点击发起 `tel:` 拨号（管家联系方式即微信号/手机号）。
- API 类型：`Building`/`BuildingInput` 增 `selfOpenSupported`；`MyAppointment` 增 `selfOpenSupported` 与 `housekeeper`（复用 `Housekeeper` 类型）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `building-management`: 登记楼栋与维护楼栋信息表单新增「支持自助开门」开关（默认关闭、可修改、编辑回显）。
- `viewing-appointment`: 查看我的预约列表新增不支持自助开门楼栋的管家带看引导（提示条 + 管家二维码/电话 + 联系管家带看拨号 + 房源详情），隐藏房门密码与门禁开门，未关联管家时降级。

## Impact

- 代码：`src/views/admin/BuildingForm.vue`（开关 + 提交/回显）、`src/views/tenant/MyAppointments.vue`（escort 引导分支 + 样式）、`src/api/types.ts`（字段）。
- 样式：照抄设计规范 `.escort-tip`/`.escort-qr`/`.escort-actions` 规格（暖橙 #FFF7EE/#F6DFC4、品牌橙 #F57C2A）。
- 测试：`BuildingForm.test.ts`、`MyAppointments` 相关单测增 escort 分支用例。
- 依赖后端同名 change 提供 `selfOpenSupported`/`housekeeper` 字段；前后端同批部署。
- 对外文案沿用设计规范措辞（品牌名「轻亭看房」，提示条文案照设计稿）。