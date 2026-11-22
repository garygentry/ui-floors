# Baseline pass

Brings a UI up to the floors and reports the opinions. Works on an unfamiliar repo. Run on a branch.

## 1. Set up

If the repo has no `ui-floors.json` or can't run the checks, follow `setup.md` first. Note which way it runs
(committed or ad hoc).

## 2. Measure

Run `ui-floors static` and the sweep (`sweep.md`, step 1). Save both reports' counts by check. That's the "before" of
the final report.

## 3. Fix the floors

Floor findings are errors: contrast, `text-size`, `target-size`, `hscroll` and `overflow-right`, `overlap`,
`clipped`, `label-collision`, `focus-ring`, `reduced-motion`.

- Group findings by check and element first. Big counts usually have one cause: a token, a base style, one component.
- Fix each cause where it lives (`sweep.md`, step 2, for triage). Common fixes: a muted text token darkened to 4.5:1,
  a base size raised to 12 px, 3 px of padding on stacked links, a `min-width: 0` on a flex child, an outline on
  `:focus-visible`, a `prefers-reduced-motion` block.
- A component library vendored from elsewhere has its own rule for edits. Follow it: fix upstream first if it says
  so, or record the local edit where it asks.

## 4. Report the opinions

Don't fix opinion warnings by default. List them by check, with counts and the likely single cause of each, and say
which would be cheap to adopt. Fix one when the repo sets it to `error` or the user asks.

## 5. Read every screenshot

Follow `sweep.md`, step 3. The checks miss most real problems; findings from reading go in the report with the page
and width.

## 6. Re-run and confirm

A full second sweep and `static`, since a shared fix can move other pages. Add a `confirm` case for each fixed problem
and read each confirm shot (`sweep.md`, step 4).

## 7. Report

Floors before and after by check, what was fixed and where, exceptions and why, opinions by check, findings from
reading the screenshots, and questions for the user. If the run was ad hoc, say where the config and screenshots are.
