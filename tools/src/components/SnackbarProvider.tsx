// 全局消息提示
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import type { AlertColor } from "@mui/material";

interface Snack {
  id: number;
  message: string;
  severity: AlertColor;
}

interface Ctx {
  notify: (message: string, severity?: AlertColor) => void;
}

const SnackbarContext = createContext<Ctx>({ notify: () => {} });

export function useNotify() {
  return useContext(SnackbarContext).notify;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const idRef = useRef(0);

  const notify = useCallback((message: string, severity: AlertColor = "success") => {
    const id = ++idRef.current;
    setSnacks((s) => [...s.slice(-2), { id, message, severity }]);
    setTimeout(() => setSnacks((s) => s.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <SnackbarContext.Provider value={{ notify }}>
      {children}
      {snacks.map((s) => (
        <Snackbar
          key={s.id}
          open
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          sx={{ mb: snacks.filter((x) => x.id <= s.id).length * 8 }}
        >
          <Alert severity={s.severity} variant="filled" sx={{ borderRadius: 3, boxShadow: 4 }}>
            {s.message}
          </Alert>
        </Snackbar>
      ))}
    </SnackbarContext.Provider>
  );
}
