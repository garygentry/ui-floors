import type { Rules } from "./rules.js";
export type Page = {
    path: string;
    /** Selector that exists once the page has rendered. */
    ready: string;
    name?: string;
    /** Root the in-page checks walk. Default: `main`, else `body`. */
    root?: string;
};
export type Ignore = {
    check: string;
    selector?: string;
    path?: string;
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
    phoneMaxWidth: number;
};
export type Config = {
    /** Directory the config file is in; relative paths resolve from here. */
    root: string;
    stack: "react-tailwind" | "css";
    base: string;
    pages: Page[];
    widths: Record<string, number>;
    schemes: ("light" | "dark")[];
    out: string;
    ignore: Ignore[];
    /** Each opinion's level: "error", "warn" or "off". An opinion not listed is a warning. Floors can't be listed. */
    rules: Rules;
    floors: Floors;
    focus: {
        width: number;
        maxTabs: number;
    };
    /** How long to wait for a page's ready selector and for aria-busy to clear, in ms. */
    timeoutMs: number;
    confirm: ConfirmCase[];
    contrast: {
        files: string[];
        pairs?: Pair[];
    };
    lint: {
        include: string[];
        exclude: string[];
        tokenFiles: string[];
    };
    /** `false` when the app keeps its own first-render budget test (an entry injected at serve time, say). */
    budget: {
        dist: string;
        entry: string;
        limitBytes: number;
    } | false;
};
export type Pair = {
    fg: string;
    bg: string;
    min: number;
    target?: number;
};
export declare const DEFAULT_FLOORS: Floors;
export declare const DEFAULTS: Omit<Config, "root">;
/** The default config file, and the old name still read when it is the only one. */
export declare const CONFIG_FILE = "ui-floors.json";
export declare const OLD_CONFIG_FILE = "ui-checks.json";
/** Load ui-floors.json (or the given path). A missing default file gives the defaults. */
export declare function loadConfig(path?: string, cwd?: string, warn?: (msg: string) => void): Config;
export declare const rel: (cfg: Config, p: string) => string;
