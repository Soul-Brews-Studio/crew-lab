# crew-lab

A lab for spawning, verifying, and tearing down parallel codex crews on a single repo —
and a `maw` plugin that encodes what went wrong while doing it.

Every guard in this repo exists because it was hit for real, then reproduced.

## `maw crew`

```bash
maw crew up <name> --pools 1,5      # render → worktrees → sessions → gates → spawn
maw crew verify <prefix>            # prove isolation from ground truth (exit 1 = do not dispatch)
maw crew status [prefix]            # real state, read from tmux
maw crew down <prefix>              # Nothing-is-Deleted teardown
```

Formerly `maw crew-lab`, which still works as an alias.

### Why `verify` exists

Spawning two crews and reading the setup output is not evidence that they are isolated.
The output states *intent*; the wake command runs afterwards and can overwrite it.

```
── crew-lab-jA07311034
  session   : UP (crewlabja07311034)
  buddy     : pool 1 ✓ (auth matches ~/.codex-team/1)
  buddy     : model gpt-5.5 xhigh
── crew-lab-jB07311034
  session   : UP (crewlabjb07311034)
  buddy     : pool 5 ✓ (auth matches ~/.codex-team/5)
  buddy     : model gpt-5.5 xhigh

auth pairwise  : ✓ no two members share credentials (2 checked)
pools distinct : ✓ (1 5)
models equal   : ✓ gpt-5.5 xhigh

VERIFIED
```

`verify` reads the bytes: it hashes each member's `auth.json` and matches it against the
pool it actually came from, compares members **pairwise** (two crews can each look fine
individually while holding one credential), and flags crews running different models —
which silently confounds any comparison between their output.

## Traps this encodes

| # | Trap | Guard |
|---|------|-------|
| 1 | `maw worktree add` defaults to a base branch the repo may not have | `--base main` always passed |
| 9 | Two crews share credentials while preflight stays green — it compares `CODEX_HOME` *paths* (which differ) not pool slots (which don't) | pairwise `auth.json` hashing |
| 10 | Pool slots are not contiguous | pools are listed, never computed; an unknown slot fails with the real list |
| 11 | Different pool ⇒ different model — two crews from one template are not one variable | `models equal` check |
| 13 | A charter is frozen in the registry at load; editing the yaml afterwards changes nothing | mtime drift is reported |
| 14 | The engine **key name** (`omx-5`) picks the pool — the command string is ignored | key, member ref, and command are all rewritten |
| — | `maw team status` reports `idle` unconditionally without querying tmux | `status` reads tmux |
| — | A bare `maw team up` on a mixed charter destroys coder worktrees | always scoped with `--only <coder roles>` |

Full write-up in [`ψ/writing/cheatsheets/`](ψ/writing/cheatsheets/).

## Install

The plugin no longer lives here. It was budded out to its own public repo and is
maintained there:

**https://github.com/Soul-Brews-Studio/maw-crew**

```bash
git clone https://github.com/Soul-Brews-Studio/maw-crew
cd maw-crew && bun install
ln -s "$PWD" ~/.maw/plugins/crew   # link name must match cli.command
maw plugin info crew
```

maw discovers plugins by scanning that directory. `plugins.lock` and `registry-cache.json`
are derived state and should not be edited by hand.

The command is `maw crew` as of maw-crew `894f2d5`; `maw crew-lab` still works as a
back-compat alias. The alias comes from `cli.aliases` — **not** a second symlink, which
would double-register the plugin. So `maw plugin info crew-lab` returns not found while
`maw crew-lab` runs fine: an alias is a command name, not a registered directory.

The copy that used to sit in `plugins/crew-lab/` was deleted once it had drifted from the
published plugin (no `runtime: "bun-dev"`, no `crew` alias, missing the `$PWD` cwd fix).
Editing it changed nothing, because the link in `~/.maw/plugins/` points at the maw-crew
repo — a two-source-of-truth trap of the same family as the rest of this README. One source
now. (This very block drifted within the hour: it was written naming the old link name and
went stale the moment the rename landed. Pointing at another repo does not exempt you from
its changes.)

Two things that cost time when writing a maw plugin:

- `cli.flags` in `plugin.json` must be an **object** (`{"--pools": "string"}`), not an array —
  as an array the plugin is not discovered at all.
- maw **executes** the entry file rather than importing it, so a bare `export default` never
  runs. An `import.meta.main` block is what actually serves the command.

## Known state of this machine's credential pools

`~/.codex-team/2` and `~/.codex-team/5` currently hold **byte-identical credentials**
(both `10d36937`, after a `cp` followed a symlink into slot 5 on 2026-07-31). The
original slot-5 account is not recoverable from disk and needs a fresh `codex login`.

Until then, `--pools 1,5` is correct at the render layer and still lands two crews on
one account. `maw crew verify` catches it — the point of checking credentials
pairwise rather than one at a time.

Slot 1 and `hermes` are also the same account with different tokens: different bytes,
one quota.

## Requirements

- `maw` with the `team` and `worktree` verbs
- [Bun](https://bun.sh) — the plugin is TypeScript, executed by maw
- charter templates from `crew-master-charters`; point at them with `CREW_RENDER=/path/to/render.sh`
- codex credential pools under `~/.codex-team/<slot>/`

## Conventions

- **Nothing is deleted.** `down` moves worktrees to `/tmp` and keeps the charter as a record.
- **Charters live in `ψ/teams/`.** One charter is one team life-cycle; names are never reused.
- **Never trust a spawn you have not verified.**

## License

MIT
