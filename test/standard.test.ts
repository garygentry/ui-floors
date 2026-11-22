// Holds STANDARD.md and the checks together: every check is in the table of its kind, every id the standard
// names exists, and every rule names its source.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHECKS, type CheckId } from "../src/checks.ts";

const STANDARD = readFileSync(join(import.meta.dir, "..", "STANDARD.md"), "utf8");
const ids = Object.keys(CHECKS);

function section(name: string): string {
  const start = STANDARD.indexOf(`## ${name}`);
  expect(start).toBeGreaterThan(-1);
  const end = STANDARD.indexOf("\n## ", start + 3);
  return STANDARD.slice(start, end === -1 ? undefined : end);
}

/** Table rows of a section, as cells, without the header and rule rows. */
const rows = (name: string) =>
  section(name).split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Check") && !l.startsWith("| ---"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

describe("standard and checks", () => {
  for (const [name, kind] of [["Floors", "floor"], ["Opinions", "opinion"]] as const) {
    test(`"${name}" lists exactly the ${kind} checks, each with a rule, a value and a source`, () => {
      const r = rows(name);
      const listed = r.map((cells) => cells[0]!.replace(/`/g, ""));
      expect(listed.sort()).toEqual(ids.filter((id) => CHECKS[id as CheckId].kind === kind).sort());
      for (const cells of r) expect([cells[0], cells.length, cells.every(Boolean)]).toEqual([cells[0], 4, true]);
    });
  }

  test("every check id the source reports is registered", () => {
    const src = ["page/checks.js", "sweep.ts", "lint.ts", "contrast.ts", "budget.ts"]
      .map((f) => readFileSync(join(import.meta.dir, "..", "src", f), "utf8"))
      .join("\n");
    const reported = new Set<string>();
    for (const m of src.matchAll(/(?:add|emit)\("([a-z-]+)"/g)) reported.add(m[1]!);
    for (const m of src.matchAll(/check: "([a-z-]+)"/g)) reported.add(m[1]!);
    reported.delete("load"); // a page that failed to load, not a rule
    reported.delete("config"); // a config error, not a rule
    expect([...reported].filter((id) => !(id in CHECKS))).toEqual([]);
    expect(ids.filter((id) => !reported.has(id))).toEqual([]);
  });
});
