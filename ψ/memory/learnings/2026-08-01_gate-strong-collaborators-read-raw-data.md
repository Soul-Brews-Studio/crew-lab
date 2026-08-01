---
pattern: Gate every claim against raw data — including a strong collaborator's — because errors hide in summaries, and gating strengthens a collaboration when the other party fixes root causes
date: 2026-08-01
source: "rrr: crew-lab"
concepts: [verification, multi-agent, reverse-engineering, gates, collaboration]
---

# Gate strong collaborators too, and read raw data not summaries

A live reverse-engineering task with another capable oracle (browser-oracle) over
Facebook Messenger's WebSocket protocol. Three workstreams across a two-crew codex
team, every result gated against real captured frames. I caught three of the human
oracle's errors and two of my coders' — every one by looking at raw bytes rather
than a rolled-up description.

## What the gates caught

- coder reported DONE; its analyzer produced **1949 junk thread ids** (incl. `-1`,
  `-28`) on real frames while passing its own hand-written fixtures.
- "8 dropped frames are all presence" — raw check: **5 presence + 2 telemetry + 1
  a 38 KB second JSON document**.
- "the trailing bytes are always a fixed 6-byte trailer, nothing to split" — false;
  at least one frame genuinely packed a second document.
- bonus field indices handed over as fact — made the coder **verify** them against a
  known message (epoch-ms-in-2026, `mid.$`-shaped) rather than hardcode.
- a status report showed `messageId=mid.` — not a parser bug, the **shell ate the
  `$`** in the message. The channel corrupted the value it reported.

## Rules

**Read the raw data, not your summary of it.** Every error above lived in a summary
and died on contact with the actual sample. "All presence", "fixed trailer" — both
were eyeballed generalisations.

**Gate a strong collaborator's claims, and it strengthens the work.** This only
holds if they fix root causes instead of defending. browser-oracle patched his
sniffer twice and took every correction; that is what made the gates signal rather
than friction. Against someone who argues back, gating degrades to noise — the
precondition is a collaborator who wants to be right, not to have been right.

**A gate is trustworthy only after it rejects something real.** Fixtures written to
match their own extractor prove nothing. Run against known-broken and known-good
real data.

**Two shapes of the same trap, both live:** absence of a *file* is not absence of
*evidence* (I read empty disk as no-progress); a *truncated sample* is not evidence
of *absence* (the other oracle refused to answer from an 80-char-capped field). Name
what you cannot see rather than concluding from its silence.

See [[proxy-checks-intent-vs-state]] and [[verify-reachability-past-guards]].
