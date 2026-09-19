# 博客管理工具（产品级）

针对「羽衣甘蓝的博客」（Hugo + PaperMod + Cloudflare Pages）定制的管理后台。

**技术栈**：React 18 + TypeScript + MUI v6（Material UI）· Node.js + Express · sharp 图片压缩
**能力**：文章管理 ｜ 图片上传（自动压缩）｜ 媒体库 ｜ 本地预览 ｜ 一键发布

---

## 快速开始

```bash
cd ~/blog/tools

# 1. 安装依赖（首次）
npm install

# 2. 构建前端
npm run build

# 3. 启动（默认 127.0.0.1:8099，仅本机）
npm start
```

浏览器访问 http://127.0.0.1:8099 ，登录 Token 在 `cat ~/blog/tools/.secret`（首次启动自动生成，也可用环境变量 `BLOG_TOKEN` 指定）。

## 访问（Tailscale 网络）

本机已接入 Tailnet（Tailscale IP `100.65.30.39`），服务绑定 `0.0.0.0:8099`，
**Tailnet 内任意设备直接访问**：

```
http://100.65.30.39:8099
```

Tailscale 本身就是加密的私有网络，无需额外隧道；应用内 Bearer Token 仅作为登录凭证。

## 开机自启（用户级 systemd，免 root）

```bash
mkdir -p ~/.config/systemd/user
cp ~/blog/tools/blogcms.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now blogcms   # 已开 linger，重启后自动运行

systemctl --user status blogcms         # 查看状态 / 日志
```

## 功能说明

| 模块 | 说明 |
|---|---|
| 📝 文章管理 | 分区浏览（post/math/huli_house…）；状态筛选（全部/草稿/已发布）+ 搜索；front matter 可视化；Markdown 实时预览（**Mermaid 图按需渲染，含图自动写 `mermaid: true`**）；脏状态提醒 + 字数统计；Ctrl+S 保存；**Ctrl+K 全局命令面板**（快速打开任意文章 / 执行动作） |
| 🖼️ 图片上传 | 拖拽 / 点击 / Ctrl+V 粘贴；逐文件进度条；JPEG 自动压缩（质量 82、最长边 1920）、PNG 优化、WebP 压缩；自动存入 `static/images/posts/年-月/`；一键复制 / 插入文章 |
| 🗂️ 媒体库 | 按目录筛选；网格浏览 + 灯箱；点击复制引用；删除二次确认 |
| 🚀 预览与发布 | 一键启停 `hugo server -D`（http://127.0.0.1:1313）；一键 `git add -A && git commit && git push origin main` 触发 Cloudflare Pages 自动部署；实时日志 |

## 安全设计

- 绑定 `0.0.0.0` 供 Tailnet 内设备访问（Tailscale 加密私有网络）
- Bearer Token 认证（常数时间比较），登录失败限流（8 次 / 10 分钟锁）
- 所有 API 鉴权；路径防目录穿越；上传上限 200MB
- 生产构建由 Express 静态托管，无第三方 CDN 依赖，离线可用

## 目录结构

```
tools/
├── server/                  # Node.js 后端
│   ├── index.js             # Express 入口（路由 / 认证 / 静态托管）
│   └── lib/
│       ├── paths.js         # 路径常量（仓库根、content、images）
│       ├── auth.js          # Token 生成 / 校验 / 限流
│       ├── frontmatter.js   # Hugo front matter 解析与生成
│       ├── media.js         # 图片上传 / sharp 压缩 / 列表 / 删除
│       ├── hugo.js          # Hugo 预览进程管理
│       └── publish.js       # git 发布流程
├── src/                     # React + MUI 前端
│   ├── theme.ts             # 设计系统（书卷风格，亮/暗色）
│   ├── pages/               # 登录 / 文章 / 上传 / 媒体 / 发布
│   └── components/          # 预览、日志面板、提示等
├── dist/                    # 构建产物（gitignore）
├── .secret                  # 登录 Token（自动生成，gitignore）
├── logs/                    # hugo / 发布日志（gitignore）
├── blogcms.service          # systemd 单元
└── package.json
```

## 常用命令

```bash
npm run build        # 构建前端到 dist/
npm start            # 启动服务
npm run dev          # Vite 开发服务器（代理 /api 到 8099）
npm run dev:server   # 单独跑后端（热重载需自行重启）
```

## API 一览

```
POST /api/login           登录（body: {token}）
GET  /api/sections        内容分区
GET  /api/posts?section=  文章列表
GET  /api/post?path=      读取文章
POST /api/save            保存文章
POST /api/new             新建文章
POST /api/upload          multipart 上传图片（file + folder）
GET  /api/media           媒体列表
POST /api/media/delete    删除媒体
POST /api/hugo/start|stop 预览启停
GET  /api/hugo/status     预览状态
POST /api/publish         一键发布
GET  /api/publish/status  发布状态
```
除 `/api/login`、`/api/health` 外均需 `Authorization: Bearer <token>`。
