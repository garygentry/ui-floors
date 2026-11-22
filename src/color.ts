// Colour parsing and WCAG contrast. Handles the colour forms themes commonly use:
// hex, rgb(), hsl(), oklch(), oklab(), and a few keywords.

export type RGBA = { r: number; g: number; b: number; a: number }; // sRGB, 0..1, gamma-encoded

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function num(part: string, scale100 = 1): number {
  part = part.trim();
  if (part === "none") return 0;
  if (part.endsWith("%")) return (parseFloat(part) / 100) * scale100;
  return parseFloat(part);
}

function hue(part: string): number {
  part = part.trim();
  if (part === "none") return 0;
  if (part.endsWith("deg")) return parseFloat(part);
  if (part.endsWith("turn")) return parseFloat(part) * 360;
  if (part.endsWith("rad")) return (parseFloat(part) * 180) / Math.PI;
  return parseFloat(part);
}

/** Split "a b c / d" or "a, b, c, d" into [channels, alpha?]. */
function args(body: string): { ch: string[]; alpha?: string } {
  let alpha: string | undefined;
  let main = body;
  if (body.includes("/")) {
    const [m, a] = body.split("/");
    main = m!;
    alpha = a!.trim();
  }
  const ch = main.includes(",") ? main.split(",").map((s) => s.trim()) : main.trim().split(/\s+/);
  if (!alpha && ch.length === 4) alpha = ch.pop();
  return { ch, alpha };
}

function alphaOf(a?: string): number {
  return a === undefined ? 1 : clamp01(num(a, 1));
}

function oklabToRgb(L: number, a: number, b: number, alpha: number): RGBA {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const enc = (c: number) => {
    c = clamp01(c);
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };
  return { r: enc(lin[0]!), g: enc(lin[1]!), b: enc(lin[2]!), a: alpha };
}

function hslToRgb(h: number, s: number, l: number, alpha: number): RGBA {
  h = ((h % 360) + 360) % 360;
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: f(0), g: f(8), b: f(4), a: alpha };
}

const KEYWORDS: Record<string, RGBA> = {
  white: { r: 1, g: 1, b: 1, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  transparent: { r: 0, g: 0, b: 0, a: 0 },
};

/** Parse a CSS colour. Returns null for anything it can't resolve (var(), color-mix(), unknown names). */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();
  if (KEYWORDS[s]) return { ...KEYWORDS[s]! };
  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const v = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
    return { r: v(0), g: v(2), b: v(4), a: h.length === 8 ? v(6) : 1 };
  }
  const fn = s.match(/^([a-z]+)\((.*)\)$/);
  if (!fn) return null;
  const [, name, body] = fn;
  if (body!.includes("var(") || body!.includes("(")) return null;
  const { ch, alpha } = args(body!);
  if (ch.length < 3) return null;
  switch (name) {
    case "rgb":
    case "rgba":
      return {
        r: clamp01(num(ch[0]!, 255) / 255),
        g: clamp01(num(ch[1]!, 255) / 255),
        b: clamp01(num(ch[2]!, 255) / 255),
        a: alphaOf(alpha),
      };
    case "hsl":
    case "hsla":
      return hslToRgb(hue(ch[0]!), clamp01(num(ch[1]!, 1) / (ch[1]!.endsWith("%") ? 1 : 100)), clamp01(num(ch[2]!, 1) / (ch[2]!.endsWith("%") ? 1 : 100)), alphaOf(alpha));
    case "oklch": {
      const L = num(ch[0]!, 1), C = num(ch[1]!, 0.4), H = (hue(ch[2]!) * Math.PI) / 180;
      return oklabToRgb(L, C * Math.cos(H), C * Math.sin(H), alphaOf(alpha));
    }
    case "oklab":
      return oklabToRgb(num(ch[0]!, 1), num(ch[1]!, 0.4), num(ch[2]!, 0.4), alphaOf(alpha));
    default:
      return null;
  }
}

/** Composite fg over an opaque bg. */
export function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

export function luminance(c: RGBA): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** WCAG 2 contrast ratio of fg on bg. A translucent fg is composited over bg first. */
export function contrast(fg: RGBA, bg: RGBA): number {
  const f = fg.a < 1 ? over(fg, bg) : fg;
  const [hi, lo] = [luminance(f), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Distance between two colours in 0..255 sRGB units. */
export function distance(a: RGBA, b: RGBA): number {
  return Math.hypot((a.r - b.r) * 255, (a.g - b.g) * 255, (a.b - b.b) * 255);
}
