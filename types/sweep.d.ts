import { type Browser, type Page as PwPage } from "playwright";
import type { Config, Page } from "./config.js";
import { type Finding, type Report } from "./report.js";
export declare const pageName: (p: Page, width: number, scheme: string) => string;
/** Wait for a page to be ready. Not networkidle: a dev server with HMR never settles. */
export declare function settle(page: PwPage, url: string, ready: string, timeout?: number): Promise<void>;
export declare function runPageChecks(page: PwPage, opts: Record<string, unknown>): Promise<Finding[]>;
/**
 * Tab through the page and flag each focused element with no visible focus indicator. Tab panels count.
 * Fast path: an outline, or a new box-shadow, on the element or its parent (:focus-within wrappers).
 * Otherwise it compares the screen around the element focused and blurred, which catches rings drawn on a
 * pseudo-element, a child, or a separate focus box (as SVG charts do). No change on screen: no ring.
 */
export declare function focusCheck(page: PwPage, maxTabs: number, ignore: Config["ignore"]): Promise<Finding[]>;
export type SweepOptions = {
    only?: string;
    schemes?: ("light" | "dark")[];
    widths?: number[];
    out?: string;
    browser?: Browser;
    screenshots?: boolean;
    /** Run the focus check in this call. Default: at the config's focus width, in the first scheme swept. */
    focus?: boolean;
};
export declare function sweep(cfg: Config, o?: SweepOptions): Promise<Report>;
