"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

const codeToken = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|#[^\n]*|\/\/[^\n]*|\b(?:def|return|for|while|if|else|elif|in|not|and|or|True|False|None|class|import|from|as|lambda|pass|break|continue|function|const|let|var|new|true|false|null|undefined|await|async|of|export)\b|\b\d+(?:\.\d+)?\b)/g;

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`\n]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="coach-inline-code">{part.slice(1, -1)}</code>;
    return part;
  });
}

function prose(text: string): ReactNode[] {
  return text.trim().split(/\n\s*\n/).filter(Boolean).map((block, index) => {
    const lines = block.split("\n");
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      return <ul key={index}>{lines.map((line, item) => <li key={item}>{inline(line.replace(/^\s*[-*]\s+/, ""))}</li>)}</ul>;
    }
    return <p key={index}>{lines.map((line, item) => <span key={item}>{item > 0 && <br />}{inline(line.replace(/^#{1,4}\s+/, ""))}</span>)}</p>;
  });
}

function coloredLine(line: string): ReactNode[] {
  const result: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(codeToken)) {
    const start = match.index ?? 0;
    if (start > last) result.push(line.slice(last, start));
    const value = match[0];
    const tone = value.startsWith("#") || value.startsWith("//") ? "comment"
      : /^["'`]/.test(value) ? "string" : /^\d/.test(value) ? "number" : "keyword";
    result.push(<span className={`coach-code-${tone}`} key={`${start}-${value}`}>{value}</span>);
    last = start + value.length;
  }
  if (last < line.length) result.push(line.slice(last));
  return result;
}

function CodeExample({ raw }: { raw: string }) {
  const [copied, setCopied] = useState(false);
  const [first, ...rest] = raw.slice(3, -3).replace(/^\n/, "").split("\n");
  const hasLanguage = /^[a-z][\w+-]*$/i.test(first.trim());
  const language = hasLanguage ? first.trim() : "Code";
  const code = (hasLanguage ? rest : [first, ...rest]).join("\n").replace(/\n$/, "");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); }
  }
  return <div className="coach-code-block">
    <div className="coach-code-header"><span>{language}</span><button type="button" onClick={() => void copy()} aria-label={`Copy ${language} code`}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button></div>
    <pre tabIndex={0}><code>{code.split("\n").map((line, index) => <span key={index}>{coloredLine(line)}{index < code.split("\n").length - 1 ? "\n" : ""}</span>)}</code></pre>
  </div>;
}

export function CoachMessage({ text }: { text: string }) {
  return <div className="coach-prose">{text.split(/(```[\s\S]*?```)/g).filter(Boolean).map((part, index) =>
    part.startsWith("```") && part.endsWith("```") ? <CodeExample key={index} raw={part} /> : <div key={index}>{prose(part)}</div>,
  )}</div>;
}
