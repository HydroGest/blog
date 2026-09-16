// 设计系统 v2：书卷风格 · 产品级
// 令牌 → 主题 → 组件覆盖，亮/暗双模式
import { createTheme, alpha } from "@mui/material/styles";

const tokens = {
  light: {
    bg: "#f4f1e9",
    surface: "#fffdf8",
    surfaceAlt: "#faf7f0",
    elevated: "#ffffff",
    line: "#e9e2d3",
    lineStrong: "#d8cdb6",
    text: "#3b362f",
    textSub: "#8d8577",
    textFaint: "#b3ab9c",
    accent: "#b08968",
    accentDark: "#8f6f52",
    accentContrast: "#ffffff",
    accentSoft: "#f3ead9",
    accentSoftDark: "#e6d6bf",
    ok: "#3f9d6e",
    warn: "#d99a3d",
    bad: "#c0564f",
    info: "#5b8db8",
    codeBg: "#f5f0e6",
    codeText: "#56493c",
    shadow: "rgba(93, 74, 48, 0.10)",
    shadowStrong: "rgba(93, 74, 48, 0.16)",
  },
  dark: {
    bg: "#181512",
    surface: "#211d19",
    surfaceAlt: "#272320",
    elevated: "#2c2723",
    line: "#38332b",
    lineStrong: "#4a4338",
    text: "#ece5d6",
    textSub: "#a49b8a",
    textFaint: "#6f675b",
    accent: "#c9a685",
    accentDark: "#d8bb99",
    accentContrast: "#241d14",
    accentSoft: "#382f24",
    accentSoftDark: "#4a3d2c",
    ok: "#74c49b",
    warn: "#e2b25f",
    bad: "#d97b74",
    info: "#7fa9cf",
    codeBg: "#121009",
    codeText: "#d6ccb9",
    shadow: "rgba(0,0,0,0.45)",
    shadowStrong: "rgba(0,0,0,0.6)",
  },
};

const FONT_SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","PingFang SC","Microsoft YaHei",serif';
const FONT_SANS = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",-apple-system,"Segoe UI",sans-serif';
const FONT_MONO = '"JetBrains Mono","Fira Code","SFMono-Regular",Consolas,"Liberation Mono",monospace';

export function buildTheme(mode: "light" | "dark") {
  const t = tokens[mode];
  const focusRing = `0 0 0 3px ${alpha(t.accent, 0.35)}`;

  return createTheme({
    palette: {
      mode,
      primary: { main: t.accent, dark: t.accentDark, contrastText: t.accentContrast },
      secondary: { main: t.accentDark },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.text, secondary: t.textSub, disabled: t.textFaint },
      divider: t.line,
      success: { main: t.ok },
      warning: { main: t.warn },
      error: { main: t.bad },
      info: { main: t.info },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT_SANS,
      fontSize: 14,
      h1: { fontFamily: FONT_SERIF, fontWeight: 700, letterSpacing: "0.01em" },
      h2: { fontFamily: FONT_SERIF, fontWeight: 700 },
      h3: { fontFamily: FONT_SERIF, fontWeight: 700 },
      h4: { fontFamily: FONT_SERIF, fontWeight: 700 },
      h5: { fontFamily: FONT_SERIF, fontWeight: 700, letterSpacing: "0.02em" },
      h6: { fontFamily: FONT_SERIF, fontWeight: 700, letterSpacing: "0.02em" },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, color: t.textSub },
      body2: { lineHeight: 1.6 },
      caption: { letterSpacing: "0.02em" },
      overline: { letterSpacing: "0.14em", fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.02em" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { transition: "background-color .35s ease, color .35s ease" },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${t.line}`,
            transition: "box-shadow .2s ease, border-color .2s ease",
          },
          rounded: { borderRadius: 16 },
          elevation1: { boxShadow: `0 1px 2px ${t.shadow}, 0 4px 16px ${t.shadow}` },
          elevation2: { boxShadow: `0 2px 4px ${t.shadow}, 0 8px 28px ${t.shadowStrong}` },
          elevation3: { boxShadow: `0 4px 8px ${t.shadow}, 0 14px 44px ${t.shadowStrong}` },
          elevation4: { boxShadow: `0 6px 12px ${t.shadowStrong}, 0 20px 60px ${t.shadowStrong}` },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: "7px 18px",
            transition: "transform .12s ease, box-shadow .2s ease, background-color .2s ease",
            "&:active": { transform: "scale(0.975)" },
            "&:focus-visible": { outline: "none", boxShadow: focusRing },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${t.accent}, ${t.accentDark})`,
            boxShadow: `0 1px 2px ${t.shadowStrong}, 0 4px 14px ${alpha(t.accent, 0.35)}`,
            "&:hover": {
              background: `linear-gradient(135deg, ${t.accentDark}, ${t.accentDark})`,
              boxShadow: `0 3px 6px ${t.shadowStrong}, 0 8px 24px ${alpha(t.accent, 0.45)}`,
            },
          },
          outlined: { borderColor: t.lineStrong, "&:hover": { borderColor: t.accent, background: alpha(t.accent, 0.06) } },
          text: { "&:hover": { background: alpha(t.accent, 0.08) } },
          sizeSmall: { padding: "5px 12px", borderRadius: 9 },
          sizeLarge: { padding: "10px 24px", borderRadius: 12 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: "background-color .15s ease, transform .12s ease",
            "&:active": { transform: "scale(0.92)" },
            "&:focus-visible": { outline: "none", boxShadow: focusRing },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 10,
              backgroundColor: mode === "light" ? "#fff" : t.surfaceAlt,
              transition: "box-shadow .2s ease, border-color .2s ease",
              "& fieldset": { borderColor: t.line, transition: "border-color .2s ease" },
              "&:hover fieldset": { borderColor: t.lineStrong },
              "&.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(t.accent, 0.15)}` },
              "&.Mui-focused fieldset": { borderColor: t.accent },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 9,
            transition: "all .15s ease",
          },
          filled: { backgroundColor: t.accentSoft, color: t.accentDark, "&:hover": { backgroundColor: t.accentSoftDark } },
          outlined: { borderColor: t.lineStrong, "&:hover": { borderColor: t.accent, color: t.accentDark } },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            margin: "2px 8px",
            padding: "8px 12px",
            transition: "background-color .15s ease, transform .1s ease",
            "&:active": { transform: "scale(0.99)" },
            "&:focus-visible": { outline: "none", boxShadow: focusRing },
            "&.Mui-selected": {
              background: alpha(t.accent, 0.14),
              color: t.accentDark,
              fontWeight: 700,
              "&:hover": { background: alpha(t.accent, 0.2) },
              "& .MuiListItemIcon-root": { color: t.accentDark },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 38, color: t.textSub } },
      },
      MuiListSubheader: {
        styleOverrides: { root: { background: "transparent", color: t.textFaint, fontWeight: 700 } },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: t.accent, height: 3, borderRadius: 3 },
          root: { minHeight: 46 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 600, minHeight: 46, "&.Mui-selected": { color: t.accentDark } },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: mode === "light" ? "#faf7f0" : t.bg,
            borderRight: `1px solid ${t.line}`,
            backgroundImage: "none",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: alpha(t.surface, 0.85),
            backdropFilter: "blur(12px)",
            color: t.text,
            borderBottom: `1px solid ${t.line}`,
            boxShadow: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 18 } },
      },
      MuiMenu: {
        styleOverrides: { paper: { borderRadius: 12, boxShadow: `0 8px 40px ${t.shadowStrong}` } },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12, background: t.text, color: t.surface } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 6, height: 6, background: alpha(t.accent, 0.15) },
          bar: { borderRadius: 6 },
        },
      },
      MuiCircularProgress: { styleOverrides: { root: { color: t.accent } } },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": { color: t.accent },
            "&.Mui-checked + .MuiSwitch-track": { backgroundColor: t.accent, opacity: 1 },
          },
          track: { opacity: 0.3 },
        },
      },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiSkeleton: {
        styleOverrides: { root: { background: alpha(t.textFaint, 0.2) } },
      },
      MuiListItemText: {
        styleOverrides: { secondary: { fontSize: 12 } },
      },
      MuiBreadcrumbs: { styleOverrides: { separator: { color: t.textFaint } } },
    },
  });
}

export { FONT_MONO, FONT_SERIF, FONT_SANS, tokens };
