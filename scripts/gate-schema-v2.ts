#!/usr/bin/env bun
// gate-schema-v2.ts — binary eligibility gate for the charter-schema-v2 tournament.
//
// NOT a judge. It decides only whether a submission may BE judged. Every check is
// mechanical, so a script answers it rather than an agent: agents forgive, scripts
// don't. A judge never sees a submission that fails here.
//
//   bun gate-schema-v2.ts <worktree>     exit 0 = eligible, 1 = rejected (reason printed)
//
// Required artifacts in the worktree:
//   templates/squad-multi-v2.yaml   the proposed template (placeholders allowed)
//   SCHEMA-V2.md                    the spec and rationale

import { $ } from "bun";
import { basename, dirname, join } from "node:path";

$.throws(false);

const RENDER =
  process.env.CREW_RENDER ??
  "/opt/Code/github.com/Soul-Brews-Studio/crew-master-charters/scripts/render.sh";
const MAX_LINES = 250;

class Reject extends Error {}
const reject = (code: string, why: string): never => {
  throw new Reject(`${code}: ${why}`);
};

const lineCount = (s: string) => s.split("\n").length - (s.endsWith("\n") ? 1 : 0);

async function gate(worktree: string): Promise<string> {
  const tplPath = join(worktree, "templates/squad-multi-v2.yaml");
  const specPath = join(worktree, "SCHEMA-V2.md");

  // ── G1 artifacts present ────────────────────────────────────────────
  const tplFile = Bun.file(tplPath);
  const specFile = Bun.file(specPath);
  if (!(await tplFile.exists())) reject("G1", "missing templates/squad-multi-v2.yaml");
  if (!(await specFile.exists())) reject("G1", "missing SCHEMA-V2.md");

  const tpl = await tplFile.text();
  const spec = await specFile.text();

  // ── G2/G3 size budget ───────────────────────────────────────────────
  const specLines = lineCount(spec);
  const tplLines = lineCount(tpl);
  if (specLines > MAX_LINES) reject("G2", `SCHEMA-V2.md is ${specLines} lines (max ${MAX_LINES})`);
  if (tplLines > MAX_LINES) reject("G3", `template is ${tplLines} lines (max ${MAX_LINES})`);

  // ── G8 pool slot must be parameterised, not hardcoded (trap #14) ────
  // The engine KEY selects the pool, so a template that pins omx-1 forces every
  // crew onto slot 1 and they silently share one credential.
  // Checking the command string would be a proxy check — the same mistake
  // preflight makes when it compares CODEX_HOME paths instead of pool slots.
  // maw reads the KEY, so the KEY is what has to vary.
  if (/codex-setup/.test(tpl)) {
    const keys = [...tpl.matchAll(/^ {2}([^\s:]+):\s*"/gm)].map((m) => m[1]);
    const engineKeys = keys.filter((k) => /^(omx|__)/.test(k));
    const keyIsParameterised = engineKeys.some((k) => /__[A-Z0-9_]+__|\$\{?[A-Za-z_]/.test(k));
    if (!keyIsParameterised)
      reject(
        "G8",
        `engine key is fixed (${engineKeys.join(", ") || "none"}) — maw selects the pool from the KEY, ` +
          `not the command string (trap #14), so every crew rendered from this template lands on the same slot. ` +
          `The key itself must be a placeholder, e.g. "__ENGINE1__:"`,
      );
  }

  // ── G4 render.sh must consume it ────────────────────────────────────
  // render.sh resolves templates relative to its own ../templates, so stage a
  // uniquely-named copy there and remove it afterwards, whatever happens.
  const stageName = `gate-probe-${process.pid}`;
  const staged = join(dirname(RENDER), "..", "templates", `${stageName}.yaml`);
  const scratch = `/tmp/${stageName}-repo`;

  try {
    await Bun.write(staged, tpl);
    await $`mkdir -p ${scratch}`.quiet();
    await $`git init -q ${scratch}`.quiet().nothrow();
    await $`git -C ${scratch} remote add origin https://github.com/gate-probe/repo.git`.quiet().nothrow();

    const r = await $`${RENDER} --template ${stageName} --target ${scratch} --team gateprobe --session gateprobe --lead-name gateprobe`
      .quiet()
      .nothrow();
    if (r.exitCode !== 0)
      reject("G4", `render.sh failed — ${r.stderr.toString().trim().split("\n").slice(-2).join(" ")}`);

    const charterPath = r.stdout.toString().match(/^wrote:\s*(.+)$/m)?.[1]?.trim();
    if (!charterPath || !(await Bun.file(charterPath).exists()))
      reject("G4", "render.sh wrote no charter");
    const charter = await Bun.file(charterPath!).text();

    // ── G6 no placeholder survived substitution ───────────────────────
    const left = [...new Set([...charter.matchAll(/__[A-Z0-9_]+__/g)].map((m) => m[0]))];
    if (left.length) reject("G6", `unsubstituted placeholder(s): ${left.join(" ")}`);

    // ── G5 maw must accept the charter SCHEMA ─────────────────────────
    // preflight fails overall here (nothing is spawned); gate only on the
    // charter-schema verdict line.
    const pre = await $`maw team preflight ${charterPath}`.quiet().nothrow();
    const schemaLine = (pre.stdout.toString() + pre.stderr.toString())
      .split("\n")
      .find((l) => l.includes("charter schema"));
    if (!schemaLine) reject("G5", "preflight produced no charter-schema verdict");
    if (!schemaLine!.includes("✓"))
      reject("G5", `charter schema rejected —${schemaLine!.split("charter schema")[1] ?? ""}`);

    // ── G7 provenance must be declared (the stated purpose of v2) ─────
    if (!/^\s*(provenance|origin|rendered_from|source):/im.test(charter))
      reject("G7", "rendered charter declares no provenance field");

    // ── G9 two crews from one template must not collide ───────────────
    // The whole point of v2 is several crews in one repo. If two renders produce
    // a member with the same name, they are not separable — and a template can
    // state "every name derives from the team" while its lead quietly does not.
    // That is checkable by rendering twice, so it is a gate, not a judgement.
    const names = async (team: string, session: string): Promise<string[]> => {
      const rr = await $`${RENDER} --template ${stageName} --target ${scratch} --team ${team} --session ${session} --lead-name repo`
        .quiet()
        .nothrow();
      if (rr.exitCode !== 0)
        reject("G9", `render failed for team '${team}' — ${rr.stderr.toString().trim().split("\n").slice(-1)[0]}`);
      const p = rr.stdout.toString().match(/^wrote:\s*(.+)$/m)?.[1]?.trim();
      if (!p) reject("G9", `render wrote no charter for team '${team}'`);
      const body = await Bun.file(p!).text();
      return [...body.matchAll(/^\s+name:\s*(.+)$/gm)].map((m) => m[1].trim());
    };

    // Same --lead-name for both, which is the realistic case: an operator names
    // the lead after the repo, not per crew.
    const a = await names("crewalpha", "crewalpha");
    const b = await names("crewbeta", "crewbeta");
    const collisions = a.filter((n) => b.includes(n));
    if (collisions.length)
      reject(
        "G9",
        `two crews rendered from this template share member name(s): ${[...new Set(collisions)].join(", ")}. ` +
          `Rendered as team 'crewalpha' and 'crewbeta' with the same --lead-name repo. ` +
          `Every member name must derive from the team name — including the lead.`,
      );

    return `spec=${specLines}L template=${tplLines}L charter=${basename(charterPath!)} members=${a.length} no-collision`;
  } finally {
    await $`rm -f ${staged}`.quiet().nothrow();
  }
}

if (import.meta.main) {
  const worktree = Bun.argv[2];
  if (!worktree) {
    console.error("usage: bun gate-schema-v2.ts <worktree>");
    process.exit(1);
  }
  if (!(await Bun.file(join(worktree, ".")).exists().catch(() => false))) {
    // Bun.file on a directory is unreliable; probe with a shell test instead
  }
  const exists = (await $`test -d ${worktree}`.quiet().nothrow()).exitCode === 0;
  if (!exists) {
    console.log(`REJECT G0: worktree not found: ${worktree}`);
    process.exit(1);
  }

  try {
    const detail = await gate(worktree);
    console.log(`PASS: ${worktree}`);
    console.log(`  ${detail}`);
  } catch (e) {
    console.log(`REJECT ${e instanceof Reject ? e.message : String((e as Error)?.stack ?? e)}`);
    process.exit(1);
  }
}
