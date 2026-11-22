// Screenshot sweep: every page in the manifest, at each width and colour scheme, full page,
// with the in-page layout checks and a keyboard focus-ring check. Writes report.json and PNGs.
// Ported from the author's earlier Python screenshot script (shoot_all.py).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page as PwPage } from "playwright";
import type { Config, Page } from "./config.ts";
import { makeReport, type Finding, type Report } from "./report.ts";
import { applyRules } from "./rules.ts";

const CHECKS_SRC = readFileSync(new URL("./page/checks.js", import.meta.url), "utf8")
  .replace(/^(\s*\/\/.*\n)+/, "")
  .trim();

export const pageName = (p: Page, width: number, scheme: string) =>
  `${p.name ?? (p.path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root")}_${width}_${scheme}`;

/** Wait for a page to be ready. Not networkidle: a dev server with HMR never settles. */
export async function settle(page: PwPage, url: string, ready: string, timeout = 45_000): Promise<void> {
  // A URL that differs from the current one only by its hash doesn't reload the page, and an app that reads its route
  // at load would show the last page again: start from a blank page so it loads anew.
  const noHash = (u: string) => u.replace(/#.*$/, "");
  if (page.url() !== "about:blank" && noHash(page.url()) === noHash(url)) await page.goto("about:blank");
  await page.goto(url, { waitUntil: "load" });
  await page.locator(ready).first().waitFor({ state: "attached", timeout });
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout });
  await page.waitForTimeout(300);
}

export async function runPageChecks(page: PwPage, opts: Record<string, unknown>): Promise<Finding[]> {
  const res = (await page.evaluate(`(${CHECKS_SRC})(${JSON.stringify(opts)})`)) as { findings: Finding[] };
  return res.findings;
}

/**
 * Tab through the page and flag each focused element with no visible focus indicator. Tab panels count.
 * Fast path: an outline, or a new box-shadow, on the element or its parent (:focus-within wrappers).
 * Otherwise it compares the screen around the element focused and blurred, which catches rings drawn on a
 * pseudo-element, a child, or a separate focus box (as SVG charts do). No change on screen: no ring.
 */
export async function focusCheck(page: PwPage, maxTabs: number, ignore: Config["ignore"]): Promise<Finding[]> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const snap = new WeakMap<Element, string>();
    for (const el of document.querySelectorAll("*")) snap.set(el, getComputedStyle(el).boxShadow);
    (window as any).__uiFocusSnap = snap;
  });
  const findings: Finding[] = [];
  let first: string | null = null;
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate((ignore) => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) return null;
      const snap: WeakMap<Element, string> = (window as any).__uiFocusSnap;
      const ringOn = (e: Element | null) => {
        if (!e) return false;
        const cs = getComputedStyle(e);
        const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 1 && !/rgba\([^)]*,\s*0\)|transparent/.test(cs.outlineColor);
        const shadow = cs.boxShadow !== "none" && cs.boxShadow !== snap?.get(e);
        return outline || shadow;
      };
      const part = (e: Element) => {
        const s = e.tagName.toLowerCase();
        if (e.id) return `${s}#${e.id}`;
        const role = e.getAttribute("role");
        const cls = (typeof (e as HTMLElement).className === "string" ? (e as HTMLElement).className : "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
        return s + (role ? `[role=${role}]` : "") + (cls.length ? "." + cls.join(".") : "");
      };
      const chain: string[] = [];
      for (let a: Element | null = el; a && a !== document.body && chain.length < 3; a = a.parentElement) chain.unshift(part(a));
      const key = chain.join(" > ") + "|" + [...(el.parentElement?.children ?? [])].indexOf(el);
      let ignored: string | undefined;
      const marked = el.closest("[data-ui-floors-ignore],[data-ui-checks-ignore]");
      if (marked) {
        const attr = marked.hasAttribute("data-ui-floors-ignore") ? "data-ui-floors-ignore" : "data-ui-checks-ignore";
        const v = marked.getAttribute(attr)!.trim();
        if (!v || v === "*" || v.split(/\s+/).includes("focus-ring")) ignored = attr === "data-ui-floors-ignore" ? attr : `${attr} (old name: use data-ui-floors-ignore)`;
      }
      for (const ig of ignore) if (!ignored && (ig.check === "focus-ring" || ig.check === "*") && ig.selector && el.closest(ig.selector)) ignored = ig.reason;
      (window as any).__uiFocusEl = el;
      // The area to compare takes in the positioned ancestor too: a stretched link draws its ring there.
      let b = el.getBoundingClientRect();
      const op = el.offsetParent;
      if (op && op !== document.body && op !== document.documentElement) {
        const o = op.getBoundingClientRect();
        const left = Math.min(b.left, o.left), top = Math.min(b.top, o.top);
        b = new DOMRect(left, top, Math.max(b.right, o.right) - left, Math.max(b.bottom, o.bottom) - top);
      }
      return { key, where: chain.join(" > "), ring: ringOn(el) || ringOn(el.parentElement), ignored, box: { x: b.x, y: b.y, width: b.width, height: b.height } };
    }, ignore.filter((i) => i.selector));
    if (!r) { if (first) break; else continue; }
    if (r.key === first) break;
    first ??= r.key;
    if (!r.ring && !r.ignored) r.ring = await changesOnScreen(page, r.box);
    if (!r.ring) findings.push({ check: "focus-ring", severity: "error", where: r.where, message: "focused with no visible focus ring", ignored: r.ignored });
  }
  return findings;
}

/** Whether the area around the focused element looks different once it is blurred. Refocuses it after. */
async function changesOnScreen(page: PwPage, box: { x: number; y: number; width: number; height: number }): Promise<boolean> {
  const vp = page.viewportSize();
  if (!vp) return false;
  const pad = 8;
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const clip = { x, y, width: Math.min(vp.width, box.x + box.width + pad) - x, height: Math.min(vp.height, box.y + box.height + pad) - y };
  if (clip.width < 1 || clip.height < 1) return false;
  const shot = () => page.screenshot({ clip, animations: "disabled", caret: "hide" });
  const focused = await shot();
  await page.evaluate(() => (window as any).__uiFocusEl?.blur());
  const blurred = await shot();
  // Programmatic focus keeps :focus-visible after keyboard use, so tabbing carries on from here.
  await page.evaluate(() => (window as any).__uiFocusEl?.focus({ preventScroll: true }));
  return !focused.equals(blurred);
}

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

export async function sweep(cfg: Config, o: SweepOptions = {}): Promise<Report> {
  const out = o.out ?? join(cfg.root, cfg.out);
  mkdirSync(out, { recursive: true });
  const browser = o.browser ?? (await chromium.launch());
  const findings: Finding[] = [];
  const shots: { name: string; path: string; width: number; scheme: string; file?: string; error?: string }[] = [];
  const widths = o.widths ?? Object.keys(cfg.widths).map(Number);
  const schemes = o.schemes ?? cfg.schemes;
  // The focus check runs at the configured focus width, or, when the app's widths don't include it, at the widest
  // of them: an app that reviews at 375/768/1280 would otherwise get no focus check at all.
  const configured = Object.keys(cfg.widths).map(Number);
  const focusWidth = configured.includes(cfg.focus.width) ? cfg.focus.width : Math.max(...configured);
  try {
    for (const scheme of schemes) {
      for (const width of widths) {
        const height = cfg.widths[String(width)] ?? (width > 480 ? 900 : 844);
        const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme });
        const page = await ctx.newPage();
        for (const p of cfg.pages) {
          if (o.only && !p.path.includes(o.only)) continue;
          const name = pageName(p, width, scheme);
          const at = { page: p.path, width, scheme };
          const pathIgnores = cfg.ignore.filter((i) => !i.path || p.path.includes(i.path));
          try {
            await settle(page, cfg.base + p.path, p.ready, cfg.timeoutMs);
            const fs = await runPageChecks(page, {
              root: p.root,
              floors: cfg.floors,
              phone: width <= cfg.floors.phoneMaxWidth,
              scheme,
              ignore: pathIgnores.filter((i) => i.selector),
            });
            let file: string | undefined;
            if (o.screenshots !== false) {
              file = join(out, `${name}.png`);
              await page.screenshot({ path: file, fullPage: true, timeout: 60_000 });
            }
            if (width === focusWidth && (o.focus ?? scheme === schemes[0])) fs.push(...(await focusCheck(page, cfg.focus.maxTabs, pathIgnores)));
            for (const f of fs) {
              // Page-wide ignores (no selector) apply to the whole page.
              const pageIgnore = pathIgnores.find((i) => !i.selector && (i.check === f.check || i.check === "*"));
              findings.push({ ...f, ...at, ignored: f.ignored ?? pageIgnore?.reason });
            }
            shots.push({ name, path: p.path, width, scheme, file });
          } catch (e) {
            const msg = String((e as Error).message ?? e).split("\n")[0]!.slice(0, 200);
            findings.push({ check: "load", severity: "error", message: msg, ...at });
            shots.push({ name, path: p.path, width, scheme, error: msg });
          }
        }
        await ctx.close();
      }
    }
  } finally {
    if (!o.browser) await browser.close();
  }
  const report = makeReport("sweep", applyRules(findings, cfg.rules), { base: cfg.base, shots });
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 1));
  return report;
}
