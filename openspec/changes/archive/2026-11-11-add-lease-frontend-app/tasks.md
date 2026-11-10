# Tasks

## 1. 工程脚手架与基础配置

- [x] 1.1 用 Vite 初始化 Vue 3 + TypeScript 工程（vue-ts 模板），安装 vant、vue-router、axios 依赖，验证 `npm run dev` 能启动开发服务器且 `npm run build` 产出 dist
- [x] 1.2 配置 Vite dev server 代理（`/api`、`/admin/api` 转发到 `VITE_DEV_PROXY_TARGET`，默认 `http://localhost:8080`）与 `VITE_API_BASE_URL` 环境变量，验证：dev server 下请求 `/api/properties` 能代理转发到本地后端并返回 JSON
- [x] 1.3 全局移动端适配：viewport meta、Vant 样式引入、底部安全区处理与基础布局骨架，验证：浏览器手机模拟器下各页面骨架正常渲染、无横向滚动
- [x] 1.4 配置 Vitest + Vue Test Utils + jsdom 并编写一个冒烟测试，验证 `npm run test` 通过

## 2. API 客户端与类型

- [x] 2.1 定义 D4 契约类型（`Property`、`MediaItem {type,key,url,sortOrder}`、`Appointment`、`UploadResult {key,url}` 及请求体类型）与 axios 实例（`VITE_API_BASE_URL` baseURL、响应拦截器统一解包 `{code,message,data}`），验证：Vitest 覆盖成功解包与业务错误抛出
- [x] 2.2 实现各域 API 函数：租客端列表/详情/预约提交（时间格式化为 `yyyy-MM-dd HH:mm:ss`）；管理端房源 CRUD/上下架/媒体上传（multipart 参数名 `file`）/预约列表/确认/拒绝，验证：Vitest 断言各请求路径、方法与参数与 D4 一致
- [x] 2.3 实现错误提示工具：业务错误取后端 `message` 用 Vant Toast 展示、HTTP/网络异常给中文兜底文案，验证：Vitest 覆盖 400/404/409 与网络异常映射

## 3. 租客端页面

- [x] 3.1 房源列表页：在租房源摘要（标题、位置、户型、面积、月租金）按登记时间倒序、加载/空态/错误重试、关键词与租金区间组合筛选、清除条件，验证：浏览器走查 property-browsing 列表与筛选全部场景（含空态与无结果）
- [x] 3.2 房源详情页：完整信息展示、周边图/找房指引图浏览（Vant Image 预览）、内屋视频播放、预约入口；已下架房源展示"房源已下架"且无预约入口，验证：浏览器走查详情相关场景
- [x] 3.3 媒体签名 URL 过期自动刷新：图片/视频加载失败时自动重拉房源数据换新签名 URL 并重新加载，验证：浏览器走查（构造过期 URL 触发失败）媒体可重新加载

## 4. 管理端页面：房源管理

- [x] 4.1 房源列表页：全部房源（含下架标记）、录入入口、上下架操作（二次确认）、状态变更后列表即时更新，验证：浏览器走查 property-management 列表与上下架场景
- [x] 4.2 房源录入表单：必填项校验（标题、位置、户型、面积、月租金、联系方式）、提交成功提示并返回列表、失败保留已填内容，验证：浏览器走查录入场景（含缺项阻止提交与失败提示）
- [x] 4.3 MediaUploader 组件：前端先行校验类型与大小（图片 jpg/jpeg/png/webp ≤10MB，视频 mp4 ≤100MB）、上传返回 `{key,url}` 后图片/视频预览、移除已添加媒体、内屋视频至多一个，验证：浏览器走查上传全部场景 + Vitest 覆盖校验逻辑
- [x] 4.4 房源编辑表单：回显既有信息与媒体（签名 URL 预览）、提交完整媒体数组 `{type,key,sortOrder}`（全量替换语义）、编辑不存在房源给出提示，验证：浏览器走查编辑场景（修改媒体后租客端详情同步可见）

## 5. 管理端页面：预约管理

- [x] 5.1 预约列表页：展示全部申请（租客姓名、手机号、期望时间、关联房源、状态）且待处理优先、空态与错误重试，验证：浏览器走查 viewing-appointment 列表场景
- [x] 5.2 确认与拒绝操作：拒绝必填原因、成功后状态即时更新且操作入口消失、重复处理（409）提示并刷新列表，验证：浏览器走查确认/拒绝/未填原因/重复处理场景

## 6. 联调验收与构建

- [x] 6.1 本地启动后端 jar（环境变量注入 MySQL/OSS 配置）+ `npm run dev`，按三个 delta 规格的全部场景逐条走查（含手机模拟器与微信开发者工具 web-view 预览），验证：全部规格场景通过、无控制台报错
- [x] 6.2 `npm run build` 产出 dist，用 `vite preview` 走查关键页面，验证：构建产物可静态托管且页面功能正常

## Workflow follow-up

- 部署（用户侧）：Nginx 托管 dist + `/api`、`/admin/api` 反向代理 + HTTPS + 微信业务域名配置与校验文件；`/admin/*` 配来源白名单
- 归档：验收通过后运行 `/opsx:archive` 将 delta 规格归档到主规格库
