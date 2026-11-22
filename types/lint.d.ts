import type { Finding } from "./report.js";
export type LintOptions = {
    root: string;
    include: string[];
    exclude: string[];
    tokenFiles: string[];
    stack: "react-tailwind" | "css";
};
type File = {
    path: string;
    text: string;
    kind: "css" | "source" | "html";
};
export declare function globToRegExp(glob: string): RegExp;
export declare function collectFiles(opts: LintOptions, missing?: string[]): File[];
export declare function lint(opts: LintOptions): {
    findings: Finding[];
    files: number;
};
export {};
