// 复制文本：Tailnet 走 HTTP（非安全上下文），navigator.clipboard 不可用，
// 需要 execCommand 兜底，保证在任意网络环境下都能复制。
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 回退到 execCommand */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// 复制并在失败时提供手动复制提示（返回是否成功）
export async function copyWithFallback(text: string, label = "复制失败，请手动复制："): Promise<boolean> {
  const ok = await copyText(text);
  if (!ok) window.prompt(label, text);
  return ok;
}
