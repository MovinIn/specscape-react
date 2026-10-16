# Linxiang · SpecScape frontend preview

独立分支 `linxiang-frontend-update`，目录 `~/Desktop/Frontend3/linxiang-frontend-update`。功能基础为 H3 分支 `9b9d3c1`。原三个工作目录没有改动，没有合并或推送。

## 运行

使用 Node 24（`.nvmrc`）：

```sh
cd ~/Desktop/Frontend3/linxiang-frontend-update
npm ci
npm run dev
```

打开 **http://localhost:5176/**，默认管理员，无需登录或验证码。`dev:preview` 与 `dev` 相同。端口固定 5176，原版本的 5173–5175 不受影响。若缺少平台原生绑定，在 Node 24 下运行 `npm install --include=optional`。

| 命令                                            | 用途                        |
| ----------------------------------------------- | --------------------------- |
| `npm run dev` / `npm run dev:preview`           | 本地管理员预览              |
| `npm run build`                                 | TypeScript 检查和预览构建   |
| `npm run preview`                               | 浏览已构建版本              |
| `npm run test:preview`                          | 数据、H3 聚合与下载格式测试 |
| `npm run lint`                                  | 静态检查                    |
| `npm run dev:backend` / `npm run build:backend` | 真实 API、登录与权限模式    |

后端模式保留会话、CSRF、REST 与 WebRTC 流程，需要有效服务与账户；通过 `VITE_API_PROXY_TARGET` 配置开发代理。免登录管理员仅在 preview/mock 模式启用。

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
| 信号解码器       | 本地连接/断开、调频/增益/音量、实时示例 PSD 与瀑布图；FM/AM/ADS-B/AIS/ACARS/LTE/IoT/LoRa/WiFi；FM/AM 提供手动播放示例音频                         |
| 占用率与排名     | 保留频率/时间分析、排名筛选和图表，统一主题                                                                                                       |
| I/Q 数据集       | 分组、元数据、可实际下载的 Raw float32 I/Q 与有效 Avro 容器                                                                                       |
| 用户目录         | 搜索、排序、停用账号筛选                                                                                                                          |
| 测量活动         | 多传感器选择，搜索保留已选项；日期/时刻/数值校验、计划创建及持久保存                                                                              |
| 赞助申请与统计   | 列表、详情、状态/备注更新、费用/月度统计和图表                                                                                                    |
| 流会话管理       | 连接传感器、客户端、RTC、使用时长及小时分布                                                                                                       |
| 账号与 token     | 默认管理员；资料编辑、注册/恢复/激活界面及本地 token 操作                                                                                         |
| 公共与资料页     | API、数据集、论文、硬件、开源、合作伙伴、FAQ、联系、加入/贡献、安装、合作及法律页面全部保留，统一导航、排版、表单与卡片                           |

H3 原分支尚无移动传感器真实定位，继续采用明确标注的模拟移动测量；聚合、筛选和频谱分析实际运行。解码器同样标明本地模拟。

写操作保存在浏览器 localStorage（`specscape.linxiang.preview.v1`），包括传感器、活动、申请、资料及联系请求，重载后保留。联系/恢复不发送邮件，不控制真实硬件；密码不写入预览存储。真实模式保留原 API 行为。

## 文件位置

| 文件/目录                                                                                                | 改动                                             |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `src/linxiang.css`                                                                                       | 全局视觉、布局、表单、地图和动效                 |
| `src/config/`、`src/layout/`、`src/components/CommandPalette.tsx`                                        | 导航、页面元信息、搜索、内容焦点、页脚           |
| `src/pages/{LandingPage,SensorsPage,SensorManagementPage,SensorFormPage}.tsx`                            | 首页、浏览/管理和传感器表单                      |
| `src/pages/SpecMonPage.tsx`、`src/components/specmon/`                                                   | 频谱工作台、H3 控制及图表                        |
| `src/lib/{geoSpectrum,sensors,mapRenderer}.ts`                                                           | 聚合校验、搜索/坐标、地图生命周期修复            |
| `src/pages/SpectrumDecoderPage.tsx`、`src/components/decoder/`                                           | 九种模式、模拟信号、AIS 绘制、频率单位、实时图表 |
| `src/components/{LeafletMap,EsLeafletMap,HcChart,RzSlider}.tsx`                                          | 地图图标、OSM 回退、统计图表、键盘滑块           |
| `src/api/{client,mock,previewStore}.ts`、`src/auth/`                                                     | API 分流、参数化样例、持久存储和管理员预览       |
| `src/lib/previewDownloads.ts`、`src/pages/IqDatasetsPage.tsx`                                            | Raw/Avro/WAV 样例及下载                          |
| `src/pages/{CampaignPage,StreamingStatusPage,SponsoringStatsPage}.tsx`                                   | 管理表单、日期/空数据处理与统计                  |
| `src/pages/{AuthPage,ContactPage,RegisterPage,RecoverPage,JoinPage}.tsx`、`src/components/Recaptcha.tsx` | 本地反馈、登录/验证码预览及站内入口              |
| `tests/preview.test.ts`、`docs/preview/`                                                                 | 回归测试和实际桌面截图                           |

没有新增应用运行依赖。`package-lock.json` 保持基础提交内容。

## 验证和边界

Node 24.19.0 下执行类型检查、预览/后端构建、lint 和 6 项回归测试。lint 无错误；旧验证码、通知、账号等模块仍有 React 警告，Bootstrap Sass 有上游弃用提示。

浏览器检查全部路由、管理员、全局搜索、传感器搜索/地图、频谱、H3 频段/指标/中心/单元格/错误输入及反复卸载、九种解码模式、管理表单和两种实际下载。未对真实后端、邮件、硬件和真实 WebRTC 流做端到端验收。
