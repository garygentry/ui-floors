# Set up the checks

Gives a repo a `ui-floors.json` with its page manifest, and a way to run the checks. Each step is idempotent: skip
what exists, and bring what's stale up to date.

## 1. Learn the app

Most mistakes are avoided here.

- Read the repo's agent instructions, README, contributing docs and any design file. List the rules that touch UI:
  semantic colours, token-only styling, a type scale, a vendored component library and its editing rule, visual
  baselines, budgets. These beat the standard.
- Find the design layer: the theme or token file, the Tailwind config, the component library.
- Find the pages: a route table, or an existing browser-test list with a ready selector per page.
- Find the commands: dev server (and any mock-data mode), build, typecheck, tests. Run them once and note the
  baseline. If something is red before you start, say so and don't build on it.

## 2. Committed or ad hoc

- **Committed** (the default in a repo the user owns, or when they want the checks in CI): add `@garygentry/ui-floors` and, if the
  app has none, `playwright` as dev dependencies, and put `ui-floors.json` at the app's root. If the app pins
  Playwright, keep its version; install Chromium with `./node_modules/.bin/playwright install chromium`.
- **Ad hoc** (the repo shouldn't gain a dependency or a file, or the user only wants a pass): install outside the
  repo, in a scratch folder, and keep the config there with absolute paths:

  ```sh
  mkdir -p <scratch>/ui-floors && cd <scratch>/ui-floors
  printf '{"private":true}\n' > package.json
  bun add -d @garygentry/ui-floors playwright
  ./node_modules/.bin/playwright install chromium
  ./node_modules/.bin/ui-floors sweep --config <scratch>/ui-floors/ui-floors.json
  ```

  Paths in the config resolve from the config's folder, so give the app's files as absolute paths. Nothing in the
  repo changes except the fixes themselves.

Ask only if the repo's rules and the user's request don't settle it.

## 3. Write `ui-floors.json`

- `contrast.files`: the theme or token CSS. `lint.include`: the source folders and `index.html`.
  `lint.tokenFiles`: the files allowed to hold literal colours.
- `stack`: `react-tailwind`, or `css` for anything else.
- `pages`: a `{ path, ready }` pair for each route, with a selector that exists once the page has rendered. Add a page
  for each display mode the app has (a kiosk view, an empty state). If the app already has a page list in code,
  load the config with `loadConfig`, set `cfg.pages` from that list, and call `sweep()` from a test instead of
  copying it.
- `widths`: the app's own review widths, if it has them. The focus check runs at the widest.
- `budget`: the build's folder and entry. If the server injects the entry script at serve time (a nonce-based CSP),
  the built HTML lists none: set `"budget": false` and use the app's own budget test.
- `rules`: leave opinions at their default (warn) unless the repo's own rules settle one. Where the repo's design
  system contradicts an opinion, set that rule to `off` or change its value, with a note in the report.

## 4. Wire it (committed only)

- Contrast and lint are fast: add `ui-floors static` to the app's main verify or lint script.
- The sweep needs a build and a browser. For a static single-page app: `"ui:sweep": "<build> && ui-floors sweep
  --serve dist"` (the server falls back to `index.html`). An app with a backend usually has a dev server with mock
  data: sweep that with `--base`, using the scenario that shows the most states.
- Add the screenshots folder (`out`, default `shots`) to `.gitignore`. Never commit screenshots. If the repo keeps
  visual baselines in CI, leave them to its own workflow.

Run everything once, then go on to the procedure that sent you here.
