// 博客管理工具 · 服务入口
// 用法：
//   node server/index.js                # 默认 127.0.0.1:8099（仅本机）
//   node server/index.js --host 0.0.0.0 # 允许局域网/公网访问（务必设置 BLOG_TOKEN）
//   PORT=9000 HOST=0.0.0.0 BLOG_TOKEN=xxx node server/index.js
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { DIST, IMAGES, LOGS, MAX_UPLOAD } from "./lib/paths.js";
import { getToken, login, authMiddleware } from "./lib/auth.js";
import * as posts from "./lib/frontmatter.js";
import * as media from "./lib/media.js";
import * as hugo from "./lib/hugo.js";
import * as publish from "./lib/publish.js";

fs.mkdirSync(LOGS, { recursive: true });

const app = express();
app.use(express.json({ limit: "100mb" }));

// ---------------- 认证 ----------------
app.post("/api/login", (req, res) => {
  const { token } = req.body || {};
  const r = login(token, req.ip || req.socket.remoteAddress);
  if (r.ok) return res.json({ ok: true });
  if (r.locked) return res.status(429).json({ error: `尝试次数过多，请 ${r.retryAfter} 秒后再试` });
  res.status(401).json({ error: "Token 错误" });
});

app.get("/api/health", (_req, res) => res.json({ ok: true, version: "1.0.0" }));

app.use("/api", authMiddleware);

// ---------------- 文章 ----------------
app.get("/api/sections", (_req, res) => res.json({ sections: posts.listSections() }));

app.get("/api/posts", (req, res) => {
  res.json({ posts: posts.listPosts(String(req.query.section || "post")) });
});

app.get("/api/post", (req, res) => {
  const p = posts.readPost(String(req.query.path || ""));
  if (!p) return res.status(404).json({ error: "文章不存在" });
  res.json(p);
});

app.post("/api/save", (req, res) => {
  const { path: rel, meta, body } = req.body || {};
  try {
    posts.savePost(rel, meta, body);
    res.json({ ok: true, path: rel });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/new", (req, res) => {
  const { section, title } = req.body || {};
  if (!section || !title) return res.status(400).json({ error: "缺少 section 或 title" });
  try {
    const rel = posts.createPost(String(section), String(title));
    res.json({ ok: true, path: rel });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------------- 图片 ----------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD },
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "没有收到文件" });
  try {
    // multer 对非 ASCII 文件名按 latin1 解码，转回 utf8
    const originalName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    const result = await media.handleUpload(req.file.buffer, originalName, req.body.folder);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/media", (_req, res) => res.json(media.listMedia()));

app.post("/api/media/delete", (req, res) => {
  const { path: rel } = req.body || {};
  if (!media.deleteMedia(rel)) return res.status(404).json({ error: "文件不存在或非法路径" });
  res.json({ ok: true });
});

// ---------------- Hugo 预览 ----------------
app.post("/api/hugo/start", async (_req, res) => {
  const r = await hugo.start();
  res.status(r.ok ? 200 : 500).json(r);
});
app.post("/api/hugo/stop", (_req, res) => res.json(hugo.stop()));
app.get("/api/hugo/status", (_req, res) => res.json(hugo.status()));

// ---------------- 发布 ----------------
app.post("/api/publish", (req, res) => {
  const message = String(req.body?.message || "update").trim().slice(0, 200);
  if (!publish.publish(message)) return res.status(409).json({ error: "发布进行中，请稍候" });
  res.json({ ok: true });
});
app.get("/api/publish/status", (_req, res) => res.json(publish.status()));

// ---------------- 前端静态资源 ----------------
// 图片目录（static/images）→ /images/...（公开，与博客站点一致）
app.use("/images", express.static(IMAGES, { maxAge: "7d", immutable: true }));
app.use(express.static(DIST));
app.get(/^\/(?!api\/).*/, (req, res) => {
  const index = path.join(DIST, "index.html");
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(404).send("前端未构建：请在 tools 目录运行 npm run build");
});

// ---------------- 启动 ----------------
function parseArgs(argv) {
  const args = { host: process.env.HOST || "127.0.0.1", port: Number(process.env.PORT) || 8099 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--host") args.host = argv[i + 1] || args.host;
    if (argv[i] === "--port") args.port = Number(argv[i + 1]) || args.port;
  }
  return args;
}

const { host, port } = parseArgs(process.argv.slice(2));
const token = getToken();

app.listen(port, host, () => {
  const isPublic = host !== "127.0.0.1" && host !== "localhost";
  console.log("");
  console.log("  ✦ 博客管理工具已启动");
  console.log(`    访问地址 : http://${host === "0.0.0.0" ? "<Tailscale IP>:8099" : `${host}:${port}`}`);
  console.log(`    登录 Token: ${token}`);
  if (isPublic) {
    console.log("    Tailnet 内任意设备可直接访问（应用内 Token 登录）");
  } else {
    console.log("    远程访问: Tailnet 内打开 http://100.65.30.39:8099");
  }
  console.log("");
});
