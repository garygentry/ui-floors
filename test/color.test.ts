import { describe, expect, test } from "bun:test";
import { contrast, parseColor } from "../src/color.ts";

const c = (s: string) => {
  const v = parseColor(s);
  if (!v) throw new Error(`unparsed: ${s}`);
  return v;
};

describe("parseColor", () => {
  test("hex, rgb, hsl and keywords", () => {
    expect(c("#fff")).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(c("#00000080").a).toBeCloseTo(0.5, 2);
    expect(c("rgb(255 0 0)")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(c("rgba(0, 0, 255, 0.5)").a).toBe(0.5);
    const red = c("hsl(0 100% 50%)");
    expect([red.r, red.g, red.b]).toEqual([1, 0, 0]);
    expect(c("transparent").a).toBe(0);
  });
  test("oklch white and black", () => {
    const w = c("oklch(1 0 0)"), k = c("oklch(0 0 0)");
    expect(w.r).toBeCloseTo(1, 3);
    expect(k.g).toBeCloseTo(0, 3);
    expect(c("oklch(100% 0 0)").b).toBeCloseTo(1, 3);
  });
  test("returns null for what it can't resolve", () => {
    expect(parseColor("var(--x)")).toBeNull();
    expect(parseColor("color-mix(in oklch, red, blue)")).toBeNull();
    expect(parseColor("rebeccapurple")).toBeNull();
  });
});

describe("contrast", () => {
  test("black on white is 21:1", () => {
    expect(contrast(c("#000"), c("#fff"))).toBeCloseTo(21, 5);
  });
  test("matches a browser's computed figure for muted text (8.4:1 on white)", () => {
    expect(contrast(c("oklch(0.42 0.03 257)"), c("oklch(1 0 0)"))).toBeCloseTo(8.4, 0);
  });
  test("a translucent foreground is composited over the background", () => {
    expect(contrast(c("rgb(0 0 0 / 0)"), c("#fff"))).toBeCloseTo(1, 5);
  });
});
