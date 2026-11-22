import { expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildTypes } from "../scripts/build-types.ts";

// Apps typecheck against the committed declarations (exports' "types"), so they must match the source.
test("the committed types/ match the source (bun run types to refresh)", () => {
  const fresh = mkdtempSync(join(tmpdir(), "ui-floors-types-"));
  try {
    buildTypes(fresh);
    const committed = join(import.meta.dir, "..", "types");
    const list = (d: string) => (readdirSync(d, { recursive: true }) as string[]).filter((f) => f.endsWith(".d.ts")).sort();
    expect(list(committed)).toEqual(list(fresh));
    for (const f of list(fresh)) expect(readFileSync(join(committed, f), "utf8")).toBe(readFileSync(join(fresh, f), "utf8"));
  } finally {
    rmSync(fresh, { recursive: true, force: true });
  }
}, 60_000);
