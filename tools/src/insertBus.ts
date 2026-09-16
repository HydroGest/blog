// 跨页面消息总线：图片上传 → 插入到文章编辑器
let handler: ((text: string) => boolean) | null = null;

export function registerInsert(fn: ((text: string) => boolean) | null) {
  handler = fn;
}

export function triggerInsert(text: string): boolean {
  if (handler) return handler(text);
  return false;
}
