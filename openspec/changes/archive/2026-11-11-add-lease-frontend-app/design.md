# Design

## Context

guoxia_app 为空目录，从零搭建前端。后端（guoxia_center，change `add-lease-listing-system`）已交付，API 契约冻结于其设计文档 D4：统一响应 `{code, message, data}`；媒体结构 `{type, key, url, sortOrder}`（key 为 OSS 对象 key，url 为查询时签发的临时签名地址）；上传接口 `POST /admin/api/files`（multipart 参数名 `file`）返回 `{key, url}`；预约时间字段 `preferredTime` 按 `yyyy-MM-dd HH:mm:ss` 格式传输。页面按微信小程序 web-view 移动端方向设计。动机见 proposal.md - Why。

## Goals / Non-Goals

**Goals:**

- 单个 Vue 3 SPA 同时承载租客端（`/`）与管理端（`/admin/*`）两套路由区，管理端同样按移动优先设计（简易系统，手机浏览器可用）
- API 客户端与类型定义严格对齐 D4 契约，统一解包 `{code, message, data}` 并把业务错误（400/404/409）转成用户可见的中文提示
- 交付可构建产物（`npm run build` → dist），支持 Nginx 托管 + 反向代理的单域名部署拓扑

**Non-Goals:**

- 微信小程序原生壳（web-view 包装、业务域名配置、校验文件）由用户另行配置，本项目只交付 H5 页面
- 登录/鉴权（后端明确不做，前端无登录页与权限路由）
- 分页/虚拟列表（后端无分页接口，当前数据规模小）
- E2E 自动化测试（依赖后端实例，联调阶段按规格场景浏览器手动验收）

## Decisions

### D1. 技术栈：Vue 3 + Vite + Vant 4 + Vue Router + axios

- 脚手架用 `npm create vite@latest`（vue 模板），TypeScript；UI 用 Vant 4（移动端组件库，与后端设计 D3 的既定技术栈一致）
- 不引入 Pinia：页面状态各自独立（列表、详情、表单均为页面级状态），用 composables 组织逻辑，避免为无共享状态需求引入全局状态层
- 依赖最小化：vue、vue-router、vant、axios；日期处理用原生 `Intl`/手写格式化，不引入 dayjs 之外的重库（时间选择器由 Vant 提供）

备选：uni-app/Taro（拒绝——页面嵌入 web-view，是纯 H5，无多端编译需求）；React（拒绝——用户指定 Vue 技术栈）；Pinia（暂不引入，见上）。

### D2. 路由与页面结构

```
/                         租客端：房源列表（关键词 + 租金区间筛选）
/properties/:id           租客端：房源详情（媒体展示 + 预约表单）
/admin/properties         管理端：房源列表（含下架标记、上下架操作、录入入口）
/admin/properties/new     管理端：房源录入表单
/admin/properties/:id/edit 管理端：房源编辑表单（回显 + 媒体全量替换）
/admin/appointments       管理端：预约列表（确认/拒绝）
```

- 源码结构：`src/api/`（axios 实例、各域 API 函数、类型定义）、`src/views/tenant/`、`src/views/admin/`、`src/components/`（MediaUploader、PropertyCard、StatusTag 等复用组件）、`src/utils/`（校验、格式化）、`src/router/`
- 路由用 createWebHistory，部署时 Nginx `try_files` 回退 index.html（SPA 直链刷新）

### D3. API 客户端与错误处理

- axios 实例 baseURL 取 `VITE_API_BASE_URL`（默认 `/`，与同域反代拓扑匹配；开发期走 Vite 代理，见 D6）
- 响应拦截器统一解包：`code === 0`（或后端约定的成功码）时返回 `data`；否则抛出携带 `message` 的业务错误对象；HTTP 层 4xx/5xx 时若响应体含 `{code, message}` 同样提取，网络异常给兜底中文提示
- 类型定义对齐 D4：`Property`、`MediaItem {type, key, url, sortOrder}`、`Appointment`、`UploadResult {key, url}`；`MediaType = 'SURROUNDING' | 'VIDEO' | 'GUIDE'`、`PropertyStatus = 'AVAILABLE' | 'OFF_SHELF'`、`AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED'`
- 预约提交 `preferredTime` 格式化为 `yyyy-MM-dd HH:mm:ss`（与后端 `@JsonFormat` 一致）；列表接口 keyword/rentMin/rentMax 用 query 参数；上传接口 multipart 参数名 `file`
- 页面统一错误提示用 Vant Toast；409/404 场景按规格处理（预约重复处理→提示并刷新列表；下架房源详情→"房源已下架"）

### D4. 媒体上传组件（MediaUploader）

- 按 `type`（SURROUNDING/VIDEO/GUIDE）复用：选择文件后**前端先行校验**扩展名与大小（图片 jpg/jpeg/png/webp ≤ 10MB；视频 mp4 ≤ 100MB，与后端规则一致），不合规直接提示、不发请求
- 校验通过后调 `POST /admin/api/files`，成功后把 `{key, url}` 加入本地媒体列表：图片用 Vant Image 缩略预览、视频用 `<video>` 预览；**提交表单时只传 `{type, key, sortOrder}`**（sortOrder 取数组内顺序），url 仅用于预览
- 内屋视频至多一个：表单层在 VIDEO 类型已存在时拒绝再次添加并提示
- 编辑回显：既有媒体以列表形式展示（url 用后端返回的临时签名地址），key 随表单提交，实现"全量替换"语义（前端提交完整媒体数组，后端删除旧记录后批量插入）
- 支持移除已添加媒体（仅移出本地列表，不触发删除请求——后端按全量替换语义处理）

### D5. 移动端适配与 web-view 兼容

- 所有页面移动优先：viewport meta、Vant 组件默认移动样式、底部安全区（`env(safe-area-inset-bottom)`）；管理端表单/列表同样适配小屏，同时在中宽屏下限制内容宽度保持可读
- 纯 H5、不依赖微信 JSSDK；视频播放使用原生 `<video controls>`（微信 web-view 内可播放）
- 媒体临时签名 URL 过期处理：图片 `@error`/视频 `error` 事件触发时，自动重新请求当前房源数据（详情页重拉详情、列表页刷新列表）换新签名地址后重载（对应 property-browsing 规格）
- 图片列表用 Vant Image `lazy-load`；房源列表为全量数据，先简单渲染（数据规模小，见 Risks）

### D6. 开发与部署拓扑

- **开发**：Vite dev server 配置 `server.proxy`，将 `/api`、`/admin/api` 代理到后端（目标默认 `http://localhost:8080`，可用 `VITE_DEV_PROXY_TARGET` 环境变量覆盖）；`npm run dev` 即联调，无 CORS 问题
- **生产（首选）**：`npm run build` 产出 dist，Nginx 托管静态资源并将 `/api`、`/admin/api` 反向代理到后端服务——浏览器视角单域名，无需 CORS
- **生产（备选）**：前端直连后端域名（`VITE_API_BASE_URL` 指后端地址），依赖后端已提供的 CORS 白名单（`cors.allowed-origins`）
- 管理端 `/admin/*` 无鉴权，与后端决策一致：安全补偿在部署层（Nginx 来源白名单），前端不做"隐蔽路径"式伪安全

### D7. 测试与验收

- Vitest + Vue Test Utils + jsdom：覆盖关键校验逻辑（手机号正则、媒体类型/大小校验、视频至多一个）与 API 客户端响应解包/错误映射
- 不做 E2E 自动化；验收方式：启动后端 jar + `npm run dev`，在浏览器（手机模拟器 + 真机/微信开发者工具 web-view 预览）按三个 delta 规格的场景逐条走查

## Risks / Trade-offs

- [前端与后端契约理解偏差导致联调返工] → 类型与格式均以 D4 与后端代码实测为准（上传参数名 `file`、时间格式 `yyyy-MM-dd HH:mm:ss` 已核对源码）；联调验收清单覆盖全部规格场景
- [签名 URL 过期导致媒体加载失败] → 规格已定义自动重拉刷新；列表页图片短缓存可接受（默认有效期 30 分钟）
- [微信 web-view 内兼容性问题（视频播放、文件选择、页面跳转）] → 纯 H5 无 JSSDK 依赖；真机预览列入验收清单，必要时降级处理（如视频改为跳转播放）
- [房源/预约无分页，数据量增大后列表页变慢] → 当前数据规模可接受；后续加分页需后端同步变更（契约变更走两侧流程）
- [管理端无鉴权被滥用] → 与后端一致按业务方决策执行；部署层白名单限制（上线清单项）

## Migration Plan

1. 初始化工程：`npm create vite@latest`（vue-ts 模板）+ 安装 vant、vue-router、axios 及 Vitest 测试依赖
2. 实现顺序：API 客户端与类型 → 路由骨架 → 租客端页面 → 管理端页面 → 媒体上传组件 → 校验与错误处理 → Vitest 测试
3. 联调：本地启动后端 jar（环境变量注入 MySQL/OSS 配置），`npm run dev` 走 Vite 代理，按规格场景逐条验收
4. 部署：`npm run build` 产出 dist → Nginx 托管 + `/api`、`/admin/api` 反代 + HTTPS → 微信业务域名配置与校验文件（用户侧）；`/admin/*` 配来源白名单
5. 回滚：静态资源回滚上一版 dist 即可，无数据库与后端变更
