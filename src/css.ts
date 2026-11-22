// A small CSS reader: enough to find declarations, their line, and the rules and at-rules around them.
// It is not a full parser. It handles comments, strings, nested blocks and parentheses in values.

export type Decl = {
  prop: string; // lower-cased; custom properties keep their case
  value: string;
  line: number; // 1-based
  context: string[]; // preludes of enclosing blocks, outermost first, e.g. ["@media (prefers-color-scheme: dark)", ":root"]
};

export function stripComments(src: string): string {
  // Keep newlines so line numbers survive.
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

export function parseCss(src: string): Decl[] {
  const text = stripComments(src);
  const decls: Decl[] = [];
  const stack: string[] = [];
  let buf = "";
  let bufStart = 0;
  let line = 1;
  let paren = 0;
  let quote: string | null = null;

  const flushDecl = () => {
    const startLine = bufStart; // line of the first non-space character
    const t = buf.trim();
    buf = "";
    if (!t || t.startsWith("@")) return;
    const i = t.indexOf(":");
    if (i <= 0) return;
    const prop = t.slice(0, i).trim();
    decls.push({
      prop: prop.startsWith("--") ? prop : prop.toLowerCase(),
      value: t.slice(i + 1).trim().replace(/\s*!important$/i, ""),
      line: startLine,
      context: [...stack],
    });
  };

  for (let k = 0; k < text.length; k++) {
    const ch = text[k]!;
    if (buf === "" || buf.trim() === "") bufStart = line;
    if (ch === "\n") line++;
    if (quote) {
      buf += ch;
      if (ch === "\\") { buf += text[++k] ?? ""; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === "(") paren++;
    if (ch === ")") paren = Math.max(0, paren - 1);
    if (paren > 0) { buf += ch; continue; }
    if (ch === "{") {
      stack.push(buf.trim().replace(/\s+/g, " "));
      buf = "";
      continue;
    }
    if (ch === ";") { flushDecl(); continue; }
    if (ch === "}") {
      flushDecl();
      stack.pop();
      continue;
    }
    buf += ch;
  }
  return decls;
}

/** Line number (1-based) of a character offset. */
export function lineOf(src: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset && i < src.length; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}
