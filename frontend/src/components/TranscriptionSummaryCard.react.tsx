import React from "react";
import { AlertTriangle, Clock, VolumeX } from "lucide-react";
import { TranscriptionResult } from "@types";
import { useUISettings } from "../contexts/UISettingsContext";
import { getNotifiableAlerts, isBlankAudioText } from "../utils/transcriptions";
import { Timestamp } from "./primitives/Timestamp.react";
import Flex from "./primitives/Flex.react";

interface TranscriptionSummaryCardProps {
  transcription: TranscriptionResult;
}

export const TranscriptionSummaryCard: React.FC<
  TranscriptionSummaryCardProps
> = ({ transcription }) => {
  const { colorCodingEnabled, transcriptCorrectionEnabled } = useUISettings();

  const formatRelativeTime = (seconds: number): string => {
    if (!Number.isFinite(seconds)) {
      return "0:00";
    }

    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const computeStartOffset = (result: TranscriptionResult): number | null => {
    if (
      typeof result.recordingStartOffset === "number" &&
      Number.isFinite(result.recordingStartOffset)
    ) {
      return Math.max(0, result.recordingStartOffset);
    }

    if (Array.isArray(result.segments) && result.segments.length > 0) {
      const firstSegment = result.segments[0];
      if (
        firstSegment &&
        typeof firstSegment.start === "number" &&
        Number.isFinite(firstSegment.start)
      ) {
        return Math.max(0, firstSegment.start);
      }
    }

    return null;
  };

  const isBlankAudio = isBlankAudioText(transcription.text);
  const reviewStatus = transcription.reviewStatus ?? "pending";
  const showReview = transcriptCorrectionEnabled && reviewStatus !== "pending";
  const finalText =
    typeof transcription.correctedText === "string" &&
    transcription.correctedText.trim().length > 0
      ? transcription.correctedText.trim()
      : transcription.text;
  const alertTriggers = getNotifiableAlerts(transcription.alerts);
  const hasAlerts = alertTriggers.length > 0;
  const confidenceValue =
    typeof transcription.confidence === "number" &&
    Number.isFinite(transcription.confidence)
      ? transcription.confidence
      : null;
  const durationValue =
    typeof transcription.duration === "number" &&
    Number.isFinite(transcription.duration)
      ? transcription.duration
      : null;

  const relativeStartSeconds = computeStartOffset(transcription);

  const getConfidenceClass = (confidence: number | null | undefined) => {
    if (!colorCodingEnabled || typeof confidence !== "number") {
      return "";
    }
    if (confidence >= 0.8) return "text-success";
    if (confidence >= 0.6) return "text-caution";
    return "text-danger";
  };

  return (
    <div
      className={`timeline-entry${hasAlerts ? " timeline-entry--alert" : ""}`}
    >
      <Clock size={18} className="text-body-tertiary mt-1 flex-shrink-0" />
      <Flex className="flex-grow-1" direction="column" gap={1}>
        <Flex align="center" wrap="wrap" gap={2}>
          {transcription.timestamp ? (
            <Timestamp
              value={transcription.timestamp}
              className="timeline-entry__time"
              titleFormatter={({ title }) =>
                relativeStartSeconds !== null ? `Captured at ${title}` : title
              }
              renderLabel={({ label }) => (
                <>
                  {relativeStartSeconds !== null
                    ? formatRelativeTime(relativeStartSeconds)
                    : label}
                  {relativeStartSeconds !== null && label ? (
                    <span className="timeline-entry__meta ms-1">({label})</span>
                  ) : null}
                </>
              )}
            />
          ) : (
            <span className="timeline-entry__time">Unknown</span>
          )}
          {!isBlankAudio && confidenceValue !== null && (
            <span
              className={`transcript-meta__confidence ${getConfidenceClass(confidenceValue)}`.trim()}
            >
              Confidence {Math.round(confidenceValue * 100)}%
            </span>
          )}
          {!isBlankAudio && durationValue !== null && durationValue > 0 && (
            <span className="timeline-entry__meta">
              {durationValue.toFixed(1)}s
            </span>
          )}
        </Flex>
        {showReview && (
          <Flex align="center" gap={2} wrap="wrap">
            <span className={`review-badge review-badge--${reviewStatus}`}>
              {reviewStatus === "verified" ? "Verified" : "Correction saved"}
            </span>
            {transcription.reviewedBy ? (
              <span className="timeline-entry__meta">
                by {transcription.reviewedBy}
              </span>
            ) : null}
          </Flex>
        )}
        {hasAlerts && (
          <Flex align="center" gap={2} className="text-danger fw-semibold small">
            <AlertTriangle size={16} />
            <span>
              {alertTriggers
                .map((trigger) => trigger.label || trigger.ruleId)
                .join(", ")}
            </span>
          </Flex>
        )}
        {isBlankAudio ? (
          <Flex align="center" gap={2} className="text-body-secondary small fst-italic">
            <VolumeX size={16} className="text-body-tertiary" />
            <span>No speech detected</span>
          </Flex>
        ) : (
          <p className="timeline-entry__text mb-0">{finalText}</p>
        )}
      </Flex>
    </div>
  );
};
