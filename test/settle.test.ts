import { afterAll, beforeAll, expect, test } from "bun:test";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { serveDir, type Served } from "../src/serve.ts";
import { settle } from "../src/sweep.ts";

let served: Served, browser: Browser;
beforeAll(async () => {
  served = serveDir(join(import.meta.dir, "fixtures", "hash"));
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser.close();
  served.stop();
});

// Found on a new app: the sweep reuses one tab, and going from "/" to "/#b" changes only the hash, so the page didn't
// reload and an app that reads its route at load showed the first page again.
test("settle loads the page anew when only the hash changes", async () => {
  const page = await browser.newPage();
  await settle(page, served.base + "/", "h1#a", 5_000);
  await settle(page, served.base + "/#b", "h1#b", 5_000);
  expect(await page.locator("h1").textContent()).toBe("Page b");
  await page.close();
});
