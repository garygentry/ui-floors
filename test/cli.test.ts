import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIXTURES, SITE } from "./helpers.ts";

const CLI = join(import.meta.dir, "..", "src", "cli.ts");
const CONFIG = join(FIXTURES, "ui-floors.json");

function run(...args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
}

describe("cli", () => {
  test("no command prints usage and exits 2; unknown command exits 2", () => {
    expect(run().code).toBe(2);
    expect(run("frobnicate", "--config", CONFIG).code).toBe(2);
  });
  test("a missing config file exits 2", () => {
    expect(run("lint", "--config", "nope.json").code).toBe(2);
  });
  test("static (contrast, lint, budget) is clean on the clean fixtures", () => {
    const r = run("static", "--config", CONFIG);
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    expect(r.out).toContain("static: 0 error(s)");
    expect(r.out).toMatch(/first-render JS [\d,]+ of 250,000 B gzip, 3 file\(s\)/);
  });
  test('"budget": false turns the budget check off, and says so', () => {
    const dir = mkdtempSync(join(tmpdir(), "ui-floors-cli-"));
    const cfg = join(dir, "ui-floors.json");
    writeFileSync(cfg, JSON.stringify({ budget: false }));
    const r = run("budget", "--config", cfg);
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(0);
    expect(r.out).toContain("budget: off in ui-floors.json");
  });
  test("an error finding exits 1, and --json prints the report", () => {
    const dir = mkdtempSync(join(tmpdir(), "ui-floors-cli-"));
    const cfg = join(dir, "ui-floors.json");
    writeFileSync(cfg, JSON.stringify({ contrast: { files: [join(FIXTURES, "tokens", "low-dark.css")] } }));
    const r = run("contrast", "--config", cfg, "--json");
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(1);
    const report = JSON.parse(r.out);
    expect(report.command).toBe("contrast");
    expect(report.findings[0].scheme).toBe("dark");
  });
  test("sweep --serve on the fixture: clean page exits 0, a defect exits 1", () => {
    const out = mkdtempSync(join(tmpdir(), "ui-floors-cli-"));
    const clean = run("sweep", "--config", CONFIG, "--serve", SITE, "--only", "clean", "--out", out);
    expect(clean.code).toBe(0);
    expect(existsSync(join(out, "report.json"))).toBe(true);
    expect(existsSync(join(out, "clean_390_dark.png"))).toBe(true);
    const bad = run("sweep", "--config", CONFIG, "--serve", SITE, "--only", "hscroll", "--width", "390", "--scheme", "light", "--out", out);
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("hscroll");
    rmSync(out, { recursive: true, force: true });
  }, 60_000);
  test("confirm --serve writes the element screenshot", () => {
    const out = mkdtempSync(join(tmpdir(), "ui-floors-cli-"));
    const r = run("confirm", "--config", CONFIG, "--serve", SITE, "--out", out, "target-390");
    expect(r.code).toBe(0);
    expect(existsSync(join(out, "confirm", "target-390.png"))).toBe(true);
    rmSync(out, { recursive: true, force: true });
  }, 60_000);
});
