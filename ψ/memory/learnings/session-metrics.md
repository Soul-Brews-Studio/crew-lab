# Oracle Session Metrics

Rule (parent CLAUDE.md §"Self-Evaluation Loop"): same friction 3 sessions → fix root cause, not another workaround.

| when | session | done | stuck | win | friction | error |
|---|---|---|---|---|---|---|
| 2026-07-31 13:46 | 5603c11c | crew flow proven, maw crew-lab plugin, 2 upstream PRs merged, repo public, 2-crew tournament + 10 judges, schema v3 passing G1-G9, 20 traps documented | slot 5 credential needs fresh codex login (crew-master's); H2 never measured cleanly; archive/_test/btest2 undeletable | judge loop showed scale and adversarial rank the same artifacts in opposite directions — length reads as thoroughness on a scale and as attack surface under adversarial reading | 56-min jan detour (3 rounds of adding mechanism when the signal meant remove); background agents' printed text is not delivery — 0/5 from one judge arm until re-run with file output; exit codes through pipes wrong 3x | reported "pools are isolated" to crew-master from setup output without checking bytes — both crews were on pool 1; caught only because Nat said verify before dispatch |
| 2026-08-01 12:17 | 5603c11c | hardened maw crew-lab up (poll before abort), filed maw-rs#751, owned 2-crew team through fbchat RE (W1 uint24-LE header, W2 insertMessage map + ts/mid, W3 all-threads), public PROTOCOL.md, clean teardown | trailing-message question left open (needs long passive capture); archive/_test/btest2 undeletable | decoded Facebook Lightspeed WS end to end with browser-oracle — every claim gated against real frames, incl. the human oracle's | ephemeral-scratch dump handoff; amending a running coder's brief mid-task; shell $-expansion corrupted a maw hey status report | reproduced the spawn false-negative inside my own fix for it (peeked once instead of polling); read empty disk as no-progress on the 'no frame dumps' premise |
| 2026-08-02 10:32 | 5603c11c | renamed command → `maw crew` (proposed, maw-crew shipped 894f2d5), deleted stale in-repo plugin fork (1d86f11), README repointed + corrected (8d3d60d), gitignore archive fix + decision record (de6400c), extension-god spawned VERIFIED and torn down | session-collapse declined (decided, not blocked); fbchat trailing-doc still needs a passive capture | maw-crew confirmed my isolation premise at source then declined anyway on teardown risk — "a confirmed premise is permission to evaluate, not permission to ship" | `diff <(cat a) <(cat b)` reported identical when md5 proved 4 files diverged; PIPESTATUS empty on both crew up/down so exit codes were never read; hook blocked `git branch -D` and `maw hey` rejected a bracket prefix | claimed ψ/teams was gitignored and "nothing to commit" without running git check-ignore — 2 files were tracked, and the glob does not cross `/` so archiving un-hid 7 more |

## 🔁 Recurring Pattern Detected

"asserted state without measuring it" appeared in **3 of last 3** sessions (all 5603c11c),
in the `error` column — decision errors, not tooling:

- 2026-07-31 — reported "pools are isolated" to crew-master from setup output; both crews were on pool 1
- 2026-08-01 — read an empty disk as "no evidence yet"; 166 frames had been captured live
- 2026-08-02 — claimed `ψ/teams` was gitignored and nothing needed committing; never ran `git check-ignore`

Per parent CLAUDE.md §"Self-Evaluation Loop" — root-cause fix, not another workaround. The
shape is identical each time: a state claim asserted from something adjacent (setup output,
disk contents, an assumed ignore rule) rather than from the check that would settle it, and
each was caught by someone else asking rather than by me checking.

Escalation (error column): raise with Nat at next standup. Candidate root-cause fix — before
any sentence asserting repo/system state, run the one command that reads it. The three
commands that would have prevented all three: `md5`/hash, `ls`+read the raw data,
`git check-ignore`.
