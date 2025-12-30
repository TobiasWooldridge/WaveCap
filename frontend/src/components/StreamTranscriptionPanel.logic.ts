import type {
  TranscriptionResult,
  TranscriptionSegment as TranscriptionSegmentData,
} from "@types";

export const MIN_SILENCE_MS = 1200;
export const MAX_SILENCE_MS = 6000;
export const GAP_MULTIPLIER = 1.6;
export const DURATION_SILENCE_SCALE = 0.6;
export const PAGER_INCIDENT_GROUP_WINDOW_MS = 90_000;

const preparedTranscriptionsCache = new WeakMap<
  TranscriptionResult[],
  {
    sortedTranscriptions: TranscriptionResult[];
    groupedTranscriptions: TranscriptionGroup[];
  }
>();
const dedupeTranscriptionsCache = new WeakMap<
  TranscriptionResult[],
  TranscriptionResult[]
>();

export interface TranscriptionGroup {
  id: string;
  startTimestamp: string;
  endTimestamp: string;
  averageConfidence: number | null;
  lastTimestampMs: number;
  lastEndMs: number;
  totalGapMs: number;
  gapSamples: number;
  transcriptions: TranscriptionResult[];
  pagerIncidentId: string | null;
}

export interface PlaybackQueueState {
  streamId: string;
  items: TranscriptionResult[];
  currentIndex: number;
}

export interface PlaybackQueueAdvanceResult {
  nextQueue: PlaybackQueueState;
  nextTranscription: TranscriptionResult;
}

const calculateAverageConfidence = (
  transcriptions: TranscriptionResult[],
): number | null => {
  let total = 0;
  let count = 0;

  transcriptions.forEach((transcription) => {
    if (transcription.eventType && transcription.eventType !== "transcription") {
      return;
    }

    const { confidence } = transcription;
    if (typeof confidence === "number" && Number.isFinite(confidence)) {
      total += confidence;
      count += 1;
    }
  });

  if (count === 0) {
    return null;
  }

  return total / count;
};

const sanitizeForId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-24);

const hashString = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
};

const normaliseIncidentId = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getRecordingElementId = (recordingUrl: string): string => {
  const normalized = recordingUrl.trim();
  const suffix = sanitizeForId(normalized) || "recording";
  const hash = hashString(normalized);
  return `audio-${suffix}-${hash}`;
};

export const getTranscriptionDurationMs = (
  transcription: TranscriptionResult,
) => {
  if (transcription.segments && transcription.segments.length > 0) {
    const finiteStarts = transcription.segments
      .map((segment) =>
        typeof segment.start === "number" && Number.isFinite(segment.start)
          ? segment.start
          : null,
      )
      .filter((value): value is number => value !== null);
    const finiteEnds = transcription.segments
      .map((segment) =>
        typeof segment.end === "number" && Number.isFinite(segment.end)
          ? segment.end
          : null,
      )
      .filter((value): value is number => value !== null);

    if (finiteStarts.length > 0 && finiteEnds.length > 0) {
      const minStart = Math.min(...finiteStarts);
      const maxEnd = Math.max(...finiteEnds);
      const durationSeconds = Math.max(0, maxEnd - minStart);

      if (Number.isFinite(durationSeconds)) {
        return durationSeconds * 1000;
      }
    }
  }

  if (
    typeof transcription.duration === "number" &&
    transcription.duration > 0
  ) {
    return transcription.duration * 1000;
  }

  return 0;
};

export const getSegmentDisplayStart = (
  segment: TranscriptionSegmentData,
  transcription: TranscriptionResult,
): number => {
  const segmentStart =
    typeof segment.start === "number" && Number.isFinite(segment.start)
      ? segment.start
      : null;
  const fallbackStart =
    typeof transcription.recordingStartOffset === "number" &&
    Number.isFinite(transcription.recordingStartOffset)
      ? Math.max(0, transcription.recordingStartOffset)
      : null;

  if (segmentStart !== null && segmentStart > 0) {
    return segmentStart;
  }

  if (fallbackStart !== null) {
    return fallbackStart;
  }

  return segmentStart ?? 0;
};

export const getBlankAudioSegmentBounds = (
  transcription: TranscriptionResult,
) => {
  const startOffset =
    typeof transcription.recordingStartOffset === "number" &&
    Number.isFinite(transcription.recordingStartOffset)
      ? Math.max(0, transcription.recordingStartOffset)
      : 0;

  const durationSecondsRaw = getTranscriptionDurationMs(transcription) / 1000;
  const durationSeconds = Number.isFinite(durationSecondsRaw)
    ? Math.max(0, durationSecondsRaw)
    : 0;
  const effectiveDuration = durationSeconds > 0 ? durationSeconds : 0.25;
  const endOffset = startOffset + effectiveDuration;

  return {
    start: startOffset,
    end: endOffset,
  };
};


const shouldIsolateTranscription = (
  transcription: TranscriptionResult,
): boolean => {
  switch (transcription.eventType) {
    case "recording_started":
    case "recording_stopped":
    case "transcription_started":
    case "transcription_stopped":
    case "upstream_disconnected":
    case "upstream_reconnected":
      return true;
    default:
      return false;
  }
};

export const groupTranscriptions = (
  transcriptions: TranscriptionResult[],
): TranscriptionGroup[] => {
  const groups: TranscriptionGroup[] = [];

  transcriptions.forEach((transcription) => {
    const timestampMs = new Date(transcription.timestamp).getTime();
    if (Number.isNaN(timestampMs)) {
      return;
    }

    const durationMs = getTranscriptionDurationMs(transcription);
    const endMs = durationMs > 0 ? timestampMs + durationMs : timestampMs;
    const incidentId = normaliseIncidentId(
      transcription.pagerIncident?.incidentId,
    );
    const lastGroup = groups[groups.length - 1];
    const startNewGroup = () => {
      const initialAverage = calculateAverageConfidence([transcription]);
      groups.push({
        id: transcription.id,
        startTimestamp: transcription.timestamp,
        endTimestamp: transcription.timestamp,
        averageConfidence: initialAverage,
        lastTimestampMs: timestampMs,
        lastEndMs: endMs,
        totalGapMs: 0,
        gapSamples: 0,
        transcriptions: [transcription],
        pagerIncidentId: incidentId,
      });
    };

    if (!lastGroup) {
      startNewGroup();
      return;
    }

    const lastTranscription =
      lastGroup.transcriptions[lastGroup.transcriptions.length - 1];

    if (
      shouldIsolateTranscription(transcription) ||
      shouldIsolateTranscription(lastTranscription)
    ) {
      startNewGroup();
      return;
    }

    const gapMs = Math.max(0, timestampMs - lastGroup.lastEndMs);
    if (!lastGroup.pagerIncidentId && incidentId) {
      lastGroup.pagerIncidentId = incidentId;
    }
    const lastIncidentId = normaliseIncidentId(lastGroup.pagerIncidentId);
    const averageGapMs =
      lastGroup.gapSamples > 0
        ? lastGroup.totalGapMs / lastGroup.gapSamples
        : 0;
    const lastDurationMs = getTranscriptionDurationMs(lastTranscription);
    const durationMsThreshold = Math.max(
      MIN_SILENCE_MS,
      lastDurationMs * DURATION_SILENCE_SCALE,
      durationMs * DURATION_SILENCE_SCALE,
    );
    const dynamicGapThreshold =
      averageGapMs > 0 ? averageGapMs * GAP_MULTIPLIER : MIN_SILENCE_MS;
    const incidentGapThreshold =
      incidentId && lastIncidentId && incidentId === lastIncidentId
        ? PAGER_INCIDENT_GROUP_WINDOW_MS
        : 0;
    const baseSilenceThreshold = Math.min(
      MAX_SILENCE_MS,
      Math.max(MIN_SILENCE_MS, dynamicGapThreshold, durationMsThreshold),
    );
    const silenceThresholdMs =
      incidentGapThreshold > 0
        ? Math.max(baseSilenceThreshold, incidentGapThreshold)
        : baseSilenceThreshold;

    if (gapMs > silenceThresholdMs) {
      startNewGroup();
      return;
    }

    lastGroup.transcriptions.push(transcription);
    lastGroup.lastTimestampMs = timestampMs;
    lastGroup.lastEndMs = Math.max(lastGroup.lastEndMs, endMs);
    lastGroup.endTimestamp = transcription.timestamp;
    lastGroup.averageConfidence = calculateAverageConfidence(
      lastGroup.transcriptions,
    );
    lastGroup.totalGapMs += gapMs;
    lastGroup.gapSamples += 1;
  });

  return groups;
};

export const prepareTranscriptions = (
  transcriptions: TranscriptionResult[],
) => {
  if (!transcriptions || transcriptions.length === 0) {
    return {
      sortedTranscriptions: [] as TranscriptionResult[],
      groupedTranscriptions: [] as TranscriptionGroup[],
    };
  }

  const cached = preparedTranscriptionsCache.get(transcriptions);
  if (cached) {
    return cached;
  }

  const sortedTranscriptions = [...transcriptions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const groupedTranscriptions = groupTranscriptions(sortedTranscriptions);
  const result = { sortedTranscriptions, groupedTranscriptions };
  preparedTranscriptionsCache.set(transcriptions, result);

  return result;
};

export const dedupeAndSortTranscriptions = (
  transcriptions: TranscriptionResult[],
) => {
  if (transcriptions.length === 0) {
    return [];
  }

  const cached = dedupeTranscriptionsCache.get(transcriptions);
  if (cached) {
    return cached;
  }

  const map = new Map<string, TranscriptionResult>();
  transcriptions.forEach((transcription) => {
    map.set(transcription.id, transcription);
  });

  const result = Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  dedupeTranscriptionsCache.set(transcriptions, result);
  return result;
};

const sortByTimestampDescending = (
  a: TranscriptionResult,
  b: TranscriptionResult,
) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

export interface VisibleTranscriptionsOptions {
  historyTranscriptions?: TranscriptionResult[];
  windowMs?: number;
  fallbackLimit?: number;
  now?: number;
}

const DEFAULT_FALLBACK_LIMIT = 5;

export const selectVisibleTranscriptions = (
  liveTranscriptions: TranscriptionResult[],
  options: VisibleTranscriptionsOptions = {},
): TranscriptionResult[] => {
  const historyTranscriptions = options.historyTranscriptions ?? [];
  const now = options.now ?? Date.now();
  const windowMs = options.windowMs;
  const hasWindow =
    typeof windowMs === "number" && Number.isFinite(windowMs) && windowMs > 0;
  const cutoff = hasWindow ? now - windowMs : null;

  const historyIds = new Set(
    historyTranscriptions.map((transcription) => transcription.id),
  );

  const recentLive = liveTranscriptions.filter((transcription) => {
    if (historyIds.has(transcription.id)) {
      return true;
    }

    if (!hasWindow || cutoff === null) {
      return true;
    }

    const timestamp = new Date(transcription.timestamp).getTime();
    if (!Number.isFinite(timestamp)) {
      return true;
    }

    return timestamp >= cutoff;
  });

  let combined = dedupeAndSortTranscriptions([
    ...historyTranscriptions,
    ...recentLive,
  ]);

  if (combined.length === 0 && liveTranscriptions.length > 0) {
    const fallbackLimit = Math.max(
      1,
      options.fallbackLimit ?? DEFAULT_FALLBACK_LIMIT,
    );
    const fallback = [...liveTranscriptions]
      .sort(sortByTimestampDescending)
      .slice(0, fallbackLimit);
    combined = dedupeAndSortTranscriptions([
      ...historyTranscriptions,
      ...fallback,
    ]);
  }

  return combined;
};

export const buildPlaybackQueue = (
  streamId: string,
  orderedTranscriptions: TranscriptionResult[],
  startId: string,
): PlaybackQueueState | null => {
  const playable = orderedTranscriptions.filter(
    (transcription) =>
      typeof transcription.recordingUrl === "string" &&
      transcription.recordingUrl.length > 0,
  );
  const startIndex = playable.findIndex(
    (transcription) => transcription.id === startId,
  );

  if (startIndex === -1) {
    return null;
  }

  return {
    streamId,
    items: playable,
    currentIndex: startIndex,
  };
};

export const advancePlaybackQueue = (
  queue: PlaybackQueueState | null,
  currentTranscription: TranscriptionResult,
): PlaybackQueueAdvanceResult | null => {
  if (!queue || queue.streamId !== currentTranscription.streamId) {
    return null;
  }

  const activeIndex = queue.items.findIndex(
    (item) => item.id === currentTranscription.id,
  );
  const startIndex = activeIndex >= 0 ? activeIndex : queue.currentIndex;

  for (let index = startIndex + 1; index < queue.items.length; index += 1) {
    const candidate = queue.items[index];
    if (candidate?.recordingUrl) {
      return {
        nextQueue: {
          ...queue,
          currentIndex: index,
        },
        nextTranscription: candidate,
      };
    }
  }

  return null;
};
