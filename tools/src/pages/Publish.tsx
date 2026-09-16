// 预览与发布：Hugo 本地预览 + 一键 git 发布
import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import TerminalIcon from "@mui/icons-material/Terminal";
import { api } from "../api";
import type { HugoStatus, PublishStatus } from "../types";
import { useNotify } from "../components/SnackbarProvider";
import LogPanel from "../components/LogPanel";
import { FONT_MONO } from "../theme";

export default function Publish() {
  const notify = useNotify();
  const [hugo, setHugo] = useState<HugoStatus>({ running: false, url: "", log: "" });
  const [hugoBusy, setHugoBusy] = useState(false);
  const [pub, setPub] = useState<PublishStatus>({ running: false, log: "" });
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  // 后端连通性
  useEffect(() => {
    api.health().then(() => setConnected(true)).catch(() => setConnected(false));
  }, []);

  // Hugo 状态轮询
  useEffect(() => {
    let timer: number | undefined;
    const tick = async () => {
      try {
        const d = await api.hugoStatus();
        setHugo(d);
      } catch { /* 忽略瞬时错误 */ }
    };
    tick();
    timer = window.setInterval(tick, 4000);
    return () => window.clearInterval(timer);
  }, []);

  // 发布状态轮询
  useEffect(() => {
    let timer: number | undefined;
    const tick = async () => {
      try {
        const d = await api.publishStatus();
        setPub(d);
      } catch { /* ignore */ }
    };
    tick();
    timer = window.setInterval(tick, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const startHugo = useCallback(async () => {
    setHugoBusy(true);
    try {
      const r = await api.hugoStart();
      notify(r.ok ? "预览已启动" : r.msg, r.ok ? "success" : "error");
      const d = await api.hugoStatus();
      setHugo(d);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setHugoBusy(false);
    }
  }, [notify]);

  const stopHugo = useCallback(async () => {
    setHugoBusy(true);
    try {
      await api.hugoStop();
      notify("预览已停止", "info");
      const d = await api.hugoStatus();
      setHugo(d);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setHugoBusy(false);
    }
  }, [notify]);

  const doPublish = useCallback(async () => {
    setConfirmOpen(false);
    try {
      await api.publish(message.trim());
      notify("发布进行中，请查看下方日志", "info");
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }, [message, notify]);

  return (
    <Stack spacing={2}>
      {/* 本地预览 */}
      <Paper elevation={1} sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TerminalIcon fontSize="small" />
          </Box>
          <Typography variant="h6">本地预览</Typography>
          <Chip
            size="small"
            label={hugo.running ? "运行中" : "未启动"}
            color={hugo.running ? "success" : "default"}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Button
            variant="contained" startIcon={<PlayArrowIcon />} onClick={startHugo} disabled={hugoBusy || hugo.running}
          >
            启动预览
          </Button>
          <Button variant="outlined" color="inherit" startIcon={<StopIcon />} onClick={stopHugo} disabled={hugoBusy || !hugo.running}>
            停止
          </Button>
          <Button
            variant="outlined" startIcon={<OpenInNewIcon />} href={hugo.url} target="_blank" rel="noreferrer"
            disabled={!hugo.running}
          >
            打开 http://127.0.0.1:1313
          </Button>
          <Typography variant="caption" color="text.secondary">
            包含草稿（-D），修改保存后自动刷新
          </Typography>
        </Stack>
        <LogPanel log={hugo.log} height={210} title="HUGO SERVER 日志" />
      </Paper>

      {/* 一键发布 */}
      <Paper elevation={1} sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RocketLaunchIcon fontSize="small" />
          </Box>
          <Typography variant="h6">一键发布</Typography>
          {pub.running && <CircularProgress size={16} />}
          <Chip size="small" label={pub.running ? "发布中…" : "就绪"} color={pub.running ? "warning" : "success"} variant="outlined" sx={{ fontWeight: 700 }} />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small" fullWidth label="提交信息" placeholder="例如：新文章：xxx"
            value={message} onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && message.trim() && !pub.running) setConfirmOpen(true); }}
          />
          <Button
            variant="contained" size="large" sx={{ px: 4, whiteSpace: "nowrap" }}
            disabled={!message.trim() || pub.running}
            onClick={() => setConfirmOpen(true)}
          >
            {pub.running ? "发布中…" : "提交并推送"}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          将执行 <code style={{ background: "#00000018", padding: "1px 5px", borderRadius: 4, fontFamily: FONT_MONO }}>git add -A && git commit && git push origin main</code>，
          推送后 Cloudflare Pages 自动构建部署，约 1 分钟生效。
        </Typography>
        <LogPanel log={pub.log} height={200} title="发布日志" />
      </Paper>

      {/* 发布确认 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>确认发布？</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            提交信息：
          </Typography>
          <Box sx={{ fontFamily: FONT_MONO, bgcolor: "background.default", p: 1.2, borderRadius: 1.5, mt: 0.5, border: "1px solid", borderColor: "divider" }}>
            {message.trim()}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            将把所有修改（文章、图片、配置）提交并推送到 GitHub，触发线上部署。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>再想想</Button>
          <Button variant="contained" color="primary" onClick={doPublish}>确认发布</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
