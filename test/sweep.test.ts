import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { serveDir, type Served } from "../src/serve.ts";
import { sweep } from "../src/sweep.ts";
import type { Finding, Report } from "../src/report.ts";
import { siteConfig, SITE } from "./helpers.ts";

// Each fixture page plants one kind of defect. Key: page name -> the checks expected on it, as
// "check@width/scheme". The clean and false-positive pages must produce nothing at all.
const BOTH = ["390/light", "1440/light", "390/dark", "1440/dark"];
const all = (check: string) => BOTH.map((s) => `${check}@${s}`);
const EXPECTED: Record<string, string[]> = {
  clean: [],
  falsepos: [],
  ignored: [],
  hscroll: ["hscroll@390/light", "overflow-right@390/light", "hscroll@390/dark", "overflow-right@390/dark"],
  "small-text": all("text-size"),
  "body-size": all("body-size"),
  clipped: all("clipped"),
  overlap: all("overlap"),
  labels: all("label-collision"),
  "line-length": ["line-length@1440/light", "line-length@1440/dark"],
  numeric: all("numeric-columns"),
  "hidden-columns": ["hidden-columns@390/light", "hidden-columns@390/dark"],
  target: ["target-size@390/light", "target-size@390/dark"],
  touch: ["touch-action@390/light", "touch-action@390/dark"],
  search: all("search-input"),
  "theme-missing": all("theme-color"),
  "theme-mismatch": ["theme-color@390/light", "theme-color@1440/light"],
  focus: ["focus-ring@1440/light"],
};

let served: Served, browser: Browser, report: Report, out: string;

beforeAll(async () => {
  served = serveDir(SITE);
  browser = await chromium.launch();
  out = mkdtempSync(join(tmpdir(), "ui-floors-sweep-"));
  report = await sweep(siteConfig(served.base), { browser, out });
}, 120_000);

afterAll(async () => {
  await browser?.close();
  served?.stop();
  rmSync(out, { recursive: true, force: true });
});

const live = (page: string) => [
  ...new Set(report.findings.filter((f) => f.page === `/${page}.html` && !f.ignored).map((f) => `${f.check}@${f.width}/${f.scheme}`)),
].sort();

describe("sweep", () => {
  test("every fixture page is in the expectations", () => {
    const pages = new Set((report.shots as { path: string }[]).map((s) => s.path.slice(1, -5)));
    expect([...pages].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [page, expected] of Object.entries(EXPECTED)) {
    test(`${page}: ${expected.length ? "catches the planted defect" : "no findings"}`, () => {
      expect(live(page)).toEqual([...expected].sort());
    });
  }

  test("no page failed to load", () => {
    expect(report.findings.filter((f) => f.check === "load")).toEqual([]);
  });

  test("ignores by attribute and by config selector are reported as ignored, with the reason", () => {
    const ign = report.findings.filter((f) => f.page === "/ignored.html" && f.ignored);
    const reasons = new Set(ign.map((f: Finding) => f.ignored));
    expect(reasons).toEqual(new Set(["data-ui-floors-ignore", "data-ui-checks-ignore (old name: use data-ui-floors-ignore)", "legacy block, fixture"]));
    expect(ign.every((f) => f.check === "text-size")).toBe(true);
  });

  test("the theme-color mismatch is a warning; the missing meta is an error", () => {
    const sev = (p: string) => new Set(report.findings.filter((f) => f.page === p).map((f) => f.severity));
    expect(sev("/theme-mismatch.html")).toEqual(new Set(["warn"]));
    expect(sev("/theme-missing.html")).toEqual(new Set(["error"]));
  });

  test("pages with two planted elements report both", () => {
    const n = (p: string, c: string) => report.findings.filter((f) => f.page === p && f.check === c && f.width === 1440 && f.scheme === "light").length;
    expect(n("/clipped.html", "clipped")).toBe(2); // horizontal and vertical
    expect(n("/focus.html", "focus-ring")).toBe(2); // a button and a tab panel
    expect(n("/small-text.html", "text-size")).toBe(3); // HTML text, SVG text, and SVG text its viewBox scales down
    expect(n("/labels.html", "label-collision")).toBe(3); // level labels, rotated ones in their own frame, and mixed angles
  });

  test("findings name the element", () => {
    const f = report.findings.find((f) => f.page === "/focus.html" && f.where?.includes("tabpanel"));
    expect(f?.where).toBe("main > div[role=tabpanel]");
  });

  test("writes a full-page screenshot per page, width and scheme, and report.json", () => {
    const shots = report.shots as { file?: string }[];
    expect(shots).toHaveLength(Object.keys(EXPECTED).length * 4);
    expect(shots.every((s) => s.file && existsSync(s.file))).toBe(true);
    const saved = JSON.parse(readFileSync(join(out, "report.json"), "utf8"));
    expect(saved.findings).toHaveLength(report.findings.length);
  });
});

describe("sweep options", () => {
  test("--only, one scheme and one width", async () => {
    const r = await sweep(siteConfig(served.base), { browser, out, only: "hscroll", schemes: ["dark"], widths: [390], screenshots: false });
    expect((r.shots as unknown[]).length).toBe(1);
    expect(r.findings.map((f) => f.check).sort()).toEqual(["hscroll", "overflow-right"]);
  });
  test("a page whose ready selector never appears is a load error, not a crash", async () => {
    const cfg = siteConfig(served.base, { pages: [{ path: "/clean.html", ready: "#never" }] });
    const settleTimeout = sweep(cfg, { browser, out, widths: [390], schemes: ["light"], screenshots: false });
    const r = await settleTimeout;
    expect(r.findings.map((f) => f.check)).toEqual(["load"]);
  }, 60_000);
  test("a page-wide ignore entry (no selector) covers that check on matching paths", async () => {
    const cfg = siteConfig(served.base, { ignore: [{ check: "hscroll", path: "/hscroll", reason: "wide by design" }] });
    const r = await sweep(cfg, { browser, out, only: "hscroll", schemes: ["light"], widths: [390], screenshots: false });
    expect(r.findings.find((f) => f.check === "hscroll")?.ignored).toBe("wide by design");
    expect(r.findings.find((f) => f.check === "overflow-right")?.ignored).toBeUndefined();
  });
});

describe("focus width", () => {
  // Found on an app that reviews at 375/768/1280: the focus check only ran at 1440, so it never ran.
  test("runs at the widest configured width when the focus width isn't one of them", async () => {
    const s = serveDir(SITE);
    try {
      const cfg = { ...siteConfig(s.base), widths: { "390": 844, "1200": 800 }, pages: [{ path: "/focus.html", ready: "main h1", name: "focus" }] };
      const dir = mkdtempSync(join(tmpdir(), "ui-floors-focus-"));
      const r = await sweep(cfg, { out: dir, screenshots: false, schemes: ["light"] });
      rmSync(dir, { recursive: true, force: true });
      expect(r.findings.filter((f) => f.check === "focus-ring").map((f) => f.width)).toEqual([1200, 1200]);
    } finally {
      s.stop();
    }
  }, 120_000);
});
