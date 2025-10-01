import { useMemo, type MouseEvent, type ReactNode } from "react";
import { Download, VolumeX } from "lucide-react";
import {
  TranscriptionResult,
  TranscriptionSegment as TranscriptionSegmentData,
} from "@types";
import Button from "./primitives/Button.react";
import {
  TranscriptBoundaryMarker,
  TranscriptSegmentListItem,
} from "./TranscriptSegmentButton.react";
import {
  getBlankAudioSegmentBounds,
  getSegmentDisplayStart,
  getTranscriptionDurationMs,
} from "./StreamTranscriptionPanel.logic";
import "./TranscriptionSegmentChips.scss";

type PlaySegmentHandler = (
  recordingUrl: string,
  startTime: number | undefined,
  endTime: number | undefined,
  transcriptionId: string,
  options?: { recordingStartOffset?: number },
) => void;

const buildSegmentIdentifier = (
  recordingId: string | null,
  transcriptionId: string,
  segment: Pick<TranscriptionSegmentData, "start" | "end">,
) =>
  recordingId
    ? `${recordingId}-${segment.start}-${segment.end}`
    : `${transcriptionId}-${segment.start}-${segment.end}`;

const DEFAULT_DOWNLOAD_EXTENSION = "wav";

const sanitizeFilenameFragment = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const extractFilenameFromUrl = (recordingUrl: string): string | null => {
  if (!recordingUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(recordingUrl);
    const pathname = parsedUrl.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const candidate = segments.pop();
    if (candidate) {
      return candidate;
    }
  } catch {
    // Fall back to manual parsing for non-standard URLs
    const withoutQuery = recordingUrl.split("?")[0]?.split("#")[0] ?? recordingUrl;
    const segments = withoutQuery.split("/").filter(Boolean);
    const candidate = segments.pop();
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

const deriveDownloadFilename = (
  recordingUrl: string,
  transcriptionId: string,
): string => {
  const candidate = extractFilenameFromUrl(recordingUrl)?.trim();
  if (candidate) {
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(candidate);
    return hasExtension ? candidate : `${candidate}.${DEFAULT_DOWNLOAD_EXTENSION}`;
  }

  const sanitizedId = sanitizeFilenameFragment(transcriptionId) || "transcription";
  return `${sanitizedId}.${DEFAULT_DOWNLOAD_EXTENSION}`;
};

const formatTimeLabel = (seconds: number): string => {
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

interface RecordingDownloadButtonProps {
  recordingUrl: string;
  transcriptionId: string;
  label: string;
}

const RecordingDownloadButton = ({
  recordingUrl,
  transcriptionId,
  label,
}: RecordingDownloadButtonProps) => {
  const handleDownload = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    if (!recordingUrl) {
      return;
    }

    if (typeof document === "undefined") {
      return;
    }

    const link = document.createElement("a");
    link.href = recordingUrl;
    link.rel = "noopener";
    link.download = deriveDownloadFilename(recordingUrl, transcriptionId);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      use="unstyled"
      className="transcript-segment__download-button"
      onClick={handleDownload}
      startContent={<Download size={20} aria-hidden="true" />}
      isCondensed
    >
      {label}
    </Button>
  );
};

interface SegmentPlaybackChipProps {
  transcription: TranscriptionResult;
  segment: TranscriptionSegmentData;
  recordingUrl: string | null;
  recordingId: string | null;
  playingSegmentId: string | null;
  onPlay: PlaySegmentHandler;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string,
    startTime: number,
    endTime: number,
  ) => boolean;
  displayOffsetSeconds?: number;
}

const SegmentPlaybackChip = ({
  transcription,
  segment,
  recordingUrl,
  recordingId,
  playingSegmentId,
  onPlay,
  isSegmentCurrentlyPlaying,
  displayOffsetSeconds,
}: SegmentPlaybackChipProps) => {
  const segmentIdentifier = buildSegmentIdentifier(
    recordingId,
    transcription.id,
    segment,
  );
  const normalizedRecordingUrl = recordingUrl?.trim() ?? null;
  const hasRecording = Boolean(normalizedRecordingUrl);
  const isPlaying = Boolean(
    (recordingId && playingSegmentId === segmentIdentifier) ||
      (hasRecording &&
        normalizedRecordingUrl &&
        isSegmentCurrentlyPlaying(
          normalizedRecordingUrl,
          segment.start,
          segment.end,
        )),
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

  const trailingAction =
    hasRecording && normalizedRecordingUrl
      ? (
          <RecordingDownloadButton
            recordingUrl={normalizedRecordingUrl}
            transcriptionId={transcription.id}
            label={
              segmentDuration
                ? `Download audio from ${formatTimeLabel(segmentStart)} to ${formatTimeLabel(segmentEnd)}`
                : `Download audio at ${formatTimeLabel(segmentStart)}`
            }
          />
        )
      : null;

  return (
    <TranscriptSegmentListItem
      segment={segment}
      recordingUrl={normalizedRecordingUrl ?? undefined}
      transcriptionId={transcription.id}
      isPlaying={isPlaying}
      onPlay={onPlay}
      displayOffsetSeconds={displayOffsetSeconds}
      recordingStartOffset={transcription.recordingStartOffset}
      trailingAction={trailingAction ?? undefined}
    />
  );
};

interface SilenceSegmentChipProps {
  transcription: TranscriptionResult;
  recordingUrl: string | null;
  recordingId: string | null;
  playingSegmentId: string | null;
  onPlay: PlaySegmentHandler;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string,
    startTime: number,
    endTime: number,
  ) => boolean;
}

const SilenceSegmentChip = ({
  transcription,
  recordingUrl,
  recordingId,
  playingSegmentId,
  onPlay,
  isSegmentCurrentlyPlaying,
}: SilenceSegmentChipProps) => {
  const { start, end } = getBlankAudioSegmentBounds(transcription);
  const segment: TranscriptionSegmentData = {
    id: -1,
    text: "Silence",
    start,
    end,
    avg_logprob: Number.NaN,
    no_speech_prob: Number.NaN,
    temperature: Number.NaN,
    compression_ratio: Number.NaN,
    seek: -1,
  };

  if (recordingUrl && recordingId) {
    return (
      <SegmentPlaybackChip
        transcription={transcription}
        segment={segment}
        recordingUrl={recordingUrl}
        recordingId={recordingId}
        playingSegmentId={playingSegmentId}
        onPlay={onPlay}
        isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
        displayOffsetSeconds={start}
      />
    );
  }

  const silenceDuration = Math.max(0, end - start);
  const formattedDuration =
    silenceDuration >= 10
      ? Math.round(silenceDuration).toString()
      : silenceDuration.toFixed(1).replace(/\.0$/, "");
  const label =
    silenceDuration > 0 ? `${formattedDuration}s silence` : "Silence";

  return (
    <span
      className="transcript-boundary transcript-silence-chip"
      title="No speech detected"
    >
      <VolumeX size={14} className="transcript-silence-chip__icon text-neutral" />
      <span>{label}</span>
    </span>
  );
};

interface SyntheticSegmentChipProps {
  transcription: TranscriptionResult;
  displayText: string;
  recordingUrl: string | null;
  recordingId: string | null;
  playingSegmentId: string | null;
  onPlay: PlaySegmentHandler;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string,
    startTime: number,
    endTime: number,
  ) => boolean;
}

const SyntheticSegmentChip = ({
  transcription,
  displayText,
  recordingUrl,
  recordingId,
  playingSegmentId,
  onPlay,
  isSegmentCurrentlyPlaying,
}: SyntheticSegmentChipProps) => {
  const fallbackStart =
    typeof transcription.recordingStartOffset === "number" &&
    Number.isFinite(transcription.recordingStartOffset)
      ? Math.max(0, transcription.recordingStartOffset)
      : 0;
  const rawDurationSeconds = getTranscriptionDurationMs(transcription) / 1000;
  const safeDurationSeconds =
    Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0
      ? rawDurationSeconds
      : 0;
  const fallbackEnd = fallbackStart + safeDurationSeconds;

  const segment: TranscriptionSegmentData = {
    id: -1,
    text: displayText,
    start: fallbackStart,
    end: fallbackEnd,
    avg_logprob: Number.NaN,
    no_speech_prob: Number.NaN,
    temperature: Number.NaN,
    compression_ratio: Number.NaN,
    seek: -1,
  };

  if (recordingUrl && recordingId) {
    return (
      <SegmentPlaybackChip
        transcription={transcription}
        segment={segment}
        recordingUrl={recordingUrl}
        recordingId={recordingId}
        playingSegmentId={playingSegmentId}
        onPlay={onPlay}
        isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
        displayOffsetSeconds={fallbackStart}
      />
    );
  }

  return (
    <span className="transcript-synthetic-chip" title="Transcription summary">
      {displayText}
    </span>
  );
};

export interface TranscriptionSegmentChipsProps {
  transcription: TranscriptionResult;
  displayText?: string | null;
  blankAudio: boolean;
  transcriptCorrectionEnabled: boolean;
  recordingUrl?: string | null;
  recordingId?: string | null;
  playingSegmentId: string | null;
  onPlaySegment: PlaySegmentHandler;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string,
    startTime: number,
    endTime: number,
  ) => boolean;
  boundaryKey?: string;
}

export const TranscriptionSegmentChips = ({
  transcription,
  displayText,
  blankAudio,
  transcriptCorrectionEnabled,
  recordingUrl,
  recordingId,
  playingSegmentId,
  onPlaySegment,
  isSegmentCurrentlyPlaying,
  boundaryKey = "boundary",
}: TranscriptionSegmentChipsProps) => {
  const chips = useMemo(() => {
    const chipElements: ReactNode[] = [];
    const normalizedRecordingUrl = recordingUrl ?? null;
    const normalizedRecordingId = recordingId ?? null;
    const segments = Array.isArray(transcription.segments)
      ? transcription.segments
      : [];
    const durationSeconds = getTranscriptionDurationMs(transcription) / 1000;

    if (blankAudio) {
      chipElements.push(
        <SilenceSegmentChip
          key={`${transcription.id}-silence`}
          transcription={transcription}
          recordingUrl={normalizedRecordingUrl}
          recordingId={normalizedRecordingId}
          playingSegmentId={playingSegmentId}
          onPlay={onPlaySegment}
          isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
        />,
      );

      if (
        transcriptCorrectionEnabled &&
        durationSeconds > 0 &&
        normalizedRecordingUrl &&
        normalizedRecordingId
      ) {
        chipElements.push(
          <TranscriptBoundaryMarker
            key={`${transcription.id}-${boundaryKey}`}
            timeSeconds={durationSeconds}
          />,
        );
      }

      return chipElements;
    }

    if (segments.length > 0) {
      segments.forEach((segment, index) => {
        const segmentKey = `${transcription.id}-${segment.start}-${segment.end}-${index}`;
        chipElements.push(
          <SegmentPlaybackChip
            key={segmentKey}
            transcription={transcription}
            segment={segment}
            recordingUrl={normalizedRecordingUrl}
            recordingId={normalizedRecordingId}
            playingSegmentId={playingSegmentId}
            onPlay={onPlaySegment}
            isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
            displayOffsetSeconds={getSegmentDisplayStart(segment, transcription)}
          />,
        );
      });

      if (transcriptCorrectionEnabled && durationSeconds > 0) {
        chipElements.push(
          <TranscriptBoundaryMarker
            key={`${transcription.id}-${boundaryKey}`}
            timeSeconds={durationSeconds}
          />,
        );
      }

      return chipElements;
    }

    const normalizedDisplayText = displayText?.trim();
    if (normalizedDisplayText) {
      chipElements.push(
        <SyntheticSegmentChip
          key={`${transcription.id}-synthetic`}
          transcription={transcription}
          displayText={normalizedDisplayText}
          recordingUrl={normalizedRecordingUrl}
          recordingId={normalizedRecordingId}
          playingSegmentId={playingSegmentId}
          onPlay={onPlaySegment}
          isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
        />,
      );

      if (transcriptCorrectionEnabled && durationSeconds > 0) {
        chipElements.push(
          <TranscriptBoundaryMarker
            key={`${transcription.id}-${boundaryKey}`}
            timeSeconds={durationSeconds}
          />,
        );
      }
    }

    return chipElements;
  }, [
    blankAudio,
    boundaryKey,
    displayText,
    isSegmentCurrentlyPlaying,
    onPlaySegment,
    playingSegmentId,
    recordingId,
    recordingUrl,
    transcriptCorrectionEnabled,
    transcription,
  ]);

  if (chips.length === 0) {
    return null;
  }

  return <>{chips}</>;
};

export default TranscriptionSegmentChips;
