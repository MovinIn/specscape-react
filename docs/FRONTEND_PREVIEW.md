# Linxiang · SpecScape frontend preview

独立分支 `linxiang-frontend-update`，目录 `~/Desktop/Frontend3/linxiang-frontend-update`。功能基础为 H3 分支 `9b9d3c1`。原三个工作目录没有改动，没有合并或推送。

## 运行

使用 Node 24（`.nvmrc`）：

```sh
cd ~/Desktop/Frontend3/linxiang-frontend-update
npm ci
npm run dev
```

打开 **http://localhost:5176/**，默认显示本地管理员导航，数据连接真实 SpecScape 后端。`dev:preview` 与 `dev` 相同。端口固定 5176，原版本的 5173–5175 不受影响。若缺少平台原生绑定，在 Node 24 下运行 `npm install --include=optional`。

| 命令                                            | 用途                            |
| ----------------------------------------------- | ------------------------------- |
| `npm run dev` / `npm run dev:preview`           | 真实 API + 本地管理员界面，5176 |
| `npm run build`                                 | TypeScript 检查和真实 API 构建  |
| `npm run dev:demo` / `npm run build:demo`       | 离线样例模式，开发端口 5177     |
| `npm run preview`                               | 浏览已构建版本                  |
| `npm run test:preview`                          | 数据、H3 聚合与下载格式测试     |
| `npm run lint`                                  | 静态检查                        |
| `npm run dev:backend` / `npm run build:backend` | 真实 API、按账户权限显示界面    |

默认 `.env.live` 禁用模拟 API，同时打开本地管理员界面。真实会话、CSRF、REST 与 WebRTC 保留，通过 `VITE_API_PROXY_TARGET` 配置开发代理。后台仍然检查真实账户权限，本地管理员身份不会授予服务端管理员权限。

使用 SpecScape 官网的账户登录 `/login`。在同一浏览器登录 localhost:5173 后，5176 可自然复用 localhost 会话 cookie；焦点返回或会话定时刷新时会重新识别。Chrome 与 Codex 内置浏览器的会话彼此独立。没有登录时，首页/传感器显示真实公开网络信息，受保护数据明确提示连接账户，不会回退成假数据。源码和配置不保存账户密码。

## 版本比较与视觉方向

| 版本             | 可复用部分及差异                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| main · cc6ef56   | 原有研究、账号、资料和管理功能。Bootstrap/Cosmo、顶部下拉菜单、固定页脚和旧分栏存在使用障碍；本地 main 落后于已有 origin/main。 |
| Andrew · e510472 | 集中导航、工具分类、首页卡片与公共页头思路；缺少 H3 及较新主线的部分管理/解码器功能。                                           |
| H3 · 9b9d3c1     | 较新主线、用户目录、解码器深链，H3 聚合/轨迹/发射源等；用作本版功能基础。                                                       |

采用银白/钛灰工业表面、石墨黑文字、紫蓝冰青光谱色。参考 [Apple 的留白与层级](https://www.apple.com/mac/) 和 [Solana 的光谱渐变与流动感](https://solana.com/)，使用原创 SVG 信号图形、细边框和柔和阴影，与 Andrew 的白蓝卡片主题区分。

Research / Administration 切换，主要工具直接可见，资源按需展开，账号固定在侧栏底部。Cmd/Ctrl+K 搜索页面，上下键和 Enter 跳转、Escape 关闭；传感器搜索支持 /。页面进入、按钮、卡片与首页信号图形带轻量动效，并尊重减少动态效果设置。按桌面工作台验收。

## 功能覆盖

| 页面/流程        | 预览行为                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 首页             | 网络计数、地图筛选、研究流程、工具与贡献入口                                                                                                      |
| 传感器浏览与管理 | 搜索、全部/感知中/我的筛选、地图列表联动、频谱/H3/解码器深链；管理表格优先，地图按需展开；添加/编辑/删除、重复检查、坐标校验与控制器状态          |
| 频谱监测         | 传感器/日期/本地时间/聚合、瀑布图、均值/悬停功率谱、占用率、缩放/平移/重置/自动刷新、地图选择传感器                                               |
| H3 空间视图      | 中心传感器、频段/自定义范围、Mean SNR/Peak SNR/Occupancy、分辨率、时间窗、传感器筛选、轨迹、发射源、估算填补、色阶，点击/键盘选择单元格及均值频谱 |
| 信号解码器       | 真实 WebSocket/WebRTC 连接、PSD 与瀑布图，保留调频/增益/音量及九种解码模式；仅离线样例模式生成模拟信号和手动示例音频                              |
| 占用率与排名     | 保留频率/时间分析、排名筛选和图表，统一主题                                                                                                       |
| I/Q 数据集       | 保留真实数据集列表、分组、元数据和下载；离线模式提供有效 Raw float32 I/Q 与 Avro 容器样例                                                         |
| 用户目录         | 搜索、排序、停用账号筛选                                                                                                                          |
| 测量活动         | 多传感器选择，搜索保留已选项；日期/时刻/数值校验、计划创建及持久保存                                                                              |
| 赞助申请与统计   | 列表、详情、状态/备注更新、费用/月度统计和图表                                                                                                    |
| 流会话管理       | 连接传感器、客户端、RTC、使用时长及小时分布                                                                                                       |
| 账号与 token     | 默认本地管理员界面；真实账户连接、资料、注册/恢复/激活及原 token API；服务端权限保持真实账户权限                                                  |
| 公共与资料页     | API、数据集、论文、硬件、开源、合作伙伴、FAQ、联系、加入/贡献、安装、合作及法律页面全部保留，统一导航、排版、表单与卡片                           |

H3 原分支的移动测量是模拟数据，作者确认真实移动数据尚待后端接入。因此 H3 默认选择 **Mobile H3 preview · simulated**，以明显提示保留完整地图交互、移动轨迹和模型发射源；这是这一视图的显式数据来源，并非真实 API 失败后的自动回退。

H3 另有可主动选择的 **Fixed sensor history · real API**：通过 `/spectrum/aggregated` 读取中心点 100 km 内固定传感器最近两小时的真实历史测量，按真实坐标聚合，不能当作真实移动热力图。最多 12 个传感器，三个并发请求，每次频谱请求最多等待 15 秒。未测量区域保持空白；估算填补需要主动开启，单元格明确区分测量与估算。此来源不会生成移动轨迹或模型发射源。

仅 `npm run dev:demo` 的写操作保存在 localStorage（`specscape.linxiang.preview.v1`），包括传感器、活动、申请、资料及联系请求，重载后保留。该模式不发送邮件、不控制真实硬件。默认真实模式的写操作使用原 API，并受服务端权限约束。测试没有创建活动、发送邮件或修改真实传感器。

## 文件位置

| 文件/目录                                                                                                | 改动                                               |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `src/linxiang.css`                                                                                       | 全局视觉、布局、表单、地图和动效                   |
| `src/config/`、`src/layout/`、`src/components/CommandPalette.tsx`                                        | 导航、页面元信息、搜索、内容焦点、页脚             |
| `src/pages/{LandingPage,SensorsPage,SensorManagementPage,SensorFormPage}.tsx`                            | 首页、浏览/管理和传感器表单                        |
| `src/pages/SpecMonPage.tsx`、`src/components/specmon/`                                                   | 频谱工作台、H3 控制及图表                          |
| `src/lib/{geoSpectrum,geoMeasurements,sensors,mapRenderer}.ts`                                           | H3 聚合、真实测量转换、坐标与地图生命周期修复      |
| `src/pages/SpectrumDecoderPage.tsx`、`src/components/decoder/`                                           | 九种模式、模拟信号、AIS 绘制、频率单位、实时图表   |
| `src/components/{LeafletMap,EsLeafletMap,HcChart,RzSlider}.tsx`                                          | 地图图标、OSM 回退、统计图表、键盘滑块             |
| `src/api/{client,liveGeoSpectrum,mock,previewStore}.ts`、`src/auth/`、`src/components/BackendAccess.tsx` | 真实/离线数据分流、会话识别、H3 数据加载与权限提示 |
| `src/lib/previewDownloads.ts`、`src/pages/IqDatasetsPage.tsx`                                            | Raw/Avro/WAV 样例及下载                            |
| `src/pages/{CampaignPage,StreamingStatusPage,SponsoringStatsPage}.tsx`                                   | 管理表单、日期/空数据处理与统计                    |
| `src/pages/{AuthPage,ContactPage,RegisterPage,RecoverPage,JoinPage}.tsx`、`src/components/Recaptcha.tsx` | 本地反馈、登录/验证码预览及站内入口                |
| `tests/preview.test.ts`、`docs/preview/`                                                                 | 回归测试和实际桌面截图                             |

没有新增应用运行依赖。`package-lock.json` 保持基础提交内容。

## 验证和边界

Node 24.19.0 下通过类型检查、真实 API 构建、lint 和 7 项回归测试；新增真实 H3 测量的时间、坐标、缺失值及频率网格测试。lint 无错误；部分旧模块仍有 React 警告，Bootstrap Sass 有上游弃用提示。

离线模式已检查 40 个路由、管理员导航、全局/传感器搜索、地图、H3 控制及反复卸载、九种解码模式、管理表单和两种文件下载。`docs/preview/route-audit.json` 和原五张桌面截图属于离线模式，不能当作真实 API 的完整验收。

真实模式已验证官网账户登录、会话识别、真实传感器目录，以及 Greentree 的 WebSocket/WebRTC PSD 和实时瀑布图。截图 `docs/preview/live-decoder-desktop.jpg` 为真实接收结果。main 和本版在检查的当前历史时间窗均未取得归档测量；本版显示无数据并提供实时解码器入口。H3 的真实历史查询存在部分服务端失败或空数据，因此尚未在本次会话验收到有测量的真实 hexagon；转换与聚合已由测试覆盖。没有将离线样例伪装成真实测量。真实硬件调谐、全部解码协议、邮件及管理写入未完成端到端验收。

后续重连曾遇到数据通道超时，历史查询也出现 HTTP 500/504 和超时；已显示失败状态，不能据此前一次成功宣称连接稳定性已全面验收。H3 模拟来源、真实来源的错误提示和单元格分析经过浏览器检查；更新截图为 `docs/preview/h3-data-source-desktop.jpg`。
