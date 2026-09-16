# 羽衣甘蓝的博客 · 管理指南

> 站点：https://blog.yurikale.top ｜ 技术栈：Hugo + PaperMod 主题 ｜ 部署：Cloudflare Pages（GitHub Actions 自动构建）
> 本文件是本地管理手册，内容与你常用即可，不强制提交到仓库。

## 〇、DIY 管理工具（强烈推荐）

`tools/` 里有一个为本博客定制的**产品级管理后台**：React 18 + TypeScript + **MUI（Material UI）** 前端、Node.js + Express + sharp 后端。**图片上传（自动压缩）+ 文章管理 + 媒体库 + 本地预览 + 一键发布**，浏览器操作：

```bash
cd ~/blog/tools
npm install && npm run build    # 首次
npm start                        # 打开 http://127.0.0.1:8099
```

登录 Token：`cat ~/blog/tools/.secret`（首次启动自动生成）。

- **🖼️ 图片上传**：拖拽/粘贴截图/选择文件 → 逐文件进度 → 自动压缩（JPEG 质量 82、最长边 1920）→ 自动存入 `static/images/posts/年-月/` → 一键复制/插入 markdown 引用
- **📝 文章管理**：新建/编辑 post、math、huli_house 文章，front matter 可视化，Markdown 实时预览，未保存提醒，Ctrl+S 保存
- **🗂️ 媒体库**：按目录筛选、灯箱预览、点击复制引用、删除二次确认
- **🚀 预览与发布**：一键启动本地预览（http://127.0.0.1:1313）、一键 `git push` 发布（Cloudflare Pages 自动部署），实时日志

**Tailnet 直连**：服务器已接入 Tailscale（IP `100.65.30.39`），服务绑定 `0.0.0.0:8099`，Tailnet 内任意设备直接打开 http://100.65.30.39:8099 即可（Tailscale 即加密私有网络，无需隧道）。已配置用户级 systemd 常驻（`systemctl --user status blogcms`）。

详细说明见 `tools/README.md`。

## 一、目录结构

```
blog/
├── hugo.yaml              # 站点配置（标题、菜单、KaTeX 公式开关等）
├── archetypes/            # 文章模板（hugo new 时使用）
│   ├── default.md         # 普通文章模板
│   ├── huli_house.md      # 梨窝模板（带 author: 胡梨）
│   └── math.md            # 数学笔记模板（带 $$ 公式块）
├── content/               # ★ 所有文章都在这
│   ├── post/              # 日常文章（技术、随笔）
│   ├── math/              # 数学笔记（KaTeX 公式）
│   ├── huli_house/        # 梨窝（胡梨的写作小屋）
│   ├── gallery/           # 随手拍（自动读取 static/images/gallery）
│   ├── archives/          # 归档页
│   └── search/            # 搜索页
├── static/
│   └── images/
│       ├── gallery/       # 随手拍原图（gallery 页面自动展示）
│       ├── posts/         # ★ 新约定：文章配图按 年-月 子目录存放
│       └── (旧截图)        # 2026-08 前的截图散在根目录，文章已引用，勿删
├── layouts/               # 自定义布局（gallery 网格、KaTeX/glightbox 注入）
├── assets/css/extended/   # 书卷风格全局美化
├── themes/PaperMod/       # 主题（git submodule）
├── tools/                 # ★ DIY 管理工具（app.py + index.html，见第〇节）
└── .vscode/settings.json  # Front Matter CMS 配置（写作面板 + 媒体管理）
```

## 二、写一篇文章（标准流程）

```bash
# 1. 新建文章（自动套用模板、生成日期）
hugo new post/我的新文章.md          # 或 math/、huli_house/ 下的主题

# 2. 本地预览（自动刷新，-D 显示草稿）
hugo server -D

# 3. 编辑内容，注意 front matter：
#    date   : 发布时间（自动生成，一般不用改）
#    title  : 标题
#    draft  : true=草稿（不发布） false=发布
#    tag(s) : 标签，如 ["教程", "工具"]

# 4. 写好后把 draft 改为 false，然后发布：
git add -A
git commit -m "新文章：xxx"
git push origin main      # 推送后 Actions 自动构建并部署到 Cloudflare Pages
```

> 写数学公式：行内 `$...$`，块级 `$$...$$`，KaTeX 已配好，无需额外设置。

## 三、图片 / assets 管理约定

| 用途 | 存放位置 | 在文章里引用 |
|---|---|---|
| 随手拍 | `static/images/gallery/` | gallery 页面自动读取，无需引用 |
| 文章配图（新） | `static/images/posts/2026-09/` | `![](/images/posts/2026-09/xxx.png)` |
| 旧截图（存量） | `static/images/` 根目录 | `![](/images/屏幕截图-xxx.png)`（已引用，保持不动） |

**配图流程：** 截图/图片 →（可选压缩）→ 放进 `static/images/posts/YYYY-MM/` → 文章里按上表引用 → 随 git push 一起部署。

**压缩工具（图片动辄 1~3MB，建议压一下再传）：**
- [Squoosh](https://squoosh.app/) — 谷歌出品，浏览器内压缩，免费
- [TinyPNG](https://tinypng.com/) — 一键压缩 PNG/JPEG
- [PicGo](https://github.com/Molunerfinn/PicGo) — 图床/上传工具

## 四、在线写作与管理工具（按推荐度排序）

| 工具 | 类型 | 费用 | 特点 | 上手 |
|---|---|---|---|---|
| **[Front Matter CMS](https://frontmatter.codes/)** | VS Code 扩展（可在线用） | 免费开源 | Hugo 一等支持；内容面板 + 媒体库管理 static/images；支持 GitPod / GitHub Codespaces 在线使用 | 已在本仓库配好 `.vscode/settings.json`，装扩展即用 |
| **[Decap CMS](https://decapcms.org/)** | 网页 CMS（Git 原生） | 免费开源 | 浏览器里可视化编辑、草稿流程、自带媒体上传库；可部署到站点的 /admin 路径 | 需配 GitHub OAuth 或后端认证，稍折腾 |
| **[CloudCannon](https://cloudcannon.com/)** | 托管式网页 CMS | 免费额度/付费 | 官方支持 Hugo；可视化编辑 + 图片自动压缩/自适应；连接 GitHub 仓库即用 | 最省事，适合不想折腾的人 |
| **[TinaCMS](https://tina.io/)** | 网页 CMS | 免费开源 | 可视化/富文本编辑，Git 工作流；对纯 Hugo 项目集成偏繁琐 | 需要 npm 集成 |
| **[github.dev](https://github.dev/)** | 浏览器版 VS Code | 免费 | 仓库页面按 `.` 键直接编辑并提交 | 零配置，配合 Front Matter 扩展更佳 |
| **[Prose.io](https://prose.io/)** | 轻量在线编辑器 | 免费 | GitHub 登录后直接改仓库里的 Markdown | 极简，适合手机快速改字 |
| **StackEdit** | 在线 Markdown 编辑器 | 免费 | 可同步 GitHub 仓库 | 写作体验好，front matter 需手写 |

**我的建议：** 日常在电脑上写 → 装 **Front Matter CMS**（本地 VS Code，或 GitHub 网页按 `.` 在 Codespaces 里用）；想要纯网页后台 → **Decap CMS** 或 **CloudCannon**；手机快速改文 → **Prose.io** 或 GitHub 网页编辑器。

## 五、部署（已自动化，一般不用管）

- `.github/workflows/page.yml`：推送到 `main` 分支后自动 `hugo --minify` 构建，部署到 Cloudflare Pages（项目名 `blog`）。
- 查看构建日志：GitHub 仓库 → Actions 页签；或 Cloudflare 控制台 → Pages → blog。
- 发布 = `git push origin main`，约 1 分钟生效。

## 六、常用命令速查

```bash
hugo new post/xxx.md        # 新建文章
hugo server -D              # 本地预览（含草稿），默认 http://localhost:1313
hugo                        # 构建到 public/（已被 .gitignore 忽略）
git push origin main        # 发布
git pull origin main        # 拉取最新（换设备时）
```

> 本机目前未安装 Hugo。安装：`sudo snap install hugo`（或下载 extended 版二进制）。需要的话我可以帮你装好。
