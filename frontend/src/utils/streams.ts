import { Stream } from "@types";

const STREAM_TITLE_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export const getStreamTitle = (stream: Stream): string => {
  const trimmedName = stream.name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedUrl = stream.url?.trim();
  if (trimmedUrl) {
    return trimmedUrl;
  }

  return "Untitled stream";
};

export const compareStreamsByName = (a: Stream, b: Stream): number => {
  const nameComparison = STREAM_TITLE_COLLATOR.compare(
    getStreamTitle(a),
    getStreamTitle(b),
  );

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return a.id.localeCompare(b.id);
};

/**
 * Extracts the SDR frequency in Hz from a stream's URL when the source is "sdr".
 * Expected URL format: sdr://<device-id>/<frequencyHz>
 */
export const getSdrFrequencyHz = (stream: Stream): number | null => {
  if ((stream.source ?? "audio") !== "sdr") {
    return null;
  }

  const raw = String(stream.url || "").trim();
  if (!raw) return null;

  // Try URL parsing first
  try {
    const url = new URL(raw);
    if (url.protocol === "sdr:") {
      const path = url.pathname.replace(/^\/+/, "");
      if (/^\d+$/.test(path)) {
        const hz = Number.parseInt(path, 10);
        return Number.isFinite(hz) ? hz : null;
      }
    }
  } catch {
    // Fall through to regex approach
  }

  // Fallback: grab trailing number-like segment
  const match = raw.match(/(\d+)(?:[^\d]*)$/);
  if (!match) return null;
  const hz = Number.parseInt(match[1], 10);
  return Number.isFinite(hz) ? hz : null;
};

export const formatFrequency = (hz: number): string => {
  if (!Number.isFinite(hz) || hz < 0) return "";
  if (hz >= 1_000_000_000) {
    return `${(hz / 1_000_000_000).toFixed(3)} GHz`;
  }
  if (hz >= 1_000_000) {
    return `${(hz / 1_000_000).toFixed(3)} MHz`;
  }
  if (hz >= 1_000) {
    return `${Math.round(hz / 1_000)} kHz`;
  }
  return `${Math.round(hz)} Hz`;
};
