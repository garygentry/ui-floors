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

test("every path the skill and its procedures name exists", () => {
  const skill = join(ROOT, "skills", "ui");
  const docs = ["SKILL.md", ...readdirSync(join(skill, "procedures")).map((f) => `procedures/${f}`)];
  for (const doc of docs) {
    const text = readFileSync(join(skill, doc), "utf8");
    for (const m of text.matchAll(/`((?:skills\/ui\/|procedures\/)?[\w./-]+\.md)`/g)) {
      const p = m[1]!;
      const candidates = [join(ROOT, p), join(skill, p), join(skill, "procedures", p)];
      expect([doc, p, candidates.some((c) => existsSync(c))]).toEqual([doc, p, true]);
    }
  }
});
