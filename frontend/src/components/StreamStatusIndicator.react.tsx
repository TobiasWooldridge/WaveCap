import clsx from "clsx";
import { Stream } from "@types";

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

const resolveUpstreamConnectivity = (stream: Stream): boolean | null => {
  const candidate = (stream as { upstreamConnected?: unknown }).upstreamConnected;
  if (typeof candidate === "boolean") {
    return candidate;
  }

  const transcriptions = Array.isArray(stream.transcriptions)
    ? stream.transcriptions
    : [];

  for (let index = transcriptions.length - 1; index >= 0; index -= 1) {
    const eventType = transcriptions[index]?.eventType;
    if (eventType === "upstream_disconnected") {
      return false;
    }
    if (eventType === "upstream_reconnected") {
      return true;
    }
  }

  return null;
};

const resolveStreamStatus = (stream: Stream): StreamStatusResolution => {
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

const getStatusIndicatorClass = (variant: StreamStatusVariant): string => {
  switch (variant) {
    case "active":
      return "stream-status-dot--active";
    case "queued":
      return "stream-status-dot--queued";
    case "error":
      return "stream-status-dot--error";
    default:
      return "stream-status-dot--idle";
  }
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
  const indicatorClass = getStatusIndicatorClass(variant);
  const resolvedLabel = label
    ? formatLabel(label)
    : formatLabel(defaultLabel);
  const tooltip = resolvedLabel ? toTitleCase(resolvedLabel) : undefined;
  const ariaLabel = showText ? undefined : tooltip;

  return (
    <span
      className={clsx("stream-status-indicator", className)}
      title={tooltip}
      aria-label={ariaLabel}
    >
      <span
        className={clsx("stream-status-dot", indicatorClass, dotClassName)}
        aria-hidden="true"
      />
      {showText && resolvedLabel ? (
        <span className={clsx("stream-status-indicator__label", textClassName)}>
          {resolvedLabel}
        </span>
      ) : null}
    </span>
  );
};

export default StreamStatusIndicator;
