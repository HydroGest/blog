// Markdown 轻量预览（安全转义后渲染，公式保持原样显示）
import { useMemo } from "react";
import Box from "@mui/material/Box";
import { FONT_MONO } from "../theme";

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

function mdToHtml(src: string): string {
  const lines = esc(src).split("\n");
  const out: string[] = [];
  let inCode = false;
  const codeBuf: string[] = [];
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) { out.push(`<p>${para.join("<br>")}</p>`); para = []; }
  };
  const flushList = () => {
    if (inList) { out.push("</ul>"); inList = false; }
  };

  for (const raw of lines) {
    const l = raw.trimEnd();
    if (l.startsWith("```")) {
      flushPara(); flushList();
      if (inCode) { out.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`); codeBuf.length = 0; inCode = false; }
      else inCode = true;
      continue;
    }
    if (inCode) { codeBuf.push(l); continue; }
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
  if (inCode) out.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`);
  return out.join("\n");
}

export default function MarkdownPreview({ source, sx }: { source: string; sx?: object }) {
  const html = useMemo(() => mdToHtml(source), [source]);
  return (
    <Box
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
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
