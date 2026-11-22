import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Rules } from "./rules.ts";

export type Page = {
  path: string;
  /** Selector that exists once the page has rendered. */
  ready: string;
  name?: string;
  /** Root the in-page checks walk. Default: `main`, else `body`. */
  root?: string;
};

export type Ignore = {
  check: string; // a check id, or "*"
  selector?: string; // matched with closest(): the element or an ancestor
  path?: string; // substring of the page path
  reason: string;
};

export type ConfirmCase = {
  name: string;
  path: string;
  width: number;
  selector: string;
  maxHeight?: number;
  scheme?: "light" | "dark";
};

export type Floors = {
  minTextPx: number;
  bodyPx: [number, number];
  targetPx: number;
  maxLineChars: number;
  phoneMaxWidth: number; // widths at or under this count as phones (target size, touch-action)
};

export type Config = {
  /** Directory the config file is in; relative paths resolve from here. */
  root: string;
  stack: "react-tailwind" | "css";
  base: string;
  pages: Page[];
  widths: Record<string, number>; // width -> viewport height
  schemes: ("light" | "dark")[];
  out: string;
  ignore: Ignore[];
  /** Each opinion's level: "error", "warn" or "off". An opinion not listed is a warning. Floors can't be listed. */
  rules: Rules;
  floors: Floors;
  focus: { width: number; maxTabs: number };
  /** How long to wait for a page's ready selector and for aria-busy to clear, in ms. */
  timeoutMs: number;
  confirm: ConfirmCase[];
  contrast: { files: string[]; pairs?: Pair[] };
  lint: { include: string[]; exclude: string[]; tokenFiles: string[] };
  /** `false` when the app keeps its own first-render budget test (an entry injected at serve time, say). */
  budget: { dist: string; entry: string; limitBytes: number } | false;
};

export type Pair = { fg: string; bg: string; min: number; target?: number };

export const DEFAULT_FLOORS: Floors = { minTextPx: 12, bodyPx: [15, 16], targetPx: 24, maxLineChars: 75, phoneMaxWidth: 480 };

export const DEFAULTS: Omit<Config, "root"> = {
  stack: "react-tailwind",
  base: "http://127.0.0.1:5173",
  pages: [],
  widths: { "390": 844, "1440": 900 },
  schemes: ["light", "dark"],
  out: "shots",
  ignore: [],
  rules: {},
  floors: DEFAULT_FLOORS,
  focus: { width: 1440, maxTabs: 80 },
  timeoutMs: 45_000,
  confirm: [],
  contrast: { files: [] },
  lint: { include: ["src"], exclude: ["node_modules", "dist", "build", ".git"], tokenFiles: [] },
  budget: { dist: "dist", entry: "index.html", limitBytes: 250_000 },
};

/** The default config file, and the old name still read when it is the only one. */
export const CONFIG_FILE = "ui-floors.json";
export const OLD_CONFIG_FILE = "ui-checks.json";

/** Load ui-floors.json (or the given path). A missing default file gives the defaults. */
export function loadConfig(path?: string, cwd = process.cwd(), warn: (msg: string) => void = console.warn): Config {
  let file = resolve(cwd, path ?? CONFIG_FILE);
  if (!path && !existsSync(file) && existsSync(resolve(cwd, OLD_CONFIG_FILE))) {
    file = resolve(cwd, OLD_CONFIG_FILE);
    warn(`reading ${OLD_CONFIG_FILE}, the old name: rename it ${CONFIG_FILE}`);
  }
  let raw: Partial<Config> = {};
  if (existsSync(file)) raw = JSON.parse(readFileSync(file, "utf8"));
  else if (path) throw new Error(`config not found: ${file}`);
  const root = existsSync(file) ? dirname(file) : cwd;
  return {
    ...DEFAULTS,
    ...raw,
    root,
    floors: { ...DEFAULT_FLOORS, ...(raw.floors ?? {}) },
    focus: { ...DEFAULTS.focus, ...(raw.focus ?? {}) },
    contrast: { ...DEFAULTS.contrast, ...(raw.contrast ?? {}) },
    lint: { ...DEFAULTS.lint, ...(raw.lint ?? {}) },
    budget: raw.budget === false ? false : { ...(DEFAULTS.budget as Exclude<Config["budget"], false>), ...(raw.budget ?? {}) },
  };
}

export const rel = (cfg: Config, p: string) => resolve(cfg.root, p);
