# The ui-floors standard

Version 0.1.1, released with the package of the same version. It applies to web apps.

Rules come in two kinds:

- **Floors** always apply. A floor's value may be raised in the config, never lowered. A floor finding that is wrong for one element is excepted on that element or page, with a reason.
- **Opinions** are sound defaults that reasonable teams differ on. Each has a default value. An app sets each one to `error`, `warn` or `off` in the config's `rules`, and may change its value. With no setting, an opinion is a warning: it is reported but doesn't fail the run.

Every rule below names the check that enforces it. The checks are in this package: `sweep` runs in the browser on every page of the app's manifest, at each configured width and colour scheme. `lint`, `contrast` and `budget` read the source, the theme and the build. A rule and its check change in the same commit, with a line in `CHANGELOG.md`.

Each rule names its source. "Ours" means the rule was set here, from use on real apps; the rest come from the sources listed in `NOTICE`.

**Precedence:** the user's own instructions for the task come first, then the app repo's rules, then this standard. Where an app settles a conflict, it records how, wherever it keeps design decisions.

**Excepting a finding:** use `data-ui-floors-ignore="<check …>"` on the element or an ancestor, or an `ignore` entry with a reason in `ui-floors.json`. Ignored findings stay in the report with their reason.

## Floors

| Check | Rule | Value | Source |
| --- | --- | --- | --- |
| `text-size` | No visible text below the smallest size, chart text included, measured as drawn | 12 px (`floors.minTextPx`) | Ours. WCAG sets no minimum size |
| `contrast` | Text contrast of each theme token pair, in light and in dark | at least 4.5:1; a pair may set a higher target, reported as a warning | WCAG 2.2, 1.4.3 (7:1 is 1.4.6) |
| `target-size` | Touch targets on phones are big enough, or spaced so a circle of that diameter centred on each meets no other target. Links inside a sentence are exempt | 24 × 24 px (`floors.targetPx`), at widths up to `floors.phoneMaxWidth` (480 px). Raise to 44 px for customer-facing apps | WCAG 2.2, 2.5.8 (44 px is 2.5.5) |
| `hscroll` | No page-level horizontal scroll at phone width | none | WCAG 2.2, 1.4.10 |
| `overflow-right` | Names the element that causes the horizontal scroll | none | Ours |
| `overlap` | Text runs don't overprint each other | none | Ours |
| `clipped` | Text isn't cut off by an ancestor that hides overflow | none | Ours |
| `label-collision` | Chart labels (SVG text) don't collide | none | Ours |
| `focus-ring` | Every element reached with Tab shows a visible focus indicator, tab panels included | visible | WCAG 2.2, 2.4.7 |
| `reduced-motion` | An app that animates handles `prefers-reduced-motion` | handled | WCAG 2.2, 2.3.3 |

## Opinions

| Check | Rule | Default value | Source |
| --- | --- | --- | --- |
| `body-size` | Body text sits in a readable range | 15–16 px (`floors.bodyPx`) | Ours |
| `line-length` | Prose lines aren't too long to read | at most 75 characters (`floors.maxLineChars`), estimated from the measure and the face's mean glyph width | Typographic convention |
| `numeric-columns` | Number columns are right-aligned with tabular figures, header included | a column where 80% of filled cells are numbers | Web Interface Guidelines (tabular figures); typographic convention (alignment) |
| `hidden-columns` | On phones, a table doesn't hide whole columns at rest in a scroll box. A ledger stacks its rows or fits its columns; a matrix meant to scroll is excepted with a reason | widths up to 480 px | Ours |
| `touch-action` | Controls set `touch-action: manipulation` | at phone widths | Web Interface Guidelines |
| `search-input` | Search inputs set `autocomplete="off"` and `spellcheck="false"` | on | Web Interface Guidelines |
| `theme-color` | A `theme-color` meta for each scheme, matching the page background. A missing meta is an error; a mismatch a warning | on | Web Interface Guidelines |
| `dark-theme` | The theme defines dark tokens as well as light | on | Ours |
| `literal-colour` | Colours come from tokens: no literal hex or colour functions outside the token files (`lint.tokenFiles`) | on | Ours |
| `transition-all` | No `transition: all`; name the properties | on | Web Interface Guidelines |
| `break-all` | Long IDs and paths wrap with `overflow-wrap: anywhere`, never `word-break: break-all` | on | Ours |
| `remote-font` | Fonts are self-hosted | on | Ours |
| `font-fallback` | Every font stack ends in a generic family | on | Ours |
| `budget` | First-render JavaScript stays within a budget, gzipped | 250,000 B (`budget.limitBytes`); `"budget": false` when the app keeps its own budget test | Ours |

## By hand

The checks miss most real problems. After a sweep, read every screenshot for: text overprinting the next column, labels colliding in charts, words broken mid-word, centred labels that should be left-aligned, clipped icons, misaligned headers, tables wider than the phone. Confirm each fix with `confirm`.

Status shown by colour alone, text on images, overlays (closed during a sweep) and the rest of the review checklist are judged by hand. The plugin's review procedure walks them.
