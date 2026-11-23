import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lint, globToRegExp } from "../src/lint.ts";
import { FIXTURES } from "./helpers.ts";

const run = (dir: string, stack: "react-tailwind" | "css" = "react-tailwind") =>
  lint({ root: join(FIXTURES, "lint", dir), include: ["src", "index.html"], exclude: ["node_modules"], tokenFiles: ["src/theme.css"], stack });

const live = (fs: ReturnType<typeof run>["findings"]) => fs.filter((f) => !f.ignored).map((f) => `${f.check} ${f.where ?? ""}`.trim()).sort();

describe("lint", () => {
  test("a file outside the config's folder is named by its absolute path", () => {
    const outside = mkdtempSync(join(tmpdir(), "ui-floors-outside-"));
    try {
      const src = join(FIXTURES, "lint", "defects", "src");
      const r = lint({ root: outside, include: [src], exclude: [], tokenFiles: [], stack: "react-tailwind" });
      expect(r.findings.length).toBeGreaterThan(0);
      expect(r.findings.filter((f) => f.where).every((f) => f.where!.startsWith(src))).toBe(true);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
  test("the clean fixture has no findings", () => {
    const r = run("clean");
    expect(r.files).toBe(4);
    expect(r.findings).toEqual([]);
  });
  test("catches every planted defect, with file and line", () => {
    expect(live(run("defects").findings)).toEqual([
      "break-all src/App.tsx:4",
      "break-all src/App.tsx:6",
      "break-all src/app.css:4",
      "font-fallback src/app.css:10",
      "font-fallback src/app.css:5",
      "literal-colour src/App.tsx:3",
      "literal-colour src/App.tsx:5",
      "literal-colour src/app.css:1",
      "literal-colour src/app.css:2",
      "reduced-motion",
      "remote-font index.html:3",
      "remote-font index.html:5",
      "remote-font src/app.css:6",
      "remote-font src/app.css:7",
      "transition-all src/App.tsx:3",
      "transition-all src/App.tsx:6",
      "transition-all src/app.css:3",
    ]);
  });
  test("font-fallback says when the generic family is quoted", () => {
    const msgs = run("defects").findings.filter((f) => f.check === "font-fallback").map((f) => f.message);
    expect(msgs[0]).toContain("has no generic fallback family");
    expect(msgs[1]).toContain("the quoted 'monospace' names a font, not the generic family");
  });
  test("an ignore comment suppresses one line, and the finding is kept as ignored", () => {
    const ign = run("defects").findings.filter((f) => f.ignored);
    expect(ign.map((f) => f.where)).toEqual(["src/app.css:9"]);
  });
  test("stack 'css' drops the Tailwind class rules and keeps the CSS ones", () => {
    const checks = live(run("defects", "css").findings);
    expect(checks).not.toContain("transition-all src/App.tsx:3");
    expect(checks).not.toContain("break-all src/App.tsx:4");
    expect(checks).toContain("transition-all src/app.css:3");
  });
  test("a missing include, or nothing to lint, is a config error", () => {
    const r = lint({ root: join(FIXTURES, "lint", "clean"), include: ["src", "nope"], exclude: [], tokenFiles: [], stack: "css" });
    expect(r.findings.filter((f) => f.check === "config").map((f) => f.message)).toEqual(["lint include not found: nope"]);
    const empty = lint({ root: join(FIXTURES, "lint", "clean"), include: ["nope"], exclude: [], tokenFiles: [], stack: "css" });
    expect(empty.findings.map((f) => f.message)).toContain("no files to lint (lint.include in ui-floors.json)");
  });
  test("node_modules and .git are skipped even when the config's exclude list leaves them out", () => {
    const root = mkdtempSync(join(tmpdir(), "ui-floors-lint-"));
    for (const d of ["node_modules/pkg", ".git", "src"]) mkdirSync(join(root, d), { recursive: true });
    writeFileSync(join(root, "node_modules/pkg/a.css"), ".x { word-break: break-all; color: #fff; }\n");
    writeFileSync(join(root, ".git/b.css"), ".x { word-break: break-all; }\n");
    writeFileSync(join(root, "src/c.css"), ".x { overflow-wrap: anywhere; }\n");
    const r = lint({ root, include: ["."], exclude: [], tokenFiles: [], stack: "css" });
    rmSync(root, { recursive: true, force: true });
    expect(r.files).toBe(1);
    expect(r.findings).toEqual([]);
  });
  test("absolute include paths work", () => {
    const r = lint({ root: "/", include: [join(FIXTURES, "lint", "clean", "src")], exclude: [], tokenFiles: ["**/theme.css"], stack: "react-tailwind" });
    expect(r.files).toBe(3);
    expect(r.findings).toEqual([]);
  });
  test("glob matching for token files", () => {
    expect(globToRegExp("src/**/theme*.css").test("src/styles/theme.dark.css")).toBe(true);
    expect(globToRegExp("src/*.css").test("src/a/b.css")).toBe(false);
  });
});
