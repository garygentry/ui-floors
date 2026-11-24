# Changelog

The package and its standard share one version and follow semver. A rule and its check change in the same commit, with a line here.

## 0.2.0 (2026-11-24)

- The plugin works in GitHub Copilot as well as Claude Code. The Copilot CLI installs it from the same `.claude-plugin/` marketplace, and VS Code installs it from source. The README gives the steps for each, and corrects the Claude Code install command.
- The skill reads Copilot's instruction files (`.github/copilot-instructions.md`, `.github/instructions/`) along with `AGENTS.md` and `CLAUDE.md`.
- `test/plugin.test.ts` holds the skill's frontmatter to what both harnesses accept: the name matches its folder, within 64 characters, and the description is within 1024.

## 0.1.1 (2026-11-24)

- `remote-font` reads whole `<link>` tags in HTML, so a tag split over several lines is caught, and a `preconnect` or `dns-prefetch` hint to a font host is no longer reported as a font load.
- `contrast` names a token file outside the config's folder by its absolute path, as `lint` does, instead of a long `../` path.
- `font-fallback` says when the stack ends in a quoted generic (`'sans-serif'`): the quotes make it a font name, not the generic family.
- The sweep procedure warns that an app shell which scrolls inside a panel shows only the panel's first screen in a full-page capture.

## 0.1.0 (2026-11-23)

First public release. Extracted from a private UI toolkit's checks package at 0.3.4, with fresh history.

- Rules are floors or opinions (`STANDARD.md`). Floors always apply; their values may be raised, never lowered. Opinions are warnings by default, and an app sets each to `error`, `warn` or `off` in the config's `rules`.
- `dark-theme` is its own opinion, split out of `contrast`, which stays a floor.
- Renamed: the package and command `ui-floors`, the config `ui-floors.json`, the attribute `data-ui-floors-ignore`, the source comment `ui-floors-ignore`. The old names still work.
- A Claude Code plugin with one skill, `ui-floors:ui`: setup (committed or ad hoc), baseline, sweep and review procedures, and a hand-review checklist paraphrased from the Web Interface Guidelines, credited. impeccable is used if installed, not bundled.
- Lint names a file outside the config's folder by its absolute path, so a config kept outside the repo reads clearly.
- Published as `@garygentry/ui-floors`, from a tag through `release.yml`: one approval of the `release` environment, npm trusted publishing with provenance, no tokens (`RELEASING.md`). CI runs the same quality gate on pull requests.
- Each rule names its source; `NOTICE` credits WCAG 2.2 and Vercel's Web Interface Guidelines.
