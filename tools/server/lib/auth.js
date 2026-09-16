// 认证：静态 Bearer Token
// 优先级：环境变量 BLOG_TOKEN > tools/.secret（不存在则自动生成）
import crypto from "node:crypto";
import fs from "node:fs";
import { SECRET_FILE } from "./paths.js";

let token = null;

export function getToken() {
  if (token) return token;
  if (process.env.BLOG_TOKEN) {
    token = process.env.BLOG_TOKEN;
    return token;
  }
  try {
    token = fs.readFileSync(SECRET_FILE, "utf8").trim();
    if (token) return token;
  } catch {
    /* 生成新 token */
  }
  token = crypto.randomBytes(24).toString("base64url");
  fs.writeFileSync(SECRET_FILE, token, { mode: 0o600 });
  return token;
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// 登录失败限流（内存级）
const attempts = new Map(); // ip -> {count, lockedUntil}
const MAX_FAIL = 8;
const LOCK_MS = 10 * 60 * 1000;

export function login(tokenInput, ip) {
  const rec = attempts.get(ip);
  if (rec && rec.lockedUntil > Date.now()) {
    return { ok: false, locked: true, retryAfter: Math.ceil((rec.lockedUntil - Date.now()) / 1000) };
  }
  if (safeEqual(tokenInput, getToken())) {
    attempts.delete(ip);
    return { ok: true };
  }
  const cur = rec ?? { count: 0, lockedUntil: 0 };
  cur.count += 1;
  if (cur.count >= MAX_FAIL) {
    cur.lockedUntil = Date.now() + LOCK_MS;
    cur.count = 0;
  }
  attempts.set(ip, cur);
  return { ok: false, locked: false };
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided && safeEqual(provided, getToken())) return next();
  res.status(401).json({ error: "未认证，请先登录" });
}
