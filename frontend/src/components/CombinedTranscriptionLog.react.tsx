import React, { useCallback, useMemo, useState } from "react";
// icons not required; using shared list wrapper
import { Stream, TranscriptionResult } from "@types";
import { useUISettings } from "../contexts/UISettingsContext";
// use auto-scroll via StreamTranscriptList
// helpers for metadata are encapsulated in TranscriptMessageRow
import { useTranscriptionAudioPlayback } from "../hooks/useTranscriptionAudioPlayback";
import { buildPlaybackQueue, dedupeAndSortTranscriptions } from "./StreamTranscriptionPanel.logic";
import TranscriptMessageRow from "./TranscriptMessageRow.react";
import { PagerTranscriptTable } from "./PagerTranscriptTable.react";
import { condensePagerTranscriptions, getCondensedFieldValue } from "../utils/pagerMessages";
import { getNotifiableAlerts, getTranscriptionDisplayText, isBlankAudioText, isSystemTranscription } from "../utils/transcriptions";
import { getRecordingElementId } from "./StreamTranscriptionPanel.logic";
import { TranscriptionSegmentChips } from "./TranscriptionSegmentChips.react";
import AudioElement from "./primitives/AudioElement.react";
import { AlertChips } from "./chips/AlertChips.react";
import { useAuth } from "../contexts/AuthContext";
import { StreamTranscriptList } from "./StreamTranscriptList.react";
import StreamStatusIndicator from "./StreamStatusIndicator.react";
import { Timestamp } from "./primitives/Timestamp.react";
import { TimeInterval } from "./primitives/TimeInterval.react";
import { getStreamAccentColor } from "../utils/streamColors";
import { PlaybackBar } from "./PlaybackBar.react";

interface CombinedTranscriptionLogProps {
  streams: Stream[];
  loading?: boolean;
  limit?: number;
}

type CombinedItem =
  | {
      kind: "audio";
      id: string;
      timestamp: string;
      streamId: string;
      streamName: string;
      transcription: TranscriptionResult;
    }
  | {
      kind: "pager";
      id: string;
      timestamp: string;
      streamId: string;
      streamName: string;
      // condensed message
      message: ReturnType<typeof condensePagerTranscriptions>[number];
    };

const safeTimestamp = (timestamp: string) => {
  const ms = new Date(timestamp).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

//

export const CombinedTranscriptionLog: React.FC<CombinedTranscriptionLogProps> = ({
  streams,
  loading = false,
  limit = 400,
}) => {
  const { transcriptCorrectionEnabled, baseLocation, colorCodingEnabled } =
    useUISettings();
  const {
    recordingAudioRefs,
    playingRecording,
    playingTranscriptionId,
    playingSegment,
    currentPlayTime,
    volume,
    setVolume,
    playRecording,
    playSegment,
    stopCurrentRecording,
    isSegmentCurrentlyPlaying,
  } = useTranscriptionAudioPlayback();
  const { authFetch } = useAuth();
  const HISTORY_FETCH_LIMIT = 50;

  const [extraByStream, setExtraByStream] = useState<Record<string, TranscriptionResult[]>>({});
  const [hasMoreByStream, setHasMoreByStream] = useState<Record<string, boolean>>({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Resolve per-stream transcript lists (live + extra history)
  const transcriptionsByStream = useMemo(() => {
    const map = new Map<string, TranscriptionResult[]>();
    streams.forEach((stream) => {
      const base = Array.isArray(stream.transcriptions) ? stream.transcriptions : [];
      const extra = extraByStream[stream.id] ?? [];
      map.set(stream.id, dedupeAndSortTranscriptions([...base, ...extra]));
    });
    return map;
  }, [streams, extraByStream]);

  // Build combined items from live + extra history
  const combinedItems = useMemo(() => {
    if (!streams || streams.length === 0) return [] as CombinedItem[];
    const items: CombinedItem[] = [];
    streams.forEach((stream) => {
      const list = transcriptionsByStream.get(stream.id) ?? [];
      const source = stream.source ?? "audio";
      if (source === "pager") {
        const normal = list.filter((t) => !isSystemTranscription(t));
        const condensed = condensePagerTranscriptions(normal);
        condensed.forEach((msg) => {
          items.push({
            kind: "pager",
            id: msg.id,
            timestamp: msg.timestamp,
            streamId: stream.id,
            streamName: stream.name || stream.url,
            message: msg,
          });
        });
      } else {
        list.forEach((t) => {
          items.push({
            kind: "audio",
            id: t.id,
            timestamp: t.timestamp,
            streamId: stream.id,
            streamName: stream.name || stream.url,
            transcription: t,
          });
        });
      }
    });
    const sorted = items.sort((a, b) => safeTimestamp(a.timestamp) - safeTimestamp(b.timestamp));
    if (limit > 0 && sorted.length > limit) return sorted.slice(-limit);
    return sorted;
  }, [streams, transcriptionsByStream, limit]);
  const [openPagerMessageIds, setOpenPagerMessageIds] = useState<Record<string, boolean>>({});
  const togglePagerMessage = useCallback((id: string) => {
    setOpenPagerMessageIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const streamMap = useMemo(() => {
    const map = new Map<string, Stream>();
    streams.forEach((s) => map.set(s.id, s));
    return map;
  }, [streams]);
  const streamColorMap = useMemo(() => {
    const map = new Map<string, string>();
    streams.forEach((s) => {
      map.set(s.id, getStreamAccentColor(s.id));
    });
    return map;
  }, [streams]);

  // Find the currently playing transcription and its stream
  const playingInfo = useMemo(() => {
    if (!playingTranscriptionId) return null;
    for (const stream of streams) {
      const transcription = stream.transcriptions?.find(
        (t) => t.id === playingTranscriptionId,
      );
      if (transcription) {
        return { transcription, streamName: stream.name };
      }
    }
    // Also check extra history
    for (const [streamId, transcriptions] of Object.entries(extraByStream)) {
      const transcription = transcriptions.find((t) => t.id === playingTranscriptionId);
      if (transcription) {
        const stream = streams.find((s) => s.id === streamId);
        return { transcription, streamName: stream?.name ?? "Unknown" };
      }
    }
    return null;
  }, [streams, extraByStream, playingTranscriptionId]);

  // number of items available for display

  const hasMoreHistory = useMemo(() => {
    if (Object.keys(hasMoreByStream).length === 0) return true;
    return Object.values(hasMoreByStream).some((v) => v !== false);
  }, [hasMoreByStream]);

  // summary removed to match radio/pager views

  // Auto-scroll behavior handled by StreamTranscriptList

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

  const earliestTimestampIso = useMemo(() => {
    if (combinedItems.length === 0) return null;
    const first = combinedItems[0];
    return first.timestamp ?? null;
  }, [combinedItems]);

  const handleLoadEarlier = useCallback(async () => {
    if (!earliestTimestampIso || isLoadingHistory) return;
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const before = new Date(earliestTimestampIso).toISOString();
      const results = await Promise.all(
        streams.map(async (s) => {
          const params = new URLSearchParams({ limit: String(HISTORY_FETCH_LIMIT), before });
          const res = await authFetch(`/api/streams/${s.id}/transcriptions?${params.toString()}`);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Failed to fetch history for ${s.id}`);
          }
          const data = (await res.json()) as { transcriptions: TranscriptionResult[]; hasMoreBefore?: boolean };
          return { id: s.id, transcriptions: data.transcriptions, hasMore: data.hasMoreBefore ?? (data.transcriptions.length >= HISTORY_FETCH_LIMIT) };
        }),
      );
      setExtraByStream((prev) => {
        const next = { ...prev };
        results.forEach(({ id, transcriptions }) => {
          const existing = next[id] ?? [];
          next[id] = dedupeAndSortTranscriptions([...transcriptions, ...existing]);
        });
        return next;
      });
      setHasMoreByStream((prev) => {
        const next = { ...prev };
        results.forEach(({ id, hasMore }) => {
          next[id] = hasMore;
        });
        return next;
      });
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to load history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [authFetch, earliestTimestampIso, streams, isLoadingHistory]);

  const orderedForScroll: TranscriptionResult[] = useMemo(() => {
    return combinedItems.map((item) => (item.kind === "audio" ? item.transcription : item.message.fragments[0]));
  }, [combinedItems]);

  return (
    <section className="transcript-view transcript-view--frameless">
      <StreamTranscriptList
        orderedTranscriptions={orderedForScroll}
        isTranscribing={true}
        onLoadEarlier={hasMoreHistory ? handleLoadEarlier : null}
        hasMoreHistory={hasMoreHistory}
        isLoadingHistory={isLoadingHistory}
        historyError={historyError}
      >
        {streams.length === 0 ? (
          <div className="transcript-view__empty">
            <p className="fw-semibold mb-1">No streams available</p>
            <p className="mb-0">Add a stream to start collecting transcripts.</p>
          </div>
        ) : combinedItems.length === 0 ? (
          <div className="transcript-view__empty">
            {loading ? <p className="mb-0">Listening for activity…</p> : (
              <>
                <p className="fw-semibold mb-1">No transcriptions captured yet.</p>
                <p className="mb-0">When streams receive audio, transcripts will appear here.</p>
              </>
            )}
          </div>
        ) : (
          <div className="transcript-message-list">
            {combinedItems.map((item) => {
              const stream = streamMap.get(item.streamId) ?? undefined;
              const channelColor = colorCodingEnabled
                ? streamColorMap.get(item.streamId) ??
                  getStreamAccentColor(item.streamId)
                : undefined;
              if (item.kind === "audio") {
                const ordered = transcriptionsByStream.get(item.streamId) ?? [];
                return (
                  <TranscriptMessageRow
                    key={`audio:${item.id}`}
                    streamId={item.streamId}
                    streamName={item.streamName}
                    stream={stream}
                    transcription={item.transcription}
                    orderedTranscriptions={ordered}
                    transcriptCorrectionEnabled={transcriptCorrectionEnabled}
                    playingRecording={playingRecording}
                    playingTranscriptionId={playingTranscriptionId}
                    playingSegmentId={playingSegment}
                    recordingAudioRefs={recordingAudioRefs}
                    onPlayAll={handlePlayAll}
                    onPlaySegment={playSegment}
                    isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
                    compact
                    channelColor={channelColor}
                  />
                );
              }
              // pager item: reuse the same compact table used in the pager view, wrapped for consistent border and header
              const channelStyle = channelColor
                ? ({
                    "--transcript-channel-color": channelColor,
                  } as React.CSSProperties)
                : undefined;
              const elementMap = new Map<string, React.ReactNode[]>();
              item.message.fragments.forEach((t) => {
                const displayText = getTranscriptionDisplayText(t);
                const blankAudio = isBlankAudioText(t.text);
                const alertTriggers = getNotifiableAlerts(t.alerts);
                const recordingUrl = t.recordingUrl;
                const recordingId = recordingUrl ? getRecordingElementId(recordingUrl) : null;
                const elems: React.ReactNode[] = [];
                if (alertTriggers.length > 0) {
                  elems.push(<AlertChips key={`${t.id}-alert`} triggers={alertTriggers} mode="collapsed" />);
                }
                elems.push(
                  <TranscriptionSegmentChips
                    key={`${t.id}-segments`}
                    transcription={t}
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
                elementMap.set(t.id, elems);
              });

              // Ensure pager items have corresponding hidden audio elements
              // so segment playback can target an HTMLAudioElement.
              const renderedRecordingIds = new Set<string>();
              const pagerAudioElements: React.ReactNode[] = [];
              item.message.fragments.forEach((t) => {
                const url = t.recordingUrl;
                if (!url) return;
                const id = getRecordingElementId(url);
                if (renderedRecordingIds.has(id)) return;
                renderedRecordingIds.add(id);
                pagerAudioElements.push(
                  <AudioElement
                    key={id}
                    recordingId={id}
                    recordingUrl={url}
                    refsMap={recordingAudioRefs}
                  />,
                );
              });

              const address = getCondensedFieldValue(item.message, "address");
              const mapGrid = getCondensedFieldValue(item.message, "map");
              const baseLocationSuffix = (() => {
                const parts: string[] = [];
                if (baseLocation?.state) parts.push(baseLocation.state);
                if (baseLocation?.country) parts.push(baseLocation.country);
                return parts.length > 0 ? parts.join(", ") : null;
              })();
              const incidentLocationQuery = (() => {
                const parts: string[] = [];
                if (address) parts.push(address);
                if (mapGrid && !parts.includes(mapGrid)) parts.push(`Map ${mapGrid}`);
                if (baseLocationSuffix) parts.push(baseLocationSuffix);
                return parts.length > 0 ? parts.join(", ") : null;
              })();

              return (
                <article key={`pager:${item.id}`} className="transcript-message transcript-message--compact">
                  <div className="transcript-message__avatar" aria-hidden="true">
                    {stream ? (
                      <StreamStatusIndicator stream={stream} className="d-inline-flex align-items-baseline" />
                    ) : null}
                  </div>
                  <div className="transcript-message__content">
                    <header className="transcript-message__header">
                      <span
                        className="transcript-message__channel"
                        style={channelStyle}
                      >
                        {item.streamName}
                      </span>
                      {item.message.timestamp ? (
                        <>
                          <Timestamp
                            value={item.message.timestamp}
                            className="transcript-message__timestamp"
                            showDate
                            dateClassName="ms-1"
                          />
                          <TimeInterval
                            value={item.message.timestamp}
                            className="ms-1 transcript-message__timestamp"
                            condensed
                          />
                        </>
                      ) : null}
                    </header>
                    <div className="w-100">
                      <PagerTranscriptTable
                        groupId={`combined-${item.streamId}-${item.id}`}
                        messages={[item.message]}
                        elementMap={elementMap}
                        openMessageIds={openPagerMessageIds}
                        onToggleMessage={togglePagerMessage}
                        incidentLocationUrls={null}
                        incidentLocationQuery={incidentLocationQuery ?? undefined}
                        hideTimeColumn
                      />
                    </div>
                    {pagerAudioElements.length > 0 ? (
                      <div className="hidden" aria-hidden>
                        {pagerAudioElements}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </StreamTranscriptList>
      <PlaybackBar
        transcription={playingInfo?.transcription ?? null}
        streamName={playingInfo?.streamName ?? null}
        currentPlayTime={currentPlayTime}
        recordingAudioRefs={recordingAudioRefs}
        playingRecordingId={playingRecording}
        volume={volume}
        onTogglePlayback={stopCurrentRecording}
        onStop={stopCurrentRecording}
        onVolumeChange={setVolume}
      />
    </section>
  );
};
