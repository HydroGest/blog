// Ctrl+K 命令面板：导航 + 快速动作 + 全站文章搜索
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import SearchIcon from "@mui/icons-material/Search";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import ImageIcon from "@mui/icons-material/Image";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import PostAddIcon from "@mui/icons-material/PostAdd";
import ArticleIcon from "@mui/icons-material/Article";
import Brightness6Icon from "@mui/icons-material/Brightness6";
import { api } from "../api";
import type { Post, TabKey } from "../types";
import { emit } from "../bus";
import { FONT_MONO } from "../theme";

export interface PaletteAction {
  key: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  group: "动作" | "文章";
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: TabKey) => void;
  onToggleTheme: () => void;
}

export default function CommandPalette({ open, onClose, onNavigate, onToggleTheme }: Props) {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时加载全站文章（懒加载）
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    setLoadingPosts(true);
    api
      .sections()
      .then((d) => Promise.all(d.sections.map((s) => api.posts(s.name))))
      .then((lists) => {
        const all = lists.flatMap((l) => l.posts).sort((a, b) => (b.date || b.mtime).localeCompare(a.date || a.mtime));
        setPosts(all.slice(0, 30));
      })
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const actions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [
      { key: "new", label: "新建文章", hint: "在当前分区创建", icon: <PostAddIcon />, group: "动作", run: () => { onNavigate("posts"); emit("new-post-request"); } },
      { key: "upload", label: "上传图片", hint: "拖拽 / 粘贴截图", icon: <ImageIcon />, group: "动作", run: () => onNavigate("upload") },
      { key: "media", label: "打开媒体库", hint: "浏览全部图片", icon: <PhotoLibraryIcon />, group: "动作", run: () => onNavigate("media") },
      { key: "publish", label: "预览与发布", hint: "hugo / git push", icon: <RocketLaunchIcon />, group: "动作", run: () => onNavigate("publish") },
      { key: "theme", label: "切换主题", hint: "亮 / 暗", icon: <Brightness6Icon />, group: "动作", run: () => onToggleTheme() },
    ];
    return list;
  }, [onNavigate, onToggleTheme]);

  const postItems = useMemo<PaletteAction[]>(
    () =>
      posts.map((p) => ({
        key: `post:${p.path}`,
        label: p.title,
        hint: `${p.path.split("/")[1]} · ${(p.date || p.mtime).slice(0, 10)}`,
        icon: <ArticleIcon />,
        group: "文章" as const,
        run: () => { onNavigate("posts"); emit("open-post-request", p.path); },
      })),
    [posts, onNavigate],
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filter = (list: PaletteAction[]) => (q ? list.filter((i) => (i.label + i.hint + i.group).toLowerCase().includes(q)) : list);
    return [...filter(actions), ...filter(postItems)];
  }, [actions, postItems, query]);

  useEffect(() => setCursor(0), [query]);

  const exec = useCallback(
    (idx: number) => {
      const item = items[idx];
      if (!item) return;
      onClose();
      setTimeout(() => item.run(), 30);
    },
    [items, onClose],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: "hidden" } } }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); exec(cursor); }
      }}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          autoFocus
          variant="outlined"
          placeholder="搜索文章或输入命令…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip label="ESC" size="small" variant="outlined" sx={{ height: 20, fontSize: 11, fontFamily: FONT_MONO }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <DialogContent sx={{ p: 0, maxHeight: 420, overflow: "auto" }}>
        {loadingPosts && items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
            加载文章…
          </Typography>
        )}
        {!loadingPosts && items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
            没有匹配「{query}」的结果
          </Typography>
        )}
        <List dense disablePadding>
          {items.map((item, i) => (
            <Box key={item.key}>
              {i > 0 && items[i - 1].group !== item.group && <Divider sx={{ mx: 2 }} />}
              <ListItemButton
                selected={i === cursor}
                onClick={() => exec(i)}
                onMouseEnter={() => setCursor(i)}
                sx={{ mx: 1, my: 0.25, borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} secondary={item.hint} />
                {item.group === "文章" && <Chip label={item.group} size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: 10 }} />}
              </ListItemButton>
            </Box>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
