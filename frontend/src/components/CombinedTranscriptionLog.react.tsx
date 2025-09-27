import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowDownCircle, List } from "lucide-react";
import { Stream, TranscriptionResult } from "@types";
import { useUISettings } from "../contexts/UISettingsContext";
import { useAutoScroll } from "../hooks/useAutoScroll";
// helpers for metadata are encapsulated in TranscriptMessageRow
import { useTranscriptionAudioPlayback } from "../hooks/useTranscriptionAudioPlayback";
import { buildPlaybackQueue, dedupeAndSortTranscriptions } from "./StreamTranscriptionPanel.logic";
import Button from "./primitives/Button.react";
import TranscriptMessageRow from "./TranscriptMessageRow.react";

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

  // metadata rendering moved into TranscriptMessageRow

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
            {combinedEntries.map(({ transcription, streamId, streamName }) => (
              <TranscriptMessageRow
                key={transcription.id}
                streamId={streamId}
                streamName={streamName}
                transcription={transcription}
                orderedTranscriptions={
                  transcriptionsByStream.get(streamId) ?? []
                }
                transcriptCorrectionEnabled={transcriptCorrectionEnabled}
                playingRecording={playingRecording}
                playingTranscriptionId={playingTranscriptionId}
                playingSegmentId={playingSegment}
                recordingAudioRefs={recordingAudioRefs}
                onPlayAll={handlePlayAll}
                onPlaySegment={playSegment}
                isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
              />
            ))}
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
