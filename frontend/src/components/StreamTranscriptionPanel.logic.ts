import type {
  TranscriptionResult,
  TranscriptionSegment as TranscriptionSegmentData,
} from "@types";

export const MIN_SILENCE_MS = 1200;
export const MAX_SILENCE_MS = 6000;
export const GAP_MULTIPLIER = 1.6;
export const DURATION_SILENCE_SCALE = 0.6;
export const PAGER_INCIDENT_GROUP_WINDOW_MS = 90_000;
export const PAGER_SIMULTANEOUS_WINDOW_MS = 5_000;

export interface CondensedPagerField {
  key: string;
  label: string;
  values: string[];
  format?: "text" | "code";
}

export interface CondensedPagerMessage {
  id: string;
  timestamp: string;
  summary: string | null;
  fields: CondensedPagerField[];
  notes: string[];
  fragments: TranscriptionResult[];
}

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

const normalisePagerFieldKey = (label: string): string => {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  switch (base) {
    case "raw":
    case "raw_message":
    case "rawmessage":
      return "raw_message";
    case "talk_group":
    case "talkgroup":
    case "tg":
      return "talkgroup";
    case "alarm":
    case "alarm_level":
      return "alarm_level";
    default:
      return base;
  }
};

const normalisePagerFieldLabel = (key: string, fallback: string): string => {
  switch (key) {
    case "map":
      return "Map";
    case "talkgroup":
      return "Talkgroup";
    case "priority":
      return "Priority";
    case "narrative":
      return "Narrative";
    case "units":
      return "Units";
    case "raw_message":
      return "Raw message";
    case "address":
      return "Address";
    case "alarm_level":
      return "Alarm level";
    default:
      return fallback;
  }
};

const PAGER_FIELD_ORDER: Record<string, number> = {
  map: 10,
  talkgroup: 20,
  address: 30,
  alarm_level: 40,
  priority: 50,
  narrative: 60,
  units: 70,
  raw_message: 80,
};

const PART_SUFFIX_PATTERN = /\s*\(Part\s+\d+\s+of\s+\d+\)\s*$/i;

const sanitizePagerValue = (value: string): string =>
  value.replace(PART_SUFFIX_PATTERN, "").trim();

interface ParsedPagerFragment {
  summary: string | null;
  fields: { label: string; value: string; format?: "text" | "code" }[];
  notes: string[];
}

const parsePagerFragment = (text: string): ParsedPagerFragment => {
  const lines = text.split(/\r?\n/);
  let summary: string | null = null;
  const fields: { label: string; value: string; format?: "text" | "code" }[] = [];
  const notes: string[] = [];

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return;
    }

    const bulletMatch = /^•\s*(.*)$/u.exec(trimmed);
    const content = bulletMatch ? bulletMatch[1].trim() : trimmed;

    if (!summary && !bulletMatch && !/^priority\b/i.test(content)) {
      summary = content;
      return;
    }

    const colonIndex = content.indexOf(":");
    if (colonIndex > 0 && colonIndex < content.length - 1) {
      const label = content.slice(0, colonIndex).trim();
      const value = content.slice(colonIndex + 1).trim();
      if (value) {
        const format = /raw\s*message/i.test(label) ? "code" : "text";
        fields.push({ label, value, format });
      }
      return;
    }

    const priorityMatch = /^priority\s*(.*)$/i.exec(content);
    if (priorityMatch) {
      const value = priorityMatch[1].replace(/^[:\s]+/, "").trim();
      if (value) {
        fields.push({ label: "Priority", value });
      }
      return;
    }

    const talkgroupMatch = /^talkgroup\s+(.+)$/i.exec(content);
    if (talkgroupMatch) {
      fields.push({ label: "Talkgroup", value: talkgroupMatch[1].trim() });
      return;
    }

    const narrativeMatch = /^==\s*(.+)$/i.exec(content);
    if (narrativeMatch) {
      fields.push({ label: "Narrative", value: narrativeMatch[1].trim() });
      return;
    }

    if (!summary && index === 0) {
      summary = content;
      return;
    }

    notes.push(content);
  });

  return { summary, fields, notes };
};

const appendPagerField = (
  fieldMap: Map<string, CondensedPagerField>,
  label: string,
  value: string,
  format: "text" | "code" = "text",
) => {
  const cleanedValue = sanitizePagerValue(value);
  if (!cleanedValue) {
    return;
  }

  const normalisedKey = normalisePagerFieldKey(label);
  const key = normalisedKey || label.toLowerCase();
  const displayLabel = normalisePagerFieldLabel(key, label.trim());
  const existing = fieldMap.get(key);

  if (existing) {
    if (!existing.values.some((item) => item.toLowerCase() === cleanedValue.toLowerCase())) {
      existing.values.push(cleanedValue);
    }
    if (format === "code") {
      existing.format = "code";
    }
    return;
  }

  fieldMap.set(key, {
    key,
    label: displayLabel,
    values: [cleanedValue],
    format,
  });
};

export const condensePagerTranscriptions = (
  transcriptions: TranscriptionResult[],
): CondensedPagerMessage[] => {
  if (transcriptions.length === 0) {
    return [];
  }

  const sorted = [...transcriptions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  interface PagerCluster {
    transcriptions: TranscriptionResult[];
    lastTimestampMs: number;
  }

  const clusters: PagerCluster[] = [];

  sorted.forEach((transcription) => {
    const timestampMs = new Date(transcription.timestamp).getTime();
    if (Number.isNaN(timestampMs)) {
      return;
    }

    const lastCluster = clusters[clusters.length - 1];
    if (
      !lastCluster ||
      timestampMs - lastCluster.lastTimestampMs > PAGER_SIMULTANEOUS_WINDOW_MS
    ) {
      clusters.push({
        transcriptions: [transcription],
        lastTimestampMs: timestampMs,
      });
      return;
    }

    lastCluster.transcriptions.push(transcription);
    lastCluster.lastTimestampMs = timestampMs;
  });

  return clusters.map((cluster) => {
    const fieldMap = new Map<string, CondensedPagerField>();
    const noteSet = new Set<string>();
    let summary: string | null = null;

    cluster.transcriptions.forEach((transcription) => {
      const parsed = parsePagerFragment(transcription.text ?? "");
      if (!summary && parsed.summary) {
        summary = parsed.summary;
      } else if (parsed.summary && parsed.summary !== summary) {
        noteSet.add(parsed.summary);
      }

      parsed.fields.forEach(({ label, value, format }) => {
        appendPagerField(fieldMap, label, value, format);
      });
      parsed.notes.forEach((note) => {
        const cleaned = sanitizePagerValue(note);
        if (cleaned) {
          noteSet.add(cleaned);
        }
      });
    });

    const incident = cluster.transcriptions.find((item) => item.pagerIncident)?.pagerIncident;
    if (incident) {
      if (!summary) {
        const summaryParts = [incident.incidentId, incident.callType, incident.address]
          .map((value) => (value ? value.trim() : ""))
          .filter((value) => value);
        if (incident.alarmLevel) {
          summaryParts.push(`Alarm level ${incident.alarmLevel}`);
        }
        if (summaryParts.length > 0) {
          summary = summaryParts.join(" – ");
        }
      }

      if (incident.map) {
        appendPagerField(fieldMap, "Map", incident.map);
      }
      if (incident.talkgroup) {
        appendPagerField(fieldMap, "Talkgroup", incident.talkgroup);
      }
      if (incident.address) {
        appendPagerField(fieldMap, "Address", incident.address);
      }
      if (incident.alarmLevel) {
        appendPagerField(fieldMap, "Alarm level", incident.alarmLevel);
      }
      if (incident.narrative) {
        appendPagerField(fieldMap, "Narrative", incident.narrative);
      }
      if (incident.units) {
        appendPagerField(fieldMap, "Units", incident.units);
      }
      if (incident.rawMessage) {
        appendPagerField(fieldMap, "Raw message", incident.rawMessage, "code");
      }
    }

    const fields = Array.from(fieldMap.values()).sort((a, b) => {
      const rankA = PAGER_FIELD_ORDER[a.key] ?? 100;
      const rankB = PAGER_FIELD_ORDER[b.key] ?? 100;
      if (rankA === rankB) {
        return a.label.localeCompare(b.label);
      }
      return rankA - rankB;
    });

    return {
      id: cluster.transcriptions[0].id,
      timestamp: cluster.transcriptions[0].timestamp,
      summary,
      fields,
      notes: Array.from(noteSet),
      fragments: cluster.transcriptions,
    } satisfies CondensedPagerMessage;
  });
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

  const sortedTranscriptions = [...transcriptions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const groupedTranscriptions = groupTranscriptions(sortedTranscriptions);

  return { sortedTranscriptions, groupedTranscriptions };
};

export const dedupeAndSortTranscriptions = (
  transcriptions: TranscriptionResult[],
) => {
  if (transcriptions.length === 0) {
    return [];
  }

  const map = new Map<string, TranscriptionResult>();
  transcriptions.forEach((transcription) => {
    map.set(transcription.id, transcription);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
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
