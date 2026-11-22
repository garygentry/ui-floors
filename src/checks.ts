// Every check id the package can report, with the command that runs it and its kind.
// STANDARD.md must name each one under its kind; test/standard.test.ts holds the two together.
// Two more ids appear in reports and aren't rules: "load" (a page failed to load) and "config".
//
// A floor always applies. A finding on one is excepted only per element or page, with a reason.
// An opinion has a default value, and each app sets it to error, warn or off in the config's "rules".

export const CHECKS = {
  hscroll: { command: "sweep", kind: "floor" },
  "overflow-right": { command: "sweep", kind: "floor" },
  "text-size": { command: "sweep", kind: "floor" },
  clipped: { command: "sweep", kind: "floor" },
  overlap: { command: "sweep", kind: "floor" },
  "label-collision": { command: "sweep", kind: "floor" },
  "target-size": { command: "sweep", kind: "floor" },
  "focus-ring": { command: "sweep", kind: "floor" },
  contrast: { command: "contrast", kind: "floor" },
  "reduced-motion": { command: "lint", kind: "floor" },
  "body-size": { command: "sweep", kind: "opinion" },
  "line-length": { command: "sweep", kind: "opinion" },
  "numeric-columns": { command: "sweep", kind: "opinion" },
  "hidden-columns": { command: "sweep", kind: "opinion" },
  "touch-action": { command: "sweep", kind: "opinion" },
  "search-input": { command: "sweep", kind: "opinion" },
  "theme-color": { command: "sweep", kind: "opinion" },
  "dark-theme": { command: "contrast", kind: "opinion" },
  "literal-colour": { command: "lint", kind: "opinion" },
  "transition-all": { command: "lint", kind: "opinion" },
  "break-all": { command: "lint", kind: "opinion" },
  "remote-font": { command: "lint", kind: "opinion" },
  "font-fallback": { command: "lint", kind: "opinion" },
  budget: { command: "budget", kind: "opinion" },
} as const satisfies Record<string, { command: string; kind: "floor" | "opinion" }>;

export type CheckId = keyof typeof CHECKS;
export type OpinionId = { [K in CheckId]: (typeof CHECKS)[K]["kind"] extends "opinion" ? K : never }[CheckId];
export type RuleLevel = "error" | "warn" | "off";

export const FLOORS = (Object.keys(CHECKS) as CheckId[]).filter((id) => CHECKS[id].kind === "floor");
export const OPINIONS = (Object.keys(CHECKS) as CheckId[]).filter((id) => CHECKS[id].kind === "opinion") as OpinionId[];
