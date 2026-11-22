// Source lint. Rules tagged "css" read plain CSS and HTML, so they work on any web stack.
// Rules tagged "react-tailwind" read JSX and Tailwind class names (D-1).
// Suppress one line with a comment containing `ui-floors-ignore <rule>` on that line or the line above
// (`ui-checks-ignore`, the old name, still works).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { parseCss, stripComments, lineOf } from "./css.ts";
import type { Finding } from "./report.ts";

export type LintOptions = {
  root: string;
  include: string[];
  exclude: string[];
  tokenFiles: string[];
  stack: "react-tailwind" | "css";
};

type File = { path: string; text: string; kind: "css" | "source" | "html" };

const CSS_EXT = new Set([".css"]);
const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".vue", ".svelte"]);
const HTML_EXT = new Set([".html"]);

export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*" && glob[i + 1] === "*") { re += ".*"; i++; if (glob[i + 1] === "/") i++; }
    else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

// Never app source, whatever the config's exclude list says: an app that sets its own list replaces the defaults.
const ALWAYS_SKIP = new Set(["node_modules", ".git"]);

function walk(dir: string, exclude: string[], out: string[]): void {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (ALWAYS_SKIP.has(name) || exclude.includes(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exclude, out);
    else out.push(p);
  }
}

export function collectFiles(opts: LintOptions, missing: string[] = []): File[] {
  const paths: string[] = [];
  for (const inc of opts.include) {
    const p = resolve(opts.root, inc);
    let st;
    try { st = statSync(p); } catch { missing.push(inc); continue; }
    if (st.isDirectory()) walk(p, opts.exclude, paths);
    else paths.push(p);
  }
  const files: File[] = [];
  for (const p of paths) {
    const ext = extname(p);
    const kind = CSS_EXT.has(ext) ? "css" : SOURCE_EXT.has(ext) ? "source" : HTML_EXT.has(ext) ? "html" : null;
    if (!kind) continue;
    // Relative to the config's folder; a file outside it (a config kept outside the repo) keeps its absolute path.
    const r = relative(opts.root, p);
    files.push({ path: (r.startsWith("..") ? p : r).split(sep).join("/"), text: readFileSync(p, "utf8"), kind });
  }
  return files;
}

const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const HEX = /(^|[^\w&\/=])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;
const GENERIC_FAMILY = /\b(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|math|emoji|fangsong)\s*$/i;
const FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|fonts\.bunny\.net|fonts\.cdnfonts\.com|cdn\.jsdelivr\.net\/.*font|unpkg\.com\/.*font/i;

function suppressed(text: string, line: number, rule: string): boolean {
  const lines = text.split("\n");
  const re = new RegExp(`ui-(?:floors|checks)-ignore\\b[^\\n]*\\b${rule}\\b`);
  return re.test(lines[line - 1] ?? "") || re.test(lines[line - 2] ?? "");
}

type Emit = (rule: string, file: File, line: number, message: string) => void;

function lintCss(f: File, isTokenFile: boolean, emit: Emit) {
  for (const d of parseCss(f.text)) {
    const inFontFace = d.context.some((c) => c.startsWith("@font-face"));
    const v = d.value;
    if (!isTokenFile && !inFontFace && (COLOR_FN.test(v) || HEX.test(" " + v))) {
      emit("literal-colour", f, d.line, d.prop.startsWith("--")
        ? `colour token \`${d.prop}\` defined outside a token file (lint.tokenFiles)`
        : `literal colour in \`${d.prop}: ${v}\`; use a token`);
    }
    if ((d.prop === "transition" && /(^|,)\s*all\b/.test(v)) || (d.prop === "transition-property" && /\ball\b/.test(v))) {
      emit("transition-all", f, d.line, `\`${d.prop}: ${v}\`; name the properties`);
    }
    if (d.prop === "word-break" && /break-all/.test(v)) {
      emit("break-all", f, d.line, "`word-break: break-all` splits words; use `overflow-wrap: anywhere`");
    }
    if (inFontFace && d.prop === "src" && /url\(\s*["']?https?:/i.test(v)) {
      emit("remote-font", f, d.line, "font loaded from another origin; self-host it");
    }
    const isFamily = (d.prop === "font-family" && !inFontFace) || /^--font-[\w-]+$/.test(d.prop);
    if (isFamily && !/var\(|^(inherit|initial|unset|revert)$/.test(v) && !GENERIC_FAMILY.test(v)) {
      emit("font-fallback", f, d.line, `\`${d.prop}: ${v}\` has no generic fallback family`);
    }
  }
  const clean = stripComments(f.text);
  for (const m of clean.matchAll(/@import\s+(?:url\()?\s*["']?(https?:[^"')\s]+)/gi)) {
    if (FONT_HOSTS.test(m[1]!)) emit("remote-font", f, lineOf(clean, m.index!), `font imported from ${m[1]}; self-host it`);
  }
}

function lintSource(f: File, stack: LintOptions["stack"], emit: Emit) {
  const lines = f.text.split("\n");
  lines.forEach((text, i) => {
    const line = i + 1;
    if (/theme-color/.test(text)) return; // theme-color metas carry literal colours by design
    if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
    // Literal colours inside strings or Tailwind arbitrary values.
    // Skip values of attributes that hold links or IDs: href="#add" is an anchor, not a colour.
    const strings = [...text.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)]
      .filter((m) => !/\b(href|to|id|htmlFor|for|name|key)\s*=\s*\{?\s*$/.test(text.slice(0, m.index)))
      .map((m) => m[2]!);
    for (const s of strings) {
      if (COLOR_FN.test(s) || HEX.test(" " + s)) {
        emit("literal-colour", f, line, `literal colour in "${s.slice(0, 60)}"; use a token`);
        break;
      }
    }
    if (f.kind === "html" && FONT_HOSTS.test(text) && /<link|@import/.test(text)) {
      emit("remote-font", f, line, "font loaded from another origin; self-host it");
    }
    if (stack === "react-tailwind" && f.kind === "source") {
      for (const s of strings) {
        if (/(^|[\s:])transition-all(\s|$)/.test(s)) emit("transition-all", f, line, "`transition-all`; name the properties (transition-colors, …)");
        if (/(^|[\s:])break-all(\s|$)/.test(s)) emit("break-all", f, line, "`break-all` splits words; use `wrap-anywhere`");
      }
    }
  });
}

export function lint(opts: LintOptions): { findings: Finding[]; files: number } {
  const missing: string[] = [];
  const files = collectFiles(opts, missing);
  const tokenRes = opts.tokenFiles.map(globToRegExp);
  const findings: Finding[] = [];
  const emit: Emit = (rule, file, line, message) => {
    findings.push({
      check: rule,
      severity: "error",
      where: `${file.path}:${line}`,
      message,
      ignored: suppressed(file.text, line, rule) ? "ui-floors-ignore comment" : undefined,
    });
  };
  let motion = false, reduced = false;
  for (const f of files) {
    const isToken = tokenRes.some((r) => r.test(f.path));
    if (f.kind === "css") lintCss(f, isToken, emit);
    else lintSource(f, opts.stack, emit);
    const clean = f.kind === "css" ? stripComments(f.text) : f.text;
    if (f.kind === "css" && (/@keyframes|\banimation\s*:/.test(clean) || /\btransition(-property)?\s*:\s*(?!none)/.test(clean))) motion = true;
    if (opts.stack === "react-tailwind" && f.kind === "source" && /["'`\s](animate-[a-z][\w-]*|transition(-[a-z]+)?)(?=["'`\s])/.test(f.text)) motion = true;
    if (/prefers-reduced-motion/.test(clean) || (opts.stack === "react-tailwind" && /\bmotion-(reduce|safe):/.test(f.text))) reduced = true;
  }
  for (const m of missing) findings.push({ check: "config", severity: "error", message: `lint include not found: ${m}` });
  if (!files.length) findings.push({ check: "config", severity: "error", message: "no files to lint (lint.include in ui-floors.json)" });
  if (motion && !reduced) {
    findings.push({ check: "reduced-motion", severity: "error", message: "the app animates but nothing handles prefers-reduced-motion" });
  }
  return { findings, files: files.length };
}
