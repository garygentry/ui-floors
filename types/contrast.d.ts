import type { Pair } from "./config.js";
import type { Finding } from "./report.js";
export declare const DEFAULT_PAIRS: Pair[];
type Theme = Map<string, {
    value: string;
    where: string;
}>;
export declare function readThemes(files: {
    path: string;
    text: string;
}[]): {
    light: Theme;
    dark: Theme;
    hasDark: boolean;
};
/** Resolve var() chains in a theme. Returns null if the value still isn't a plain colour. */
export declare function resolveToken(theme: Theme, name: string, depth?: number): string | null;
export declare function checkContrast(files: string[], pairs?: Pair[], cwd?: string): Finding[] & {
    checked?: number;
};
/** Findings, with `checked` set to the number of token pairs measured. */
export declare function checkContrastText(files: {
    path: string;
    text: string;
}[], pairs?: Pair[]): Finding[] & {
    checked?: number;
};
export {};
