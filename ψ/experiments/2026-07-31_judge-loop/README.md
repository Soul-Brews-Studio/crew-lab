# Judge loop — 2026-07-31

Two isolated crews wrote a charter schema v2 from the same brief; ten judges that
never saw the work adjudicated the two artifacts. Commissioned by crew-master
after finding three branches (`agents/1-codex-{1,2,3}`) that had been sitting for
days with identical commit subjects — a tournament with no judge, which is just
parallel garbage.

## Result

**Neither submission was merged.** Four of five adversarial judges returned
BOTH-REJECTED, and the defects they cited are real (verified below).

| Arm | picked A | picked B | rejected both |
|-----|---------|---------|---------------|
| scale 1–10 (n=5) | 0 | **5** | 0 |
| adversarial (n=5) | 1 | **0** | 4 |

Same artifacts, same supplied facts, same judge model. Only the prompt differed.

## The arms disagree, and the mechanism is legible

Scale scores: A `6,7,7,7,8` (mean 7.0) · B `8,8,8,9,9` (mean 8.4) — unanimous for B.
Adversarial: nobody picked B; `Y_FATAL ≥ X_FATAL` on every judge.

B's spec is 82 lines, A's is 43.

> **A longer document scores higher and is easier to stab, at the same time.**
> Scale rewards apparent thoroughness. Adversarial punishes claims that don't
> hold. More documentation means more stated invariants — and more surface on
> which to contradict yourself.

"Which prompt style is more stable?" turned out to be the wrong question: the two
styles measure different things. On stability alone, scale was *more* consistent
(5/5 identical verdict vs 4/5), which refuted the hypothesis the experiment was
built on.

Had we looked only at scores, we would have merged B unanimously — while B
violates an invariant it states itself.

## Verified defects (checked by hand, not taken on the judges' word)

**Real — B contradicts itself.** `SCHEMA-V2.md:38` asserts "Every member name,
branch, and worktree is derived from `__TEAM_NAME__`", but the template's lead is
`name: __LEAD_NAME__`. B's own worked example renders `api-a` and `api-b` on one
repo with `--lead-name repo`, producing two members both named `repo`.

**Real — A violates its own rule.** `SCHEMA-V2.md:22` lists `prompt` under
"Required member fields"; A's lead member has no `prompt`.

**False — the CODEX_HOME objection.** A judge argued that
`codex-setup.ts __POOL1__ && CODEX_HOME=$PWD/.codex … omx` fails to scope
`CODEX_HOME` over `codex-setup.ts`. Reading the source: `codex-setup.ts:30` is
`const dst = join(process.cwd(), ".codex")` — it derives the target from the
working directory, not the environment variable, and its own header documents
this exact invocation as the intended one. Not a bug.

> Requiring a concrete failing case makes an objection **checkable**. It does not
> make it **true**. Two of three objections I verified were real; one was a
> confident false positive that would have sent me "fixing" a template that works.

## Method flaw worth recording

In the first collection round the scale arm returned 0/5 and the adversarial arm
3/5. That looked like a property of the prompt styles. It wasn't: background
agents were told to "end with these lines", but printing text delivers nothing —
an agent must call a tool to send. The deliverable was misdesigned. Re-running
with "write your verdict to this file" collected 10/10.

Reading that first round as evidence would have attributed a data-plumbing
failure to the thing being measured.

## Not established

- **H1 (do two crews produce different work?)** — the artifacts do differ
  (43L/39L vs 82L/26L) but the producers ran different models and reasoning
  efforts, so the difference cannot be attributed to the task. Observation only.
- Judge order was fixed at A-then-B for all ten; position bias was not measured.
- All judges shared one model; nothing here generalises across models.
- n=5 per arm.

## Contents

- `submissions/A`, `submissions/B` — the two artifacts, `MAPPING.txt` for provenance
- `judge-results/` — raw verdicts, one file per judge
