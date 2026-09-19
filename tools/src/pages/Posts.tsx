// 文章管理：列表（状态筛选/搜索）+ 编辑器（front matter 可视化、预览、Ctrl+S）
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Badge from "@mui/material/Badge";
import Fade from "@mui/material/Fade";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ArticleIcon from "@mui/icons-material/Article";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DoneIcon from "@mui/icons-material/Done";
import { api } from "../api";
import type { Post, PostDetail, Section } from "../types";
import { useNotify } from "../components/SnackbarProvider";
import { registerInsert } from "../insertBus";
import { on, off } from "../bus";
import MarkdownPreview from "../components/MarkdownPreview";
import MediaPicker from "../components/MediaPicker";
import { FONT_MONO, FONT_SERIF } from "../theme";

function tzSuffix(): string {
  const off = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${sign}${String(Math.floor(Math.abs(off) / 60)).padStart(2, "0")}:${String(Math.abs(off) % 60).padStart(2, "0")}`;
}
function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 16);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocalInput(v: string): string {
  return v ? `${v}:00${tzSuffix()}` : "";
}
function wordCount(s: string): number {
  return s.replace(/\s+/g, "").length;
}

type StatusFilter = "all" | "draft" | "published";

export default function Posts() {
  const notify = useNotify();
  const [sections, setSections] = useState<Section[]>([]);
  const [section, setSection] = useState("post");
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  const [current, setCurrent] = useState<PostDetail | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("");
  const [draft, setDraft] = useState(false);
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const bodyRef = useRef(body);
  bodyRef.current = body;
  const bodyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const sectionRef = useRef(section);
  sectionRef.current = section;
  const titleRef = useRef(title);
  titleRef.current = title;

  // ---------- 数据 ----------
  useEffect(() => {
    api.sections().then((d) => setSections(d.sections)).catch((e) => notify(e.message, "error"));
  }, [notify]);

  useEffect(() => {
    setLoading(true);
    api.posts(section)
      .then((d) => setPosts(d.posts))
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [section, notify]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = posts;
    if (status === "draft") list = list.filter((p) => p.draft);
    if (status === "published") list = list.filter((p) => !p.draft);
    if (q) list = list.filter((p) => p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)));
    return list;
  }, [posts, search, status]);

  // ---------- 打开 / 保存 ----------
  const openPost = useCallback(async (path: string) => {
    try {
      const d = await api.post(path);
      setCurrent(d);
      setTitle(String(d.meta.title || ""));
      setDate(toLocalInput(String(d.meta.date || "")));
      setTags(((d.meta.tag as string[]) || (d.meta.tags as string[]) || []).map(String).join(", "));
      setAuthor(String(d.meta.author || ""));
      setDraft(Boolean(d.meta.draft));
      setBody(d.body || "");
      setPreview(false);
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }, [notify]);

  const save = useCallback(async () => {
    if (!current) return;
    setSaving(true);
    try {
      const tagsArr = tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
      // 合并原有 meta，保留未知字段（searchHidden / hiddenInRss / robotsNoIndex / _build 等）
      const meta: Record<string, unknown> = { ...current.meta, date: fromLocalInput(date), title: title.trim(), draft };
      delete meta.tag;
      delete meta.tags;
      if (sectionRef.current === "post") meta.tag = tagsArr;
      else meta.tags = tagsArr;
      if (sectionRef.current === "huli_house") {
        if (author.trim()) meta.author = author.trim();
        else delete meta.author;
      }
      await api.save(current.path, meta, bodyRef.current);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1600);
      notify("已保存 ✓", "success");
      const updated = await api.post(current.path);
      setCurrent(updated);
      api.posts(sectionRef.current).then((d) => setPosts(d.posts));
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }, [current, title, date, tags, author, draft, notify]);

  // Ctrl+S
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (current) save(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [current, save]);

  // 命令面板 / 跨页协作
  useEffect(() => {
    registerInsert((text) => {
      if (!current) return false;
      const sep = bodyRef.current && !bodyRef.current.endsWith("\n") ? "\n" : "";
      setBody(bodyRef.current + sep + text + "\n");
      notify("已插入图片引用", "success");
      return true;
    });
    const offOpen = on("open-post-request", (path) => { if (typeof path === "string") openPost(path); });
    const offNew = on("new-post-request", () => setNewOpen(true));
    return () => { registerInsert(null); offOpen(); offNew(); };
  }, [current, notify, openPost]);

  const insertAtCursor = (text: string) => {
    const el = bodyInputRef.current;
    const cur = bodyRef.current;
    if (el && typeof el.selectionStart === "number" && el.selectionStart >= 0) {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const sepBefore = start > 0 && cur[start - 1] !== "\n" ? "\n" : "";
      const sepAfter = end < cur.length && cur[end] !== "\n" ? "\n" : "";
      const next = cur.slice(0, start) + sepBefore + text + sepAfter + cur.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + sepBefore.length + text.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      setBody(cur + (cur && !cur.endsWith("\n") ? "\n" : "") + text + "\n");
    }
  };

  const createPost = async () => {
    if (!newTitle.trim()) return;
    try {
      const d = await api.create(sectionRef.current, newTitle.trim());
      setNewOpen(false);
      setNewTitle("");
      notify("已创建，开始写作吧", "success");
      const fresh = await api.posts(sectionRef.current);
      setPosts(fresh.posts);
      openPost(d.path);
    } catch (e) {
      notify((e as Error).message, "error");
    }
  };

  const dirty = current !== null &&
    (title !== String(current.meta.title || "") ||
      date !== toLocalInput(String(current.meta.date || "")) ||
      tags !== ((current.meta.tag as string[]) || (current.meta.tags as string[]) || []).map(String).join(", ") ||
      author !== String(current.meta.author || "") ||
      draft !== Boolean(current.meta.draft) ||
      body !== (current.body || ""));

  const counts = useMemo(
    () => ({ all: posts.length, draft: posts.filter((p) => p.draft).length, published: posts.length - posts.filter((p) => p.draft).length }),
    [posts],
  );

  const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "全部", count: counts.all },
    { key: "draft", label: "草稿", count: counts.draft },
    { key: "published", label: "已发布", count: counts.published },
  ];

  // ---------- 渲染 ----------
  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {/* 左：文章列表 */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5, width: { xs: "100%", lg: 340 }, flexShrink: 0,
          display: "flex", flexDirection: "column",
          maxHeight: { lg: "calc(100vh - 190px)" },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ px: 0.5, pt: 0.5 }}>
          <FormControl size="small" sx={{ minWidth: 130, flex: 1 }}>
            <InputLabel>分区</InputLabel>
            <Select value={section} label="分区" onChange={(e) => setSection(e.target.value)}>
              {sections.map((s) => (
                <MenuItem key={s.name} value={s.name}>
                  {s.title} <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{s.name}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="新建文章">
            <Button variant="contained" onClick={() => setNewOpen(true)} sx={{ minWidth: 44, px: 1.5 }}><AddIcon /></Button>
          </Tooltip>
        </Stack>

        {/* 状态筛选 */}
        <Stack direction="row" spacing={0.6} sx={{ px: 0.5, pt: 1.25 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              size="small"
              label={`${f.label} ${f.count}`}
              color={status === f.key ? "primary" : "default"}
              variant={status === f.key ? "filled" : "outlined"}
              onClick={() => setStatus(f.key)}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>

        <TextField
          size="small" placeholder="搜索标题 / 标签…" value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ mt: 1.25 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />

        <List dense sx={{ mt: 1, overflow: "auto", flex: 1, "& .MuiListItemButton-root": { borderRadius: 2 } }}>
          {loading
            ? [...Array(6)].map((_, i) => <Skeleton key={i} height={52} sx={{ mx: 1, my: 0.5, borderRadius: 2 }} />)
            : filtered.length === 0
              ? (
                  <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
                    <ArticleIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                    <Typography variant="body2">没有匹配的文章</Typography>
                  </Box>
                )
              : filtered.map((p) => (
                  <ListItemButton
                    key={p.path}
                    selected={current?.path === p.path}
                    onClick={() => openPost(p.path)}
                    sx={{ flexDirection: "column", alignItems: "flex-start", py: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                          {p.draft && <Chip size="small" label="草稿" color="warning" variant="outlined" sx={{ height: 18, fontSize: 10, flexShrink: 0 }} />}
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.4, flexWrap: "wrap" }}>
                          <ScheduleIcon sx={{ fontSize: 12, opacity: 0.6 }} />
                          <Typography variant="caption">{p.date?.slice(0, 10) || p.mtime}</Typography>
                          {p.tags.slice(0, 2).map((t) => (
                            <Chip key={t} label={t} size="small" sx={{ height: 18, fontSize: 10, opacity: 0.85 }} />
                          ))}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
        </List>
      </Paper>

      {/* 右：编辑器 */}
      <Paper elevation={1} sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 520 }}>
        {!current ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, color: "text.secondary", py: 8 }}>
            <Box sx={{ width: 84, height: 84, borderRadius: "24px", bgcolor: "background.default", border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArticleIcon sx={{ fontSize: 40, opacity: 0.35 }} />
            </Box>
            <Typography sx={{ fontWeight: 600 }}>从左侧选择一篇文章</Typography>
            <Typography variant="body2">或点击 ＋ 新建，Ctrl+K 也可以快速找到文章</Typography>
          </Box>
        ) : (
          <Fade in>
            <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              {/* 编辑器头部 */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25, flexWrap: "wrap" }}>
                <Breadcrumbs sx={{ flex: 1, minWidth: 140 }}>
                  <Typography variant="body2" color="text.secondary">{sections.find((s) => s.name === section)?.title || section}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {title || "未命名"}
                  </Typography>
                </Breadcrumbs>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {justSaved ? (
                    <Chip size="small" icon={<DoneIcon />} label="已保存" color="success" sx={{ fontWeight: 700 }} />
                  ) : dirty ? (
                    <Badge color="warning" variant="dot" overlap="circular"><Chip size="small" label="未保存修改" variant="outlined" /></Badge>
                  ) : null}
                  <Tooltip title="字数（不含空白）">
                    <Chip size="small" label={`${wordCount(body)} 字`} variant="outlined" sx={{ fontFamily: FONT_MONO }} />
                  </Tooltip>
                  <Button size="small" variant="outlined" onClick={() => setPickerOpen(true)} startIcon={<AddPhotoAlternateIcon fontSize="small" />}>
                    插入图片
                  </Button>
                  <Button size="small" variant={preview ? "contained" : "outlined"} onClick={() => setPreview(!preview)} startIcon={<VisibilityIcon fontSize="small" />}>
                    {preview ? "编辑" : "预览"}
                  </Button>
                  <Button size="small" variant="contained" onClick={save} disabled={saving} startIcon={<SaveIcon fontSize="small" />}>
                    {saving ? "保存中…" : "保存"}
                  </Button>
                </Stack>
              </Stack>

              {preview ? (
                <Paper variant="outlined" sx={{ flex: 1, p: 2.5, overflow: "auto", bgcolor: "background.default", borderColor: "divider" }}>
                  <MarkdownPreview source={body} />
                </Paper>
              ) : (
                <>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <TextField label="标题" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth sx={{ flex: 1.6 }} />
                    <TextField
                      label="日期" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
                      sx={{ flex: 1 }}
                      slotProps={{
                        inputLabel: { shrink: true },
                        input: { startAdornment: <InputAdornment position="start"><CalendarMonthIcon fontSize="small" sx={{ opacity: 0.6 }} /></InputAdornment> },
                      }}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 1.5, alignItems: "center" }}>
                    <TextField label="标签（逗号分隔）" placeholder="教程, 工具, AI" value={tags} onChange={(e) => setTags(e.target.value)} fullWidth sx={{ flex: 1.4 }} />
                    {section === "huli_house" && (
                      <TextField label="作者" placeholder="胡梨" value={author} onChange={(e) => setAuthor(e.target.value)} sx={{ flex: 0.8 }} />
                    )}
                    <FormControlLabel
                      control={<Switch checked={draft} onChange={(e) => setDraft(e.target.checked)} />}
                      label={draft ? "草稿中" : "发布状态"}
                      sx={{ m: 0 }}
                    />
                  </Stack>
                  <TextField
                    inputRef={bodyInputRef}
                    label="正文 Markdown（$公式$ 用 $$ 包裹）"
                    multiline value={body} onChange={(e) => setBody(e.target.value)}
                    fullWidth
                    sx={{
                      mt: 1.5, flex: 1, display: "flex",
                      "& .MuiInputBase-root": { flex: 1, alignItems: "flex-start" },
                      "& textarea": { fontFamily: FONT_MONO, fontSize: 13.5, lineHeight: 1.7 },
                    }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </>
              )}
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  <kbd style={{ background: "#00000018", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_MONO, fontSize: 11 }}>Ctrl+S</kbd> 保存 ·
                  <kbd style={{ background: "#00000018", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_MONO, fontSize: 11, marginLeft: 4 }}>Ctrl+K</kbd> 命令面板
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">保存后到「预览与发布」推送上线</Typography>
              </Stack>
            </Box>
          </Fade>
        )}
      </Paper>

      {/* 媒体选择器：边写边插图 */}
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(md) => {
          insertAtCursor(md);
          notify("已插入图片引用", "success");
        }}
      />

      {/* 新建对话框 */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT_SERIF }}>新建文章</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="标题" placeholder="例如：我的第一篇博客"
            value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createPost(); }}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            将创建到分区「{sections.find((s) => s.name === section)?.title ?? section}」，自动套用模板
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewOpen(false)}>取消</Button>
          <Button variant="contained" onClick={createPost} disabled={!newTitle.trim()}>创建</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
