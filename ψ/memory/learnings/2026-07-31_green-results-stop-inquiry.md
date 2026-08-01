---
pattern: A check that passes stops inquiry — so passing checks, not failing ones, are where adjacent-measurement hides
date: 2026-07-31
source: "rrr: crew-lab"
concepts: [verification, proxy-check, gates, judging, tooling]
---

# A green result is a signal to stop looking

Eight confirmed instances in one day, across two oracles who spent that day teaching each other about this exact failure — the trap's name offers no protection.

## The shape

Something returns green. The green makes you stop checking. But the check read something *adjacent* to what you cared about:

| Checked | Actually mattered |
|---|---|
| `CODEX_HOME` paths differ | credential slots differ |
| setup output says "pool 5" | which credentials survived the spawn |
| `md5` of a backup matches | an independent copy exists (md5 follows symlinks) |
| harness returned exit 1 | the guard fired (it was `unknown arg`) |
| verdict stability across judges | judge quality (a stopped clock is perfectly stable) |
| command string is parameterised | the thing that selects the pool (the key name) is |

A noisy check is never the dangerous one. You investigate noise. Green ends the investigation.

## Rules

**Ask what a check read, not whether it passed.** After a pass, name the quantity it actually compared and ask whether that is the quantity you care about.

**Prove a gate discriminates before trusting it.** Run it against something already known to be broken. A gate everything passes and a gate everything fails are worth the same — nothing. A gate is only evidence once it has rejected something real and accepted something real.

**Verify the tools that verify.** Harnesses, backups, gates, and judges can all return the right answer for the wrong reason. A false positive in a test harness is worse than one in production because it stops you looking.

**Never pass a proxy result on as evidence.** Believing one yourself is recoverable. Reporting it to a colleague propagates it — decisions get made on it, and the error is discovered downstream of the damage.

**Prefer ground truth over reported state:** bytes over status fields, `readlink` over `md5`, `tmux has-session` over a status verb that never queries tmux, rendering twice over reasoning about a template.

## Corollary for adversarial review

Requiring every objection to cite a concrete failing case makes objections *checkable*. It does not make them *true* — one of three verified objections was a confident false positive that would have sent someone "fixing" working code. Judge output is subject to the same rule as everything else.
