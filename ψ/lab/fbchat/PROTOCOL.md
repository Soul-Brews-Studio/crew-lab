# Facebook Messenger Lightspeed WebSocket — decoded protocol

Reverse-engineered 2026-08-01 by browser-oracle (live capture + W1/W3) and a
crew-lab codex team (W2), each result gated against real captured frames before
it was accepted. Messenger migrated off the `edge-chat` MQTT endpoint; inbound
chat now flows over `gateway.facebook.com/ws/lightspeed`. Every FB-chat library
on GitHub still targets the dead socket.

Captures: `frames.jsonl` (269 lines, W2 shape with parsed payload) and
`frames-v2.jsonl` (635 lines, 198 with W1 header fields).

## Frame header — SOLVED (verified 198/198)

```
[0]     opcode         0x0d and 0x0f observed (also 0x0a/0x0c/0x0e)
[1..2]  seq/flags      0x0f uses [1] as a counter (0,0,1,0,2,3,4,5,… — resets/interleaves)
[3..5]  uint24 LE      payload length == total_frame_length - 6
[6..]   payload
```

**Length field is uint24 LITTLE-endian at offset 3, and equals `total - 6`** — for
both opcodes and all header sizes. This is why 3- and 4-byte *big*-endian guesses
all failed. It is a fixed 6-byte prefix; the "6/8/14/15/16-byte header" figures
are the offset to the first `{`, which varies because a binary sub-header can sit
between the 6-byte prefix and the JSON. Prefix length and JSON offset are two
different things — conflating them cost the earlier failed attempts.

Worked: `0f 00 00 0c 00 00` → 0x00000c=12 = 18−6. `0d 06 00 75 2d 02 …` → 0x022d75=142709 = 142715−6.

## Envelope shapes (endpoint=lightspeed)

| envKeys | count |
|---|---|
| `request_id, payload, sp, target` | 173 |
| `code` | 79 |
| `nop, request_id, payload, sp, target` | 11 |
| `request_id, payload` | 6 |

`target` observed only as `target=3` — a routing/sync gate, **not** a thread id.
`payload` is a JSON-encoded string; parse it again for the step DSL.

## Message extraction — SOLVED (ground-truth verified)

New messages are `insertMessage` steps inside
`executeFirstBlockForSyncTransaction` / `Finally` sync transactions. Argument map:

```
insertMessage:  text = arg0,  threadId = arg3,  sender = arg10
                (setMessageDisplayedContentTypes as a text fallback)
```

`[19,"X"]` is a **generic value opcode, not a thread id** — extracting every
`[19,…]` yields 1949 junk "threads" (incl. `-1`, `-28`). Thread id is specifically
`insertMessage` arg3. Skipped: `code`/null, `taskExists`/`removeTask`, receipts,
delivery, typing, upsert/backfill/reload.

Gate: `dsl-map.ts` on `frames.jsonl` extracts 8 new-messages across 2 threads with
zero junk ids, including the exact known test message sent into a non-rendered
thread. Empty-text events occur for non-text messages (image/link) — a known gap.

## Coverage — SOLVED: ALL THREADS

Inbound messages for every thread arrive on one socket, not only the rendered
one. Confirmed three independent ways:
1. Controlled A/B (browser-oracle): render thread A, send into thread B on a
   listener-less tab; B's frames appeared on A's socket, tagged renderedThread=A.
2. W2 extraction: messages from a third thread (`27933907859536840`) that was
   never rendered appeared in the same capture.
3. The dropped-frame audit below found presence updates for other threads.

This is the whole point: DOM scraping sees only the rendered thread; the socket
sees all of them.

## Silent frame loss — found and fixed

The original header-agnostic parser (`JSON.parse` the whole remainder, `return
null` on throw) **silently discarded any frame that was not exactly one JSON
document** — 8 of 198, and the largest ones. A dropped frame is indistinguishable
from one that never arrived: no counter, no error. Fixed by a brace-matcher that
finds where the first document ends and reports `trailingChars`/`parseFailed`.

The dropped 8, by what followed the first document:
- **5** — a fixed benign 6-byte trailer `00 00 15 00 00 00`.
- **2** — binary telemetry (`publishEnterBladeRunnerJsMs`, `pylonPublishDeductableLatencyMs`).
- **1** — a full **38 KB second JSON document** (`{"data":{"viewer":{"actor":…}}`).

So "the trailing is always a fixed 6-byte trailer, nothing to split" is **false**:
at least one frame genuinely packs a second document. None of the 8 first-docs
were `insertMessage`, so message extraction was not affected — but a parser that
takes only the first document per frame does lose real data. Open question: has a
`insertMessage` ever appeared in a trailing document? Not seen yet; not disproven.

## Files

- `frames.jsonl` — W2 capture (parsed payload, renderedThread)
- `frames-v2.jsonl` — W1 capture (headerHex, trailingChars, parseFailed)
- `dsl-map.ts` — message extractor (W2)
- `W2-FINDINGS.md` — coder-2's notes
