import React from "react";
import { Pause, Play, Radio } from "lucide-react";
import type { Stream, TranscriptionResult } from "@types";
import { getNotifiableAlerts, getReviewStatus, getTranscriptionDisplayText, isBlankAudioText, isSystemTranscription } from "../utils/transcriptions";
import { getRecordingElementId } from "./StreamTranscriptionPanel.logic";
import Button from "./primitives/Button.react";
import AudioElement from "./primitives/AudioElement.react";
import { Timestamp } from "./primitives/Timestamp.react";
import { TimeInterval } from "./primitives/TimeInterval.react";
import { TranscriptionSegmentChips } from "./TranscriptionSegmentChips.react";
import { AlertChips } from "./chips/AlertChips.react";
import StreamStatusIndicator from "./StreamStatusIndicator.react";
import { SystemEventChip } from "./chips/SystemEventChip.react";

type PlayAllHandler = (
  streamId: string,
  transcription: TranscriptionResult,
  orderedTranscriptions: TranscriptionResult[],
) => void;

type PlaySegmentHandler = (
  recordingUrl: string,
  startTime: number | undefined,
  endTime: number | undefined,
  transcriptionId: string,
  options?: { recordingStartOffset?: number },
) => void;

export interface TranscriptMessageRowProps {
  streamId: string;
  streamName: string;
  stream?: Stream;
  transcription: TranscriptionResult;
  orderedTranscriptions: TranscriptionResult[];
  transcriptCorrectionEnabled: boolean;
  playingRecording: string | null;
  playingTranscriptionId: string | null;
  playingSegmentId: string | null;
  recordingAudioRefs: React.MutableRefObject<Record<string, HTMLAudioElement | null>>;
  onPlayAll: PlayAllHandler;
  onPlaySegment: PlaySegmentHandler;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string,
    startTime: number,
    endTime: number,
  ) => boolean;
}

export const TranscriptMessageRow: React.FC<TranscriptMessageRowProps> = ({
  streamId,
  streamName,
  stream,
  transcription,
  orderedTranscriptions,
  transcriptCorrectionEnabled,
  playingRecording,
  playingTranscriptionId,
  playingSegmentId,
  recordingAudioRefs,
  onPlayAll,
  onPlaySegment,
  isSegmentCurrentlyPlaying,
}) => {
  const isSystemEvent = isSystemTranscription(transcription);
  const blankAudio = isBlankAudioText(transcription.text);
  const displayText = getTranscriptionDisplayText(transcription);
  const alertTriggers = getNotifiableAlerts(transcription.alerts);
  const hasAlerts = alertTriggers.length > 0;
  const recordingUrl = transcription.recordingUrl;
  const recordingId = recordingUrl ? getRecordingElementId(recordingUrl) : null;
  const isRecordingActive = Boolean(
    recordingId &&
      playingRecording === recordingId &&
      playingTranscriptionId === transcription.id,
  );

  const renderMetadata = () => {
    const parts: React.ReactNode[] = [];

    if (alertTriggers.length > 0) {
      parts.push(
        <AlertChips key="alerts" triggers={alertTriggers} mode="collapsed" />,
      );
    }

    const durationSeconds = transcription.duration;
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      parts.push(
        <span key="duration" className="chip-button chip-button--surface">
          {durationSeconds.toFixed(1)}s duration
        </span>,
      );
    }

    if (transcriptCorrectionEnabled) {
      const reviewStatus = getReviewStatus(transcription);
      if (reviewStatus !== "pending") {
        parts.push(
          <span
            key="review"
            className={`review-badge review-badge--${reviewStatus}`}
          >
            {reviewStatus === "verified" ? "Verified" : "Corrected"}
          </span>,
        );
      }

      if (transcription.reviewedBy) {
        parts.push(
          <span key="reviewedBy" className="chip-button chip-button--surface">
            by {transcription.reviewedBy}
          </span>,
        );
      }

      if (transcription.reviewedAt) {
        parts.push(
          <Timestamp
            key="reviewedAt"
            value={transcription.reviewedAt}
            className="chip-button chip-button--surface"
            prefix="Reviewed "
            showDate
            dateClassName="ms-1"
          />,
        );
      }
    }

    if (parts.length === 0) {
      return null;
    }
    return <div className="transcript-message__meta">{parts}</div>;
  };

  const chipElements: React.ReactNode[] = [];
  if (isSystemEvent) {
    const label = displayText ?? transcription.text ?? "System event";
    if (label) {
      chipElements.push(
        <SystemEventChip
          key={`${transcription.id}-system`}
          label={label}
          eventType={transcription.eventType}
        />,
      );
    }
  } else if (recordingUrl && recordingId) {
    chipElements.push(
      <Button
        use="unstyled"
        key={`${transcription.id}-play`}
        onClick={() =>
          onPlayAll(streamId, transcription, orderedTranscriptions)
        }
        className="chip-button chip-button--accent"
      >
        {isRecordingActive ? <Pause size={14} /> : <Play size={14} />}
        {isRecordingActive ? "Stop" : "Play"}
      </Button>,
    );
  }

  chipElements.push(
    <TranscriptionSegmentChips
      key={`${transcription.id}-segments`}
      transcription={transcription}
      displayText={displayText}
      blankAudio={blankAudio}
      transcriptCorrectionEnabled={transcriptCorrectionEnabled}
      recordingUrl={recordingUrl}
      recordingId={recordingId}
      playingSegmentId={playingSegmentId}
      onPlaySegment={onPlaySegment}
      isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
    />,
  );

  return (
    <article
      className={`transcript-message${hasAlerts ? " transcript-message--alert" : ""}`}
    >
      <div className="transcript-message__avatar" aria-hidden="true">
        {stream ? (
          <StreamStatusIndicator stream={stream} className="d-inline-flex align-items-baseline" />
        ) : (
          <Radio size={18} />
        )}
      </div>
      <div className="transcript-message__content">
        <header className="transcript-message__header">
          <span className="transcript-message__channel">{streamName}</span>
          {transcription.timestamp ? (
            <>
              <Timestamp
                value={transcription.timestamp}
                className="transcript-message__timestamp"
                showDate
                dateClassName="ms-1"
              />
              <TimeInterval
                value={transcription.timestamp}
                className="ms-1 transcript-message__timestamp"
                condensed
              />
            </>
          ) : (
            <span className="transcript-message__timestamp">Unknown timestamp</span>
          )}
        </header>

        {renderMetadata()}

        <div className="transcript-message__chips">{chipElements}</div>
        {recordingUrl && recordingId ? (
          <AudioElement
            recordingId={recordingId}
            recordingUrl={recordingUrl}
            refsMap={recordingAudioRefs}
          />
        ) : null}
      </div>
    </article>
  );
};

export default TranscriptMessageRow;
