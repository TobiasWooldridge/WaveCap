import { ReactNode, useMemo } from "react";
import clsx from "clsx";
import { useUISettings } from "../contexts/UISettingsContext";
import Button from "./primitives/Button.react";
import "./TranscriptSegmentButton.scss";

interface TranscriptSegmentListItemProps {
  segment: {
    id: number;
    text: string;
    start: number;
    end: number;
    no_speech_prob?: number;
    temperature?: number;
    avg_logprob?: number;
    compression_ratio?: number;
    seek?: number;
  };
  recordingUrl?: string;
  transcriptionId: string;
  isPlaying: boolean;
  onPlay: (
    recordingUrl: string,
    startTime: number | undefined,
    endTime: number | undefined,
    transcriptionId: string,
    options?: { recordingStartOffset?: number },
  ) => void;
  displayOffsetSeconds?: number;
  recordingStartOffset?: number;
}

type SegmentData = TranscriptSegmentListItemProps["segment"];

const clampConfidence = (value: number) => Math.max(0, Math.min(1, value));

const calculateSegmentConfidence = (segment: SegmentData): number | null => {
  if (
    typeof segment.avg_logprob !== "number" ||
    Number.isNaN(segment.avg_logprob)
  ) {
    return null;
  }

  const confidence = Math.exp(segment.avg_logprob);
  if (!Number.isFinite(confidence)) {
    return null;
  }

  return clampConfidence(confidence);
};

const getConfidenceStyles = (
  confidence: number | null,
  colorCodingEnabled: boolean,
) => {
  if (!colorCodingEnabled || confidence === null) {
    return "transcript-segment--unknown";
  }

  if (confidence >= 0.8) {
    return "transcript-segment--high";
  }

  if (confidence >= 0.6) {
    return "transcript-segment--medium";
  }

  return "transcript-segment--low";
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDuration = (seconds: number) => {
  const rounded = Math.max(0, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

interface TranscriptSegmentPlaybackButtonProps {
  onClick: () => void;
  isPlaying: boolean;
  disabled: boolean;
  tooltip?: string;
  confidenceClass: string;
  children: ReactNode;
}

const TranscriptSegmentPlaybackButton = ({
  onClick,
  isPlaying,
  disabled,
  tooltip,
  confidenceClass,
  children,
}: TranscriptSegmentPlaybackButtonProps) => {
  const segmentClassName = clsx(
    "transcript-segment",
    confidenceClass,
    isPlaying && "transcript-segment--playing",
    disabled && "transcript-segment--static",
  );

  if (disabled) {
    return (
      <div className={segmentClassName} aria-disabled="true" title={tooltip}>
        {children}
      </div>
    );
  }

  return (
    <Button
      use="unstyled"
      onClick={onClick}
      tooltip={tooltip}
      className={segmentClassName}
    >
      {children}
    </Button>
  );
};

interface TranscriptSegmentTimeRangeProps {
  startTime: number;
  endTime: number;
  duration: number;
}

const TranscriptSegmentTimeRange = ({
  startTime,
  endTime,
  duration,
}: TranscriptSegmentTimeRangeProps) => (
  <span className="transcript-segment__time">
    {duration > 0
      ? `${formatTime(startTime)} → ${formatTime(endTime)}`
      : formatTime(startTime)}
  </span>
);

const TranscriptSegmentText = ({
  children,
}: {
  children: ReactNode;
}) => <span className="transcript-segment__text">{children}</span>;

interface TranscriptSegmentContentProps {
  startTime: number;
  endTime: number;
  duration: number;
  text: string;
}

const TranscriptSegmentContent = ({
  startTime,
  endTime,
  duration,
  text,
}: TranscriptSegmentContentProps) => (
  <TranscriptSegmentText>
    <TranscriptSegmentTimeRange
      startTime={startTime}
      endTime={endTime}
      duration={duration}
    />
    {" "}
    {text}
  </TranscriptSegmentText>
);

export const TranscriptSegmentListItem = ({
  segment,
  recordingUrl,
  transcriptionId,
  isPlaying,
  onPlay,
  displayOffsetSeconds,
  recordingStartOffset,
}: TranscriptSegmentListItemProps) => {
  const { colorCodingEnabled } = useUISettings();
  const segmentConfidence = useMemo(
    () => calculateSegmentConfidence(segment),
    [segment],
  );
  const confidenceClass = useMemo(
    () => getConfidenceStyles(segmentConfidence, colorCodingEnabled),
    [segmentConfidence, colorCodingEnabled],
  );

  const segmentStart = Math.max(
    0,
    typeof displayOffsetSeconds === "number" &&
      Number.isFinite(displayOffsetSeconds)
      ? displayOffsetSeconds
      : segment.start,
  );

  const segmentEnd = Math.max(segmentStart, segment.end ?? segment.start);
  const segmentDuration = Math.max(0, segmentEnd - segmentStart);

  const handleClick = () => {
    if (recordingUrl) {
      onPlay(recordingUrl, segment.start, segment.end, transcriptionId, {
        recordingStartOffset,
      });
    }
  };

  const tooltipParts: string[] = [];
  if (segmentConfidence !== null) {
    tooltipParts.push(`${Math.round(segmentConfidence * 100)}% confidence`);
  }
  tooltipParts.push(`Starts at ${formatTime(segmentStart)}`);
  if (segmentDuration > 0) {
    tooltipParts.push(`Duration ${formatDuration(segmentDuration)}`);
  }

  return (
    <TranscriptSegmentPlaybackButton
      onClick={handleClick}
      disabled={!recordingUrl}
      tooltip={tooltipParts.join(" • ") || undefined}
      confidenceClass={confidenceClass}
      isPlaying={isPlaying}
    >
      <TranscriptSegmentContent
        startTime={segmentStart}
        endTime={segmentEnd}
        duration={segmentDuration}
        text={segment.text}
      />
    </TranscriptSegmentPlaybackButton>
  );
};

export const TranscriptBoundaryMarker = ({
  label,
  timeSeconds,
}: {
  label?: string;
  timeSeconds: number;
}) => {
  const safeTime = Math.max(0, timeSeconds);
  return (
    <span className="transcript-boundary">
      <span className="transcript-boundary__time">{formatTime(safeTime)}</span>
      <span className="tracking-wide">{label ?? "END"}</span>
    </span>
  );
};
