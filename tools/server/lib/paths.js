// 路径与常量
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TOOLS = path.resolve(__dirname, "..", ".."); // blog/tools
export const ROOT = path.resolve(TOOLS, ".."); // blog 仓库根
export const CONTENT = path.join(ROOT, "content");
export const IMAGES = path.join(ROOT, "static", "images");
export const LOGS = path.join(TOOLS, "logs");
export const SECRET_FILE = path.join(TOOLS, ".secret");
export const DIST = path.join(TOOLS, "dist");

export const IMAGE_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".avif",
]);

export const MAX_UPLOAD = 200 * 1024 * 1024; // 200MB

// 防目录穿越：p 必须位于 base 之内
export function safeRel(base, p) {
  const b = path.resolve(base);
  const r = path.resolve(p);
  return r === b || r.startsWith(b + path.sep);
}
