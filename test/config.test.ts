import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.ts";

describe("config file names", () => {
  const withDir = (files: Record<string, object>, fn: (dir: string) => void) => {
    const dir = mkdtempSync(join(tmpdir(), "ui-floors-config-"));
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), JSON.stringify(body));
    try { fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
  };

  test("reads ui-floors.json by default", () => {
    withDir({ "ui-floors.json": { base: "http://new" }, "ui-checks.json": { base: "http://old" } }, (dir) => {
      const warnings: string[] = [];
      expect(loadConfig(undefined, dir, (m) => warnings.push(m)).base).toBe("http://new");
      expect(warnings).toEqual([]);
    });
  });

  test("falls back to the old ui-checks.json, with a warning", () => {
    withDir({ "ui-checks.json": { base: "http://old" } }, (dir) => {
      const warnings: string[] = [];
      expect(loadConfig(undefined, dir, (m) => warnings.push(m)).base).toBe("http://old");
      expect(warnings[0]).toContain("rename it ui-floors.json");
    });
  });
});
