// 轻量事件总线：跨页面协调（命令面板 → 文章页 等）
type Handler = (payload?: unknown) => void;

const map = new Map<string, Set<Handler>>();

export function on(event: string, fn: Handler): () => void {
  if (!map.has(event)) map.set(event, new Set());
  map.get(event)!.add(fn);
  return () => off(event, fn);
}

export function off(event: string, fn: Handler) {
  map.get(event)?.delete(fn);
}

export function emit(event: string, payload?: unknown) {
  map.get(event)?.forEach((fn) => fn(payload));
}
