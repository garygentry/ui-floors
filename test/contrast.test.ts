import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { checkContrast, checkContrastText } from "../src/contrast.ts";
import { FIXTURES } from "./helpers.ts";

const run = (name: string, pairs?: Parameters<typeof checkContrast>[1]) => checkContrast([join(FIXTURES, "tokens", `${name}.css`)], pairs, FIXTURES);

describe("contrast", () => {
  test("a real app's tokens pass in light and dark", () => {
    const fs = run("good");
    expect([...fs]).toEqual([]);
    expect(fs.checked).toBe(14); // the seven default pairs whose tokens exist, in each theme
  });
  test("a theme where no pair can be measured is an error, not a pass", () => {
    const fs = checkContrastText([{ path: "x.css", text: ":root{--paper:#fff} .dark{--paper:#000}" }]);
    expect(fs.map((f) => f.message)).toEqual(["no token pairs could be measured; set contrast.pairs"]);
  });
  test("dark muted text under 4.5:1 is an error, light is fine", () => {
    const fs = run("low-dark");
    expect(fs).toHaveLength(1);
    expect(fs[0]).toMatchObject({ severity: "error", scheme: "dark", where: "tokens/low-dark.css:11" });
    expect(fs[0]!.message).toContain("muted-foreground on background");
  });
  test("between the floor and the 7:1 target is a warning", () => {
    const fs = run("warn");
    expect(fs.map((f) => [f.severity, f.scheme])).toEqual([["warn", "light"]]);
  });
  test("a theme with no dark tokens fails", () => {
    expect(run("no-dark").map((f) => [f.check, f.message])).toEqual([["dark-theme", expect.stringContaining("no dark theme")]]);
  });
  test("explicit pairs: a missing token is an error", () => {
    const fs = run("good", [{ fg: "link", bg: "background", min: 4.5 }]);
    expect(fs.map((f) => f.message)).toEqual(["token missing: link", "token missing: link"]);
  });
  test("an unparseable value is reported, not skipped", () => {
    const fs = checkContrastText([{ path: "x.css", text: ":root{--foreground: color-mix(in oklch, red, blue); --background:#fff} .dark{--background:#000}" }]);
    expect(fs.some((f) => f.message.startsWith("can't parse foreground"))).toBe(true);
  });
  test("preset variants don't overwrite the base themes", () => {
    expect([...run("presets")]).toEqual([]);
  });
  test("no files is an error", () => {
    expect(checkContrastText([])[0]!.severity).toBe("error");
  });
});
