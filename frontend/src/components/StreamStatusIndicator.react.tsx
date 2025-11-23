import clsx from "clsx";
import { Bell, Globe, Layers, Radio } from "lucide-react";
import InlineText from "./primitives/InlineText.react";
import type { Stream, TranscriptionResult } from "@types";

type StreamStatusVariant = "active" | "queued" | "error" | "idle";

type StreamStatusResolution = {
  variant: StreamStatusVariant;
  label: string;
};

type StreamStatusIndicatorProps = {
  stream: Stream;
  showText?: boolean;
  label?: string | null;
  className?: string;
  dotClassName?: string;
  textClassName?: string;
};

const formatLabel = (label: string): string => {
  return label.replace(/[_\s]+/g, " ").trim();
};

const toTitleCase = (label: string): string => {
  return label
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

// eslint-disable-next-line react-refresh/only-export-components
export const resolveUpstreamConnectivity = (
  stream: Stream,
): boolean | null => {
  const candidate = (stream as { upstreamConnected?: unknown }).upstreamConnected;
  if (typeof candidate === "boolean") {
    return candidate;
  }

  const transcriptions: TranscriptionResult[] = Array.isArray(
    stream.transcriptions,
  )
    ? stream.transcriptions
    : [];

  // Determine the most recent connectivity event by timestamp, independent of
  // array ordering, and also consider whether normal transcriptions have
  // arrived after a disconnect (which implies connectivity has been restored
  // even if the explicit "reconnected" system event hasn't been recorded).
  let lastDisconnectTs = -Infinity;
  let lastReconnectTs = -Infinity;
  let lastNormalTranscriptionTs = -Infinity;

  for (const t of transcriptions) {
    const ts = new Date(t?.timestamp ?? 0).getTime();
    if (!Number.isFinite(ts)) continue;
    const type = t?.eventType ?? "transcription";
    if (type === "upstream_disconnected") {
      if (ts > lastDisconnectTs) lastDisconnectTs = ts;
      continue;
    }
    if (type === "upstream_reconnected") {
      if (ts > lastReconnectTs) lastReconnectTs = ts;
      continue;
    }
    // Any non-system transcription implies audio activity
    if (type === "transcription") {
      if (ts > lastNormalTranscriptionTs) lastNormalTranscriptionTs = ts;
    }
  }

  // If we have an explicit reconnected event after the last disconnect, treat
  // as connected.
  if (lastReconnectTs > lastDisconnectTs && lastReconnectTs > -Infinity) {
    return true;
  }

  // If the latest connectivity event was a disconnect but we have observed
  // normal transcriptions afterwards, consider the upstream connected.
  if (
    lastDisconnectTs > -Infinity &&
    lastNormalTranscriptionTs > lastDisconnectTs
  ) {
    return true;
  }

  // If the most recent connectivity event is a disconnect and no activity has
  // occurred since, treat as disconnected.
  if (lastDisconnectTs > -Infinity && lastReconnectTs <= lastDisconnectTs) {
    return false;
  }

  // No connectivity signals yet
  return null;
};

// eslint-disable-next-line react-refresh/only-export-components
export const resolveStreamStatus = (
  stream: Stream,
): StreamStatusResolution => {
  const kind = resolveStreamKind(stream);

  // Pager feeds do not have an upstream; they are event-driven
  if (kind === "pager") {
    const hasMessages = Array.isArray(stream.transcriptions)
      && stream.transcriptions.some((t) => (t?.eventType ?? "transcription") === "transcription");
    if (!stream.enabled) {
      return { variant: "idle", label: "Pager updates stopped" };
    }
    if (stream.status === "error") {
      return { variant: "error", label: "Pager feed error" };
    }
    if (hasMessages || stream.status === "transcribing") {
      return { variant: "active", label: "Receiving pager updates" };
    }
    return { variant: "idle", label: "Waiting for pager updates" };
  }

  // Combined view has no upstream; derive from status only
  if (kind === "combined") {
    if (stream.status === "error") {
      return { variant: "error", label: "Combined view issues" };
    }
    if (stream.status === "queued") {
      return { variant: "queued", label: "Aggregating activity" };
    }
    if (stream.status === "transcribing") {
      return { variant: "active", label: "Aggregating activity" };
    }
    return { variant: "idle", label: "No recent activity" };
  }

  // For web audio streams, show connectivity details when we have signals
  if (!stream.enabled) {
    return { variant: "idle", label: "Transcription stopped" };
  }
  if (stream.status === "error") {
    return { variant: "error", label: "Stream error" };
  }
  if (stream.status === "queued") {
    return { variant: "queued", label: "Queued for transcription" };
  }

  const connectivity = resolveUpstreamConnectivity(stream);
  if (connectivity === false) {
    // If we have never observed any normal transcription or explicit reconnect
    // events, treat initial failures as "Connecting" rather than "Disconnected".
    const transcriptions = Array.isArray(stream.transcriptions)
      ? stream.transcriptions
      : [];
    let sawReconnect = false;
    let sawNormal = false;
    for (const t of transcriptions) {
      const type = t?.eventType ?? "transcription";
      if (type === "upstream_reconnected") sawReconnect = true;
      if (type === "transcription") sawNormal = true;
      if (sawReconnect || sawNormal) break;
    }
    if (!sawReconnect && !sawNormal) {
      return { variant: "queued", label: "Connecting to stream" };
    }
    return { variant: "error", label: "Upstream disconnected" };
  }
  if (connectivity === true || stream.status === "transcribing") {
    return { variant: "active", label: "Live transcription" };
  }
  // No connectivity signals yet
  return { variant: "idle", label: "Awaiting audio" };
};

// Legacy class mapping kept for compatibility; icon variant uses getIconStatusClass

const getIconStatusClass = (variant: StreamStatusVariant): string => {
  switch (variant) {
    case "active":
      return "stream-status-icon--active";
    case "queued":
      return "stream-status-icon--queued";
    case "error":
      return "stream-status-icon--error";
    default:
      return "stream-status-icon--idle";
  }
};

const resolveStreamKind = (
  stream: Stream,
): "pager" | "combined" | "web" | "remote" | "audio" => {
  const source = stream.source ?? "audio";
  if (source === "pager") return "pager";
  if (source === "combined") return "combined";
  if (source === "remote") return "remote";
  const url = String(stream.url || "");
  if (/^https?:\/\//i.test(url)) return "web";
  return "audio";
};

const StreamStatusIndicator = ({
  stream,
  showText = false,
  label,
  className,
  dotClassName,
  textClassName,
}: StreamStatusIndicatorProps) => {
  const { variant, label: defaultLabel } = resolveStreamStatus(stream);
  const iconStatusClass = getIconStatusClass(variant);
  const resolvedLabel = label
    ? formatLabel(label)
    : formatLabel(defaultLabel);
  const tooltip = resolvedLabel ? toTitleCase(resolvedLabel) : undefined;
  const ariaLabel = showText ? undefined : tooltip;
  const kind = resolveStreamKind(stream);

  return (
    <InlineText
      className={clsx("stream-status-indicator", className)}
      title={tooltip}
      aria-label={ariaLabel}
      gap={2}
    >
      {/* Icon colored by status, representing stream kind */}
      {kind === "pager" ? (
        <Bell
          size={16}
          className={clsx("stream-status-icon", iconStatusClass, dotClassName)}
          aria-hidden="true"
        />
      ) : kind === "combined" ? (
        <Layers
          size={16}
          className={clsx("stream-status-icon", iconStatusClass, dotClassName)}
          aria-hidden="true"
        />
      ) : kind === "web" ? (
        <Globe
          size={16}
          className={clsx("stream-status-icon", iconStatusClass, dotClassName)}
          aria-hidden="true"
        />
      ) : (
        <Radio
          size={16}
          className={clsx("stream-status-icon", iconStatusClass, dotClassName)}
          aria-hidden="true"
        />
      )}
      {showText && resolvedLabel ? (
        <span className={clsx("stream-status-indicator__label", textClassName)}>
          {resolvedLabel}
        </span>
      ) : null}
    </InlineText>
  );
};

export default StreamStatusIndicator;
