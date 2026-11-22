import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { checkBudget } from "../src/budget.ts";
import { FIXTURES } from "./helpers.ts";

const DIST = join(FIXTURES, "dist");

describe("budget", () => {
  test("counts entry scripts, modulepreloads and static imports, not lazy or nomodule chunks", () => {
    const r = checkBudget(DIST, "index.html", 250_000);
    expect(r.files.map((f) => f.file).sort()).toEqual(["assets/index.js", "assets/shared.js", "assets/vendor.js"]);
    expect(r.totalGzip).toBe(r.files.reduce((n, f) => n + f.gzip, 0));
    expect(r.findings).toEqual([]);
  });
  test("over the limit is an error", () => {
    const r = checkBudget(DIST, "index.html", 1000);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]!.message).toMatch(/over the 1,000 B budget/);
  });
  test("an entry that lists no script is an error, not a pass at 0 B", () => {
    const r = checkBudget(join(FIXTURES, "dist-injected"), "index.html", 250_000);
    expect(r.files).toEqual([]);
    expect(r.findings.map((f) => f.message)).toEqual([expect.stringMatching(/lists no script/)]);
  });
  test("a missing build is an error", () => {
    expect(checkBudget(join(FIXTURES, "nope")).findings[0]!.message).toMatch(/entry not found/);
  });
});
