// 应用外壳：侧边栏导航（桌面永久 / 移动临时）+ 页头 + 命令面板 + 在线状态
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import MuiListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import ImageIcon from "@mui/icons-material/Image";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import KeyboardCommandKeyIcon from "@mui/icons-material/KeyboardCommandKey";
import Login from "./pages/Login";
import Posts from "./pages/Posts";
import Upload from "./pages/Upload";
import Media from "./pages/Media";
import Publish from "./pages/Publish";
import CommandPalette from "./components/CommandPalette";
import { copyWithFallback } from "./clipboard";
import { api, getToken, clearToken } from "./api";
import type { TabKey } from "./types";
import { FONT_SERIF } from "./theme";

const NAV: { key: TabKey; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: "posts", label: "文章管理", desc: "撰写与编辑", icon: <AutoStoriesIcon /> },
  { key: "upload", label: "图片上传", desc: "压缩与插入", icon: <ImageIcon /> },
  { key: "media", label: "媒体库", desc: "浏览与管理", icon: <PhotoLibraryIcon /> },
  { key: "publish", label: "预览与发布", desc: "构建与上线", icon: <RocketLaunchIcon /> },
];

interface Props {
  mode: "light" | "dark";
  onToggleMode: () => void;
}

export default function App({ mode, onToggleMode }: Props) {
  const [authed, setAuthed] = useState<boolean>(() => Boolean(getToken()));
  const [tab, setTab] = useState<TabKey>("posts");
  // 访问过的页面保持挂载：切页不丢编辑现场
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set(["posts"]));
  const visitedRef = useRef(visited);
  visitedRef.current = visited;
  const go = (t: TabKey) => {
    setTab(t);
    if (!visitedRef.current.has(t)) setVisited(new Set(visitedRef.current).add(t));
    setMobileDrawer(false);
  };
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [online, setOnline] = useState(true);

  // 后端在线状态
  useEffect(() => {
    if (!authed) return;
    let timer: number | undefined;
    const check = () => api.health().then(() => setOnline(true)).catch(() => setOnline(false));
    check();
    timer = window.setInterval(check, 20000);
    return () => window.clearInterval(timer);
  }, [authed]);

  // Ctrl+K 命令面板
  useEffect(() => {
    if (!authed) return;
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [authed]);

  useEffect(() => {
    if (authed && !getToken()) setAuthed(false);
  }, [authed]);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const logout = () => {
    clearToken();
    setAnchor(null);
    setAuthed(false);
  };

  const isTailnet = window.location.hostname !== "127.0.0.1" && window.location.hostname !== "localhost";
  const current = NAV.find((n) => n.key === tab)!;

  const navContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 品牌 */}
      <Box sx={{ px: 2.5, py: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: "12px", flexShrink: 0,
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
            display: "flex", alignItems: "center", justifyContent: "center", color: (t) => t.palette.primary.contrastText,
            boxShadow: (t) => `0 4px 14px ${t.palette.primary.main}66`,
          }}
        >
          <AutoStoriesIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 16, lineHeight: 1.2, whiteSpace: "nowrap" }}>
            博客管理工具
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            羽衣甘蓝 · Hugo
          </Typography>
        </Box>
      </Box>
      <Divider />

      {/* 导航 */}
      <List sx={{ flex: 1, pt: 1.5 }}>
        {NAV.map((n) => (
          <ListItemButton
            key={n.key}
            selected={tab === n.key}
            onClick={() => go(n.key)}
          >
            <MuiListItemIcon>{n.icon}</MuiListItemIcon>
            <ListItemText primary={n.label} secondary={n.desc} />
          </ListItemButton>
        ))}
      </List>

      <Divider />
      {/* 底部 */}
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <ListItemButton sx={{ mx: 0 }} onClick={onToggleMode}>
          <MuiListItemIcon>{mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}</MuiListItemIcon>
          <ListItemText primary={mode === "light" ? "切换到暗色" : "切换到亮色"} />
        </ListItemButton>
        <Box sx={{ px: 1.25, py: 0.75, display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              bgcolor: online ? "success.main" : "error.main",
              boxShadow: online ? (t) => `0 0 0 3px ${t.palette.success.main}33` : "none",
              animation: online ? "pulse 2s infinite" : "none",
              "@keyframes pulse": { "0%": { boxShadow: "0 0 0 0 rgba(63,157,110,.4)" }, "70%": { boxShadow: "0 0 0 6px rgba(63,157,110,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(63,157,110,0)" } },
            }}
          />
          <Typography variant="caption" color="text.secondary">{online ? "服务在线" : "服务离线"}</Typography>
          {isTailnet && <Chip size="small" label="Tailnet" color="primary" variant="outlined" sx={{ ml: "auto", height: 20, fontSize: 10 }} />}
        </Box>
        <ListItemButton sx={{ mx: 0 }} onClick={(e) => setAnchor(e.currentTarget)}>
          <MuiListItemIcon><VpnKeyIcon /></MuiListItemIcon>
          <ListItemText primary="账户" />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* 桌面侧栏 */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          width: 232, flexShrink: 0,
          "& .MuiDrawer-paper": { width: 232, boxSizing: "border-box", border: "none" },
        }}
        open
      >
        {navContent}
      </Drawer>

      {/* 移动端顶栏 + 临时抽屉 */}
      <AppBar position="fixed" sx={{ display: { lg: "none" } }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setMobileDrawer(true)}><MenuIcon /></IconButton>
          <Typography sx={{ fontFamily: FONT_SERIF, fontWeight: 700 }}>博客管理工具</Typography>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="命令面板 (Ctrl+K)">
            <IconButton onClick={() => setPaletteOpen(true)}><KeyboardCommandKeyIcon /></IconButton>
          </Tooltip>
          <IconButton onClick={onToggleMode}>{mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}</IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={mobileDrawer}
        onClose={() => setMobileDrawer(false)}
        sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { width: 232 } }}
      >
        {navContent}
      </Drawer>

      {/* 主区 */}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Toolbar sx={{ display: { lg: "none" } }} />
        <Container maxWidth="xl" sx={{ py: 3, flex: 1, display: "flex", flexDirection: "column" }}>
          {/* 页头 */}
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h5" sx={{ mb: 0.25 }}>
                {current.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">{current.desc}</Typography>
            </Box>
            <Tooltip title="命令面板 (Ctrl+K)">
              <Chip
                icon={<KeyboardCommandKeyIcon fontSize="small" />}
                label="Ctrl K"
                variant="outlined"
                onClick={() => setPaletteOpen(true)}
                sx={{ cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, px: 1 }}
              />
            </Tooltip>
          </Box>

          {NAV.map((n) => {
            const active = tab === n.key;
            return (
              <Box
                key={n.key}
                sx={{
                  flex: 1, display: active ? "flex" : "none", flexDirection: "column", minHeight: 0,
                  animation: active ? "panelIn .26s ease" : "none",
                  "@keyframes panelIn": { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "none" } },
                }}
              >
                {visited.has(n.key) && (
                  <>
                    {n.key === "posts" && <Posts />}
                    {n.key === "upload" && <Upload />}
                    {n.key === "media" && <Media />}
                    {n.key === "publish" && <Publish />}
                  </>
                )}
              </Box>
            );
          })}
        </Container>

        <Box component="footer" sx={{ py: 2, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            博客管理工具 · Ctrl+K 打开命令面板 · 修改后记得发布
          </Typography>
        </Box>
      </Box>

      {/* 账户菜单 */}
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { copyWithFallback(getToken() || "", "复制失败，请手动复制："); setAnchor(null); }}>
          <ListItemIcon><VpnKeyIcon fontSize="small" /></ListItemIcon>
          复制登录 Token
        </MenuItem>
        <Divider />
        <MenuItem onClick={logout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          退出登录
        </MenuItem>
      </Menu>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={go} onToggleTheme={onToggleMode} />
    </Box>
  );
}
