# Review a UI

The automatic checks, a hand checklist, and, if it's installed, impeccable's critique, then fixes. Run on a branch.

## 1. Run the checks

`ui-floors static` and the sweep (`sweep.md`). Floors are findings to fix; opinions are findings to report.

## 2. Walk the hand checklist

`skills/ui/reference/guidelines.md` lists the review rules no check covers. Walk them over the source and the
screenshots, and record findings as high, medium or low.

## 3. Critique with impeccable, if installed

[impeccable](https://github.com/pbakaus/impeccable) (Paul Bakaus, Apache-2.0) is a design critique skill. It isn't
part of this plugin. If the user has it installed as a skill, run its critique on the app's source as its own
`SKILL.md` describes, and use its severities (P0 to P3). If it isn't installed, skip this step and say so in the
report; don't install it without asking. If the app holds a connection open (an `EventSource` or websocket), point
its detector at source files, not the live URL, which waits for the page to settle and times out.

## 4. Fix

- Fix every floor finding, every high and medium, and every P0 and P1. Fix low and P2 or P3 where the fix doesn't
  change content or a recorded decision.
- **If a finding would change what a page says, or reverse a decision the repo records, don't apply it.** Record it
  as a question for the user.
- Fix shared causes in the theme and the library. Where a guideline conflicts with a repo rule, keep the repo rule
  and say so.

## 5. Record

If the repo keeps design or review records, add one in its format: a table per step (finding, severity, outcome),
what was left and why, and the questions. Otherwise put it in the report. Run every check again, and report with
numbers.
