import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { setAudioElementSource } from "../utils/audio";
import {
  advancePlaybackQueue,
  buildPlaybackQueue,
  dedupeAndSortTranscriptions,
  getRecordingElementId,
  type PlaybackQueueState,
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

export const CombinedTranscriptionLog: React.FC<
  CombinedTranscriptionLogProps
> = ({ streams, loading = false, limit = 400 }) => {
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
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [playingTranscriptionId, setPlayingTranscriptionId] = useState<
    string | null
  >(null);
  const [playingSegment, setPlayingSegment] = useState<string | null>(null);
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(0);
  const [playbackQueue, setPlaybackQueue] = useState<PlaybackQueueState | null>(
    null,
  );
  const playbackQueueRef = useRef<PlaybackQueueState | null>(null);
  const recordingAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  useEffect(() => {
    playbackQueueRef.current = playbackQueue;
  }, [playbackQueue]);

  const updatePlaybackQueue = useCallback(
    (queue: PlaybackQueueState | null) => {
      playbackQueueRef.current = queue;
      setPlaybackQueue(queue);
    },
    [],
  );

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

  const resetAudioPlaybackState = useCallback(
    (audio: HTMLAudioElement | null, options?: { clearQueue?: boolean }) => {
      if (audio) {
        audio.loop = false;
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
      }

      setPlayingRecording(null);
      setPlayingTranscriptionId(null);
      setPlayingSegment(null);
      setCurrentPlayTime(0);

      if (options?.clearQueue ?? true) {
        updatePlaybackQueue(null);
      }
    },
    [updatePlaybackQueue],
  );

  const stopCurrentRecording = useCallback(() => {
    if (!playingRecording) {
      return;
    }

    const currentAudio = recordingAudioRefs.current[playingRecording] ?? null;
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch {
        // Ignore pause errors
      }
    }

    resetAudioPlaybackState(currentAudio, { clearQueue: true });
  }, [playingRecording, resetAudioPlaybackState]);

  useEffect(
    () => () => {
      stopCurrentRecording();
    },
    [stopCurrentRecording],
  );

  const isSegmentCurrentlyPlaying = useCallback(
    (recordingUrl: string | undefined, startTime: number, endTime: number) => {
      if (!recordingUrl || !playingRecording) {
        return false;
      }

      const recordingId = getRecordingElementId(recordingUrl);
      if (playingRecording !== recordingId) {
        return false;
      }

      return currentPlayTime >= startTime && currentPlayTime <= endTime;
    },
    [playingRecording, currentPlayTime],
  );

  const playRecording = useCallback(
    (
      transcription: TranscriptionResult,
      options?: { queue?: PlaybackQueueState },
    ) => {
      if (!transcription.recordingUrl) {
        console.warn("⚠️ No recording available for this transcription");
      return;
    }

    const recordingId = getRecordingElementId(transcription.recordingUrl);
    const audio = recordingAudioRefs.current[recordingId] ?? null;

    if (!audio) {
      console.error(`❌ Audio element not found: ${recordingId}`);
      return;
    }

      setAudioElementSource(audio, transcription.recordingUrl);

      const startOffset = Math.max(0, transcription.recordingStartOffset ?? 0);

      if (
        playingRecording === recordingId &&
        playingTranscriptionId === transcription.id
      ) {
        stopCurrentRecording();
        audio.currentTime = startOffset;
        return;
      }

      if (playingRecording && playingRecording !== recordingId) {
        stopCurrentRecording();
      }

      if (options?.queue) {
        updatePlaybackQueue(options.queue);
      } else {
        updatePlaybackQueue(null);
      }

      setPlayingRecording(recordingId);
      setPlayingTranscriptionId(transcription.id);
      setPlayingSegment(null);

      const handleEnded = () => {
        const advance = advancePlaybackQueue(
          playbackQueueRef.current,
          transcription,
        );
        if (advance) {
          resetAudioPlaybackState(audio, { clearQueue: false });
          updatePlaybackQueue(advance.nextQueue);
          setTimeout(() => {
            playRecording(advance.nextTranscription, {
              queue: advance.nextQueue,
            });
          }, 0);
          return;
        }

        resetAudioPlaybackState(audio);
      };

      const handleError = (error: Event | string) => {
        console.error("❌ Error playing audio:", error);
        resetAudioPlaybackState(audio);
      };

      const updateTime = () => {
        setCurrentPlayTime(audio.currentTime);
      };

      const startPlayback = () => {
        audio.loop = false;
        audio.currentTime = startOffset;
        setCurrentPlayTime(startOffset);
        audio.ontimeupdate = updateTime;
        audio.onended = handleEnded;
        audio.onerror = handleError;

        audio.play().catch((error) => {
          console.error("❌ Error starting audio playback:", error);
          resetAudioPlaybackState(audio);
        });
      };

      if (audio.readyState >= 2) {
        startPlayback();
      } else {
        const onReady = () => {
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("canplay", onReady);
          startPlayback();
        };

        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("canplay", onReady, { once: true });
        if (audio.readyState === 0) {
          audio.load();
        }
      }
    },
    [
      playingRecording,
      playingTranscriptionId,
      resetAudioPlaybackState,
      stopCurrentRecording,
      updatePlaybackQueue,
    ],
  );

  const playSegment = useCallback(
    (
      recordingUrl: string,
      startTime: number | undefined,
      endTime: number | undefined,
      transcriptionId: string,
      options?: { recordingStartOffset?: number },
    ) => {
      const recordingId = getRecordingElementId(recordingUrl);
      const audio = recordingAudioRefs.current[recordingId] ?? null;

      if (!audio) {
        console.error(`❌ Audio element not found: ${recordingId}`);
        return;
      }

      setAudioElementSource(audio, recordingUrl);

      if (playingRecording && playingRecording !== recordingId) {
        stopCurrentRecording();
      }

      const safeStart =
        typeof startTime === "number" && Number.isFinite(startTime)
          ? startTime
          : null;
      const safeEnd =
        typeof endTime === "number" && Number.isFinite(endTime)
          ? endTime
          : null;
      const recordingOffset =
        typeof options?.recordingStartOffset === "number" &&
        Number.isFinite(options.recordingStartOffset)
          ? Math.max(0, options.recordingStartOffset)
          : null;

      const playbackStart =
        safeStart !== null && safeStart > 0
          ? safeStart
          : (recordingOffset ??
            (safeStart !== null ? Math.max(0, safeStart) : 0));
      const segmentDuration =
        safeEnd !== null && safeStart !== null
          ? Math.max(0, safeEnd - safeStart)
          : null;

      let playbackEnd =
        segmentDuration !== null
          ? playbackStart + segmentDuration
          : safeEnd !== null && safeEnd > playbackStart
            ? safeEnd
            : playbackStart;

      if (!Number.isFinite(playbackEnd)) {
        playbackEnd = playbackStart;
      }

      if (playbackEnd <= playbackStart) {
        playbackEnd = playbackStart + 0.25;
      }

      const segmentKey = `${recordingId}-${startTime ?? playbackStart}-${endTime ?? playbackEnd}`;

      updatePlaybackQueue(null);
      setPlayingRecording(recordingId);
      setPlayingTranscriptionId(transcriptionId);
      setPlayingSegment(segmentKey);

      const handleError = (error: Event | string) => {
        console.error("❌ Error playing audio:", error);
        resetAudioPlaybackState(audio);
      };

      const handleSegmentTimeUpdate = () => {
        const nextTime = audio.currentTime;
        setCurrentPlayTime(nextTime);

        const completionThreshold = Math.max(playbackStart, playbackEnd - 0.05);

        if (nextTime >= completionThreshold) {
          setPlayingSegment((current) =>
            current === segmentKey ? null : current,
          );
        }
      };

      const handleEnded = () => {
        resetAudioPlaybackState(audio);
      };

      const startPlayback = () => {
        audio.loop = false;
        audio.currentTime = Math.max(0, playbackStart);
        setCurrentPlayTime(Math.max(0, playbackStart));
        audio.ontimeupdate = handleSegmentTimeUpdate;
        audio.onended = handleEnded;
        audio.onerror = handleError;

        audio.play().catch((error) => {
          console.error("❌ Error starting audio playback:", error);
          resetAudioPlaybackState(audio);
        });
      };

      if (audio.readyState >= 2) {
        startPlayback();
      } else {
        const onReady = () => {
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("canplay", onReady);
          startPlayback();
        };

        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("canplay", onReady, { once: true });
        if (audio.readyState === 0) {
          audio.load();
        }
      }
    },
    [
      playingRecording,
      resetAudioPlaybackState,
      stopCurrentRecording,
      updatePlaybackQueue,
    ],
  );

  const handlePlayAll = useCallback(
    (
      streamId: string,
      transcription: TranscriptionResult,
      orderedTranscriptions: TranscriptionResult[],
    ) => {
      const queue = buildPlaybackQueue(
        streamId,
        orderedTranscriptions,
        transcription.id,
      );
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
