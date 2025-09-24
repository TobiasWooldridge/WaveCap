import assert from "node:assert/strict";
import test from "node:test";
import type { TranscriptionResult, TranscriptionSegment } from "@types";
import {
  buildPlaybackQueue,
  advancePlaybackQueue,
  getRecordingElementId,
  getBlankAudioSegmentBounds,
  getSegmentDisplayStart,
  getTranscriptionDurationMs,
  groupTranscriptions,
  prepareTranscriptions,
  selectVisibleTranscriptions,
  type PlaybackQueueState,
  type TranscriptionGroup,
} from "./StreamTranscriptionPanel.logic.js";

const baseTimestamp = Date.UTC(2024, 0, 1, 0, 0, 0);

const createSegment = (
  id: number,
  start: number,
  end: number,
): TranscriptionSegment => ({
  id,
  text: `segment-${id}`,
  no_speech_prob: 0,
  temperature: 0,
  avg_logprob: 0,
  compression_ratio: 0,
  start,
  end,
  seek: 0,
});

const createTranscription = (
  id: string,
  offsetMs: number,
  overrides: Partial<TranscriptionResult> = {},
): TranscriptionResult => ({
  id,
  streamId: overrides.streamId ?? "stream-1",
  text: overrides.text ?? `transcription-${id}`,
  timestamp: new Date(baseTimestamp + offsetMs).toISOString(),
  confidence: overrides.confidence ?? 0.5,
  duration: overrides.duration ?? 1,
  segments: overrides.segments,
  recordingUrl: overrides.recordingUrl,
  recordingStartOffset: overrides.recordingStartOffset,
  eventType: overrides.eventType,
  correctedText: overrides.correctedText,
  reviewStatus: overrides.reviewStatus,
  reviewedAt: overrides.reviewedAt,
  reviewedBy: overrides.reviewedBy,
  alerts: overrides.alerts,
  pagerIncident: overrides.pagerIncident,
});

const assertApproximatelyEqual = (
  actual: number,
  expected: number,
  epsilon = 1e-3,
) => {
  const difference = Math.abs(actual - expected);
  assert.ok(
    difference <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected} (difference: ${difference})`,
  );
};

test("getTranscriptionDurationMs uses finite segment boundaries when available", () => {
  const transcription = createTranscription("a", 0, {
    duration: 2,
    segments: [
      createSegment(1, 1.2, 4.8),
      createSegment(2, Number.POSITIVE_INFINITY, 5.5),
      createSegment(3, 0.5, 5.2),
    ],
  });

  assertApproximatelyEqual(
    getTranscriptionDurationMs(transcription),
    (5.5 - 0.5) * 1000,
  );
});

test("getTranscriptionDurationMs falls back to the duration field when segments are unusable", () => {
  const transcription = createTranscription("b", 0, {
    duration: 3,
    segments: [createSegment(1, Number.NaN, Number.NaN)],
  });

  assert.strictEqual(getTranscriptionDurationMs(transcription), 3000);
});

test("getSegmentDisplayStart prefers segment start when positive", () => {
  const transcription = createTranscription("c", 0, {
    recordingStartOffset: 42,
    segments: [createSegment(1, 3, 6)],
  });
  const segment = transcription.segments![0];

  assert.strictEqual(getSegmentDisplayStart(segment, transcription), 3);
});

test("getSegmentDisplayStart falls back to recording offset when segment start is zero", () => {
  const transcription = createTranscription("d", 0, {
    recordingStartOffset: 12,
    segments: [createSegment(1, 0, 5)],
  });
  const segment = transcription.segments![0];

  assert.strictEqual(getSegmentDisplayStart(segment, transcription), 12);
});

test("getBlankAudioSegmentBounds returns an adjusted range using duration", () => {
  const transcription = createTranscription("blank", 0, {
    recordingStartOffset: 5,
    duration: 3,
  });

  const bounds = getBlankAudioSegmentBounds(transcription);

  assert.deepStrictEqual(bounds, { start: 5, end: 8 });
});

test("getBlankAudioSegmentBounds enforces a minimum playback window", () => {
  const transcription = createTranscription("blank-min", 0, {
    duration: 0,
  });

  const bounds = getBlankAudioSegmentBounds(transcription);

  assertApproximatelyEqual(bounds.start, 0);
  assertApproximatelyEqual(bounds.end, 0.25);
});

test("getRecordingElementId generates deterministic, unique, and selector-safe ids", () => {
  const firstUrl = "https://example.com/audio/foo-bar.wav?token=alpha";
  const secondUrl = "https://example.com/audio/foobar.wav?token=alpha";

  const firstId = getRecordingElementId(firstUrl);
  const secondId = getRecordingElementId(secondUrl);
  const repeatedFirstId = getRecordingElementId(firstUrl);

  assert.match(firstId, /^audio-[a-z0-9-]+$/);
  assert.match(secondId, /^audio-[a-z0-9-]+$/);
  assert.strictEqual(firstId, repeatedFirstId);
  assert.notStrictEqual(firstId, secondId);
});

test("groupTranscriptions merges nearby items and splits on long silences", () => {
  const t1 = createTranscription("t1", 0, {
    confidence: 0.9,
    segments: [createSegment(1, 0, 1)],
  });
  const t2 = createTranscription("t2", 1100, {
    confidence: 0.6,
    segments: [createSegment(2, 0, 1)],
  });
  const t3 = createTranscription("t3", 5000, {
    confidence: 0.3,
    segments: [createSegment(3, 0, 1)],
  });

  const groups = groupTranscriptions([t1, t2, t3]);

  assert.strictEqual(groups.length, 2);
  assert.deepStrictEqual(
    groups[0].transcriptions.map((item: TranscriptionResult) => item.id),
    ["t1", "t2"],
  );
  assert.strictEqual(groups[0].startTimestamp, t1.timestamp);
  assert.strictEqual(groups[0].endTimestamp, t2.timestamp);
  assert.strictEqual(typeof groups[0].averageConfidence, "number");
  assertApproximatelyEqual(
    groups[0].averageConfidence as number,
    (0.9 + 0.6) / 2,
  );
  assert.deepStrictEqual(
    groups[1].transcriptions.map((item: TranscriptionResult) => item.id),
    ["t3"],
  );
});

test("groupTranscriptions ignores missing confidence values", () => {
  const missingConfidence = createTranscription("missing", 0, {
    segments: [createSegment(1, 0, 1)],
  });
  missingConfidence.confidence = undefined;

  const validConfidence = createTranscription("valid", 1100, {
    segments: [createSegment(2, 0, 1)],
    confidence: 0.75,
  });

  const groups = groupTranscriptions([missingConfidence, validConfidence]);

  assert.strictEqual(groups.length, 1);
  assert.strictEqual(typeof groups[0].averageConfidence, "number");
  assertApproximatelyEqual(
    groups[0].averageConfidence as number,
    0.75,
  );
});

test("groupTranscriptions returns null confidence when no numeric values exist", () => {
  const first = createTranscription("first", 0, {
    segments: [createSegment(1, 0, 1)],
  });
  const second = createTranscription("second", 900, {
    segments: [createSegment(2, 0, 1)],
  });
  first.confidence = undefined;
  second.confidence = null;

  const groups = groupTranscriptions([first, second]);

  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0].averageConfidence, null);
});

test("groupTranscriptions isolates recording state updates", () => {
  const speechBefore = createTranscription("speech-1", 0, {
    segments: [createSegment(1, 0, 1)],
  });
  const recordingStarted = createTranscription("recording-start", 800, {
    eventType: "recording_started",
    text: "Recording started",
    confidence: 0,
  });
  const speechAfter = createTranscription("speech-2", 1600, {
    segments: [createSegment(2, 0, 1)],
  });

  const groups = groupTranscriptions([
    speechBefore,
    recordingStarted,
    speechAfter,
  ]);

  assert.deepStrictEqual(
    groups.map((group: TranscriptionGroup) =>
      group.transcriptions.map((item: TranscriptionResult) => item.id),
    ),
    [["speech-1"], ["recording-start"], ["speech-2"]],
  );
});

test("groupTranscriptions isolates upstream connectivity events", () => {
  const before = createTranscription("before", 0);
  const disconnect = createTranscription("disconnect", 1800, {
    eventType: "upstream_disconnected",
    text: "Lost connection",
  });
  const after = createTranscription("after", 2600);
  const reconnect = createTranscription("reconnect", 3400, {
    eventType: "upstream_reconnected",
    text: "Reconnected",
  });

  const groups = groupTranscriptions([
    before,
    disconnect,
    after,
    reconnect,
  ]);

  assert.deepStrictEqual(
    groups.map((group: TranscriptionGroup) =>
      group.transcriptions.map((item: TranscriptionResult) => item.id),
    ),
    [["before"], ["disconnect"], ["after"], ["reconnect"]],
  );
});

test("groupTranscriptions keeps pager incident updates together", () => {
  const initial = createTranscription("incident-1", 0, {
    duration: 0,
    pagerIncident: { incidentId: "INC-1" },
  });
  const followUp = createTranscription("incident-2", 70_000, {
    duration: 0,
    pagerIncident: { incidentId: "INC-1" },
  });

  const groups = groupTranscriptions([initial, followUp]);

  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0].transcriptions.length, 2);
});

test("groupTranscriptions separates pager incidents after the merge window", () => {
  const initial = createTranscription("incident-1", 0, {
    duration: 0,
    pagerIncident: { incidentId: "INC-1" },
  });
  const muchLater = createTranscription("incident-2", 200_000, {
    duration: 0,
    pagerIncident: { incidentId: "INC-1" },
  });

  const groups = groupTranscriptions([initial, muchLater]);

  assert.strictEqual(groups.length, 2);
});

test("prepareTranscriptions sorts data before grouping", () => {
  const t1 = createTranscription("t1", 0, {
    segments: [createSegment(1, 0, 1)],
  });
  const t2 = createTranscription("t2", 1100, {
    segments: [createSegment(2, 0, 1)],
  });
  const t3 = createTranscription("t3", 5000, {
    segments: [createSegment(3, 0, 1)],
  });

  const { sortedTranscriptions, groupedTranscriptions } = prepareTranscriptions(
    [t3, t1, t2],
  );

  assert.deepStrictEqual(
    sortedTranscriptions.map((item: TranscriptionResult) => item.id),
    ["t1", "t2", "t3"],
  );
  assert.strictEqual(groupedTranscriptions.length, 2);
});

test(
  "selectVisibleTranscriptions falls back to the latest items when all are stale",
  () => {
    const first = createTranscription("stale-1", 0);
    const second = createTranscription("stale-2", 60_000);
    const tenHoursLater = baseTimestamp + 10 * 60 * 60 * 1000;

    const result = selectVisibleTranscriptions([first, second], {
      windowMs: 30 * 60 * 1000,
      now: tenHoursLater,
      fallbackLimit: 3,
    });

    assert.deepStrictEqual(
      result.map((item: TranscriptionResult) => item.id),
      ["stale-1", "stale-2"],
    );
  },
);

test(
  "selectVisibleTranscriptions preserves history entries outside the live window",
  () => {
    const history = createTranscription("history", 0);
    const future = baseTimestamp + 8 * 60 * 60 * 1000;

    const result = selectVisibleTranscriptions([], {
      historyTranscriptions: [history],
      windowMs: 15 * 60 * 1000,
      now: future,
    });

    assert.deepStrictEqual(
      result.map((item: TranscriptionResult) => item.id),
      ["history"],
    );
  },
);

test("buildPlaybackQueue creates a sequential queue of playable items", () => {
  const playable = [
    createTranscription("playable-1", 0, {
      recordingUrl: "https://example.com/1.wav",
    }),
    createTranscription("unplayable", 1000),
    createTranscription("playable-2", 2000, {
      recordingUrl: "https://example.com/2.wav",
    }),
  ];

  const queue = buildPlaybackQueue("stream-1", playable, "playable-2");

  assert.ok(queue);
  assert.strictEqual(queue!.streamId, "stream-1");
  assert.deepStrictEqual(
    queue!.items.map((item: TranscriptionResult) => item.id),
    ["playable-1", "playable-2"],
  );
  assert.strictEqual(queue!.currentIndex, 1);
});

test("buildPlaybackQueue returns null when the requested start item is not playable", () => {
  const playable = [
    createTranscription("playable-1", 0, {
      recordingUrl: "https://example.com/1.wav",
    }),
    createTranscription("unplayable", 1000),
    createTranscription("playable-2", 2000, {
      recordingUrl: "https://example.com/2.wav",
    }),
  ];

  assert.strictEqual(
    buildPlaybackQueue("stream-1", playable, "unplayable"),
    null,
  );
});

test("advancePlaybackQueue returns the next playable item and advances the index", () => {
  const first = createTranscription("playable-1", 0, {
    recordingUrl: "https://example.com/1.wav",
  });
  const second = createTranscription("playable-2", 1000, {
    recordingUrl: "https://example.com/2.wav",
  });
  const queue: PlaybackQueueState = {
    streamId: "stream-1",
    items: [first, second],
    currentIndex: 0,
  };

  const advance = advancePlaybackQueue(queue, first);

  assert.ok(advance);
  assert.strictEqual(advance!.nextTranscription.id, "playable-2");
  assert.strictEqual(advance!.nextQueue.currentIndex, 1);
});

test("advancePlaybackQueue returns null when the queue is exhausted", () => {
  const only = createTranscription("playable-1", 0, {
    recordingUrl: "https://example.com/1.wav",
  });
  const queue: PlaybackQueueState = {
    streamId: "stream-1",
    items: [only],
    currentIndex: 0,
  };

  assert.strictEqual(advancePlaybackQueue(queue, only), null);
});

test("advancePlaybackQueue falls back to the current index when the active item is missing", () => {
  const first = createTranscription("playable-1", 0, {
    recordingUrl: "https://example.com/1.wav",
  });
  const second = createTranscription("playable-2", 1000, {
    recordingUrl: "https://example.com/2.wav",
  });
  const queue: PlaybackQueueState = {
    streamId: "stream-1",
    items: [first, second],
    currentIndex: 0,
  };
  const phantom = createTranscription("phantom", 2000, {
    streamId: "stream-1",
    recordingUrl: "https://example.com/3.wav",
  });

  const advance = advancePlaybackQueue(queue, phantom);

  assert.ok(advance);
  assert.strictEqual(advance!.nextTranscription.id, "playable-2");
  assert.strictEqual(advance!.nextQueue.currentIndex, 1);
});

test("advancePlaybackQueue ignores queues from other streams", () => {
  const first = createTranscription("playable-1", 0, {
    recordingUrl: "https://example.com/1.wav",
  });
  const queue: PlaybackQueueState = {
    streamId: "stream-1",
    items: [first],
    currentIndex: 0,
  };
  const other = createTranscription("playable-2", 1000, {
    streamId: "stream-2",
    recordingUrl: "https://example.com/2.wav",
  });

  assert.strictEqual(advancePlaybackQueue(queue, other), null);
});
