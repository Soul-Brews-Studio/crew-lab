---
pattern: When a result comes back green, clean, or identical, audit the instrument before the result — a diff that reports identical, a grep hit near your hypothesis, and a doc pointing at another repo all fail in the direction that stops inquiry
date: 2026-08-02
source: "rrr: crew-lab"
concepts: [verification, tooling, false-negatives, documentation, cross-repo]
---

# Instruments that lie green

Three measurements deceived me in one session, all in the same direction: toward
*stop looking*. A noisy instrument gets fixed immediately because it is annoying. An
instrument that reports success is trusted and closes the investigation.

## What lied

**`diff <(cat a) <(cat b)` reported "identical".** md5 proved all four compared files
diverged. I had read both files minutes earlier and *seen* a difference. Two contradictory
observations, and I nearly deferred to the tool because tools feel more objective than
memory. Contradiction is a signal to re-measure with fewer layers, not to pick a winner.

**`grep session` returned `SessionStart`.** A codex *hook-event* name, nothing to do with
tmux — while I was investigating whether tmux sessions were load-bearing. It reads as
evidence **for** session-coupling when the truth was the exact opposite. The most expensive
search result is the one shaped like confirmation.

**A README pointing at another repo went stale within the hour.** I committed install
instructions naming a symlink, then the repo I had *just asked to change* renamed it. The
commit closing a two-sources-of-truth trap opened a new one.

## Rules

**Audit the instrument, not just the result, whenever the result is clean.** "Identical",
"no matches", "0 findings", "tests pass" — each is a claim about the world made by
something that can be broken. Ask what the check actually read.

**Prefer the measurement with fewest layers between you and the bytes.** Content hash beats
diff-of-cat beats eyeballing a summary. When two readings disagree, the shorter path wins.

**A search hit is a pointer to read, never a finding.** Keyword proximity to your hypothesis
is not evidence for it. Open the file — the match may be an unrelated homonym pointing the
opposite way.

**Documentation that points at another repo is perishable.** It does not inherit an exemption
from that repo's changes. If you ask someone to change a thing, your pointer to that thing is
now scheduled to expire.

**Never claim repo state you did not run.** "That path is gitignored" cost me twice in two
days — once asserting nothing needed committing when two files were tracked, once not knowing
`ψ/teams/*.yaml` does not cross a `/`, so archiving *un-hid* seven files. `git check-ignore`
takes one second.

See [[gate-strong-collaborators-read-raw-data]], [[proxy-checks-intent-vs-state]],
[[session-collapse-declined-on-cost]].
