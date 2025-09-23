import assert from "node:assert/strict";
import test from "node:test";
import type { Stream, StreamUpdate, TranscriptionResult } from "@types";
import {
  mergeStreamUpdates,
  STREAM_TRANSCRIPTION_PREVIEW_LIMIT,
} from "./useTranscriptions.js";

test("mergeStreamUpdates prioritizes server-provided transcribing status", () => {
  const previous: Stream[] = [
    {
      id: "alpha",
      name: "Alpha",
      url: "http://example.com/alpha",
      status: "stopped",
      enabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
      transcriptions: [],
    },
  ];

  const incoming: StreamUpdate[] = [
    {
      id: "alpha",
      name: "Alpha",
      url: "http://example.com/alpha",
      status: "transcribing",
      createdAt: previous[0].createdAt,
      transcriptions: [],
    },
  ];

  const merged = mergeStreamUpdates(previous, incoming);

  assert.notStrictEqual(merged, previous);
  assert.strictEqual(merged[0].status, "transcribing");
});

test("mergeStreamUpdates preserves existing transcriptions when omitted in updates", () => {
  const transcription: TranscriptionResult = {
    id: "t1",
    streamId: "beta",
    text: "hello world",
    timestamp: new Date("2024-01-01T00:00:00Z").toISOString(),
  };

  const previous: Stream[] = [
    {
      id: "beta",
      name: "Beta",
      url: "http://example.com/beta",
      status: "transcribing",
      enabled: true,
      createdAt: new Date("2024-01-01T00:01:00Z").toISOString(),
      transcriptions: [transcription],
    },
  ];

  const incoming: StreamUpdate[] = [
    {
      id: "beta",
      name: "Beta",
      url: "http://example.com/beta",
      status: "transcribing",
      createdAt: previous[0].createdAt,
    },
  ];

  const merged = mergeStreamUpdates(previous, incoming);

  assert.deepStrictEqual(merged[0].transcriptions, [transcription]);
});

test("mergeStreamUpdates truncates transcriptions to the preview limit", () => {
  const makeTranscription = (index: number): TranscriptionResult => ({
    id: `t-${index}`,
    streamId: "gamma",
    text: `sample ${index}`,
    timestamp: new Date(2024, 0, 1, 0, 0, index).toISOString(),
  });

  const oversizedList = Array.from(
    { length: STREAM_TRANSCRIPTION_PREVIEW_LIMIT + 10 },
    (_, index) => makeTranscription(index),
  );

  const previous: Stream[] = [
    {
      id: "gamma",
      name: "Gamma",
      url: "http://example.com/gamma",
      status: "transcribing",
      enabled: true,
      createdAt: new Date("2024-01-02T00:00:00Z").toISOString(),
      transcriptions: [],
    },
  ];

  const incoming: StreamUpdate[] = [
    {
      id: "gamma",
      name: "Gamma",
      url: "http://example.com/gamma",
      status: "transcribing",
      createdAt: previous[0].createdAt,
      transcriptions: oversizedList,
    },
  ];

  const merged = mergeStreamUpdates(previous, incoming);

  assert.strictEqual(
    merged[0].transcriptions.length,
    STREAM_TRANSCRIPTION_PREVIEW_LIMIT,
  );
  assert.deepStrictEqual(
    merged[0].transcriptions.map((item) => item.id),
    oversizedList
      .slice(0, STREAM_TRANSCRIPTION_PREVIEW_LIMIT)
      .map((item) => item.id),
  );
});

test("mergeStreamUpdates keeps untouched streams when updates arrive", () => {
  const previous: Stream[] = [
    {
      id: "alpha",
      name: "Alpha",
      url: "http://example.com/alpha",
      status: "stopped",
      enabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
      transcriptions: [],
    },
    {
      id: "beta",
      name: "Beta",
      url: "http://example.com/beta",
      status: "stopped",
      enabled: false,
      createdAt: new Date("2024-01-01T00:01:00Z").toISOString(),
      transcriptions: [],
    },
  ];

  const incoming: StreamUpdate[] = [
    {
      id: "beta",
      status: "transcribing",
    },
  ];

  const merged = mergeStreamUpdates(previous, incoming);

  assert.strictEqual(merged.length, 2);
  assert.strictEqual(merged[0], previous[0]);
  assert.strictEqual(merged[1].status, "transcribing");
});

test("mergeStreamUpdates appends newly discovered streams", () => {
  const previous: Stream[] = [
    {
      id: "alpha",
      name: "Alpha",
      url: "http://example.com/alpha",
      status: "stopped",
      enabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
      transcriptions: [],
    },
  ];

  const incoming: StreamUpdate[] = [
    {
      id: "alpha",
      status: "transcribing",
    },
    {
      id: "beta",
      name: "Beta",
      status: "queued",
      createdAt: new Date("2024-01-02T00:00:00Z").toISOString(),
      transcriptions: [],
    },
  ];

  const merged = mergeStreamUpdates(previous, incoming);

  assert.strictEqual(merged.length, 2);
  assert.strictEqual(merged[0].id, "alpha");
  assert.strictEqual(merged[1].id, "beta");
});

test("mergeStreamUpdates ignores empty update batches", () => {
  const previous: Stream[] = [
    {
      id: "alpha",
      name: "Alpha",
      url: "http://example.com/alpha",
      status: "stopped",
      enabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
      transcriptions: [],
    },
  ];

  const merged = mergeStreamUpdates(previous, []);

  assert.strictEqual(merged, previous);
});
