// 图片：上传（sharp 压缩 + 缩略图）/ 列表 / 删除
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { IMAGES, IMAGE_EXTS, safeRel } from "./paths.js";

// 缩略图后缀：网格/选择器用缩略图，灯箱用原图，避免手机原图拖垮浏览器
export const THUMB_SUFFIX = "-thumb.webp";
const THUMB_MAX = 480;

export function thumbPathOf(fullPath) {
  const ext = path.extname(fullPath);
  return path.join(path.dirname(fullPath), `${path.basename(fullPath, ext)}${THUMB_SUFFIX}`);
}

export async function makeThumb(fullPath) {
  const target = thumbPathOf(fullPath);
  if (fs.existsSync(target)) return target;
  try {
    await sharp(fullPath, { failOn: "none" })
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(target);
  } catch {
    return null;
  }
  return target;
}

export function sanitizeFilename(name) {
  const base = path.basename(String(name).replace(/\\/g, "/")).trim();
  return (base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/^[.\s]+|[.\s]+$/g, "") || "image");
}

function uniquePath(target) {
  if (!fs.existsSync(target)) return target;
  const ext = path.extname(target);
  const stem = path.basename(target, ext);
  let i = 1;
  while (true) {
    const cand = path.join(path.dirname(target), `${stem}-${i}${ext}`);
    if (!fs.existsSync(cand)) return cand;
    i += 1;
  }
}

/**
 * 上传并压缩一张图片。
 * @returns {{filename, folder, url, markdown, sizeBefore, sizeAfter, compressed}}
 */
export async function handleUpload(buffer, filename, subdir) {
  const fname = sanitizeFilename(filename);
  const ext = path.extname(fname).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) {
    throw new Error(`仅支持图片：${[...IMAGE_EXTS].join(" / ")}`);
  }
  const folder = (subdir || `posts/${new Date().toISOString().slice(0, 7)}`)
    .replace(/[^a-zA-Z0-9/_\-]/g, "")
    .replace(/^\/+|\/+$/g, "");
  const targetDir = path.join(IMAGES, folder);
  if (!safeRel(IMAGES, targetDir)) throw new Error("非法目录");
  fs.mkdirSync(targetDir, { recursive: true });

  let out = buffer;
  let compressed = false;
  try {
    const img = sharp(buffer, { failOn: "none" });
    const meta = await img.metadata();
    const fmt = meta.format;
    if (["jpeg", "png", "webp"].includes(fmt)) {
      const maxDim = fmt === "png" ? 2560 : 1920;
      if (meta.width > maxDim || meta.height > maxDim) {
        img.resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true });
      }
      let opts;
      if (fmt === "jpeg") opts = { quality: 82, mozjpeg: true };
      else if (fmt === "png") opts = { compressionLevel: 9 };
      else opts = { quality: 80 };
      const method = fmt === "jpeg" ? "jpeg" : fmt; // png / webp
      const resized = await img[method](opts).toBuffer();
      if (resized.length < buffer.length) {
        out = resized;
        compressed = true;
      }
    }
  } catch { /* 压缩失败则原样保存 */ }

  const target = uniquePath(path.join(targetDir, fname));
  fs.writeFileSync(target, out);
  const name = path.basename(target);
  const url = `/images/${folder}/${name}`;
  // 同步生成缩略图（缩略图始终不带 -1 后缀去重，与目标文件同 stem）
  const thumb = await makeThumb(target);
  return {
    filename: name,
    folder,
    url,
    thumb: thumb ? `/images/${folder}/${path.basename(thumb)}` : url,
    markdown: `![](${url})`,
    sizeBefore: buffer.length,
    sizeAfter: out.length,
    compressed,
  };
}

export function listMedia() {
  const files = [];
  if (!fs.existsSync(IMAGES)) return { files, folders: [] };
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (IMAGE_EXTS.has(path.extname(ent.name).toLowerCase()) && !ent.name.endsWith(THUMB_SUFFIX)) {
        const rel = path.relative(IMAGES, full).split(path.sep).join("/");
        const st = fs.statSync(full);
        const thumb = thumbPathOf(full);
        files.push({
          path: rel,
          url: `/images/${rel}`,
          thumb: fs.existsSync(thumb) ? `/images/${rel.replace(path.extname(rel), "")}${THUMB_SUFFIX}` : `/images/${rel}`,
          folder: path.dirname(rel) === "." ? "/" : path.dirname(rel),
          size: st.size,
          mtime: new Date(st.mtime).toLocaleString("zh-CN", { hour12: false }),
        });
      }
    }
  };
  walk(IMAGES);
  files.sort((a, b) => b.path.localeCompare(a.path));
  const folders = [...new Set(files.map((f) => f.folder))].sort();
  return { files, folders };
}

export function deleteMedia(rel) {
  const f = path.join(IMAGES, rel);
  if (!safeRel(IMAGES, f) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return false;
  fs.unlinkSync(f);
  const thumb = thumbPathOf(f);
  if (fs.existsSync(thumb)) fs.unlinkSync(thumb);
  return true;
}
