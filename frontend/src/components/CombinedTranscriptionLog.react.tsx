import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowDownCircle, List, Pause, Play, Radio } from "lucide-react";
import { Stream, TranscriptionResult } from "@types";
import { useUISettings } from "../contexts/UISettingsContext";
import { useAutoScroll } from "../hooks/useAutoScroll";
import {
  getNotifiableAlerts,
  getReviewStatus,
  getTranscriptionDisplayText,
  isBlankAudioText,
  isSystemTranscription,
} from "../utils/transcriptions";
import { useTranscriptionAudioPlayback } from "../hooks/useTranscriptionAudioPlayback";
import {
  buildPlaybackQueue,
  dedupeAndSortTranscriptions,
  getRecordingElementId,
} from "./StreamTranscriptionPanel.logic";
import { Timestamp } from "./primitives/Timestamp.react";
import Button from "./primitives/Button.react";
import { TranscriptionSegmentChips } from "./TranscriptionSegmentChips.react";
import { AlertChips } from "./chips/AlertChips.react";
import { SystemEventChip } from "./chips/SystemEventChip.react";

interface CombinedTranscriptionLogProps {
  streams: Stream[];
  loading?: boolean;
  limit?: number;
}

interface CombinedEntry {
  streamId: string;
  streamName: string;
  transcription: TranscriptionResult;
}

const safeTimestamp = (timestamp: string) => {
  const ms = new Date(timestamp).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const useCombinedEntries = (
  streams: Stream[],
  limit: number,
): CombinedEntry[] =>
  useMemo(() => {
    if (!streams || streams.length === 0) {
      return [];
    }

    const deduped = new Map<string, CombinedEntry>();

    streams.forEach((stream) => {
      if (!Array.isArray(stream.transcriptions)) {
        return;
      }

      stream.transcriptions.forEach((transcription) => {
        if (!transcription?.id) {
          return;
        }

        deduped.set(transcription.id, {
          streamId: stream.id,
          streamName: stream.name || stream.url,
          transcription,
        });
      });
    });

    const sorted = Array.from(deduped.values()).sort(
      (a, b) =>
        safeTimestamp(a.transcription.timestamp) -
        safeTimestamp(b.transcription.timestamp),
    );

    if (limit > 0 && sorted.length > limit) {
      return sorted.slice(-limit);
    }

    return sorted;
  }, [streams, limit]);

export const CombinedTranscriptionLog: React.FC<CombinedTranscriptionLogProps> = ({
  streams,
  loading = false,
  limit = 400,
}) => {
  const { transcriptCorrectionEnabled } = useUISettings();
  const {
    attachRef,
    hasNewItems,
    isScrolledAway,
    notifyContentChanged,
    scrollToBottom,
  } = useAutoScroll();
  const latestEntryKeyRef = useRef<string | null>(null);
  const previousCountRef = useRef(0);
  const {
    recordingAudioRefs,
    playingRecording,
    playingTranscriptionId,
    playingSegment,
    playRecording,
    playSegment,
    isSegmentCurrentlyPlaying,
  } = useTranscriptionAudioPlayback();

  const combinedEntries = useCombinedEntries(streams, limit);
  const transcriptionsByStream = useMemo(() => {
    const map = new Map<string, TranscriptionResult[]>();

    streams.forEach((stream) => {
      if (!Array.isArray(stream.transcriptions)) {
        map.set(stream.id, []);
        return;
      }

      map.set(stream.id, dedupeAndSortTranscriptions(stream.transcriptions));
    });

    return map;
  }, [streams]);
  const totalUniqueTranscriptions = useMemo(() => {
    if (!streams || streams.length === 0) {
      return 0;
    }

    const ids = new Set<string>();
    streams.forEach((stream) => {
      stream.transcriptions?.forEach((transcription) => {
        if (transcription?.id) {
          ids.add(transcription.id);
        }
      });
    });

    return ids.size;
  }, [streams]);

  const summaryLabel = useMemo(() => {
    if (loading && combinedEntries.length === 0) {
      return "Loading activity…";
    }

    if (combinedEntries.length === 0) {
      return "No transcripts yet";
    }

    if (limit > 0 && totalUniqueTranscriptions > combinedEntries.length) {
      return `Showing latest ${combinedEntries.length} of ${totalUniqueTranscriptions} transcripts`;
    }

    return `Showing latest ${combinedEntries.length} transcripts`;
  }, [loading, combinedEntries, totalUniqueTranscriptions, limit]);

  useEffect(() => {
    const nextCount = combinedEntries.length;
    const latestEntry = combinedEntries[nextCount - 1];
    const latestKey = latestEntry
      ? `${latestEntry.transcription.id}-${latestEntry.transcription.timestamp}`
      : null;
    const prevKey = latestEntryKeyRef.current;
    const prevCount = previousCountRef.current;

    if (nextCount === 0) {
      previousCountRef.current = 0;
      latestEntryKeyRef.current = null;
      return;
    }

    if (nextCount > prevCount || (latestKey && latestKey !== prevKey)) {
      notifyContentChanged({ behavior: prevCount === 0 ? "auto" : "smooth" });
    }

    previousCountRef.current = nextCount;
    latestEntryKeyRef.current = latestKey;
  }, [combinedEntries, notifyContentChanged]);

  // audio playback details are handled by useTranscriptionAudioPlayback

  // stopCurrentRecording handled by hook cleanup

  // isSegmentCurrentlyPlaying provided by hook

  const handlePlayAll = useCallback(
    (
      streamId: string,
      transcription: TranscriptionResult,
      orderedTranscriptions: TranscriptionResult[],
    ) => {
      const queue = buildPlaybackQueue(streamId, orderedTranscriptions, transcription.id);
      if (queue) {
        playRecording(transcription, { queue });
        return;
      }
      playRecording(transcription);
    },
    [playRecording],
  );

  const renderMetadata = (transcription: TranscriptionResult) => {
    const parts: React.ReactNode[] = [];

    const alertTriggers = getNotifiableAlerts(transcription.alerts);
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

  return (
    <section className="transcript-view">
      <div className="transcript-view__header">
        <div className="transcript-view__title">
          <List size={18} className="text-primary" />
          <div>
            <h2 className="h5 mb-0">Combined transcript log</h2>
            <div className="transcript-view__summary text-body-secondary small">
              {summaryLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="transcript-view__scroller" ref={attachRef}>
        {streams.length === 0 ? (
          <div className="transcript-view__empty">
            <p className="fw-semibold mb-1">No streams available</p>
            <p className="mb-0">
              Add a stream to start collecting transcripts.
            </p>
          </div>
        ) : combinedEntries.length === 0 ? (
          <div className="transcript-view__empty">
            {loading ? (
              <p className="mb-0">Listening for activity…</p>
            ) : (
              <>
                <p className="fw-semibold mb-1">
                  No transcriptions captured yet.
                </p>
                <p className="mb-0">
                  When streams receive audio, transcripts will appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="transcript-message-list">
            {combinedEntries.map(({ transcription, streamId, streamName }) => {
              const isSystemEvent = isSystemTranscription(transcription);
              const blankAudio = isBlankAudioText(transcription.text);
              const displayText = getTranscriptionDisplayText(transcription);
              const alertTriggers = getNotifiableAlerts(transcription.alerts);
              const hasAlerts = alertTriggers.length > 0;
              const recordingUrl = transcription.recordingUrl;
              const recordingId = recordingUrl
                ? getRecordingElementId(recordingUrl)
                : null;
              const orderedTranscriptions =
                transcriptionsByStream.get(streamId) ?? [];
              const isRecordingActive = Boolean(
                recordingId &&
                  playingRecording === recordingId &&
                  playingTranscriptionId === transcription.id,
              );
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
                      handlePlayAll(
                        streamId,
                        transcription,
                        orderedTranscriptions,
                      )
                    }
                    className="chip-button chip-button--accent"
                  >
                    {isRecordingActive ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                    {isRecordingActive ? "Stop" : "Play all"}
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
                  playingSegmentId={playingSegment}
                  onPlaySegment={playSegment}
                  isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
                />,
              );

              return (
                <article
                  key={transcription.id}
                  className={`transcript-message${hasAlerts ? " transcript-message--alert" : ""}`}
                >
                  <div
                    className="transcript-message__avatar"
                    aria-hidden="true"
                  >
                    <Radio size={18} />
                  </div>
                  <div className="transcript-message__content">
                    <header className="transcript-message__header">
                      <span className="transcript-message__channel">
                        {streamName}
                      </span>
                  {transcription.timestamp ? (
                    <Timestamp
                      value={transcription.timestamp}
                      className="transcript-message__timestamp"
                      showDate
                      dateClassName="ms-1"
                    />
                  ) : (
                    <span className="transcript-message__timestamp">
                      Unknown timestamp
                    </span>
                  )}
                    </header>

                    {renderMetadata(transcription)}

                    <div className="transcript-message__chips">
                      {chipElements}
                    </div>
                    {recordingUrl && recordingId ? (
                      <audio
                        key={`${recordingId}-audio`}
                        id={recordingId}
                        data-recording-url={recordingUrl}
                        preload="none"
                        className="hidden"
                        ref={(element) => {
                          if (element) {
                            recordingAudioRefs.current[recordingId] = element;
                          } else {
                            delete recordingAudioRefs.current[recordingId];
                          }
                        }}
                      />
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {isScrolledAway ? (
        <Button
          use="unstyled"
          className={`transcript-view__pill${hasNewItems ? " transcript-view__pill--highlight" : ""}`}
          onClick={() => scrollToBottom("smooth")}
        >
          <ArrowDownCircle size={16} aria-hidden="true" />
          <span>
            {hasNewItems ? "New messages · Go to latest" : "Go to latest"}
          </span>
        </Button>
      ) : null}
    </section>
  );
};
