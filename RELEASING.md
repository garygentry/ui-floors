# Releasing

Publishing follows the estate's process (gnet-lg ADR 0046 Amendment 4), modelled on garygentry/rauf. One human
approval per release gates the irreversible steps. No npm token exists anywhere.

## One-time setup (the owner, as repo admin)

In this order:

1. **Tag ruleset `release-tags`** (Settings → Rules → Rulesets → New tag ruleset): active, target `v*`, restrict
   creations, bypass list Repository admin only. This does **not** bind the agent: its token (gnet-lg-dev) acts as
   `garygentry`, an admin on the bypass list, so it can push `v*` tags, and verify's actor check passes for the same
   reason. The ruleset and the actor check stop outside contributors only. The `release` environment's approval is
   the real gate.
2. **Environment `release`** (Settings → Environments): required reviewer `garygentry`; "Prevent self-review" off
   (agent-pushed tags run as the owner and could never be approved otherwise); admin bypass disallowed; deployment
   branches and tags limited to `v*` tags.
3. **Merge `release.yml`** to `main`. npm trusts it by filename, so don't rename it.
4. **The package must exist on npm** before a trusted publisher can be bound to it. For a new package, the owner
   publishes a placeholder `0.0.0` once by hand, with 2FA (see below).
5. **npmjs.com → `@garygentry/ui-floors` → Settings:** Trusted publisher = GitHub Actions, owner `garygentry`, repo
   `ui-floors`, workflow `release.yml`, environment `release`, with "Allow npm publish" checked. Then Publishing access
   → "Require two-factor authentication and disallow tokens". A new trusted publisher must complete its first publish
   within 2 days, or it expires.
6. **First gated release** (`v0.1.0`) proves the switch.

The agent's GitHub App token must never hold Deployments: write or Administration: write: either would let it approve
or dismantle its own gate.

### The placeholder publish

From an empty folder, logged in to npm as the owner (`npm login`, 2FA):

```sh
printf '{ "name": "@garygentry/ui-floors", "version": "0.0.0", "description": "Placeholder; see https://github.com/garygentry/ui-floors", "license": "Apache-2.0", "repository": { "type": "git", "url": "git+https://github.com/garygentry/ui-floors.git" } }\n' > package.json
npm publish --access public
npm deprecate @garygentry/ui-floors@0.0.0 "Placeholder. Use 0.1.0 or later."
npm logout
```

## Cutting a release

1. A release-prep PR: bump the version in `package.json`, `.claude-plugin/plugin.json`,
   `.claude-plugin/marketplace.json` and `STANDARD.md`; date the `CHANGELOG.md` section (`## X.Y.Z (YYYY-MM-DD)`).
   CI runs the quality gate. Merge it.
2. Tag the merge commit and push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. `release.yml` runs `verify`: preflight (`scripts/release/preflight.ts`: the versions agree and the changelog section
   exists), no existing release, version not on npm, the quality gate, `npm pack`, and a summary on the run page:
   version, package contents, changelog, the diff since the last tag, and a caution if `.github/` changed.
4. The owner reads the summary and approves the `release` environment, on the web or in GitHub Mobile.
5. `publish` attests the tarball, creates the GitHub Release with it, and runs
   `npm publish ./dist/*.tgz --access public --provenance` through trusted publishing. Prereleases go to dist-tag
   `next`, stable versions to `latest`.

Never publish from `main` or from a laptop. If `publish` fails part-way, use "Re-run failed jobs"; each step skips work
that already landed. An E404 on the PUT right after "Provenance statement published" means the trusted publisher entry
doesn't match (repo, `release.yml`, environment `release`): fix it on npmjs.com and re-run.
