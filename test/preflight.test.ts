import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preflight } from "../scripts/release/preflight.ts";

const EXPECT = { name: "@garygentry/ui-floors", repositoryUrl: "git+https://github.com/garygentry/ui-floors.git" };

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
      expect(preflight(dir, "v1.2.3", EXPECT)).toEqual({ version: "1.2.3", tag: "v1.2.3", isPrerelease: false, notes: "- A change." });
      expect(preflight(repo("1.3.0-rc.1", "## 1.3.0-rc.1 (2026-11-23)"), "v1.3.0-rc.1", EXPECT).isPrerelease).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails on a tag that doesn't match, and on an undated changelog section", () => {
    const dir = repo("1.2.3", "## 1.2.3 (unreleased)");
    try {
      expect(() => preflight(dir, "v1.2.4", EXPECT)).toThrow(/tag v1.2.4 doesn't match[\s\S]*no "## 1.2.3 \(YYYY-MM-DD\)" section/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails when a manifest's version drifts", () => {
    const dir = repo("1.2.3", "## 1.2.3 (2026-11-23)");
    try {
      const p = join(dir, ".claude-plugin", "plugin.json");
      writeFileSync(p, readFileSync(p, "utf8").replace('"1.2.3"', '"1.2.2"'));
      expect(() => preflight(dir, "v1.2.3", EXPECT)).toThrow(/plugin.json version 1.2.2 isn't 1.2.3/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails when the package name isn't the trusted publisher's", () => {
    const dir = repo("1.2.3", "## 1.2.3 (2026-11-23)");
    try {
      const p = join(dir, "package.json");
      writeFileSync(p, JSON.stringify({ ...JSON.parse(readFileSync(p, "utf8")), name: "ui-floors" }));
      expect(() => preflight(dir, "v1.2.3", EXPECT)).toThrow(/package.json name "ui-floors" isn't "@garygentry\/ui-floors"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails when repository.url differs at all, case included", () => {
    const dir = repo("1.2.3", "## 1.2.3 (2026-11-23)");
    try {
      const p = join(dir, "package.json");
      const pkg = JSON.parse(readFileSync(p, "utf8"));
      writeFileSync(p, JSON.stringify({ ...pkg, repository: { type: "git", url: "git+https://github.com/GaryGentry/ui-floors.git" } }));
      expect(() => preflight(dir, "v1.2.3", EXPECT)).toThrow(/repository.url .* isn't exactly/);
      expect(() => preflight(dir, "v1.2.3", { name: "", repositoryUrl: "" })).toThrow(/must be given/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the real package.json matches the trusted publisher", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect([pkg.name, pkg.repository.url]).toEqual([EXPECT.name, EXPECT.repositoryUrl]);
  });
});
