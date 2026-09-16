// API 客户端：fetch 封装 + XHR 上传（带进度）
import type {
  HugoStatus, MediaList, PostDetail, PostList, PublishStatus,
  SectionList, UploadResult,
} from "./types";

const TOKEN_KEY = "blogcms_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && typeof options.body === "string") headers["Content-Type"] = "application/json";

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new ApiError("登录已失效", 401);
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* 非 JSON */ }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `请求失败 (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  login: (token: string) =>
    request<{ ok: boolean }>("/api/login", { method: "POST", body: JSON.stringify({ token }) }),

  sections: () => request<SectionList>("/api/sections"),
  posts: (section: string) => request<PostList>(`/api/posts?section=${encodeURIComponent(section)}`),
  post: (path: string) => request<PostDetail>(`/api/post?path=${encodeURIComponent(path)}`),
  save: (path: string, meta: Record<string, unknown>, body: string) =>
    request<{ ok: boolean }>("/api/save", { method: "POST", body: JSON.stringify({ path, meta, body }) }),
  create: (section: string, title: string) =>
    request<{ ok: boolean; path: string }>("/api/new", { method: "POST", body: JSON.stringify({ section, title }) }),

  media: () => request<MediaList>("/api/media"),
  deleteMedia: (path: string) =>
    request<{ ok: boolean }>("/api/media/delete", { method: "POST", body: JSON.stringify({ path }) }),

  hugoStart: () => request<{ ok: boolean; msg: string }>("/api/hugo/start", { method: "POST" }),
  hugoStop: () => request<{ ok: boolean; msg: string }>("/api/hugo/stop", { method: "POST" }),
  hugoStatus: () => request<HugoStatus>("/api/hugo/status"),

  publish: (message: string) =>
    request<{ ok: boolean }>("/api/publish", { method: "POST", body: JSON.stringify({ message }) }),
  publishStatus: () => request<PublishStatus>("/api/publish/status"),
};

// XHR 上传（支持进度回调）
export function uploadFile(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("响应解析失败")); }
      } else {
        let msg = `上传失败 (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* ignore */ }
        if (xhr.status === 401) { clearToken(); window.location.reload(); }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("网络错误"));
    xhr.send(form);
  });
}

export function fmtSize(n: number): string {
  if (n >= 1048576) return (n / 1048576).toFixed(2) + " MB";
  if (n >= 1024) return (n / 1024).toFixed(1) + " KB";
  return n + " B";
}
