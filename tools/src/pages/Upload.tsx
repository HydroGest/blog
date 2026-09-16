// 图片上传：拖拽 / 点击 / 粘贴，实时缩略图 + 逐文件进度 + 压缩结果
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Grow from "@mui/material/Grow";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ImageIcon from "@mui/icons-material/Image";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import { uploadFile, fmtSize } from "../api";
import type { UploadResult } from "../types";
import { useNotify } from "../components/SnackbarProvider";
import { triggerInsert } from "../insertBus";
import { copyWithFallback } from "../clipboard";
import { FONT_MONO } from "../theme";

interface ItemBase { id: number; name: string; size: number; thumb: string }
type Item =
  | (ItemBase & { status: "uploading"; progress: number })
  | (ItemBase & { status: "processing" })
  | (ItemBase & { status: "done"; result: UploadResult })
  | (ItemBase & { status: "error"; error: string });

let idSeq = 0;

export default function Upload() {
  const notify = useNotify();
  const [items, setItems] = useState<Item[]>([]);
  const [folderMode, setFolderMode] = useState("auto");
  const [customFolder, setCustomFolder] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
      if (files.length) { e.preventDefault(); addFiles(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  function currentFolder(): string {
    if (customFolder.trim()) return customFolder.trim();
    if (folderMode === "gallery") return "gallery";
    const d = new Date();
    return `posts/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function addFiles(files: File[]) {
    const folder = currentFolder();
    for (const f of files) {
      const id = ++idSeq;
      const base: ItemBase = { id, name: f.name, size: f.size, thumb: URL.createObjectURL(f) };
      setItems((s) => [{ ...base, status: "uploading", progress: 0 }, ...s]);
      uploadFile(f, folder, (p) => {
        setItems((s) => s.map((it) => (it.id === id ? { ...it, status: "uploading", progress: p } : it)));
      })
        .then((result) => {
          setItems((s) => s.map((it) => (it.id === id ? { ...it, status: "done", result } : it)));
        })
        .catch((err: Error) => {
          setItems((s) => s.map((it) => (it.id === id ? { ...it, status: "error", error: err.message } : it)));
          notify(`上传失败：${err.message}`, "error");
        });
    }
  }

  async function copyMarkdown(text: string) {
    const ok = await copyWithFallback(text);
    if (ok) notify("已复制 markdown 引用", "success");
  }

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <Stack spacing={2}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
          <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImageIcon fontSize="small" />
          </Box>
          <Typography variant="h6">图片上传</Typography>
          <Chip size="small" label="自动压缩" color="primary" variant="outlined" />
          <Chip size="small" label="自动存放 posts/年-月" variant="outlined" />
          {doneCount > 0 && (
            <Chip size="small" color="success" label={`已完成 ${doneCount} 张`} sx={{ ml: "auto" }} />
          )}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>存入目录</InputLabel>
            <Select value={folderMode} label="存入目录" onChange={(e) => setFolderMode(e.target.value)}>
              <MenuItem value="auto">文章配图 posts/年-月（自动）</MenuItem>
              <MenuItem value="gallery">随手拍 gallery</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="或自定义目录（可选）" placeholder="posts/2026-09" value={customFolder} onChange={(e) => setCustomFolder(e.target.value)} sx={{ flex: 1 }} />
        </Stack>

        <Box
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]); }}
          sx={{
            border: "2px dashed",
            borderColor: dragging ? "primary.main" : "divider",
            borderRadius: 4,
            p: { xs: 4, sm: 6 },
            textAlign: "center",
            cursor: "pointer",
            transition: "all .25s ease",
            transform: dragging ? "scale(1.015)" : "none",
            bgcolor: dragging ? alphaPrimary() : "background.default",
            color: dragging ? "primary.contrastText" : "text.secondary",
            "&:hover": { borderColor: "primary.main", bgcolor: alphaPrimary(), color: "primary.contrastText", transform: "scale(1.01)" },
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 56, opacity: 0.85, mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            拖拽图片到这里 · 点击选择文件
          </Typography>
          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mt: 1, color: "inherit", opacity: 0.85 }}>
            <KeyboardIcon fontSize="small" />
            <Typography variant="body2">或直接 Ctrl+V 粘贴截图</Typography>
          </Stack>
          <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.8 }}>
            JPG / PNG / WebP / GIF · JPEG 压至质量 82、最长边 1920px
          </Typography>
          <input
            ref={fileInput} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.length) addFiles([...e.target.files]); e.target.value = ""; }}
          />
        </Box>

        {items.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.secondary">上传队列</Typography>
              <Box sx={{ flex: 1 }} />
              <Button size="small" color="inherit" startIcon={<DeleteSweepIcon fontSize="small" />} onClick={() => setItems([])}>
                清空
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {items.map((it, idx) => (
                <Grow key={it.id} in timeout={250 + idx * 60}>
                  <Box><QueueItem item={it} onCopy={copyMarkdown} /></Box>
                </Grow>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

function alphaPrimary() {
  return "rgba(176,137,104,0.10)";
}

function Thumb({ item }: { item: ItemBase }) {
  return (
    <Box sx={{ width: 88, height: 62, borderRadius: 2, overflow: "hidden", flexShrink: 0, bgcolor: "background.default", border: "1px solid", borderColor: "divider", position: "relative" }}>
      <img src={item.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </Box>
  );
}

function QueueItem({ item, onCopy }: { item: Item; onCopy: (t: string) => void }) {
  const active = item.status === "uploading" || item.status === "processing";
  return (
    <Paper variant="outlined" sx={{ p: 1.5, opacity: active ? 1 : undefined }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Thumb item={item} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {item.status === "uploading" && <InsertDriveFileIcon color="primary" fontSize="small" />}
            {item.status === "processing" && <InsertDriveFileIcon color="primary" fontSize="small" />}
            {item.status === "done" && <CheckCircleIcon color="success" fontSize="small" />}
            {item.status === "error" && <ErrorIcon color="error" fontSize="small" />}
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{item.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{fmtSize(item.size)}</Typography>
          </Stack>

          {item.status === "uploading" && (
            <Box sx={{ mt: 0.8, display: "flex", alignItems: "center", gap: 1 }}>
              <LinearProgress variant="determinate" value={item.progress} sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: FONT_MONO, minWidth: 36, textAlign: "right" }}>{item.progress}%</Typography>
            </Box>
          )}
          {item.status === "processing" && (
            <Box sx={{ mt: 0.8 }}>
              <LinearProgress sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: "block" }}>压缩中…</Typography>
            </Box>
          )}
          {item.status === "error" && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>{item.error}</Typography>
          )}

          {item.status === "done" && (
            <Collapse in>
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                  <Chip size="small" label={item.result.folder} />
                  <Typography variant="caption" color="text.secondary">
                    {fmtSize(item.result.sizeBefore)} → {fmtSize(item.result.sizeAfter)}
                    {item.result.compressed ? `（节省 ${Math.round((1 - item.result.sizeAfter / item.result.sizeBefore) * 100)}%）` : "（已是最优）"}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    mt: 1, p: 1, borderRadius: 1.5, fontFamily: FONT_MONO, fontSize: 12.5,
                    bgcolor: (t) => (t.palette.mode === "dark" ? "#14120f" : "#f6f2ea"),
                    border: "1px solid", borderColor: "divider", overflowX: "auto", whiteSpace: "nowrap",
                  }}
                >
                  {item.result.markdown}
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" startIcon={<ContentCopyIcon fontSize="small" />} onClick={() => onCopy(item.result.markdown)}>
                    复制引用
                  </Button>
                  <Button size="small" variant="contained" onClick={() => { if (!triggerInsert(item.result.markdown)) onCopy(item.result.markdown); }}>
                    插入到文章
                  </Button>
                </Stack>
              </Box>
            </Collapse>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
