# Crew charter schema v2

## Goal
v2 keeps the v1 charter shape that maw already reads, but makes two properties explicit enough for parallel crews on one repo: isolation and provenance.

## Required top-level fields
- `name`: unique crew id. It is the namespace for member names, worktrees, branches, and registry artifacts.
- `project`: `owner/repo`, copied from the target remote or path.
- `session`: tmux session for this crew only. Two crews on one repo must not share it.
- `base_branch`: intended PR base for the lead and for merge planning.
- `goal`: human-readable operating contract.
- `provenance`: render record. It must include schema id, template path, renderer id, render-time marker, and render inputs.
- `engines`: map from engine key to launch command.
- `members`: list of lead and worker members.

## Required member fields
- `role`: unique inside one charter.
- `name`: globally distinguishable process/window name, prefixed by `name`.
- `engine`: engine key from `engines`, or `claude` for the non-worktree lead.
- `worktree`: `agents/<crew>-<role>` for workers, `false` for lead.
- `branch`: `agents/<crew>-<role>` for workers, `base_branch` for lead.
- `prompt`: role contract. It must tell workers to wait for dispatch and stay inside their own worktree.

## Isolation rules
1. Credential pools are selected by the engine key, not the command string. Therefore every Codex engine key in a template must be a placeholder such as `__ENGINE1__`, rendered to `omx-<slot>`.
2. The command argument must use the matching `__POOLn__` placeholder so humans see the same slot that maw actually selected from the key.
3. Pool slots are an explicit list passed to render, for example `--pools 1,2` or `--pools 5,6`. Do not derive slots by arithmetic because available slots can be sparse.
4. Worktree, branch, member name, and session all include the crew name. This lets two charters target the same repo without path, branch, tmux, or registry collisions.
5. `CODEX_HOME=$PWD/.codex` keeps Codex state inside each spawned worktree, not in a shared global directory.

## Provenance contract
`provenance` records what produced the charter and with which inputs:
- `schema`: schema id, here `crew-master-charter-v2`.
- `template`: source template path.
- `renderer`: renderer identity.
- `rendered_when`: render-time marker. With the current renderer this is the session id, so session names should carry the operator timestamp. A future renderer should replace it with RFC3339 time.
- `input_*`: concrete values after substitution, including team, project, session, base branch, roles, rendered engine keys, and bare pool slots.

## Parser constraints
The current charter parser is line-based. Do not put `#` in values, even quoted values, because older parser paths truncate there. Prefer block YAML with one field per line and no inline comments in templates.

## Template scope
`templates/squad-multi-v2.yaml` is a two-worker primitive. Run multiple charters for more parallel crews, assigning disjoint pool lists per crew, for example one crew with `--pools 1,2` and another with `--pools 5,6`.
