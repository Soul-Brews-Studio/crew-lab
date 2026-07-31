# Charter schema v2

Supports several crews running concurrently in one repository, and records what
produced each charter.

Every rule below is enforced by `gate-schema-v2.ts`. Nothing is asserted here
that a script cannot check — an invariant with no test is a wish.

## Top-level fields

| Field | Meaning |
|---|---|
| `name` | crew name, unique per repo; every member name derives from it |
| `project` | `owner/repo` |
| `session` | tmux session, one per crew |
| `base_branch` | branch the lead stays on and coder branches fork from |
| `goal` | one line, free text |
| `provenance` | what produced this charter (below) |
| `engines` | one entry per credential slot in use |
| `members` | coders and exactly one lead |

## Member fields — required for every member, lead included

`role`, `name`, `engine`, `worktree`, `branch`, `prompt`.

The lead is not an exception. A rule that exempts one member is a rule that does
not hold, and the exemption is where collisions hide.

- `worktree` is a path, or `false` for the lead, which owns none.
- `name` is `<name>-<role>` — derived from the crew name for **every** member.
  `--lead-name` names the operator's lead process; it must not appear in a member
  name, or two crews rendered with the same `--lead-name` produce two members
  called the same thing. *(gate G9 renders two crews and compares names)*

## Engines: the key selects the slot

`maw` reads the credential slot from the engine **key name** — `omx-5` means slot
5. The command string is not consulted for slot selection.

A template must therefore write the key as `__ENGINE1__ … __ENGINEn__`, which
`render.sh --pools` substitutes to `omx-<slot>`. A fixed key pins every crew
rendered from the template to one slot, so they share one credential while every
path-based check still looks isolated. *(gate G8)*

`__POOLn__` substitutes to the bare slot number and must be used for the
`codex-setup.ts` argument, so the command cannot disagree with its own key.

Slots are supplied as an explicit list (`--pools 1,5`). They are not contiguous
on a given machine, so any arithmetic on them produces a slot that does not exist.

## Provenance

Records the inputs a render consumed: `template`, `team`, `project`, `session`,
`base_branch`, `engine_keys`, `pool_slots`.

`engine_keys` is included because the key is what actually selects the credential.
Recording only the pool argument would leave the audit trail unable to answer the
one question it exists for: which credential did this crew run on.

Provenance holds only values the renderer substitutes. A field like "rendered at
<time>" cannot be filled by a placeholder substitution and would render as a
literal, so it is not claimed here.

## Values that break the parser

The charter parser is line-based and truncates a line at the first `#`. Any
substituted value containing `#` will silently lose the rest of its line;
`render.sh` refuses such values before writing.

## What the gate checks

| | |
|---|---|
| G1 | both artifacts present |
| G2/G3 | each ≤ 250 lines |
| G4 | `render.sh` consumes the template |
| G5 | `maw team preflight` accepts the rendered schema |
| G6 | no `__PLACEHOLDER__` survives into the output |
| G7 | rendered charter declares provenance |
| G8 | engine key is a placeholder, not a fixed slot |
| G9 | two crews rendered from this template share no member name |
