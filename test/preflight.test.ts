import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preflight } from "../scripts/release/preflight.ts";

const ROOT = join(import.meta.dir, "..");
const FILES = ["package.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", "STANDARD.md", "CHANGELOG.md"];

/** A copy of the release files, at a version, with the changelog heading given. */
function repo(version: string, heading: string): string {
  const dir = mkdtempSync(join(tmpdir(), "ui-floors-preflight-"));
  const current = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version as string;
  for (const f of FILES) {
    cpSync(join(ROOT, f), join(dir, f), { recursive: true });
    writeFileSync(join(dir, f), readFileSync(join(dir, f), "utf8").replaceAll(current, version));
  }
  writeFileSync(join(dir, "CHANGELOG.md"), `# Changelog\n\n${heading}\n\n- A change.\n\n## 0.0.9 (2026-01-01)\n\n- Older.\n`);
  return dir;
}

describe("release preflight", () => {
  test("passes when everything agrees, and returns that version's notes only", () => {
    const dir = repo("1.2.3", "## 1.2.3 (2026-11-23)");
    try {
      expect(preflight(dir, "v1.2.3")).toEqual({ version: "1.2.3", tag: "v1.2.3", isPrerelease: false, notes: "- A change." });
      expect(preflight(repo("1.3.0-rc.1", "## 1.3.0-rc.1 (2026-11-23)"), "v1.3.0-rc.1").isPrerelease).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails on a tag that doesn't match, and on an undated changelog section", () => {
    const dir = repo("1.2.3", "## 1.2.3 (unreleased)");
    try {
      expect(() => preflight(dir, "v1.2.4")).toThrow(/tag v1.2.4 doesn't match[\s\S]*no "## 1.2.3 \(YYYY-MM-DD\)" section/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails when a manifest's version drifts", () => {
    const dir = repo("1.2.3", "## 1.2.3 (2026-11-23)");
    try {
      const p = join(dir, ".claude-plugin", "plugin.json");
      writeFileSync(p, readFileSync(p, "utf8").replace('"1.2.3"', '"1.2.2"'));
      expect(() => preflight(dir, "v1.2.3")).toThrow(/plugin.json version 1.2.2 isn't 1.2.3/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
