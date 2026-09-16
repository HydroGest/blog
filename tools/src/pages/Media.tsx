// 媒体库：目录筛选 + 排序 + 网格浏览 + 灯箱（方向键导航）
import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { api, fmtSize } from "../api";
import type { MediaFile } from "../types";
import { useNotify } from "../components/SnackbarProvider";
import { copyWithFallback } from "../clipboard";
import { FONT_MONO } from "../theme";

type SortKey = "newest" | "oldest" | "size";

export default function Media() {
  const notify = useNotify();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("__all__");
  const [sort, setSort] = useState<SortKey>("newest");
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<MediaFile | null>(null);
  const [confirmDel, setConfirmDel] = useState<MediaFile | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.media();
      setFiles(d.files);
      setFolders(d.folders);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    let list = filter === "__all__" ? files : files.filter((f) => f.folder === filter);
    if (sort === "newest") list = [...list].sort((a, b) => b.mtime.localeCompare(a.mtime) || b.path.localeCompare(a.path));
    if (sort === "oldest") list = [...list].sort((a, b) => a.mtime.localeCompare(b.mtime));
    if (sort === "size") list = [...list].sort((a, b) => b.size - a.size);
    return list;
  }, [files, filter, sort]);

  const lightboxIndex = useMemo(
    () => (lightbox ? shown.findIndex((f) => f.path === lightbox.path) : -1),
    [lightbox, shown],
  );

  const step = useCallback((dir: 1 | -1) => {
    if (lightboxIndex < 0 || shown.length === 0) return;
    setLightbox(shown[(lightboxIndex + dir + shown.length) % shown.length]);
  }, [lightboxIndex, shown]);

  useEffect(() => {
    if (!lightbox) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lightbox, step]);

  const doDelete = async (f: MediaFile) => {
    setConfirmDel(null);
    setLightbox(null);
    try {
      await api.deleteMedia(f.path);
      notify(`已删除 ${f.path.split("/").pop()}`, "success");
      load();
    } catch (e) {
      notify((e as Error).message, "error");
    }
  };

  async function copyMarkdown(f: MediaFile) {
    const md = `![](${f.url})`;
    const ok = await copyWithFallback(md);
    if (ok) notify("已复制引用", "success");
  }

  return (
    <Paper elevation={1} sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PhotoLibraryIcon fontSize="small" />
        </Box>
        <Typography variant="h6">媒体库</Typography>
        <Typography variant="caption" color="text.secondary">共 {files.length} 张 · 点击图片复制引用</Typography>
        <FormControl size="small" sx={{ ml: "auto", minWidth: 130 }}>
          <InputLabel>排序</InputLabel>
          <Select value={sort} label="排序" onChange={(e) => setSort(e.target.value as SortKey)}>
            <MenuItem value="newest">最新优先</MenuItem>
            <MenuItem value="oldest">最早优先</MenuItem>
            <MenuItem value="size">文件最大</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack direction="row" spacing={0.8} sx={{ mb: 2, flexWrap: "wrap" }}>
        <Chip
          label={`全部 (${files.length})`}
          color={filter === "__all__" ? "primary" : "default"}
          variant={filter === "__all__" ? "filled" : "outlined"}
          onClick={() => setFilter("__all__")}
          sx={{ fontWeight: 600 }}
        />
        {folders.map((f) => (
          <Chip
            key={f} label={`${f} (${files.filter((x) => x.folder === f).length})`}
            color={filter === f ? "primary" : "default"}
            variant={filter === f ? "filled" : "outlined"}
            onClick={() => setFilter(f)}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      {loading ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 1.5 }}>
          {[...Array(12)].map((_, i) => <Skeleton key={i} height={150} variant="rounded" />)}
        </Box>
      ) : shown.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 7, color: "text.secondary" }}>
          <PhotoLibraryIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
          <Typography variant="body2">该目录还没有图片，去「图片上传」传一张吧</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 1.5 }}>
          {shown.map((f) => (
            <Box
              key={f.path}
              sx={{
                position: "relative", borderRadius: 3, overflow: "hidden", cursor: "zoom-in",
                border: "1px solid", borderColor: "divider", bgcolor: "background.default",
                transition: "transform .18s ease, box-shadow .18s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: (t) => `0 8px 24px ${t.palette.mode === "dark" ? "rgba(0,0,0,.5)" : "rgba(93,74,48,.18)"}` },
              }}
              onClick={() => setLightbox(f)}
            >
              <img src={f.thumb} alt={f.path} loading="lazy" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
              <Box
                sx={{
                  position: "absolute", top: 6, right: 6, display: "flex", gap: 0.5, opacity: 0,
                  transition: "opacity .15s ease", "&:hover": { opacity: 1 }, "& .MuiIconButton-root": { bgcolor: "background.paper", backdropFilter: "blur(4px)" },
                }}
              >
                <Tooltip title="复制引用">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); copyMarkdown(f); }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除">
                  <IconButton size="small" sx={{ color: "error.main" }} onClick={(e) => { e.stopPropagation(); setConfirmDel(f); }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ p: 0.8, bgcolor: "background.paper" }}>
                <Typography variant="caption" noWrap sx={{ display: "block", fontFamily: FONT_MONO }}>{f.path.split("/").pop()}</Typography>
                <Typography variant="caption" color="text.secondary">{fmtSize(f.size)} · {f.mtime.slice(0, 10)}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* 灯箱 */}
      <Dialog open={Boolean(lightbox)} onClose={() => setLightbox(null)} maxWidth="md" fullWidth>
        {lightbox && (
          <>
            <DialogContent sx={{ p: 1.5, bgcolor: "background.default", position: "relative" }}>
              <img src={lightbox.url} alt={lightbox.path} style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: 10 }} />
              <IconButton
                onClick={() => step(-1)}
                sx={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", bgcolor: "background.paper" }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={() => step(1)}
                sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", bgcolor: "background.paper" }}
              >
                <ChevronRightIcon />
              </IconButton>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ fontFamily: FONT_MONO }}>{lightbox.path}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fmtSize(lightbox.size)} · {lightbox.mtime} · {lightboxIndex + 1} / {shown.length}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<ContentCopyIcon fontSize="small" />} onClick={() => copyMarkdown(lightbox)}>复制引用</Button>
                <Button size="small" color="error" startIcon={<DeleteIcon fontSize="small" />} onClick={() => setConfirmDel(lightbox)}>删除</Button>
                <Button size="small" variant="contained" onClick={() => setLightbox(null)}>关闭</Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={Boolean(confirmDel)} onClose={() => setConfirmDel(null)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>确定删除这张图片？</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: FONT_MONO, wordBreak: "break-all" }}>{confirmDel?.path}</Typography>
          <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>⚠ 将直接从 static/images 删除，引用了它的文章会显示裂图</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDel(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={() => confirmDel && doDelete(confirmDel)}>删除</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
