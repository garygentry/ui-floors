# ui-floors

Checks that bring any web UI up to a sound baseline: `STANDARD.md` (the rules), the checks package in `src/`, and a Claude Code plugin (`.claude-plugin/`, one skill in `skills/ui/`) whose procedures use them. Public, Apache-2.0.

## Rules

- **A rule and its check change together,** in one commit, with a line in `CHANGELOG.md`. `test/standard.test.ts` holds the standard and the checks together.
- **Floors and opinions.** A floor is backed by WCAG or plainly broken UI, and always applies. Everything else is an opinion, with a default value, a warning unless an app says otherwise. Moving a rule between kinds is a breaking change.
- **Credit sources.** Every rule names its source in `STANDARD.md`. A rule, text or idea taken from someone else's work is credited there and in `NOTICE`, after checking its licence allows the use. Don't copy third-party code or text without its licence's notice. Say plainly what is derived; don't present it as original.
- **Nothing private.** This repo is public. Don't add names, paths or details of private projects, in files or commit messages.
- **The plugin has one skill.** Procedures go under it; `test/plugin.test.ts` holds the plugin's version and paths to the package. Third-party skills are credited and called if installed, not bundled.
- **Each check has a fixture** in `test/fixtures` that fails without it, and the clean and false-positive pages stay silent.
- **Releases go through `release.yml`** from a `v*` tag, as `RELEASING.md` says. Never publish from a laptop or from `main`.
- **Commit each piece of work.** Push, tag or publish only with the owner's approval.
- Prose follows plain house style: short sentences, sentence case, no marketing language.

## Commands

- Install: `bun install`, then `./node_modules/.bin/playwright install chromium` once.
- Typecheck and test: `bun run check` (about a minute; the sweep tests launch Chromium).
- Refresh type declarations after changing exports: `bun run types`.
