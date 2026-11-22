// Contrast test for theme token pairs, in light and dark.
// Reads CSS custom properties from the app's theme file(s). Light tokens come from :root, html, @theme
// and similar; dark tokens from .dark, [data-theme=dark] or a prefers-color-scheme: dark block.
// Dark inherits any token it doesn't redefine.

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { parseCss } from "./css.ts";
import { contrast, parseColor } from "./color.ts";
import type { Pair } from "./config.ts";
import type { Finding } from "./report.ts";

export const DEFAULT_PAIRS: Pair[] = [
  { fg: "foreground", bg: "background", min: 4.5, target: 7 },
  { fg: "foreground", bg: "card", min: 4.5, target: 7 },
  { fg: "card-foreground", bg: "card", min: 4.5, target: 7 },
  { fg: "popover-foreground", bg: "popover", min: 4.5 },
  { fg: "muted-foreground", bg: "background", min: 4.5, target: 7 },
  { fg: "muted-foreground", bg: "card", min: 4.5, target: 7 },
  { fg: "muted-foreground", bg: "muted", min: 4.5, target: 7 },
  { fg: "primary", bg: "background", min: 4.5 },
  { fg: "primary-foreground", bg: "primary", min: 4.5 },
  { fg: "secondary-foreground", bg: "secondary", min: 4.5 },
  { fg: "accent-foreground", bg: "accent", min: 4.5 },
];

type Theme = Map<string, { value: string; where: string }>;

// Only plain theme selectors count. A compound one such as `.dark[data-theme-preset="slate"]` is a variant
// of the theme, and must not overwrite the base tokens.
const DARK_SEL = /^(:root|html)?(\.dark|\[data-(theme|mode)=["']?dark["']?\])$/;
const LIGHT_SEL = /^(:root|html)(:not\(\.dark\))?$|^(:root|html)?(\.light|\[data-(theme|mode)=["']?light["']?\])$/;
const selectors = (prelude: string) => prelude.split(",").map((s) => s.trim());
const DARK_MEDIA = /prefers-color-scheme\s*:\s*dark/;

const isDark = (ctx: string[]) => {
  const last = ctx[ctx.length - 1] ?? "";
  if (ctx.slice(0, -1).some((c) => DARK_MEDIA.test(c))) return selectors(last).some((s) => /^(:root|html)$/.test(s));
  return selectors(last).some((s) => DARK_SEL.test(s));
};

const isLight = (ctx: string[]) => {
  const last = ctx[ctx.length - 1] ?? "";
  if (ctx.slice(0, -1).some((c) => DARK_MEDIA.test(c))) return false;
  if (/^@theme\b/.test(last)) return true;
  return selectors(last).some((s) => LIGHT_SEL.test(s));
};

export function readThemes(files: { path: string; text: string }[]): { light: Theme; dark: Theme; hasDark: boolean } {
  const light: Theme = new Map();
  const darkOnly: Theme = new Map();
  for (const f of files) {
    for (const d of parseCss(f.text)) {
      if (!d.prop.startsWith("--")) continue;
      const name = d.prop.slice(2);
      const entry = { value: d.value, where: `${f.path}:${d.line}` };
      if (isDark(d.context)) darkOnly.set(name, entry);
      else if (isLight(d.context)) light.set(name, entry);
    }
  }
  const dark: Theme = new Map([...light, ...darkOnly]);
  return { light, dark, hasDark: darkOnly.size > 0 };
}

/** Resolve var() chains in a theme. Returns null if the value still isn't a plain colour. */
export function resolveToken(theme: Theme, name: string, depth = 0): string | null {
  const e = theme.get(name);
  if (!e || depth > 10) return null;
  let v = e.value.trim();
  const m = v.match(/^var\(\s*--([\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (m) return resolveToken(theme, m[1]!, depth + 1) ?? (m[2] ? m[2].trim() : null);
  return v;
}

/** Tailwind v4 apps often define --color-foreground in @theme; accept either name. */
function lookup(theme: Theme, name: string): string | null {
  const n = name.replace(/^--/, "");
  return resolveToken(theme, n) ?? resolveToken(theme, `color-${n}`);
}

export function checkContrast(files: string[], pairs?: Pair[], cwd = process.cwd()): Finding[] & { checked?: number } {
  const loaded = files.map((p) => ({ path: relative(cwd, p) || p, text: readFileSync(p, "utf8") }));
  return checkContrastText(loaded, pairs);
}

/** Findings, with `checked` set to the number of token pairs measured. */
export function checkContrastText(files: { path: string; text: string }[], pairs?: Pair[]): Finding[] & { checked?: number } {
  const findings: Finding[] & { checked?: number } = [];
  findings.checked = 0;
  if (!files.length) {
    findings.push({ check: "contrast", severity: "error", message: "no theme files given (contrast.files in ui-floors.json)" });
    return findings;
  }
  const { light, dark, hasDark } = readThemes(files);
  if (!hasDark) {
    findings.push({ check: "dark-theme", severity: "error", message: "no dark theme tokens found (.dark, [data-theme=dark] or prefers-color-scheme: dark)" });
  }
  const explicit = !!pairs;
  for (const [scheme, theme] of [["light", light], ["dark", dark]] as const) {
    if (scheme === "dark" && !hasDark) continue;
    for (const p of pairs ?? DEFAULT_PAIRS) {
      const fv = lookup(theme, p.fg), bv = lookup(theme, p.bg);
      if (!fv || !bv) {
        if (explicit) findings.push({ check: "contrast", severity: "error", scheme, message: `token missing: ${!fv ? p.fg : p.bg}` });
        continue;
      }
      const fc = parseColor(fv), bc = parseColor(bv);
      if (!fc || !bc) {
        findings.push({ check: "contrast", severity: "error", scheme, message: `can't parse ${!fc ? `${p.fg}: ${fv}` : `${p.bg}: ${bv}`}` });
        continue;
      }
      const ratio = contrast(fc, bc);
      findings.checked!++;
      const label = `${p.fg} on ${p.bg} is ${ratio.toFixed(2)}:1`;
      const where = theme.get(p.fg.replace(/^--/, ""))?.where ?? theme.get(`color-${p.fg}`)?.where;
      if (ratio < p.min) findings.push({ check: "contrast", severity: "error", scheme, where, message: `${label}, under the ${p.min}:1 floor` });
      else if (p.target && ratio < p.target) findings.push({ check: "contrast", severity: "warn", scheme, where, message: `${label}, under the ${p.target}:1 target` });
    }
  }
  if (findings.checked === 0 && !findings.length) findings.push({ check: "contrast", severity: "error", message: "no token pairs could be measured; set contrast.pairs" });
  return findings;
}
