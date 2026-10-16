# SpecScape · Linxiang frontend

独立的银白光谱风格前端，分支 `linxiang-frontend-update`，基于 H3 分支保留全部页面和功能。默认免登录管理员，用于本地设计与交互评审。

## 运行

使用 Node 24（`.nvmrc`）：

```sh
npm ci
npm run dev
```

打开 **http://localhost:5176/**。示例数据和修改保存在浏览器。H3 与解码器明确标注为模拟测量。原三个版本的目录、分支和服务不受影响。

[完整预览指南](docs/FRONTEND_PREVIEW.md) 包含版本比较、功能清单、文件位置与验证结果。

## 命令

| 命令                                            | 用途                    |
| ----------------------------------------------- | ----------------------- |
| `npm run dev` / `npm run dev:preview`           | 本地管理员预览，5176    |
| `npm run build`                                 | 类型检查和预览构建      |
| `npm run preview`                               | 浏览已构建版本          |
| `npm run lint`                                  | 静态检查                |
| `npm run test:preview`                          | 数据、H3 和文件格式测试 |
| `npm run dev:backend` / `npm run build:backend` | 真实后端及登录模式      |

后端模式保留会话 cookie、CSRF、JWT 与 WebRTC。开发代理 `/api` 默认指向 `https://specscape.org`，TLS 校验开启；可用 `VITE_API_PROXY_TARGET` 指定服务，`VITE_RECAPTCHA_SITE_KEY` 配置验证码公钥。

## 技术和目录

React 19、TypeScript、Vite、React Router、Leaflet、H3 和 Highcharts。没有新增运行依赖。

- `src/layout`、`src/config`：导航与公共布局
- `src/auth`、`src/api`：认证、REST 与本地存储
- `src/pages`：资料、账号、研究与管理页面
- `src/components`：地图、图表、解码器和公共控件
- `src/linxiang.css`：视觉与交互动效
- `tests/preview.test.ts`：功能回归测试
