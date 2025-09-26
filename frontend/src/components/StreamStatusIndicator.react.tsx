import clsx from "clsx";
import { Stream } from "@types";

type StreamStatusVariant = "active" | "queued" | "error" | "idle";

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

const resolveStreamStatusVariant = (stream: Stream): StreamStatusVariant => {
  if (!stream.enabled) {
    return "idle";
  }

  if (stream.status === "queued") {
    return "queued";
  }

  if (stream.status === "error") {
    return "error";
  }

  const connectivity = resolveUpstreamConnectivity(stream);
  if (connectivity === true) {
    return "active";
  }

  if (connectivity === false) {
    return "error";
  }

  if (stream.status === "transcribing") {
    return "active";
  }

  return "idle";
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
  const variant = resolveStreamStatusVariant(stream);
  const indicatorClass = getStatusIndicatorClass(variant);
  const resolvedLabel = label ? formatLabel(label) : formatLabel(stream.status);
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
