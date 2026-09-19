// 文章：front matter 解析 / 读写 / 新建
import fs from "node:fs";
import path from "node:path";
import { CONTENT, ROOT, safeRel } from "./paths.js";

// ---------------- front matter ----------------
export function parseValue(s) {
  s = s.trim();
  if (s.startsWith("[") && s.endsWith("]")) {
    const inner = s.slice(1, -1);
    const items = [...inner.matchAll(/'([^']*)'|"([^"]*)"|([^,\[\]"']+)/g)];
    const out = [];
    for (const m of items) {
      const v = (m[1] ?? m[2] ?? m[3] ?? "").trim();
      if (v) out.push(v);
    }
    return out;
  }
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (s.length >= 2 && (s[0] === "'" || s[0] === '"') && s[s.length - 1] === s[0]) {
    return s.slice(1, -1);
  }
  return s;
}

export function fmtValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    return "[" + v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(", ") + "]";
  }
  const s = String(v);
  return "'" + s.replace(/'/g, "''") + "'";
}

export function parseFrontMatter(text) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      const k = line.slice(0, i).trim();
      meta[k] = parseValue(line.slice(i + 1));
    }
  }
  return { meta, body: text.slice(m[0].length) };
}

const FM_ORDER = ["date", "title", "draft", "author", "tag", "tags"];

export function buildFrontMatter(meta) {
  const keys = [
    ...FM_ORDER.filter((k) => meta[k] !== undefined && meta[k] !== null && meta[k] !== "" && !(Array.isArray(meta[k]) && meta[k].length === 0)),
    ...Object.keys(meta).filter((k) => !FM_ORDER.includes(k) && meta[k] !== undefined && meta[k] !== null && meta[k] !== ""),
  ];
  const lines = ["---"];
  for (const k of keys) lines.push(`${k}: ${fmtValue(meta[k])}`);
  lines.push("---");
  return lines.join("\n") + "\n";
}

// ---------------- 时间 ----------------
export function nowISO() {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${hh}:${mm}`;
}

export function makeSlug(title) {
  const s = title
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "untitled";
}

// ---------------- 目录 / 文章 ----------------
export function listSections() {
  if (!fs.existsSync(CONTENT)) return [];
  return fs
    .readdirSync(CONTENT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, title: sectionTitle(d.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function sectionTitle(section) {
  const idx = path.join(CONTENT, section, "_index.md");
  try {
    const { meta } = parseFrontMatter(fs.readFileSync(idx, "utf8"));
    if (meta.title) return String(meta.title);
  } catch { /* 忽略 */ }
  return section;
}

export function listPosts(section) {
  const dir = path.join(CONTENT, section);
  if (!fs.existsSync(dir)) return [];
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "_index.md");
  } catch {
    return [];
  }
  const posts = [];
  for (const f of files) {
    try {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      const { meta } = parseFrontMatter(text);
      const st = fs.statSync(path.join(dir, f));
      const tags = meta.tag || meta.tags || [];
      posts.push({
        name: f,
        path: `content/${section}/${f}`,
        title: meta.title || f.replace(/\.md$/, ""),
        date: meta.date ? String(meta.date) : "",
        draft: Boolean(meta.draft),
        tags: Array.isArray(tags) ? tags.map(String) : [],
        mtime: new Date(st.mtime).toLocaleString("zh-CN", { hour12: false }),
      });
    } catch { /* 跳过损坏文件 */ }
  }
  posts.sort((a, b) => (b.date || b.mtime).localeCompare(a.date || a.mtime));
  return posts;
}

export function readPost(rel) {
  const f = path.join(ROOT, rel);
  if (!rel.endsWith(".md") || !safeRel(ROOT, f) || !fs.existsSync(f)) return null;
  const { meta, body } = parseFrontMatter(fs.readFileSync(f, "utf8"));
  return { path: rel, meta, body };
}

export function savePost(rel, meta, body) {
  const f = path.join(ROOT, rel);
  if (!rel.endsWith(".md") || !safeRel(ROOT, f)) throw new Error("非法路径");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const clean = {};
  for (const [k, v] of Object.entries(meta || {})) {
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) clean[k] = v;
  }
  // 自动标记 mermaid：正文含 ```mermaid 代码块时写入 front matter，发布站据此按需加载渲染脚本
  if (body && /```\s*mermaid/i.test(body)) clean.mermaid = true;
  else delete clean.mermaid;
  if (!clean.date) clean.date = nowISO();
  fs.writeFileSync(f, buildFrontMatter(clean) + (body || ""), "utf8");
  return rel;
}

export function createPost(section, title) {
  const dir = path.join(CONTENT, section);
  fs.mkdirSync(dir, { recursive: true });
  const slug = makeSlug(title);
  let name = `${slug}.md`;
  let i = 1;
  while (fs.existsSync(path.join(dir, name))) {
    name = `${slug}-${i++}.md`;
  }
  let arch = path.join(ROOT, "archetypes", `${section}.md`);
  if (!fs.existsSync(arch)) arch = path.join(ROOT, "archetypes", "default.md");
  let tmpl = "---\ndate: \"{{ .Date }}\"\ntitle: \"{{ title }}\"\n---\n";
  try {
    tmpl = fs.readFileSync(arch, "utf8");
  } catch { /* 用默认模板 */ }
  const content = tmpl
    .replace("{{ .Date }}", nowISO())
    .replace('{{ replace .File.ContentBaseName "-" " " | title }}', title)
    .replace("{{ title }}", title)
    .replace('{{replace .File.ContentBaseName "-" " " | title}}', title);
  fs.writeFileSync(path.join(dir, name), content, "utf8");
  return `content/${section}/${name}`;
}
