#!/usr/bin/env bun

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Call = { op: string; args: Json[] };

type Event = {
  threadId: string | null;
  sender: string | null;
  text: string | null;
  type: "new-message";
};

const input = Bun.argv[2] ?? "frames.jsonl";

function atom(v: Json | undefined): Json | null {
  if (Array.isArray(v) && v.length === 2 && v[0] === 19 && typeof v[1] === "string") return v[1];
  if (Array.isArray(v) && v.length === 1 && v[0] === 9) return null;
  return v ?? null;
}

function stringAtom(v: Json | undefined): string | null {
  const decoded = atom(v);
  return typeof decoded === "string" ? decoded : null;
}

function nonEmptyString(v: Json | undefined): string | null {
  const s = stringAtom(v);
  return s && s.length > 0 ? s : null;
}

function parsePayload(frame: any): Json | null {
  const direct = frame?.payload;
  if (direct !== null && direct !== undefined) return direct as Json;

  const raw = frame?.envelope?.payload;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Json;
    } catch {
      return null;
    }
  }
  return null;
}

function collectCalls(node: Json, out: Call[] = []): Call[] {
  if (Array.isArray(node)) {
    if (
      node.length >= 2 &&
      (node[0] === 5 || node[0] === 7) &&
      typeof node[1] === "string"
    ) {
      out.push({ op: node[1], args: node.slice(2) });
    }
    for (const child of node) collectCalls(child, out);
  } else if (node && typeof node === "object") {
    for (const child of Object.values(node)) collectCalls(child, out);
  }
  return out;
}

function key(threadId: string | null, messageId: string | null, timestamp: string | null): string {
  return `${threadId ?? ""}\u0000${messageId ?? ""}\u0000${timestamp ?? ""}`;
}

function displayedTextByMessage(calls: Call[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of calls) {
    if (c.op !== "setMessageDisplayedContentTypes") continue;
    const threadId = stringAtom(c.args[0]);
    const messageId = stringAtom(c.args[1]);
    const timestamp = stringAtom(c.args[2]);
    const text = nonEmptyString(c.args[3]);
    if (text) map.set(key(threadId, messageId, timestamp), text);
  }
  return map;
}

function senderFallback(calls: Call[], threadId: string | null, timestamp: string | null): string | null {
  for (const c of calls) {
    if (c.op !== "updateParticipantLastMessageSendTimestamp") continue;
    if (stringAtom(c.args[0]) === threadId && stringAtom(c.args[2]) === timestamp) {
      return stringAtom(c.args[1]);
    }
  }
  for (const c of calls) {
    if (c.op !== "updateReadReceipt") continue;
    if (stringAtom(c.args[0]) === timestamp && stringAtom(c.args[1]) === threadId) {
      return stringAtom(c.args[2]);
    }
  }
  return null;
}

function eventsFromFrame(frame: any): Event[] {
  // In this capture every useful DSL frame is a Lightspeed envelope with target=3.
  // Treat target as a routing/sync gate, not as the Messenger thread id.
  if (frame?.envelope?.target === undefined) return [];

  const payload = parsePayload(frame);
  if (!payload) return [];

  const calls = collectCalls(payload);
  const display = displayedTextByMessage(calls);
  const events: Event[] = [];

  for (const c of calls) {
    if (c.op !== "insertMessage") continue; // new-message; upsertMessage/deleteThenInsertMessage are backfill/reload in this dump.

    const threadId = stringAtom(c.args[3]);
    const timestamp = stringAtom(c.args[5]);
    const messageId = stringAtom(c.args[8]);
    const text = nonEmptyString(c.args[0]) ?? display.get(key(threadId, messageId, timestamp)) ?? null;
    const sender = stringAtom(c.args[10]) ?? senderFallback(calls, threadId, timestamp);

    events.push({ threadId, sender, text, type: "new-message" });
  }
  return events;
}

const text = await Bun.file(input).text();
for (const [i, line] of text.split(/\r?\n/).entries()) {
  if (!line.trim()) continue;
  let frame: any;
  try {
    frame = JSON.parse(line);
  } catch (error) {
    console.error(`Skipping invalid JSON on line ${i + 1}: ${error}`);
    continue;
  }
  for (const event of eventsFromFrame(frame)) console.log(JSON.stringify(event));
}
