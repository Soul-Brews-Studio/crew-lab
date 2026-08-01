# W2 Meta sync DSL mapping findings

Input: `frames.jsonl` (269 JSONL frames, rendered thread `2020188088851429`).

## `target`

- All envelopes that contain `target` have `target: 3` (184 frames), and all are on the `lightspeed` endpoint.
- `target` is therefore not the Messenger thread id in this dump. It is best treated as a Lightspeed routing/sync target gate: parse DSL only when the envelope has a `target`, then find thread attribution inside the step DSL.
- Code-only frames such as `{"code":200}` have no target/payload and are skipped safely.

## New-message opcode

New messages in this capture are the sync-transaction frames containing:

- `executeFirstBlockForSyncTransaction`
- `checkAuthoritativeMessageExists`
- `verifyThreadExists`
- `bumpThread`
- `updateThreadSnippet`
- `insertMessage`
- receipt/forward/display/timestamp bookkeeping
- `executeFinallyBlockForSyncTransaction`

The canonical message row is `insertMessage`:

```text
[5,"insertMessage", text, _, _, threadId, _, timestamp, timestamp, _, messageId, otid, sender, ...]
```

Mapped fields (args are zero-based after `"insertMessage"`):

- `text`: arg `0`; if null, fall back to matching `setMessageDisplayedContentTypes(threadId, messageId, timestamp, text, ...)`.
- `threadId`: arg `3` (`[19,"..."]`).
- `sender`: arg `10` (`[19,"..."]`); fallback observed in `updateParticipantLastMessageSendTimestamp(threadId, sender, timestamp)` / `updateReadReceipt(timestamp, threadId, sender, ...)`.
- `type`: normalized to `"new-message"` for these `insertMessage` events.

## Ground-truth thread B

Thread `830628859896062` is visible in the dump while `renderedThread` remains `2020188088851429`, confirming all-thread sync frames. The actual new message is line 213:

- `insertMessage` threadId = `830628859896062`
- sender = `896050346`
- text = `W3 coverage test 🔮 — ส่งจาก Browser Oracle ครับ กำลังทดสอบว่า socket ของอีกห้องเห็นข้อความนี้ไหม (AI generated, Rule 6)`

Other B frames are bookkeeping/reload: `markThreadReadV2`, `updateDeliveryReceipt`, and a large thread-history `upsertMessage`/`deleteThenInsertThread` reload. They should not be emitted as new-message events.

## Other frame types observed

- Code/ack: `{"code":200}` payload-null frames.
- Task bookkeeping: `taskExists`, `removeTask`, menu/banner/contact/profile operations.
- Sync transactions: cursor updates wrapped in `executeFirstBlockForSyncTransaction` / `executeFinallyBlockForSyncTransaction`.
- Backfill/reload: `deleteThenInsertThread`, `upsertMessage`, `deleteThenInsertMessage`, `insertNewMessageRange`.
- Receipts: `markThreadReadV2`, `updateReadReceipt`, `updateDeliveryReceipt`.
- Typing: `updateTypingIndicator`.
- Attachments around messages: `insertXmaAttachment`, `insertBlobAttachment`, `insertStickerAttachment`.
