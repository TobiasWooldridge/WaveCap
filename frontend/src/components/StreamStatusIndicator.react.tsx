import clsx from "clsx";
import { Bell, Globe, Layers, Radio } from "lucide-react";
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

  for (const transcription of transcriptions) {
    const eventType = transcription?.eventType;
    if (eventType === "upstream_disconnected") {
      return false;
    }
    if (eventType === "upstream_reconnected") {
      return true;
    }
  }

  return null;
};

// eslint-disable-next-line react-refresh/only-export-components
export const resolveStreamStatus = (
  stream: Stream,
): StreamStatusResolution => {
  if (!stream.enabled) {
    return { variant: "idle", label: "Transcription stopped" };
  }

  if (stream.status === "queued") {
    return { variant: "queued", label: "Queued for transcription" };
  }

  if (stream.status === "error") {
    return { variant: "error", label: "Stream error" };
  }

  const connectivity = resolveUpstreamConnectivity(stream);
  if (connectivity === false) {
    return { variant: "error", label: "Upstream disconnected" };
  }

  if (connectivity === true || stream.status === "transcribing") {
    return { variant: "active", label: "Live transcription" };
  }

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
): "pager" | "combined" | "web" | "sdr" | "audio" => {
  const source = stream.source ?? "audio";
  if (source === "pager") return "pager";
  if (source === "combined") return "combined";
  const url = String(stream.url || "");
  if (/^https?:\/\//i.test(url)) return "web";
  if (source === "audio") return "sdr";
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
    <span
      className={clsx("stream-status-indicator", className)}
      title={tooltip}
      aria-label={ariaLabel}
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
    </span>
  );
};

export default StreamStatusIndicator;
