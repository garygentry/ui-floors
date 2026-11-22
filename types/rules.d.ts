import { OPINIONS, type OpinionId, type RuleLevel } from "./checks.js";
import type { Finding } from "./report.js";
import { type Floors } from "./config.js";
export type Rules = Partial<Record<OpinionId, RuleLevel>>;
/** The baseline: every opinion reported as a warning. */
export declare const DEFAULT_LEVEL: RuleLevel;
export declare function levelOf(rules: Rules, check: string): RuleLevel | "floor" | undefined;
export declare function applyRules<T extends Finding>(findings: T[], rules: Rules): T[];
/** Config problems in "rules": an unknown id, a floor, or a bad level. Reported as "config" errors. */
export declare function checkRules(rules: unknown): Finding[];
/** Floor values may be raised, never lowered. bodyPx and maxLineChars are opinion values and may go either way. */
export declare function checkFloors(floors: Floors): Finding[];
export { OPINIONS };
