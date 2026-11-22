# ui-floors

Checks that bring a web UI up to a sound baseline, and keep it there. A screenshot sweep with layout checks, theme contrast, source lint and a JavaScript budget, run from the command line or CI.

The rules come in two kinds (see [`STANDARD.md`](STANDARD.md)):

- **Floors** always apply: contrast, smallest text, touch targets, horizontal scroll, overprinted or clipped text, focus rings, reduced motion. Most come from WCAG 2.2.
- **Opinions** are defaults that teams differ on: body size, line length, number columns, tokens-only colour, dark theme, self-hosted fonts and more. They are warnings unless an app sets each one to `error` or `off`, so the same checks fit different house styles.

It runs on Bun. The package ships TypeScript source, which Node won't run from `node_modules`.

## Install

```sh
bun add -d ui-floors playwright
bunx playwright install chromium
```

Playwright is a peer dependency, so the app's own pinned Playwright and its Chromium are used. If an app pins Playwright, install Chromium with that version: `./node_modules/.bin/playwright install chromium`.

## Commands

```sh
ui-floors sweep    [--base URL | --serve DIR] [--only TEXT] [--width N] [--scheme light|dark|both] [--out DIR]
ui-floors confirm  [--base URL | --serve DIR] [CASE ...]
ui-floors contrast
ui-floors lint
ui-floors budget
ui-floors static   # contrast, lint and budget: no browser
```

All commands read `ui-floors.json` from the current directory, or the file given with `--config`. They exit 0 when clean, 1 on any error finding that isn't ignored, and 2 on bad usage. `--json` prints the report.

`sweep` writes a full-page PNG for each page, width and scheme, plus `report.json`, to `out`. Read every screenshot: the checks miss most real problems. Don't commit the screenshots.

`confirm` takes an element screenshot for each fixed problem, at the width it was reported at.

## Config: `ui-floors.json`

Paths are relative to the config file. Everything except `pages` has a default.

```jsonc
{
  "stack": "react-tailwind",            // or "css": drops the JSX and Tailwind lint rules
  "base": "http://127.0.0.1:5173",      // the running app
  "pages": [                            // the page manifest
    { "path": "/", "ready": "main h1" },               // ready: a selector that exists once the page has rendered
    { "path": "/settings", "ready": "[data-page=settings]", "root": "main" }  // root: where layout checks look (default main, else body)
  ],
  "widths": { "390": 844, "1440": 900 }, // width -> viewport height
  "schemes": ["light", "dark"],
  "out": "shots",
  "timeoutMs": 45000,                   // wait for the ready selector and for [aria-busy=true] to clear
  "rules": {                            // opinions only: "error", "warn" (the default) or "off"
    "body-size": "error",
    "dark-theme": "off"
  },
  "floors": { "minTextPx": 12, "bodyPx": [15, 16], "targetPx": 24, "maxLineChars": 75, "phoneMaxWidth": 480 },
  "focus": { "width": 1440, "maxTabs": 80 },
  "ignore": [
    { "check": "overlap", "selector": ".hatch-legend", "reason": "legend swatches overlap by design" },
    { "check": "hscroll", "path": "/wide-report", "reason": "a wide report, agreed with the product owner" }
  ],
  "confirm": [{ "name": "orders-table-390", "path": "/orders", "width": 390, "selector": "main table", "maxHeight": 700 }],
  "contrast": { "files": ["src/styles/theme.css"], "pairs": [{ "fg": "muted-foreground", "bg": "muted", "min": 4.5, "target": 7 }] },
  "lint": { "include": ["src", "index.html"], "exclude": ["dist"], "tokenFiles": ["src/styles/theme.css"] },  // exclude: folder names, not globs; node_modules and .git are always skipped
  "budget": { "dist": "dist", "entry": "index.html", "limitBytes": 250000 }  // or false: the app keeps its own budget test
}
```

`minTextPx` and `targetPx` are floors: they may be raised, never lowered. `bodyPx` and `maxLineChars` are opinion values and may go either way. A floor named in `rules` is a config error.

The sweep doesn't wait for `networkidle`, because a dev server with hot reload never settles. It waits for `load`, then the ready selector, then for no `[aria-busy="true"]`, then 300 ms.

## Checks

| Check | Kind | Command | What fails |
| --- | --- | --- | --- |
| `hscroll` | floor | sweep | The page scrolls sideways |
| `overflow-right` | floor | sweep | An element ends past the viewport and no ancestor clips or scrolls it. Only the outermost is reported |
| `text-size` | floor | sweep | Visible text under `minTextPx`, SVG text included at the size it is drawn (a viewBox that scales a chart down scales its labels too) |
| `clipped` | floor | sweep | Text cut off by an ancestor with hidden or clipped overflow |
| `overlap` | floor | sweep | Two text runs in flow overprint each other by more than 3 px |
| `label-collision` | floor | sweep | Two SVG `<text>` labels in one chart overlap: by more than 1 px along the baseline and 3 px across it. Rotated labels are compared in their own frame |
| `target-size` | floor | sweep, phones | A control under `targetPx` in either dimension, unless a circle of that diameter centred on it meets no other control and no other such circle (WCAG 2.2, 2.5.8) |
| `focus-ring` | floor | sweep, at `focus.width` | An element reached with Tab whose surroundings look the same focused and blurred. An outline or a new box-shadow on the element or its parent passes at once; otherwise two clipped screenshots are compared |
| `contrast` | floor | contrast | A token pair under its `min` (error) or its `target` (warning), light or dark; or no pair measurable. Only plain theme selectors count (`:root`, `.dark`, `[data-theme=dark]`, a dark media query) |
| `reduced-motion` | floor | lint | The app animates and nothing handles `prefers-reduced-motion` |
| `body-size` | opinion | sweep | `body` font size outside `bodyPx` |
| `line-length` | opinion | sweep | Prose (`p`, `li`, `dd`, `blockquote`, `figcaption`) with room for more than `maxLineChars` + 3 characters a line |
| `numeric-columns` | opinion | sweep | A column of numbers (at least 80% of filled cells) with cells or header not right-aligned, or without tabular figures |
| `hidden-columns` | opinion | sweep | At widths up to 480 px, a table in a scroll box with a column less than half shown at rest |
| `touch-action` | opinion | sweep, phones | A control whose `touch-action` is `auto` |
| `search-input` | opinion | sweep | A search input without `autocomplete="off"` and `spellcheck="false"` |
| `theme-color` | opinion | sweep | No `theme-color` meta for the current scheme (error), or one that doesn't match the page background (warning) |
| `dark-theme` | opinion | contrast | No dark theme tokens |
| `literal-colour` | opinion | lint | Hex or colour functions outside the token files: CSS values, and strings in source (including Tailwind `bg-[#…]`) |
| `transition-all` | opinion | lint | `transition: all`, or the Tailwind class `transition-all` |
| `break-all` | opinion | lint | `word-break: break-all`, or the Tailwind class `break-all` |
| `remote-font` | opinion | lint | A font loaded from another origin |
| `font-fallback` | opinion | lint | A `font-family` or `--font-*` value with no generic family at the end |
| `budget` | opinion | budget | First-render JS over `limitBytes` gzip: the entry's scripts and modulepreloads, plus their static imports. Lazy chunks don't count |

### Known false positives, excluded

The layout checks skip text that is hidden (`visibility`, `opacity: 0`, `display: none`), screen-reader-only (1 px boxes), clamped (`-webkit-line-clamp`) or ellipsised. `overlap` skips sticky, fixed and absolute text, `aria-hidden` text and tooltips, and compares only the visible part of each run. `clipped` stops at a scroll box, since scrolled content is reachable. `overflow-right` ignores anything inside a scroller or clipper. `target-size` exempts links inside a sentence. Lazy sections that mount on scroll show blank in full-page captures; scroll to them before calling them defects.

### Excepting a finding

- On the element or an ancestor: `data-ui-floors-ignore="overlap clipped"`. An empty value covers every check.
- In config: an `ignore` entry with a `check` (or `"*"`), a `selector` and/or a page `path`, and a `reason`.
- In source: a comment containing `ui-floors-ignore <rule>` on the line or the line above.

Ignored findings stay in the report with their reason. Two ids in a report aren't rules: `load` (a page didn't reach its ready selector) and `config` (a config mistake). Both fail the run.

The names from before the package was public (`ui-checks.json`, `data-ui-checks-ignore`, `ui-checks-ignore`) still work. The old config file prints a warning, and the old attribute's reason says to rename it.

### Stacks

`lint` rules that read JSX and Tailwind classes are tagged `react-tailwind`. Everything else works on any web stack: the sweep needs only a URL and a page manifest, and contrast reads plain CSS custom properties.

## Where this comes from

The code is original. It started as Python screenshot scripts written for a design update of one internal app, and grew into this package over a few more apps. The false-positive rules come from those apps.

The rules aren't all ours, and the standard says which are:

- **WCAG 2.2** (W3C) gives the contrast formula and thresholds, the target size and its spacing exception, focus visibility, reflow and motion.
- **Vercel's [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)** (MIT) give the `transition: all`, `touch-action`, search-input, `theme-color` and tabular-figures rules, and the plugin's hand-review checklist.
- Line length and number alignment are typographic convention.

The rest (the floor values for text size, the opinions marked "ours", the floors and opinions model) are this project's own. `NOTICE` has the details and licence texts.

## Developing

```sh
bun install
./node_modules/.bin/playwright install chromium
bun run check        # typecheck and all tests, about a minute
bun test test/sweep.test.ts
bun src/cli.ts sweep --config test/fixtures/ui-floors.json --serve test/fixtures/site   # exits 1: the fixtures plant defects
```

The tests use small HTML fixtures in `test/fixtures`. Each sweep fixture page plants one kind of defect; `clean.html` and `falsepos.html` must produce no findings. `test/standard.test.ts` fails if a check is missing from `STANDARD.md`, or listed under the wrong kind. `bun run types` refreshes `types/`; `test/types.test.ts` fails when they drift.

## Licence

Apache-2.0. See `LICENSE` and `NOTICE`.
