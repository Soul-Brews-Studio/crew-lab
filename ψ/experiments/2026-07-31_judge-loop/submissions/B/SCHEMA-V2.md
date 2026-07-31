# Crew charter schema v2

## Purpose

V2 is a renderable profile of maw's existing line-oriented charter format. It does
not require a parser migration. Its contract adds two properties missing from v1:
crew-scoped runtime identity and self-declared render provenance.

## Normative fields

The maw fields `name`, `project`, `session`, `goal`, `engines`, and `members`
retain their current meaning. V2 additionally requires one top-level
`provenance` scalar. Unknown top-level metadata must remain ignorable by maw.

`provenance` is a semicolon-delimited record with:

- `schema`: schema identity (`crew-charter-v2`).
- `source`: repository-relative template path.
- `renderer`: renderer path or stable renderer identity.
- `rendered_at`: render event identifier. With today's renderer this is
  `__SESSION__` rendered as a crew session identifier containing an RFC 3339-like
  UTC creation time (for example `api-a-20260731T0530Z`). This makes time
  available with the current renderer; a future renderer may emit a dedicated
  RFC 3339 UTC instant without changing the schema.
- `input.*`: every isolation-affecting render input, including team, project,
  session, base, lead, and the explicit pool-slot list.

The record is deliberately a single quoted scalar. maw's parser is line-based;
a nested metadata object would imply YAML semantics the parser does not promise.
Values containing the `#` character are invalid because maw truncates the line.

## Isolation invariants

1. `name` and `session` are independently supplied per crew and must be unique
   among concurrent crews on the machine. Session names must end in a UTC
   creation timestamp (`YYYYMMDDThhmmZ`) so provenance records when rendering
   occurred without requiring an unsupported timestamp placeholder.
2. Every member name, branch, and worktree is derived from `__TEAM_NAME__`.
   Therefore two crews in one repository do not share checkout state.
3. Each Codex engine **key** is `__ENGINEn__`, rendered to `omx-<slot>`.
   The matching command argument is `__POOLn__`. The key is authoritative for
   maw credential selection; changing only `codex-setup.ts` is not isolation.
4. Concurrent crews must be rendered with disjoint explicit `--pools` lists.
   Slots are opaque machine inventory, not a sequence. For inventory `1,2,5,6`,
   valid two-worker allocations include `--pools 1,5` and `--pools 2,6`; never
   infer missing slots 3 or 4.
5. `CODEX_HOME=$PWD/.codex` is evaluated after maw enters the member worktree,
   keeping Codex runtime state scoped to that checkout.
6. The tmux session comes from `__SESSION__`; it is not derived implicitly from
   the repository, so concurrent crews cannot collide when callers obey rule 1.

The lead intentionally has `worktree: false`: it coordinates from the target
checkout and does not implement changes. Worker filesystem isolation is the
boundary for mutable work. If a lead must edit, model it as another worker with
a team-derived worktree rather than weakening this rule.

## Rendering contract

Example for two crews in the same repository:

```sh
render.sh --template squad-multi-v2 --target /repo --team api-a \
  --session api-a-20260731T0530Z --lead-name repo --base main --pools 1,5
render.sh --template squad-multi-v2 --target /repo --team api-b \
  --session api-b-20260731T0531Z --lead-name repo --base main --pools 2,6
```

The renderer must reject pool-count mismatch, nonnumeric slots, unresolved
placeholders, existing output, and any substituted input containing `#`.
Operators must run `maw team preflight` before spawn and verify that no live
registry/session/member name collides. Credential availability is deployment
inventory and must be passed explicitly rather than encoded in the template.

## Design rationale

Team-prefixed paths make isolation visible and auditable without adding parser
features. Parameterizing engine keys fixes the subtle failure where different
command strings still select one credential pool. Recording both key slots and
inputs makes a rendered artifact reproducible and lets reviewers distinguish a
template defect from a bad invocation. A compact scalar maximizes compatibility
while reserving a clean migration path to structured provenance once maw adopts
a real YAML parser.
