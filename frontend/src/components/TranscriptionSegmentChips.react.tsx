import { useMemo, type ReactNode } from "react";
import { VolumeX } from "lucide-react";
import {
  TranscriptionResult,
  TranscriptionSegment as TranscriptionSegmentData,
} from "@types";
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
  const hasRecording = Boolean(recordingUrl);
  const isPlaying = Boolean(
    (recordingId && playingSegmentId === segmentIdentifier) ||
      (hasRecording &&
        recordingUrl &&
        isSegmentCurrentlyPlaying(recordingUrl, segment.start, segment.end)),
  );

  return (
    <TranscriptSegmentListItem
      segment={segment}
      recordingUrl={recordingUrl ?? undefined}
      transcriptionId={transcription.id}
      isPlaying={isPlaying}
      onPlay={onPlay}
      displayOffsetSeconds={displayOffsetSeconds}
      recordingStartOffset={transcription.recordingStartOffset}
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
