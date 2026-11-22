export type RGBA = {
    r: number;
    g: number;
    b: number;
    a: number;
};
/** Parse a CSS colour. Returns null for anything it can't resolve (var(), color-mix(), unknown names). */
export declare function parseColor(input: string): RGBA | null;
/** Composite fg over an opaque bg. */
export declare function over(fg: RGBA, bg: RGBA): RGBA;
export declare function luminance(c: RGBA): number;
/** WCAG 2 contrast ratio of fg on bg. A translucent fg is composited over bg first. */
export declare function contrast(fg: RGBA, bg: RGBA): number;
/** Distance between two colours in 0..255 sRGB units. */
export declare function distance(a: RGBA, b: RGBA): number;
