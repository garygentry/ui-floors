// Confirm mode: an element screenshot for each fixed problem, at the width it was reported at.
// Ported from the author's earlier Python script (confirm.py). A full-page clip is in
// page coordinates, while the element's box is in viewport coordinates, so scrollY is added.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import type { Config, ConfirmCase } from "./config.ts";

export type ConfirmResult = { name: string; ok: boolean; file?: string; clip?: { x: number; y: number; width: number; height: number }; error?: string };

export async function confirm(cfg: Config, o: { names?: string[]; out?: string; browser?: Browser } = {}): Promise<ConfirmResult[]> {
  const out = o.out ?? join(cfg.root, cfg.out, "confirm");
  mkdirSync(out, { recursive: true });
  const cases: ConfirmCase[] = cfg.confirm.filter((c) => !o.names?.length || o.names.includes(c.name));
  const browser = o.browser ?? (await chromium.launch());
  const results: ConfirmResult[] = [];
  try {
    for (const c of cases) {
      const height = cfg.widths[String(c.width)] ?? (c.width > 480 ? 900 : 844);
      const ctx = await browser.newContext({ viewport: { width: c.width, height }, colorScheme: c.scheme ?? "light" });
      const page = await ctx.newPage();
      try {
        await page.goto(cfg.base + c.path, { waitUntil: "load" });
        const el = page.locator(c.selector).first();
        await el.waitFor({ state: "attached", timeout: cfg.timeoutMs });
        await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: cfg.timeoutMs });
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(700);
        const box = await el.boundingBox();
        if (!box) throw new Error(`${c.selector} has no box (hidden?)`);
        const sy = await page.evaluate(() => scrollY);
        const x = Math.max(0, box.x - 8);
        const clip = {
          x,
          y: Math.max(0, box.y + sy - 8),
          width: Math.min(box.width + 16, c.width - x),
          height: Math.min(box.height + 16, c.maxHeight ?? 700),
        };
        const file = join(out, `${c.name}.png`);
        await page.screenshot({ path: file, clip, fullPage: true });
        results.push({ name: c.name, ok: true, file, clip });
      } catch (e) {
        results.push({ name: c.name, ok: false, error: String((e as Error).message ?? e).split("\n")[0]!.slice(0, 200) });
      }
      await ctx.close();
    }
  } finally {
    if (!o.browser) await browser.close();
  }
  return results;
}
