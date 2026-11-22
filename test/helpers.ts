import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULTS, type Config } from "../src/config.ts";
import { OPINIONS } from "../src/checks.ts";
import type { Rules } from "../src/rules.ts";

export const FIXTURES = join(import.meta.dir, "fixtures");
export const SITE = join(FIXTURES, "site");

/** Every opinion at error, as a strict profile sets them: the fixtures test what each check finds. */
export const STRICT: Rules = Object.fromEntries(OPINIONS.map((id) => [id, "error"]));

export function siteConfig(base: string, over: Partial<Config> = {}): Config {
  const pages = readdirSync(SITE)
    .filter((f) => f.endsWith(".html") && f !== "confirm.html")
    .map((f) => ({ path: "/" + f, ready: "main h1", name: f.replace(".html", "") }));
  return {
    ...DEFAULTS,
    root: FIXTURES,
    base,
    pages,
    ignore: [{ check: "text-size", selector: ".legacy", reason: "legacy block, fixture" }],
    timeoutMs: 3000,
    rules: STRICT,
    ...over,
  };
}
