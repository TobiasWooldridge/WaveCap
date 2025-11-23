import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, Clock, Loader2, Pause, Play, VolumeX } from "lucide-react";
import { TranscriptionResult } from "@types";
import { useUISettings } from "../contexts/UISettingsContext";
import { getNotifiableAlerts, isBlankAudioText } from "../utils/transcriptions";
import { Timestamp } from "./primitives/Timestamp.react";
import Flex from "./primitives/Flex.react";
import Button from "./primitives/Button.react";
import { getBlankAudioSegmentBounds } from "./StreamTranscriptionPanel.logic";
import "./TranscriptionSummaryCard.scss";

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
  const hasSilenceRecording =
    isBlankAudio && typeof transcription.recordingUrl === "string"
      ? transcription.recordingUrl.trim().length > 0
      : false;
  const silenceBounds = useMemo(() => {
    if (!hasSilenceRecording) {
      return null;
    }
    return getBlankAudioSegmentBounds(transcription);
  }, [hasSilenceRecording, transcription]);
  const silenceDurationSeconds = useMemo(() => {
    if (!silenceBounds) {
      return 0;
    }
    return Math.max(0, silenceBounds.end - silenceBounds.start);
  }, [silenceBounds]);
  const reviewStatus = transcription.reviewStatus ?? "pending";
  const showReview = transcriptCorrectionEnabled && reviewStatus !== "pending";
  const correctedTextValue = transcription.correctedText;
  const hasCorrectedText =
    typeof correctedTextValue === "string" &&
    correctedTextValue.trim().length > 0;
  const finalText = hasCorrectedText
    ? correctedTextValue.trim()
    : transcription.text;
  const originalTextTooltip = hasCorrectedText
    ? `Original: ${transcription.text}`
    : undefined;
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

  const formatDurationLabel = useCallback((seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0s";
    }

    if (seconds < 60) {
      const rounded = seconds.toFixed(seconds >= 10 ? 0 : 1);
      return `${rounded.replace(/\.0$/, "")}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const roundedSeconds = remainingSeconds.toFixed(
      remainingSeconds >= 10 ? 0 : 1,
    );

    if (Number(roundedSeconds) === 0) {
      return `${minutes}m`;
    }

    return `${minutes}m ${roundedSeconds.replace(/\.0$/, "")}s`;
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackBoundsRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!silenceBounds) {
      playbackBoundsRef.current = { start: 0, end: 0 };
      return;
    }
    playbackBoundsRef.current = silenceBounds;
  }, [silenceBounds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      if (!isPlayingRef.current) {
        return;
      }

      const { start, end } = playbackBoundsRef.current;
      if (end <= start) {
        return;
      }

      const completionThreshold = Math.max(start, end - 0.05);
      if (audio.currentTime >= completionThreshold) {
        audio.pause();
        audio.currentTime = Math.max(start, 0);
        setIsPlaying(false);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setPlaybackError("Unable to play clip");
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!hasSilenceRecording) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setIsPlaying(false);
      setPlaybackError(null);
      return;
    }

    const recordingUrl = transcription.recordingUrl?.trim() ?? "";
    if (!recordingUrl) {
      return;
    }

    const previousSrc = audio.getAttribute("data-loaded-src") ?? "";
    if (previousSrc !== recordingUrl) {
      audio.setAttribute("data-loaded-src", recordingUrl);
      audio.src = recordingUrl;
      audio.load();
      setIsPlaying(false);
    }
  }, [hasSilenceRecording, transcription.recordingUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) {
        return;
      }
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  const handleToggleSilencePlayback = useCallback(async () => {
    if (!hasSilenceRecording) {
      return;
    }
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlayingRef.current) {
      audio.pause();
      audio.currentTime = Math.max(playbackBoundsRef.current.start, 0);
      return;
    }

    setPlaybackError(null);
    setIsLoadingPlayback(true);
    try {
      const startTime = Math.max(playbackBoundsRef.current.start, 0);
      audio.currentTime = startTime;
      const playResult = audio.play();
      if (playResult instanceof Promise) {
        await playResult;
      }
      setIsPlaying(true);
    } catch (error) {
      console.error("Error playing clip", error);
      setPlaybackError("Unable to play clip");
    } finally {
      setIsLoadingPlayback(false);
    }
  }, [hasSilenceRecording]);

  const silencePlaybackLabel = isPlaying
    ? "Stop clip"
    : `Play clip${silenceDurationSeconds > 0 ? ` (${formatDurationLabel(silenceDurationSeconds)})` : ""}`;

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
          <Flex align="center" gap={3} wrap="wrap">
            <Flex align="center" gap={2} className="text-body-secondary small fst-italic">
              <VolumeX size={16} className="text-body-tertiary" />
              <span><em>No transcription</em></span>
            </Flex>
            {hasSilenceRecording ? (
              <Button
                use="secondary"
                appearance="outline"
                size="sm"
                onClick={handleToggleSilencePlayback}
                disabled={isLoadingPlayback}
                startContent={
                  isLoadingPlayback ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={14} />
                  ) : (
                    <Play size={14} />
                  )
                }
              >
                {silencePlaybackLabel}
              </Button>
            ) : null}
            {playbackError ? (
              <span className="text-danger small">{playbackError}</span>
            ) : null}
            <audio ref={audioRef} preload="none" className="d-none" />
          </Flex>
        ) : (
          <p className="timeline-entry__text mb-0" title={originalTextTooltip}>{finalText}</p>
        )}
      </Flex>
    </div>
  );
};
