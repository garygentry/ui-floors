#!/usr/bin/env bun
// ui-floors: the command line. Exit 0 when clean, 1 on any error finding, 2 on bad usage.

import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig, rel, type Config } from "./config.ts";
import { checkContrast } from "./contrast.ts";
import { lint } from "./lint.ts";
import { checkBudget } from "./budget.ts";
import { sweep } from "./sweep.ts";
import { confirm } from "./confirm.ts";
import { serveDir, type Served } from "./serve.ts";
import { failing, makeReport, printSummary, type Finding } from "./report.ts";
import { applyRules, checkFloors, checkRules } from "./rules.ts";

const USAGE = `ui-floors <command> [options]

Commands:
  sweep     Screenshot every page in the manifest at each width and scheme, and run the layout checks
  confirm   Element screenshots for fixed problems (the config's "confirm" cases, or the names given)
  contrast  Contrast of theme token pairs, light and dark
  lint      Source lint: literal colours, transition: all, break-all, fonts, reduced motion
  budget    Gzip size of first-render JS in the build
  static    contrast, lint and budget together (no browser)

Options:
  --config <file>   Config file (default ui-floors.json, else the old ui-checks.json)
  --base <url>      Base URL of the running app (overrides the config)
  --serve <dir>     Serve a folder (a build or a fixture) and sweep that instead of --base
  --out <dir>       Where screenshots and report.json go (default: the config's "out")
  --only <text>     Sweep only pages whose path contains this
  --scheme <s>      light, dark, or both (default: the config's schemes)
  --width <n>       Sweep one width only
  --json            Print the report as JSON
`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      base: { type: "string" },
      serve: { type: "string" },
      out: { type: "string" },
      only: { type: "string" },
      scheme: { type: "string" },
      width: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, ...rest] = positionals;
  if (!command || values.help) {
    console.log(USAGE);
    return command ? 0 : 2;
  }
  let cfg: Config;
  try {
    cfg = loadConfig(values.config);
  } catch (e) {
    console.error(String((e as Error).message));
    return 2;
  }
  if (values.base) cfg.base = values.base;
  const out = values.out ? resolve(values.out) : rel(cfg, cfg.out);
  const configErrors = [...checkRules(cfg.rules), ...checkFloors(cfg.floors)];
  const emit = (command: string, findings: Finding[], extra: Record<string, unknown> = {}) => {
    findings = [...configErrors, ...applyRules(findings, cfg.rules)];
    if (values.json) console.log(JSON.stringify(makeReport(command, findings, extra), null, 1));
    else printSummary(command, findings);
    return failing(findings).length ? 1 : 0;
  };

  const runStatic = (which: string): Finding[] => {
    const fs: Finding[] = [];
    if (which === "contrast" || which === "static") {
      const c = checkContrast(cfg.contrast.files.map((f) => rel(cfg, f)), cfg.contrast.pairs, cfg.root);
      if (!values.json) console.log(`contrast: ${c.checked ?? 0} token pair(s) measured, light and dark`);
      fs.push(...c);
    }
    if (which === "lint" || which === "static") {
      const l = lint({ root: cfg.root, stack: cfg.stack, ...cfg.lint });
      if (!values.json) console.log(`lint: ${l.files} file(s)`);
      fs.push(...l.findings);
    }
    if (which === "budget" || which === "static") {
      const budget = cfg.budget;
      if (budget === false) {
        if (!values.json) console.log("budget: off in ui-floors.json (the app keeps its own budget test)");
      } else {
        const b = checkBudget(rel(cfg, budget.dist), budget.entry, budget.limitBytes);
        if (!values.json) console.log(`budget: first-render JS ${b.totalGzip.toLocaleString("en-US")} of ${b.limit.toLocaleString("en-US")} B gzip, ${b.files.length} file(s)`);
        fs.push(...b.findings);
      }
    }
    return fs;
  };

  switch (command) {
    case "contrast":
    case "lint":
    case "budget":
    case "static":
      return emit(command, runStatic(command));
    case "sweep":
    case "confirm": {
      let served: Served | undefined;
      if (values.serve) {
        served = serveDir(resolve(values.serve));
        cfg.base = served.base;
      }
      try {
        if (command === "sweep") {
          if (!cfg.pages.length) { console.error("no pages in the manifest (pages in ui-floors.json)"); return 2; }
          const schemes = values.scheme === "both" || !values.scheme ? undefined : [values.scheme as "light" | "dark"];
          const report = await sweep(cfg, { only: values.only, schemes, widths: values.width ? [Number(values.width)] : undefined, out });
          if (!values.json) console.log(`pages shot: ${(report.shots as unknown[]).length}; report: ${join(out, "report.json")}`);
          return emit("sweep", report.findings);
        }
        const results = await confirm(cfg, { names: rest, out: join(out, "confirm") });
        mkdirSync(join(out, "confirm"), { recursive: true });
        writeFileSync(join(out, "confirm", "confirm.json"), JSON.stringify(results, null, 1));
        for (const r of results) console.log(r.ok ? `ok   ${r.name} ${r.file}` : `FAIL ${r.name} ${r.error}`);
        if (!results.length) { console.error("no confirm cases matched"); return 2; }
        return results.every((r) => r.ok) ? 0 : 1;
      } finally {
        served?.stop();
      }
    }
    default:
      console.error(`unknown command: ${command}\n\n${USAGE}`);
      return 2;
  }
}

process.exit(await main(process.argv.slice(2)));
