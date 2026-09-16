// 一键发布：git add → commit → push
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, LOGS } from "./paths.js";

const state = { running: false, log: path.join(LOGS, "publish.log") };

export function status() {
  return { running: state.running, log: tail(state.log) };
}

function tail(file, n = 400) {
  try {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    return lines.slice(-n).join("\n");
  } catch {
    return "";
  }
}

function runCmd(cmd, args, cwd, log) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, shell: false });
    let out = "";
    p.stdout.on("data", (d) => { out += d; log.write(d); });
    p.stderr.on("data", (d) => { out += d; log.write(d); });
    p.on("close", (code) => resolve({ code, out }));
    p.on("error", (e) => { log.write(`\nERROR: ${e.message}\n`); resolve({ code: -1, out: e.message }); });
  });
}

export function publish(message) {
  if (state.running) return false;
  state.running = true;
  fs.mkdirSync(LOGS, { recursive: true });
  const log = fs.createWriteStream(state.log, { flags: "a" });
  const write = (s) => log.write(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${s}\n`);

  (async () => {
    try {
      write(`提交信息：${message}`);
      write("$ git add -A");
      const add = await runCmd("git", ["add", "-A"], ROOT, log);
      write("$ git commit -m ...");
      const commit = await runCmd("git", ["commit", "-m", message], ROOT, log);
      if (commit.code !== 0 && !/nothing to commit/i.test(commit.out)) {
        write("✗ 提交失败，已中止（不会推送）");
        return;
      }
      write("$ git push origin main");
      const push = await runCmd("git", ["push", "origin", "main"], ROOT, log);
      write(push.code === 0 ? "✓ 推送成功，Cloudflare Pages 将自动部署" : "✗ 推送失败，请查看上方日志");
    } catch (e) {
      write(`✗ 出错：${e.message}`);
    } finally {
      state.running = false;
      log.end();
    }
  })();
  return true;
}
