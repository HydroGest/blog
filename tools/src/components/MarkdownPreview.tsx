// Markdown 轻量预览（安全转义渲染 + Mermaid 图表懒加载渲染，公式保持原样显示）
import { useEffect, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { FONT_MONO, FONT_SANS } from "../theme";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function inline(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img alt="$1" src="$2" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

interface Parsed {
  html: string;
  mermaid: string[]; // 与 html 中 .mmd[data-mmd] 占位符一一对应
}

function mdToHtml(src: string): Parsed {
  const rawLines = src.split("\n");
  const out: string[] = [];
  const mermaid: string[] = [];
  let inCode = false;
  let codeLang = "";
  const codeBuf: string[] = [];
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) { out.push(`<p>${para.join("<br>")}</p>`); para = []; }
  };
  const flushList = () => {
    if (inList) { out.push("</ul>"); inList = false; }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const l = raw.trimEnd();
    if (l.startsWith("```")) {
      flushPara(); flushList();
      if (inCode) {
        if (codeLang === "mermaid") {
          mermaid.push(codeBuf.join("\n"));
          out.push(`<div class="mmd" data-mmd="${mermaid.length - 1}"></div>`);
        } else {
          out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`);
        }
        codeBuf.length = 0;
        inCode = false;
        codeLang = "";
      } else {
        inCode = true;
        codeLang = l.slice(3).trim();
      }
      continue;
    }
    if (inCode) { codeBuf.push(raw); continue; }
    if (/^\s*[-*] /.test(l)) {
      flushPara();
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`);
      continue;
    }
    flushList();
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { flushPara(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^>\s?/.test(l)) { flushPara(); out.push(`<blockquote>${inline(l.replace(/^>\s?/, ""))}</blockquote>`); continue; }
    if (/^\s*---+\s*$/.test(l)) { flushPara(); out.push("<hr>"); continue; }
    if (!l.trim()) { flushPara(); continue; }
    para.push(inline(l));
  }
  flushPara(); flushList();
  if (inCode) {
    if (codeLang === "mermaid") {
      mermaid.push(codeBuf.join("\n"));
      out.push(`<div class="mmd" data-mmd="${mermaid.length - 1}"></div>`);
    } else {
      out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`);
    }
  }
  return { html: out.join("\n"), mermaid };
}

export default function MarkdownPreview({ source, sx }: { source: string; sx?: object }) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const { html, mermaid } = useMemo(() => mdToHtml(source), [source]);
  const boxRef = useRef<HTMLDivElement>(null);
  const renderSeq = useRef(0);

  // 懒加载 mermaid：仅在预览含 ```mermaid 块时拉取对应 chunk，不影响主包体积
  useEffect(() => {
    if (mermaid.length === 0) return;
    let cancelled = false;
    const seq = ++renderSeq.current;
    (async () => {
      const mod = await import("mermaid");
      const mmd = mod.default;
      mmd.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: mode === "dark" ? "dark" : "default",
        fontFamily: FONT_SANS,
        flowchart: { htmlLabels: true, curve: "basis" },
      });
      const root = boxRef.current;
      if (!root || cancelled || seq !== renderSeq.current) return;
      const slots = [...root.querySelectorAll<HTMLElement>(".mmd[data-mmd]")];
      for (let i = 0; i < mermaid.length && i < slots.length; i++) {
        if (cancelled || seq !== renderSeq.current) return;
        const el = slots[i];
        try {
          const { svg } = await mmd.render(`mmd-${seq}-${i}`, mermaid[i]);
          if (cancelled || seq !== renderSeq.current) return;
          el.innerHTML = svg;
          el.classList.add("mmd-rendered");
        } catch (e) {
          if (cancelled) return;
          el.innerHTML = `<div class="mmd-error">⚠ Mermaid 渲染失败：${esc(String((e as Error).message))}</div>`;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [mermaid, mode]);

  return (
    <Box
      ref={boxRef}
      className="md-preview"
      sx={{
        fontFamily: FONT_MONO,
        fontSize: 13.5,
        lineHeight: 1.75,
        "& p": { m: "0.5em 0" },
        "& h1,& h2,& h3,& h4": { fontFamily: "inherit", m: "0.9em 0 0.4em", lineHeight: 1.3 },
        "& h1": { fontSize: 22 }, "& h2": { fontSize: 18 }, "& h3": { fontSize: 16 }, "& h4": { fontSize: 14.5 },
        "& img": { maxWidth: "100%", borderRadius: 2, display: "block", m: "0.5em 0" },
        "& pre": { background: (t) => t.palette.mode === "dark" ? "#14120f" : "#f4efe6", p: 1.5, borderRadius: 2, overflow: "auto", fontSize: 12.5 },
        "& code": { background: (t) => t.palette.mode === "dark" ? "#14120f" : "#f4efe6", px: 0.5, py: 0.1, borderRadius: 1, fontSize: "0.92em" },
        "& pre code": { background: "none", p: 0, fontSize: "1em" },
        "& blockquote": { borderLeft: "3px solid", borderColor: "primary.main", m: "0.5em 0", pl: 1.5, color: "text.secondary" },
        "& a": { color: "primary.main" },
        "& hr": { border: "none", borderTop: "1px solid", borderColor: "divider", m: "1em 0" },
        "& ul": { m: "0.4em 0", pl: 2 },
        "& li": { m: "0.15em 0" },
        // Mermaid 图表
        "& .mmd": { m: "0.8em 0", textAlign: "center", overflowX: "auto" },
        "& .mmd svg": { maxWidth: "100%", height: "auto" },
        "& .mmd-error": {
          textAlign: "left", p: 1, borderRadius: 2, fontSize: 12,
          color: "error.main", bgcolor: (t) => (t.palette.mode === "dark" ? "#2a1a18" : "#fbeae8"),
          border: "1px solid", borderColor: "error.main",
          whiteSpace: "pre-wrap", wordBreak: "break-all",
        },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
