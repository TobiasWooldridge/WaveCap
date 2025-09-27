import { test } from "node:test";
import assert from "node:assert/strict";
import { computePlaybackRange, MIN_SEGMENT_WINDOW } from "./playback";

test("computePlaybackRange uses explicit segment boundaries when valid", () => {
  const { start, end } = computePlaybackRange(10, 12, 3);
  assert.equal(start, 10);
  assert.equal(end, 12);
});

test("computePlaybackRange falls back to recording offset when start is null", () => {
  const { start, end } = computePlaybackRange(null, 12, 5);
  assert.equal(start, 5);
  assert.equal(end, 12);
});

test("computePlaybackRange clamps to minimum window when end <= start", () => {
  const { start, end } = computePlaybackRange(8, 7.5, null);
  assert.equal(start, 8);
  assert.equal(end, 8 + MIN_SEGMENT_WINDOW);
});

test("computePlaybackRange handles missing inputs with sensible defaults", () => {
  const { start, end } = computePlaybackRange(undefined, undefined, undefined);
  assert.equal(start, 0);
  assert.equal(end, MIN_SEGMENT_WINDOW);
});

test("computePlaybackRange ignores non-finite values", () => {
  const { start, end } = computePlaybackRange(NaN, Infinity, -2);
  assert.equal(start, 0);
  assert.equal(end, MIN_SEGMENT_WINDOW);
});

