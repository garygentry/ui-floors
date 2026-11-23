# Changelog

The package and its standard share one version and follow semver. A rule and its check change in the same commit, with a line here.

## 0.1.0 (2026-11-23)

First public release. Extracted from a private UI toolkit's checks package at 0.3.4, with fresh history.

- Rules are floors or opinions (`STANDARD.md`). Floors always apply; their values may be raised, never lowered. Opinions are warnings by default, and an app sets each to `error`, `warn` or `off` in the config's `rules`.
- `dark-theme` is its own opinion, split out of `contrast`, which stays a floor.
- Renamed: the package and command `ui-floors`, the config `ui-floors.json`, the attribute `data-ui-floors-ignore`, the source comment `ui-floors-ignore`. The old names still work.
- A Claude Code plugin with one skill, `ui-floors:ui`: setup (committed or ad hoc), baseline, sweep and review procedures, and a hand-review checklist paraphrased from the Web Interface Guidelines, credited. impeccable is used if installed, not bundled.
- Lint names a file outside the config's folder by its absolute path, so a config kept outside the repo reads clearly.
- Published as `@garygentry/ui-floors`, from a tag through `release.yml`: one approval of the `release` environment, npm trusted publishing with provenance, no tokens (`RELEASING.md`). CI runs the same quality gate on pull requests.
- Each rule names its source; `NOTICE` credits WCAG 2.2 and Vercel's Web Interface Guidelines.
