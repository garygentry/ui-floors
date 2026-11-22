---
name: ui
description: Bring a web UI up to a sound baseline with the ui-floors checks. Use it to set up the checks in a repo, run a baseline pass (sweep every page, fix every floor such as contrast, small text, touch targets, overflow and focus rings, and report the opinions), run the screenshot sweep and confirm fixes, or review a UI against the checks and a hand checklist. Works on any web stack, in a repo you own or one you only visit.
---

# ui-floors

Every task goes through one of the procedures below. Read the one that fits, then follow it.

## Paths

This file's folder is the skill folder; the harness shows it as the skill's base directory. The plugin root is two
folders up. From the plugin root:

| What | Path |
| --- | --- |
| The standard: floors, opinions, the check and source of each | `STANDARD.md` |
| The checks' commands and config | `README.md` |
| The hand-review checklist | `skills/ui/reference/guidelines.md` |

## Pick a procedure

| The task | Procedure |
| --- | --- |
| The repo has no `ui-floors.json`, or the checks aren't installed | `procedures/setup.md` |
| "Get this UI to a solid baseline", "fix the accessibility basics", a first pass on an unfamiliar UI | `procedures/baseline.md` |
| Screenshot every page, find layout problems, fix them and confirm | `procedures/sweep.md` |
| Review, critique or audit a UI | `procedures/review.md` |

Baseline runs setup first if it's needed, then the sweep.

## Rules for every procedure

- **Precedence:** the user's own words for the task, then the repo's rules, then the standard, then any tool's advice.
  Read the repo's `CLAUDE.md`, `AGENTS.md`, contributing docs and any design file before acting.
- **Floors are floors.** Fix every floor finding, or except it on the element with a reason. A floor's value may be
  raised, never lowered.
- **Opinions are the repo's to choose.** Report them. Fix one only when the repo sets it to `error`, or the user asks.
  Where the repo's own style contradicts an opinion (13 px body text in its design system, say), set that rule to
  `off` or change its value, and say so; don't restyle the app to match the default.
- **Don't change what a page says,** or a decision the repo records, on a check's advice. Record it as a question.
- **Fix shared causes where they live:** tokens, the theme, the component library. Follow the repo's rule for editing
  its library, including vendored code.
- **Exceptions need reasons,** written in the `ignore` entry or beside the `data-ui-floors-ignore` attribute. If a
  check misreads correct UI, say so: the fix belongs in ui-floors, with a fixture.
- **Ask the user** only for what the code and the repo can't tell you. Otherwise decide, say what you decided, and go on.
- **Work on a branch** and commit in steps where the repo allows it. Never push or open a PR without the user's approval.
- **Report with numbers:** findings by check before and after, what was fixed and excepted, what was left and why.
  Name anything not run.
