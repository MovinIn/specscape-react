# SpecScape · Linxiang frontend

独立的银白光谱风格前端，分支 `linxiang-frontend-update`，基于 H3 分支保留原页面和 API 流程。默认打开本地管理员工作台，数据默认连接真实 SpecScape 后端。

## 运行

使用 Node 24（`.nvmrc`）：

```sh
npm ci
npm run dev
```

打开 **http://localhost:5176/**。使用官网账户连接后端；同一浏览器中在 localhost:5173 建立的会话可由 5176 自动识别。本地管理员界面不改变服务端账户权限。未连接时可以查看真实公开网络信息，受保护的数据会显示连接提示。原三个版本的目录、分支和服务不受影响。

实时解码器已经验证收到 Greentree 的真实 PSD 和瀑布图。H3 移动测量尚待后端提供，因此保留清楚标注的模拟预览；可主动切换到固定传感器真实历史 API。真实模式没有测量的区域保持空白，接口失败或空数据时不会自动填入模拟信号。

[完整预览指南](docs/FRONTEND_PREVIEW.md) 包含版本比较、功能清单、文件位置与验证结果。

## 命令

| 命令                                            | 用途                                  |
| ----------------------------------------------- | ------------------------------------- |
| `npm run dev` / `npm run dev:preview`           | 真实 API + 本地管理员界面，5176       |
| `npm run build`                                 | 类型检查和真实 API 版本构建           |
| `npm run dev:demo` / `npm run build:demo`       | 明确标注的离线样例模式，开发端口 5177 |
| `npm run preview`                               | 浏览已构建版本                        |
| `npm run lint`                                  | 静态检查                              |
| `npm run test:preview`                          | 数据、H3 和文件格式测试               |
| `npm run dev:backend` / `npm run build:backend` | 按真实账户权限显示界面                |

真实模式保留会话 cookie、CSRF、JWT 与 WebRTC。开发代理 `/api` 默认指向 `https://specscape.org`，TLS 校验开启；可用 `VITE_API_PROXY_TARGET` 指定服务，`VITE_RECAPTCHA_SITE_KEY` 配置验证码公钥。账户密码不写入源码或配置。

## 技术和目录

React 19、TypeScript、Vite、React Router、Leaflet、H3 和 Highcharts。没有新增运行依赖。

- `src/layout`、`src/config`：导航与公共布局
- `src/auth`、`src/api`：认证、REST 与本地存储
- `src/pages`：资料、账号、研究与管理页面
- `src/components`：地图、图表、解码器和公共控件
- `src/linxiang.css`：视觉与交互动效
- `tests/preview.test.ts`：功能回归测试
