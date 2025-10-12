import type { TranscriptionResult } from "@types";

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

export const PAGER_SIMULTANEOUS_WINDOW_MS = 5_000;

const normalisePagerFieldKey = (label: string): string => {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

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

/**
 * Safely get the first value for a given condensed field key from a pager message.
 */
export const getCondensedFieldValue = (
  message: CondensedPagerMessage,
  key: string,
): string | null => {
  const f = message.fields.find((x) => x.key === key);
  if (!f || f.values.length === 0) return null;
  return f.values[0];
};
