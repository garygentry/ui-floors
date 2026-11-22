#!/usr/bin/env bun
// Release preflight, run by release.yml's verify job on a v* tag. Fails unless the tag, package.json, the plugin
// manifests and STANDARD.md agree on one version, CHANGELOG.md has a dated section for it, and package.json's name and
// repository.url are exactly what npm's trusted publisher expects (a mismatch would only fail at the publish PUT,
// after approval). The expected name and URL come from release.yml's env (PACKAGE, REPOSITORY_URL). Writes that section to
// dist/NOTES.md (the release notes) and version, tag and is_prerelease to $GITHUB_OUTPUT.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Preflight = { version: string; tag: string; isPrerelease: boolean; notes: string };
export type Expect = { name: string; repositoryUrl: string };

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function preflight(root: string, tag: string, expect: Expect): Preflight {
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const json = (p: string) => JSON.parse(read(p));
  const errors: string[] = [];
  const pkg = json("package.json");
  const version = pkg.version as string;
  if (!expect.name || !expect.repositoryUrl) errors.push("the expected package name and repository URL must be given (PACKAGE, REPOSITORY_URL)");
  if (pkg.name !== expect.name) errors.push(`package.json name "${pkg.name}" isn't "${expect.name}"`);
  const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  if (repo !== expect.repositoryUrl) errors.push(`package.json repository.url "${repo}" isn't exactly "${expect.repositoryUrl}" (trusted publishing needs an exact, case-sensitive match)`);
  if (!SEMVER.test(version)) errors.push(`package.json version "${version}" isn't semver`);
  if (tag !== `v${version}`) errors.push(`tag ${tag} doesn't match package.json version ${version} (want v${version})`);
  const plugin = json(".claude-plugin/plugin.json").version;
  if (plugin !== version) errors.push(`.claude-plugin/plugin.json version ${plugin} isn't ${version}`);
  const market = json(".claude-plugin/marketplace.json").plugins.map((p: { version: string }) => p.version);
  if (market.some((v: string) => v !== version)) errors.push(`.claude-plugin/marketplace.json versions ${market.join(", ")} aren't ${version}`);
  if (!read("STANDARD.md").includes(`Version ${version},`)) errors.push(`STANDARD.md doesn't say "Version ${version},"`);

  // The changelog section: "## X.Y.Z (YYYY-MM-DD)", up to the next "## ".
  const changelog = read("CHANGELOG.md");
  const head = new RegExp(`^## ${version.replace(/\./g, "\\.")} \\((\\d{4}-\\d{2}-\\d{2})\\)$`, "m");
  const m = head.exec(changelog);
  let notes = "";
  if (!m) errors.push(`CHANGELOG.md has no "## ${version} (YYYY-MM-DD)" section (an "unreleased" heading doesn't count)`);
  else {
    const rest = changelog.slice(m.index + m[0].length);
    const next = rest.search(/^## /m);
    notes = (next === -1 ? rest : rest.slice(0, next)).trim();
    if (!notes) errors.push(`CHANGELOG.md's ${version} section is empty`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { version, tag, isPrerelease: SEMVER.exec(version)![4] !== undefined, notes };
}

if (import.meta.main) {
  const root = join(import.meta.dir, "..", "..");
  const tag = process.env.TAG ?? process.env.GITHUB_REF_NAME ?? "";
  try {
    const p = preflight(root, tag, { name: process.env.PACKAGE ?? "", repositoryUrl: process.env.REPOSITORY_URL ?? "" });
    mkdirSync(join(root, "dist"), { recursive: true });
    writeFileSync(join(root, "dist", "NOTES.md"), p.notes + "\n");
    const out = `version=${p.version}\ntag=${p.tag}\nis_prerelease=${p.isPrerelease}\n`;
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, out);
    console.log(out.trim());
  } catch (e) {
    for (const line of String((e as Error).message).split("\n")) console.error(`::error::${line}`);
    process.exit(1);
  }
}
