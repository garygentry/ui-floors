// Budget check: gzip size of the JavaScript a first render loads.
// Counts the entry HTML's scripts and modulepreloads, and follows static imports between chunks.
// Dynamic import() chunks are lazy, so they are not counted. Gzip at zlib's default level (6), the level most
// apps' own size tests use, so the figures agree.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { gzipSync } from "node:zlib";
import type { Finding } from "./report.ts";

export type BudgetResult = { totalGzip: number; limit: number; files: { file: string; raw: number; gzip: number }[]; findings: Finding[] };

function resolveRef(dist: string, from: string, ref: string): string | null {
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) return null;
  const clean = ref.split(/[?#]/)[0]!;
  return normalize(clean.startsWith("/") ? join(dist, clean) : join(dirname(from), clean));
}

export function checkBudget(dist: string, entry = "index.html", limitBytes = 250_000): BudgetResult {
  const findings: Finding[] = [];
  const entryPath = join(dist, entry);
  if (!existsSync(entryPath)) {
    return { totalGzip: 0, limit: limitBytes, files: [], findings: [{ check: "budget", severity: "error", message: `entry not found: ${entryPath} (build first)` }] };
  }
  const html = readFileSync(entryPath, "utf8");
  const queue: string[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = m[1]!;
    if (/\bnomodule\b/i.test(attrs)) continue;
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) { const p = resolveRef(dist, entryPath, src); if (p) queue.push(p); }
  }
  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = m[1]!;
    if (!/\brel\s*=\s*["']?modulepreload/i.test(attrs)) continue;
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) { const p = resolveRef(dist, entryPath, href); if (p) queue.push(p); }
  }
  const seen = new Set<string>();
  const files: BudgetResult["files"] = [];
  while (queue.length) {
    const p = queue.shift()!;
    if (seen.has(p)) continue;
    seen.add(p);
    if (!existsSync(p)) {
      findings.push({ check: "budget", severity: "error", message: `referenced script missing: ${relative(dist, p)}` });
      continue;
    }
    const buf = readFileSync(p);
    files.push({ file: relative(dist, p), raw: buf.length, gzip: gzipSync(buf).length });
    const text = buf.toString("utf8");
    // Static imports only: `import "./x.js"`, `import {a} from "./x.js"`, `export * from "./x.js"`.
    for (const m of text.matchAll(/(?:\bimport|\bfrom)\s*["']([^"']+\.m?js)["']/g)) {
      const q = resolveRef(dist, p, m[1]!);
      if (q) queue.push(q);
    }
  }
  const totalGzip = files.reduce((n, f) => n + f.gzip, 0);
  // An entry that lists no script would pass at 0 B. It usually means the server injects the entry script when it
  // serves the page (a nonce-based CSP does this), so the built HTML isn't what the browser gets.
  if (files.length === 0 && findings.length === 0) {
    findings.push({ check: "budget", severity: "error", message: `${entry} lists no script, so nothing was measured. If the server injects the entry script, keep the app's own budget test and set "budget": false in ui-floors.json` });
  }
  if (totalGzip > limitBytes) {
    findings.push({ check: "budget", severity: "error", message: `first-render JS is ${totalGzip.toLocaleString("en-US")} B gzip, over the ${limitBytes.toLocaleString("en-US")} B budget` });
  }
  return { totalGzip, limit: limitBytes, files, findings };
}
