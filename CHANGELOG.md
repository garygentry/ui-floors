# Changelog

The package and its standard share one version and follow semver. A rule and its check change in the same commit, with a line here.

## 0.1.0 (unreleased)

First public release. Extracted from a private UI toolkit's checks package at 0.3.4, with fresh history.

- Rules are floors or opinions (`STANDARD.md`). Floors always apply; their values may be raised, never lowered. Opinions are warnings by default, and an app sets each to `error`, `warn` or `off` in the config's `rules`.
- `dark-theme` is its own opinion, split out of `contrast`, which stays a floor.
- Renamed: the package and command `ui-floors`, the config `ui-floors.json`, the attribute `data-ui-floors-ignore`, the source comment `ui-floors-ignore`. The old names still work.
- Each rule names its source; `NOTICE` credits WCAG 2.2 and Vercel's Web Interface Guidelines.
