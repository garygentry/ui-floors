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

export function makeReport(command: string, findings: Finding[], extra: Record<string, unknown> = {}): Report {
  return { tool: "ui-floors", command, generatedAt: new Date().toISOString(), findings, ...extra };
}

export const failing = (fs: Finding[]) => fs.filter((f) => f.severity === "error" && !f.ignored);

export function formatFinding(f: Finding): string {
  const at = [f.page && `${f.page}${f.width ? `@${f.width}` : ""}${f.scheme ? `/${f.scheme}` : ""}`, f.where]
    .filter(Boolean)
    .join(" ");
  return `${f.ignored ? "ignored" : f.severity.padEnd(5)} ${f.check.padEnd(16)} ${at ? at + ": " : ""}${f.message}${f.ignored ? ` (${f.ignored})` : ""}`;
}

export function printSummary(command: string, findings: Finding[], log = console.log): void {
  for (const f of findings) if (!f.ignored) log(formatFinding(f));
  const errors = failing(findings).length;
  const warns = findings.filter((f) => f.severity === "warn" && !f.ignored).length;
  const ignored = findings.filter((f) => f.ignored).length;
  log(`${command}: ${errors} error(s), ${warns} warning(s), ${ignored} ignored`);
}
