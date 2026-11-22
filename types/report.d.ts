export type Severity = "error" | "warn";
export type Finding = {
    check: string;
    severity: Severity;
    message: string;
    /** Where: a CSS selector-like label for page checks, file:line for source checks. */
    where?: string;
    page?: string;
    width?: number;
    scheme?: string;
    /** Set when an ignore entry or data-ui-floors-ignore covers the finding. */
    ignored?: string;
};
export type Report = {
    tool: "ui-floors";
    command: string;
    generatedAt: string;
    findings: Finding[];
    [extra: string]: unknown;
};
export declare function makeReport(command: string, findings: Finding[], extra?: Record<string, unknown>): Report;
export declare const failing: (fs: Finding[]) => Finding[];
export declare function formatFinding(f: Finding): string;
export declare function printSummary(command: string, findings: Finding[], log?: {
    (...data: any[]): void;
    (...data: any[]): void;
}): void;
