// 登录页
import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Fade from "@mui/material/Fade";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import KeyIcon from "@mui/icons-material/Key";
import { api, setToken } from "../api";
import { FONT_SERIF } from "../theme";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [token, setTokenInput] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      await api.login(token.trim());
      setToken(token.trim());
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        p: 2,
        background: (t) =>
          `radial-gradient(900px 420px at 15% -5%, ${t.palette.primary.main}2e, transparent 55%), radial-gradient(900px 420px at 90% 110%, ${t.palette.primary.main}1f, transparent 55%), ${t.palette.background.default}`,
      }}
    >
      <Fade in timeout={400}>
        <Paper
          elevation={2}
          sx={{ width: "100%", maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: "22px" }}
          component="form"
          onSubmit={submit}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
            <Box
              sx={{
                width: 58, height: 58, borderRadius: "18px", mb: 2,
                background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                display: "flex", alignItems: "center", justifyContent: "center", color: (t) => t.palette.primary.contrastText,
                boxShadow: (t) => `0 10px 30px ${t.palette.primary.main}55`,
              }}
            >
              <AutoStoriesIcon />
            </Box>
            <Typography variant="h5" sx={{ fontFamily: FONT_SERIF, fontWeight: 700, letterSpacing: "0.02em" }}>
              博客管理工具
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              羽衣甘蓝的博客 · 撰写 · 配图 · 发布
            </Typography>
            <Chip size="small" label="Tailnet · yurikale-beacon" variant="outlined" sx={{ mt: 1.5, height: 22, fontSize: 11 }} />
          </Box>

          {error && (
            <Fade in>
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            </Fade>
          )}

          <TextField
            fullWidth
            label="登录 Token"
            placeholder="输入服务器上的访问令牌"
            type={show ? "text" : "password"}
            value={token}
            onChange={(e) => setTokenInput(e.target.value)}
            autoFocus
            autoComplete="off"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start"><KeyIcon fontSize="small" /></InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShow(!show)}>
                      {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button fullWidth variant="contained" size="large" type="submit" disabled={loading || !token.trim()} sx={{ mt: 2.5, py: 1.2 }}>
            {loading ? "验证中…" : "进入"}
          </Button>
          {loading && <LinearProgress sx={{ mt: 1.5, borderRadius: 2 }} />}

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2.5, textAlign: "center", lineHeight: 1.7 }}>
            在服务器上执行 <code style={{ background: "#00000014", padding: "2px 6px", borderRadius: 4 }}>cat ~/blog/tools/.secret</code> 查看 Token
          </Typography>
        </Paper>
      </Fade>
    </Box>
  );
}
