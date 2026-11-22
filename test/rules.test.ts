import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CHECKS, FLOORS, OPINIONS } from "../src/checks.ts";
import { applyRules, checkFloors, checkRules } from "../src/rules.ts";
import { DEFAULT_FLOORS } from "../src/config.ts";
import type { Finding } from "../src/report.ts";
import { FIXTURES } from "./helpers.ts";

const f = (check: string, severity: Finding["severity"] = "error"): Finding => ({ check, severity, message: "x" });

describe("rules", () => {
  test("every check is a floor or an opinion", () => {
    expect([...FLOORS, ...OPINIONS].map(String).sort()).toEqual(Object.keys(CHECKS).sort());
  });

  test("floors pass through unchanged, whatever the rules say", () => {
    expect(applyRules([f("text-size"), f("contrast", "warn")], {})).toEqual([f("text-size"), f("contrast", "warn")]);
  });

  test("an opinion not listed is a warning", () => {
    expect(applyRules([f("body-size")], {})).toEqual([f("body-size", "warn")]);
  });

  test("error keeps the check's own severity; off drops the finding", () => {
    expect(applyRules([f("body-size"), f("theme-color", "warn"), f("budget")], { "body-size": "error", "theme-color": "error", budget: "off" }))
      .toEqual([f("body-size"), f("theme-color", "warn")]);
  });

  test("config and load findings aren't rules and pass through", () => {
    expect(applyRules([f("config"), f("load")], {})).toEqual([f("config"), f("load")]);
  });

  test("a floor, an unknown id or a bad level in rules is a config error", () => {
    const msgs = checkRules({ "text-size": "off", "no-such": "warn", "body-size": "loud", budget: "off" }).map((x) => x.message);
    expect(msgs).toEqual([
      expect.stringContaining(`"text-size" is a floor`),
      expect.stringContaining(`unknown check "no-such"`),
      expect.stringContaining(`"body-size" must be`),
    ]);
  });

  test("floor values may be raised, never lowered", () => {
    expect(checkFloors({ ...DEFAULT_FLOORS, minTextPx: 14, targetPx: 44, bodyPx: [13, 14] })).toEqual([]);
    expect(checkFloors({ ...DEFAULT_FLOORS, minTextPx: 11 }).map((x) => x.message)).toEqual([expect.stringContaining("floors.minTextPx is 11")]);
  });

  test("the CLI fails on a floor in rules, and warns on an opinion by default", () => {
    const dir = mkdtempSync(join(tmpdir(), "ui-floors-rules-"));
    const cfg = join(dir, "ui-floors.json");
    const run = (body: object) => {
      writeFileSync(cfg, JSON.stringify(body));
      const p = Bun.spawnSync(["bun", join(import.meta.dir, "..", "src", "cli.ts"), "contrast", "--config", cfg], { stdout: "pipe", stderr: "pipe" });
      return { code: p.exitCode, out: p.stdout.toString() };
    };
    try {
      const noDark = { contrast: { files: [join(FIXTURES, "tokens", "no-dark.css")] } };
      const base = run(noDark);
      expect(base.code).toBe(0);
      expect(base.out).toMatch(/warn\s+dark-theme/);
      expect(run({ ...noDark, rules: { "dark-theme": "error" } }).code).toBe(1);
      expect(run({ ...noDark, rules: { "dark-theme": "off" } }).out).not.toContain("dark-theme");
      const floor = run({ ...noDark, rules: { contrast: "off" } });
      expect(floor.code).toBe(1);
      expect(floor.out).toContain(`"contrast" is a floor`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
