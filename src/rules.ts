// Applies the config's "rules" to findings. Floors pass through unchanged. An opinion at "off" is dropped, at
// "warn" is reported as a warning, and at "error" keeps the severity its check gave (some, such as a theme-color
// mismatch, are warnings even then).

import { CHECKS, OPINIONS, type CheckId, type OpinionId, type RuleLevel } from "./checks.ts";
import type { Finding } from "./report.ts";
import { DEFAULT_FLOORS, type Floors } from "./config.ts";

export type Rules = Partial<Record<OpinionId, RuleLevel>>;

/** The baseline: every opinion reported as a warning. */
export const DEFAULT_LEVEL: RuleLevel = "warn";

export function levelOf(rules: Rules, check: string): RuleLevel | "floor" | undefined {
  const def = CHECKS[check as CheckId];
  if (!def) return undefined;
  if (def.kind === "floor") return "floor";
  return rules[check as OpinionId] ?? DEFAULT_LEVEL;
}

export function applyRules<T extends Finding>(findings: T[], rules: Rules): T[] {
  const out: T[] = [];
  for (const f of findings) {
    const level = levelOf(rules, f.check);
    if (level === "off") continue;
    out.push(level === "warn" && f.severity === "error" ? { ...f, severity: "warn" } : f);
  }
  return out;
}

/** Config problems in "rules": an unknown id, a floor, or a bad level. Reported as "config" errors. */
export function checkRules(rules: unknown): Finding[] {
  if (rules === undefined) return [];
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) return [{ check: "config", severity: "error", message: `"rules" must be an object of opinion ids to "error", "warn" or "off"` }];
  const findings: Finding[] = [];
  for (const [id, level] of Object.entries(rules)) {
    const def = CHECKS[id as CheckId];
    if (!def) findings.push({ check: "config", severity: "error", message: `rules: unknown check "${id}"` });
    else if (def.kind === "floor") findings.push({ check: "config", severity: "error", message: `rules: "${id}" is a floor and can't be changed. Except a finding per element or page, with a reason` });
    else if (!["error", "warn", "off"].includes(level as string)) findings.push({ check: "config", severity: "error", message: `rules: "${id}" must be "error", "warn" or "off"` });
  }
  return findings;
}

/** Floor values may be raised, never lowered. bodyPx and maxLineChars are opinion values and may go either way. */
export function checkFloors(floors: Floors): Finding[] {
  const findings: Finding[] = [];
  for (const key of ["minTextPx", "targetPx"] as const) {
    if (!(floors[key] >= DEFAULT_FLOORS[key])) findings.push({ check: "config", severity: "error", message: `floors.${key} is ${floors[key]}: a floor may be raised, never lowered below ${DEFAULT_FLOORS[key]}` });
  }
  return findings;
}

export { OPINIONS };
