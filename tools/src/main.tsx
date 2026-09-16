import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, GlobalStyles } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App";
import { buildTheme, FONT_MONO } from "./theme";
import { SnackbarProvider } from "./components/SnackbarProvider";
import ErrorBoundary from "./components/ErrorBoundary";

function Root() {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("blogcms_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const theme = useMemo(() => buildTheme(mode), [mode]);
  const toggleMode = () => {
    setMode((m) => {
      const next = m === "light" ? "dark" : "light";
      localStorage.setItem("blogcms_theme", next);
      return next;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          "::-webkit-scrollbar": { width: 10, height: 10 },
          "::-webkit-scrollbar-thumb": { background: "rgba(140,130,115,.35)", borderRadius: 6, border: "2px solid transparent", backgroundClip: "content-box" },
          "::-webkit-scrollbar-thumb:hover": { background: "rgba(140,130,115,.6)", backgroundClip: "content-box" },
          "::-webkit-scrollbar-track": { background: "transparent" },
          "::selection": { background: "rgba(176,137,104,.3)" },
          "code, pre, .mono": { fontFamily: FONT_MONO },
          "html": { scrollBehavior: "smooth" },
        }}
      />
      <SnackbarProvider>
        <ErrorBoundary>
          <App mode={mode} onToggleMode={toggleMode} />
        </ErrorBoundary>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
