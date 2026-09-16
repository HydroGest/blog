// Hugo 本地预览：启动 / 停止 / 状态
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ROOT, LOGS } from "./paths.js";

const state = { proc: null, log: path.join(LOGS, "hugo.log") };

export function status() {
  const running = Boolean(state.proc && state.proc.exitCode === null);
  return { running, url: "http://127.0.0.1:1313", log: tail(state.log) };
}

function tail(file, n = 300) {
  try {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    return lines.slice(-n).join("\n");
  } catch {
    return "";
  }
}

function findHugo() {
  const envPath = process.env.HUGO_BIN;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const candidates = [
    path.join(os.homedir(), ".local", "bin", "hugo"),
    "/usr/local/bin/hugo",
    "/usr/bin/hugo",
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return "hugo"; // 依赖 PATH
}

export function start() {
  if (state.proc && state.proc.exitCode === null) return { ok: true, msg: "已在运行" };
  fs.mkdirSync(LOGS, { recursive: true });
  const logFd = fs.openSync(state.log, "a");
  fs.writeSync(logFd, `\n=== ${new Date().toLocaleString("zh-CN", { hour12: false })} hugo server 启动 ===\n`);
  let proc;
  try {
    proc = spawn(findHugo(), ["server", "-D", "--bind", "127.0.0.1", "--port", "1313", "--disableFastRender"], {
      cwd: ROOT,
      stdio: ["ignore", logFd, logFd],
      detached: true,
    });
  } catch (err) {
    try { fs.closeSync(logFd); } catch { /* ignore */ }
    return { ok: false, msg: `启动失败：${err.message}` };
  }
  state.proc = proc;
  proc.on("exit", () => { state.proc = null; try { fs.closeSync(logFd); } catch { /* ignore */ } });
  proc.on("error", (e) => { try { fs.writeSync(logFd, `\nERROR: ${e.message}\n`); } catch { /* ignore */ } });
  // 短暂等待以捕获启动错误
  return new Promise((resolve) => {
    setTimeout(() => {
      if (proc.exitCode !== null) {
        resolve({ ok: false, msg: tail(state.log, 40) });
      } else {
        resolve({ ok: true, msg: "已启动" });
      }
    }, 1500);
  });
}

export function stop() {
  const proc = state.proc;
  if (proc && proc.exitCode === null) {
    try { process.kill(-proc.pid, "SIGTERM"); } catch { try { proc.kill("SIGTERM"); } catch { /* 已退出 */ } }
    state.proc = null;
  }
  return { ok: true, msg: "已停止" };
}
