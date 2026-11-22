#!/usr/bin/env bun
// Writes the package's type declarations to types/ (or the folder given), for apps that typecheck what they import.
// Apps run the TypeScript source with Bun, but their own compiler settings (exactOptionalPropertyTypes, no
// allowImportingTsExtensions) would reject it; declarations are all they need, and skipLibCheck covers them.
// Relative imports are rewritten from ./x.ts to ./x.js, which TypeScript resolves to ./x.d.ts.
// test/types.test.ts fails when the committed types/ differ from the source.
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export function buildTypes(outDir: string): void {
  const root = resolve(import.meta.dir, "..");
  rmSync(outDir, { recursive: true, force: true });
  const tsc = Bun.spawnSync(["bunx", "tsc", "-p", join(root, "tsconfig.types.json"), "--outDir", outDir], { cwd: root, stdout: "pipe", stderr: "pipe" });
  if (tsc.exitCode !== 0) throw new Error(`tsc failed:\n${tsc.stdout.toString()}${tsc.stderr.toString()}`);
  for (const name of readdirSync(outDir, { recursive: true }) as string[]) {
    if (!name.endsWith(".d.ts")) continue;
    const path = join(outDir, name);
    const text = readFileSync(path, "utf8").replace(/((?:from|import)\s*\(?\s*["'])(\.{1,2}\/[^"']+)\.ts(["'])/g, "$1$2.js$3");
    writeFileSync(path, text);
  }
}

if (import.meta.main) {
  const out = resolve(process.argv[2] ?? join(import.meta.dir, "..", "types"));
  buildTypes(out);
  console.log(`types written to ${out}`);
}
