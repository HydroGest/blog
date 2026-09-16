// 媒体选择器：编辑器内边写边选图，点击即插入引用，不离开编辑现场
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { api } from "../api";
import type { MediaFile } from "../types";
import { useNotify } from "./SnackbarProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (markdown: string) => void;
}

export default function MediaPicker({ open, onClose, onPick }: Props) {
  const notify = useNotify();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [filter, setFilter] = useState("__all__");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFilter("__all__");
    setQuery("");
    api.media()
      .then((d) => { setFiles(d.files); setFolders(d.folders); })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [open, notify]);

  const shown = files.filter((f) => (filter === "__all__" || f.folder === filter))
    .filter((f) => !query || f.path.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.mtime.localeCompare(a.mtime));

  const pick = (f: MediaFile) => {
    onPick(`![](${f.url})`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>插入图片 · 点击即插入</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 380 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
          <TextField
            size="small" placeholder="搜索文件名…" value={query} onChange={(e) => setQuery(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
        </Stack>
        <Stack direction="row" spacing={0.6} sx={{ mb: 1.5, flexWrap: "wrap" }}>
          <Chip label={`全部 (${files.length})`} size="small" color={filter === "__all__" ? "primary" : "default"} variant={filter === "__all__" ? "filled" : "outlined"} onClick={() => setFilter("__all__")} />
          {folders.map((f) => (
            <Chip key={f} label={f} size="small" color={filter === f ? "primary" : "default"} variant={filter === f ? "filled" : "outlined"} onClick={() => setFilter(f)} />
          ))}
        </Stack>

        {loading ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 1 }}>
            {[...Array(12)].map((_, i) => <Skeleton key={i} height={96} variant="rounded" />)}
          </Box>
        ) : shown.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            没有图片，可先到「图片上传」或直接 Ctrl+V 粘贴截图
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 1 }}>
            {shown.map((f) => (
              <Box
                key={f.path}
                onClick={() => pick(f)}
                title={f.path}
                sx={{
                  borderRadius: 2, overflow: "hidden", cursor: "pointer", position: "relative",
                  border: "1px solid", borderColor: "divider", bgcolor: "background.default",
                  transition: "transform .15s ease, box-shadow .15s ease",
                  "&:hover": { transform: "scale(1.04)", boxShadow: (t) => `0 6px 18px ${t.palette.mode === "dark" ? "rgba(0,0,0,.5)" : "rgba(93,74,48,.22)"}`, borderColor: "primary.main" },
                }}
              >
                <img src={f.thumb} alt={f.path} loading="lazy" style={{ width: "100%", height: 84, objectFit: "cover", display: "block" }} />
                <Box sx={{ p: 0.4 }}>
                  <Typography variant="caption" noWrap sx={{ display: "block", fontSize: 10 }}>{f.path.split("/").pop()}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
      </DialogActions>
    </Dialog>
  );
}
