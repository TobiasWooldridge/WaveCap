export const MIN_SEGMENT_WINDOW = 0.25;

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? (value as number) : null;

export interface PlaybackRange {
  start: number;
  end: number;
}

export const computePlaybackRange = (
  startTime?: number | null,
  endTime?: number | null,
  recordingStartOffset?: number | null,
): PlaybackRange => {
  const safeStart = finiteOrNull(startTime);
  const safeEnd = finiteOrNull(endTime);
  const offset = finiteOrNull(recordingStartOffset);

  const rawStart =
    safeStart !== null && safeStart > 0
      ? safeStart
      : offset ?? (safeStart !== null ? Math.max(0, safeStart) : 0);
  const playbackStart = Math.max(0, rawStart);

  const segmentDuration =
    safeEnd !== null && safeStart !== null
      ? Math.max(0, safeEnd - safeStart)
      : null;

  let playbackEnd =
    segmentDuration !== null
      ? playbackStart + segmentDuration
      : safeEnd !== null && safeEnd > playbackStart
        ? safeEnd
        : playbackStart;

  if (!Number.isFinite(playbackEnd)) {
    playbackEnd = playbackStart;
  }

  if (playbackEnd <= playbackStart) {
    playbackEnd = playbackStart + MIN_SEGMENT_WINDOW;
  }

  // Ensure end is not negative after clamping start
  playbackEnd = Math.max(playbackEnd, playbackStart + MIN_SEGMENT_WINDOW);

  return { start: playbackStart, end: playbackEnd };
};
