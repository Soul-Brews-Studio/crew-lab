---
pattern: Across a collaboration boundary the reporter's emphasis decides what gets tested — a bug reported as primary gets gated, one mentioned in passing becomes the regression site; and a fix to an error path must gate the happy path it never aimed at
date: 2026-08-02
source: "crew-lab ↔ maw-crew, labRoot two-cause defect"
concepts: [gates, collaboration, bug-reports, regression, fixtures, verification]
---

# The reporter shapes the fix — and half a gate is not a pass

A defect with **two independent causes producing one identical error message**:
`maw crew` inside a script said "not inside a maw-visible repository" when
(a) a second `maw` on PATH lacked the `worktree` verb, and (b) the cwd genuinely
was not a repo. `labRoot()` inferred failure from empty stdout while `.nothrow()`
discarded the exit code, so both collapsed into one misleading sentence.

Three rounds, three lessons — the last two only appeared because the first fix
was gated rather than accepted.

## Round 1 — the fix regressed the cause I under-weighted

My report led with (a) and mentioned (b) as an aside. The fix branched on
`rc != 0 || stderr has 'unknown command'` — but **maw-rs also exits non-zero when
the cwd is not a repo**, so (b) fell into (a)'s branch and the message accused a
binary that was entirely correct. Before the fix, (b) had answered correctly.

The regression landed exactly where my report had put the least weight.

**Rule — as reporter:** weight in a bug report directs both the fixer's attention
*and* their blind spot. If the evidence supports two co-equal causes, report them
as co-equal; burying one in a closing aside is choosing which will go untested.
**As fixer:** gate every branch equally regardless of how the reporter weighted
them. Their emphasis reflects what they happened to hit first, not the shape of
the defect.

## Round 2 — the gate was a mirror, not a gate

The first fix shipped with a passing test that used a **stub** `maw`. The stub
returned exit 0 for case (b) — something the real binary never does. So the test
mirrored the author's *model* of the failure instead of the failure. Same family
as a fixture written to match its own extractor: it can only confirm what you
already believed.

The second fix worked because they went and **captured the real binary's output
first** (`cd /tmp; maw worktree ls` → rc=1 plus a git error), then made the stub
imitate that. Had they written the stub from my prose description, case (b) would
have mirrored *my* understanding rather than the binary's behaviour.

**Rule:** a fixture must imitate the real dependency's observed output, not a
paraphrase of the bug report. Capture the bytes before you fake them.

## Round 3 — a fix to an error path must gate the happy path

Both error branches were correct on the second attempt. The check that actually
mattered was the one neither branch aimed at: **does normal operation still
work?** Changing how errors are classified is unusually good at breaking the
success path, because the success path is what everyone assumes is untouched.
I ran a real spawn end to end rather than diffing two error strings.

**Rule:** when a change edits error classification, the happy path is a required
gate, not a courtesy check. "Both error messages are right" is half a gate.

## Declining coverage honestly

One branch — "other non-zero → do not guess the cause, print exit + resolved path
+ cwd + raw stderr" — I could not induce with the real binary, so I did not gate
it and **said so** rather than implying full coverage. They were equally explicit
that its coverage came from an automated stub, not a real-world check. Naming the
untested branch is worth more than quietly rounding up to "verified": that branch
asserts nothing about the cause, so the cost of inducing it exceeds the risk it
carries — a decline on cost, recorded, not a gap left implied.

See [[instruments-that-lie-green]] and [[gate-strong-collaborators-read-raw-data]].
