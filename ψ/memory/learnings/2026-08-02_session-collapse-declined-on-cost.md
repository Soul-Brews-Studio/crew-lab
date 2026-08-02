---
pattern: A confirmed premise does not entitle you to the change — maw-crew verified the isolation claim at source and still declined, on cost rather than safety; record that as considered-and-declined with a re-open trigger, never as pending
date: 2026-08-02
source: "crew-lab ↔ maw-crew, session-collapse proposal"
concepts: [design-decisions, verification, multi-agent, collaboration, tmux, codex-pools]
---

# Session-collapse: CONFIRMED premise, declined on cost

Nat asked why two crews produce two tmux sessions and whether they should be
windows instead. Measuring tmux showed they are **already windows** (`win1 lead` zsh
idle, `win2 buddy` node), and that each crew carries a dead lead shell. I proposed to
maw-crew: collapse to one session, one window per crew.

**Outcome: declined. Recorded as considered-and-declined, not pending.**

## The claim was confirmed — at source, not by inference

I reasoned that pool isolation is worktree-bound from `internal/crew.ts:347-348`
(runs `codex-setup <pool>` inside each worktree, appends `.codex/config.toml`), plus
`verify` reporting "auth matches ~/.codex-team/1", a worktree-level fact.

maw-crew verified it one level deeper, in `codex-setup.ts` itself:

- line 30 — `dst = join(process.cwd(), '.codex')`, "worktree-local, unique per coder"
- line 160 — symlinks `pool/auth.json` into it
- line 15 — the engine runs with `CODEX_HOME=$PWD/.codex`
- **no tmux/session reference anywhere.** `SessionStart:46` is a *codex hook-event*
  name, not tmux — a false positive a grep for "session" would hand you.

So collapsing sessions **cannot** share credentials by mechanism. The premise held.

## Declined anyway, for two reasons

1. **`down` safety regression.** Today `down` is `maw kill <session>`, provably killing
   exactly one crew because session:crew is 1:1. A shared session forces per-window kill
   plus last-crew detection — on the *Nothing-is-Deleted* verb, the single place where a
   bug destroys a neighbouring crew's live work. That trades a safety invariant for tab
   convenience.
2. **Not self-contained.** Session/window shape originates in `render.sh --session`
   (crew-master's repo), and `crew.ts:331-333` forbids rewriting a charter after render
   ("a second implementation free to drift"). maw-crew cannot own the change end-to-end.

At 2–5 crews the benefit is convenience, not correctness.

**Re-open trigger:** routine pool count ≥4–5 **and** `render.sh` supports shared-session
/ window naming. Then run the gate as specified: spawn collapsed → verify DISTINCT from
auth bytes → prove it FAILS (two crews on one pool → exit 1) → per-window down with
last-crew detection.

## Rules

**A confirmed premise is permission to evaluate, not permission to ship.** I built the
proposal so its foundation could be refuted, and it survived — then the change died on
teardown risk and repo ownership, neither of which the premise touched. Verifying the
claim and deciding the change are separate questions; conflating them is how a correct
fact becomes a bad build.

**"No" is a complete outcome — write it down as decided.** Leaving a declined proposal
in a pending list means re-litigating it every recap. Record the reasoning *and* the
condition that would flip it, so the next visit is a lookup rather than a rethink.

**Offer the decline explicitly when proposing.** I wrote "if you judge the teardown
complexity is not worth it, that is a legitimate no." That sentence is what made a
clean, reasoned decline cheaper than a grudging yes.

**Ask the owner to check your premise at source.** My reading was right but shallower —
one file up from where the answer actually lived. Whoever owns the code can refute
faster and deeper than the proposer can.

**A keyword match landing near your hypothesis is a lying instrument.** `grep session`
returns `SessionStart` — a codex *hook-event*, nothing to do with tmux — and it reads as
evidence **for** session-coupling when the truth is the opposite. This is the same family
as a `diff` that reports "identical" and setup output read as live state: the measurement
lands close enough to the question to feel like an answer. A search hit is a pointer to
read, never a finding. Confirmation-shaped noise is the most expensive kind, because it
stops the search exactly when the search was wrong.

**Check repo ownership before proposing, not after.** The proposal was structurally
un-ownable by its recipient — session shape lives in `render.sh` (a third repo). Good
measurement (tmux ground truth, two real pools) does not rescue a change addressed to
someone who cannot land it.

## Side facts this surfaced

- The "2 panes" confusion is **`maw ls`** summing panes across windows — cosmetic, and
  in maw's own listing, not in `crew status`.
- The idle `lead` zsh window per session comes from the `squad-solo-buddy` template in
  `render.sh`, not from the plugin.

See [[gate-strong-collaborators-read-raw-data]] and [[proxy-checks-intent-vs-state]].
