import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { confirm } from "../src/confirm.ts";
import { serveDir, type Served } from "../src/serve.ts";
import { siteConfig, SITE } from "./helpers.ts";

let served: Served, browser: Browser, out: string;
beforeAll(async () => {
  served = serveDir(SITE);
  browser = await chromium.launch();
  out = mkdtempSync(join(tmpdir(), "ui-floors-confirm-"));
});
afterAll(async () => {
  await browser?.close();
  served?.stop();
  rmSync(out, { recursive: true, force: true });
});

/** Share of pure-green pixels in a PNG, decoded by the browser. */
async function greenShare(file: string): Promise<number> {
  const page = await browser.newPage();
  const b64 = readFileSync(file).toString("base64");
  const share = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext("2d")!;
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let g = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i]! < 20 && d[i + 1]! > 235 && d[i + 2]! < 20) g++;
    return g / (d.length / 4);
  }, `data:image/png;base64,${b64}`);
  await page.close();
  return share;
}

test("confirm clips the element below the fold, with the scrollY correction", async () => {
  const cfg = siteConfig(served.base, {
    confirm: [
      { name: "target-390", path: "/confirm.html", width: 390, selector: "#target" },
      { name: "target-1440", path: "/confirm.html", width: 1440, selector: "#target", scheme: "dark" },
      { name: "missing", path: "/confirm.html", width: 390, selector: "#nope" },
    ],
  });
  const results = await confirm(cfg, { browser, out, names: ["target-390", "target-1440"] });
  expect(results.map((r) => [r.name, r.ok])).toEqual([["target-390", true], ["target-1440", true]]);
  for (const r of results) {
    expect(r.clip!.y).toBeGreaterThan(2000); // page coordinates, not viewport
    expect(r.clip!.width).toBe(216); // 200 px element plus an 8 px margin each side
    // The 200 x 120 green box inside a 216 x 136 clip: about 81% green if the clip is in the right place.
    expect(await greenShare(r.file!)).toBeGreaterThan(0.75);
  }
});

test("a case whose element never appears fails without stopping the others", async () => {
  const cfg = siteConfig(served.base, {
    confirm: [
      { name: "missing", path: "/confirm.html", width: 390, selector: "#nope" },
      { name: "ok", path: "/confirm.html", width: 390, selector: "#target" },
    ],
  });
  const results = await confirm(cfg, { browser, out });
  expect(results.map((r) => [r.name, r.ok])).toEqual([["missing", false], ["ok", true]]);
}, 60_000);
