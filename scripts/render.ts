#!/usr/bin/env bun
// render.ts — render a squad template into a target repo's ψ/teams/<name>.yaml
//
// Bun rewrite of render.sh. Wins over the bash original:
//   • placeholder substitution via replaceAll() — no sed delimiter fragility
//     (the bash mixes s/…/ and s#…# because $PROJECT holds a '/'; a value with
//      both '/' and '#' would break it. replaceAll has no delimiter to collide.)
//   • default out-dir is ψ/teams (charters are records → live in the vault);
//     override with --out-dir. .maw is left for pure runtime.
//   • Bun.$ used only where a shell is genuinely needed (git remote lookup).
//
// Usage:
//   bun render.ts --template squad-2-starter --target /path/to/repo \
//     --team myteam --session mysession [--lead-name repo] [--base main] \
//     [--roles frontend,backend,infra,test,research] [--out-dir DIR] [--dry-run]
//
// maw-rs#738: the charter parser is LINE-BASED (raw.split('#')[0]) — a bare '#'
// in any substituted value silently truncates the line. This refuses to render
// if any value contains '#'.

import { $ } from "bun";
import { basename, dirname, join, resolve } from "node:path";

const HERE = dirname(Bun.fileURLToPath(new URL(import.meta.url)));
const TEMPLATES_DIR = process.env.TEMPLATES_DIR ?? resolve(HERE, "../templates");

// ── arg parse ──
const opts: Record<string, string> = {};
let dryRun = false;
const argv = Bun.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dry-run") { dryRun = true; continue; }
  const key = a.replace(/^--/, "");
  const val = argv[++i];
  if (val === undefined) die(`missing value for ${a}`);
  opts[key] = val;
}

function die(msg: string): never { console.error(msg); process.exit(1); }

const template = opts.template ?? die("missing --template (see templates/ for names)");
const target   = opts.target   ?? die("missing --target <repo-path>");
const team     = opts.team     ?? die("missing --team <name>");
const session  = opts.session  ?? die("missing --session <tmux-session>");
const base     = opts.base ?? "main";
const roles    = (opts.roles ?? "frontend,backend,infra,test,research").split(",");

const tpl = join(TEMPLATES_DIR, `${template}.yaml`);
if (!(await Bun.file(tpl).exists())) {
  console.error(`no such template: ${tpl}`);
  console.error("available:");
  console.error((await Array.fromAsync(new Bun.Glob("*.yaml").scan(TEMPLATES_DIR))).join("\n"));
  process.exit(1);
}

if (!(await Bun.file(join(target, ".git/HEAD")).exists())) {
  die(`target is not a git repo root: ${target}`);
}

// derive project (org/repo) from target's git remote, else from the path
let project = "";
try {
  const url = (await $`git -C ${target} remote get-url origin`.quiet().text()).trim();
  project = url.replace(/.*[:/]([^/]+\/[^/]+?)(\.git)?$/, "$1");
} catch { /* no remote — fall through */ }
if (!project) project = `${basename(dirname(target))}/${basename(target)}`;

const leadName = opts["lead-name"] ?? basename(target);
const [r1 = "", r2 = "", r3 = "", r4 = "", r5 = ""] = roles;

// ── guard: no '#' anywhere in a substituted value (line-based-parser trap) ──
const subs: Record<string, string> = {
  __TEAM_NAME__: team, __PROJECT__: project, __SESSION__: session,
  __BASE_BRANCH__: base, __LEAD_NAME__: leadName,
  __ROLE1__: r1, __ROLE2__: r2, __ROLE3__: r3, __ROLE4__: r4, __ROLE5__: r5,
};
for (const v of Object.values(subs)) {
  if (v.includes("#")) {
    die(`REFUSING: value '${v}' contains '#' — the charter parser truncates the line at the first '#' (maw-rs#738). Remove it.`);
  }
}

let rendered = await Bun.file(tpl).text();
for (const [ph, v] of Object.entries(subs)) rendered = rendered.replaceAll(ph, v);

const outDir = opts["out-dir"] ?? join(target, "ψ/teams");
const out = join(outDir, `${team}.yaml`);

if (dryRun) {
  console.log(`── DRY RUN — would write to: ${out} ──`);
  console.log(rendered);
  process.exit(0);
}

if (await Bun.file(out).exists()) {
  die(`REFUSING: ${out} already exists — remove it first or pick a different --team name (never silently overwrite a live charter).`);
}

await Bun.$`mkdir -p ${outDir}`.quiet();
await Bun.write(out, rendered.endsWith("\n") ? rendered : rendered + "\n");
console.log(`wrote: ${out}`);
console.log(`
next (verified flow — crew-master-oracle/ψ/skills/crew-up/references/maw-rs-v26-worktree-spawn.md):
  cd ${target}
  maw team preflight ${out}
  maw team load ${out} --no-spawn
  maw team status ${team}   # check for name collisions in the machine-global registry first
  maw team up ${team} --only <coder-roles> --dry-run
  maw team up ${team} --only <coder-roles>
  maw peek ${session}:<coder>   # confirm real engine booted, not a bare shell
  maw hey ${session}:<coder> "<real task>"   # charter prompt is NOT delivered at spawn`);
