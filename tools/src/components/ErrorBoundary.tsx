// 全局错误边界：防止白屏
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI 渲染错误:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, textAlign: "center", p: 4 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 52 }} />
          <Typography variant="h6">出错了</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, wordBreak: "break-all", fontFamily: "monospace" }}>
            {this.state.error.message}
          </Typography>
          <Button variant="contained" onClick={() => this.setState({ error: null })}>重试</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
