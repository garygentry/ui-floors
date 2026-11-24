// Holds the plugin to the package: one version everywhere, and every path the skill names exists.
import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const json = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

test("the plugin and its marketplace entry carry the package's version", () => {
  const version = json("package.json").version;
  expect(json(".claude-plugin/plugin.json").version).toBe(version);
  expect(json(".claude-plugin/marketplace.json").plugins.map((p: { version: string }) => p.version)).toEqual([version]);
});

test("the standard's version is the package's", () => {
  expect(readFileSync(join(ROOT, "STANDARD.md"), "utf8")).toContain(`Version ${json("package.json").version}`);
});

// Files the skill tells the agent to read in the app's repo, not this one.
const APP_FILES = new Set([".github/copilot-instructions.md"]);

test("every path the skill and its procedures name exists", () => {
  const skill = join(ROOT, "skills", "ui");
  const docs = ["SKILL.md", ...readdirSync(join(skill, "procedures")).map((f) => `procedures/${f}`)];
  for (const doc of docs) {
    const text = readFileSync(join(skill, doc), "utf8");
    for (const m of text.matchAll(/`((?:skills\/ui\/|procedures\/)?[\w./-]+\.md)`/g)) {
      const p = m[1]!;
      if (APP_FILES.has(p)) continue;
      const candidates = [join(ROOT, p), join(skill, p), join(skill, "procedures", p)];
      expect([doc, p, candidates.some((c) => existsSync(c))]).toEqual([doc, p, true]);
    }
  }
});

// Copilot and Claude Code both load the skill; Copilot (VS Code) wants the name to match the folder.
test("the skill's frontmatter suits Claude Code and Copilot", () => {
  const text = readFileSync(join(ROOT, "skills", "ui", "SKILL.md"), "utf8");
  const front = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
  const field = (k: string) => front.match(new RegExp(`^${k}: (.*)$`, "m"))?.[1]?.trim() ?? "";
  expect(field("name")).toBe("ui"); // the folder's name: skills/ui
  expect(field("name").length).toBeLessThanOrEqual(64);
  expect(field("description").length).toBeGreaterThan(0);
  expect(field("description").length).toBeLessThanOrEqual(1024);
});
