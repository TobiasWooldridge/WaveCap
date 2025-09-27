import assert from "node:assert/strict";
import test from "node:test";
import type { Stream, TranscriptionResult } from "@types";
import {
  resolveStreamStatus,
  resolveUpstreamConnectivity,
} from "./StreamStatusIndicator.react.js";

const baseTimestamp = Date.UTC(2024, 0, 1, 0, 0, 0);

const createTranscription = (
  id: string,
  eventType?: TranscriptionResult["eventType"],
  offsetMs = 0,
): TranscriptionResult => ({
  id,
  streamId: "stream-1",
  text: `${eventType ?? "transcription"}-${id}`,
  timestamp: new Date(baseTimestamp + offsetMs).toISOString(),
  eventType,
  confidence: null,
  duration: null,
  segments: [],
});

const createStream = (
  transcriptions: TranscriptionResult[],
  overrides: Partial<Stream> = {},
): Stream => ({
  id: overrides.id ?? "stream-1",
  name: overrides.name ?? "Example Stream",
  url: overrides.url ?? "https://example.com/audio", // dummy URL
  status: overrides.status ?? "transcribing",
  enabled: overrides.enabled ?? true,
  createdAt:
    overrides.createdAt ?? new Date(baseTimestamp).toISOString(),
  transcriptions,
  language: overrides.language,
  error: overrides.error,
  source: overrides.source,
  webhookToken: overrides.webhookToken,
  ignoreFirstSeconds: overrides.ignoreFirstSeconds,
  lastActivityAt: overrides.lastActivityAt,
});

test("resolveUpstreamConnectivity prioritises the most recent connectivity event", () => {
  const stream = createStream([
    createTranscription("reconnected", "upstream_reconnected", 2000),
    createTranscription("disconnected", "upstream_disconnected", 1000),
  ]);

  assert.strictEqual(resolveUpstreamConnectivity(stream), true);
});

test("resolveUpstreamConnectivity reports disconnect when the latest event is a disconnect", () => {
  const stream = createStream([
    createTranscription("disconnected", "upstream_disconnected", 2000),
    createTranscription("reconnected", "upstream_reconnected", 1000),
  ]);

  assert.strictEqual(resolveUpstreamConnectivity(stream), false);
});

test("resolveStreamStatus returns active when the upstream reconnects", () => {
  const stream = createStream([
    createTranscription("reconnected", "upstream_reconnected", 2000),
    createTranscription("disconnected", "upstream_disconnected", 1000),
  ]);

  const status = resolveStreamStatus(stream);
  assert.deepStrictEqual(status, {
    variant: "active",
    label: "Live transcription",
  });
});

test("resolveStreamStatus surfaces upstream disconnects", () => {
  const stream = createStream([
    createTranscription("disconnected", "upstream_disconnected", 2000),
    createTranscription("reconnected", "upstream_reconnected", 1000),
  ]);

  const status = resolveStreamStatus(stream);
  assert.deepStrictEqual(status, {
    variant: "error",
    label: "Upstream disconnected",
  });
});
