// 日志面板：等宽字体 + 自动滚动到底 + 复制
import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { FONT_MONO } from "../theme";
import { copyWithFallback } from "../clipboard";

export default function LogPanel({ log, height = 200, title }: { log: string; height?: number; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [log]);

  const copy = async () => {
    await copyWithFallback(log);
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      {title && (
        <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: "0.08em" }}>{title}</Typography>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="复制日志">
            <IconButton size="small" onClick={copy}><ContentCopyIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
      )}
      <Box
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
        }}
        sx={{
          p: 1.5, borderRadius: 2, overflow: "auto", height,
          fontFamily: FONT_MONO, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all",
          bgcolor: (t) => (t.palette.mode === "dark" ? "#14120f" : "#f6f2ea"),
          color: (t) => (t.palette.mode === "dark" ? "#d8cfbe" : "#4c443a"),
          border: "1px solid", borderColor: "divider",
          "&::-webkit-scrollbar-thumb": { background: "rgba(140,130,115,.3)", borderRadius: 6 },
        }}
      >
        {log || <Box sx={{ opacity: 0.45 }}>暂无日志…</Box>}
      </Box>
    </Box>
  );
}
