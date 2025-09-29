import React, { cloneElement, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  MicOff,
  Play,
  Radio,
  Search,
  Volume2,
  RotateCcw,
} from "lucide-react";
import type { Stream, TranscriptionResult, TranscriptionReviewStatus } from "@types";
import { useAuth } from "../contexts/AuthContext";
import { useUISettings } from "../contexts/UISettingsContext";
import { useStreamTranscriptions } from "../hooks/useStreamTranscriptions";
import { useStreamSearch } from "../hooks/useStreamSearch";
import { useStreamFocusWindow } from "../hooks/useStreamFocusWindow";
import { useLiveAudioSession } from "../contexts/LiveAudioContext";
import { useStandaloneControls, type StandaloneTool } from "../hooks/useStandaloneControls";
import { StreamTranscriptList } from "./StreamTranscriptList.react";
import StreamTranscriptThread from "./StreamTranscriptThread.react";
import SearchPanel from "./SearchPanel.react";
import FocusContextPanel from "./FocusContextPanel.react";
import JumpForm from "./JumpForm.react";
import Button from "./primitives/Button.react";
import { Timestamp } from "./primitives/Timestamp.react";
import StreamMetricsSummary from "./StreamMetricsSummary.react";
import {
  prepareTranscriptions,
  selectVisibleTranscriptions,
  type TranscriptionGroup,
} from "./StreamTranscriptionPanel.logic";
import type { StandaloneStreamControls } from "./streamControls";
import { getStreamTitle } from "../utils/streams";

const INITIAL_HISTORY_WINDOW_MINUTES = 180;
const INITIAL_HISTORY_WINDOW_MS = INITIAL_HISTORY_WINDOW_MINUTES * 60 * 1000;
const HISTORY_FETCH_LIMIT = 50;
const MAX_SEARCH_RESULTS = 100;
const DEFAULT_FOCUS_WINDOW_MINUTES = 10;

const isPagerStream = (stream: Stream): boolean => (stream.source ?? "audio") === "pager";

const buildPagerWebhookPath = (stream: Stream): string | null => {
  if (!isPagerStream(stream)) return null;
  const base = stream.url ?? "";
  const token = (stream as { webhookToken?: string }).webhookToken;
  if (!base && !token) return null;
  const suffix = token ? `${base.includes("?") ? "&" : "?"}token=${token}` : "";
  return `${base}${suffix}`;
};

const getStatusIcon = (status: Stream["status"]) => {
  switch (status) {
    case "transcribing":
      return <Activity className="w-4 h-4" aria-hidden="true" />;
    case "queued":
      return <Clock className="w-4 h-4" aria-hidden="true" />;
    case "error":
      return <AlertTriangle className="w-4 h-4" aria-hidden="true" />;
    case "stopped":
    default:
      return <MicOff className="w-4 h-4" aria-hidden="true" />;
  }
};

const getStatusLabel = (status: Stream["status"]) => {
  switch (status) {
    case "transcribing":
      return "Live transcription";
    case "queued":
      return "Queued for transcription";
    case "error":
      return "Stream error";
    case "stopped":
    default:
      return "Transcription stopped";
  }
};

const getStatusModifier = (
  status: Stream["status"],
): "transcribing" | "queued" | "error" | "stopped" => {
  switch (status) {
    case "transcribing":
      return "transcribing";
    case "queued":
      return "queued";
    case "error":
      return "error";
    case "stopped":
    default:
      return "stopped";
  }
};

export interface StreamSectionProps {
  stream: Stream;
  isStandalone: boolean;
  recordingAudioRefs: React.MutableRefObject<Record<string, HTMLAudioElement | null>>;
  playingRecording: string | null;
  playingTranscriptionId: string | null;
  playingSegmentId: string | null;
  onPlayAll: (
    streamId: string,
    transcription: TranscriptionResult,
    ordered: TranscriptionResult[],
  ) => void;
  onPlaySegment: (
    recordingUrl: string | undefined,
    startTime: number | null | undefined,
    endTime: number | null | undefined,
    transcriptionId: string,
  ) => void;
  onStopPlayback: () => void;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string | undefined,
    startTime: number,
    endTime: number,
  ) => boolean;
  onReviewTranscription: (
    transcriptionId: string,
    updates: {
      correctedText?: string | null;
      reviewStatus: TranscriptionReviewStatus;
      reviewer?: string | null;
    },
  ) => Promise<unknown>;
  onResetStream: (streamId: string) => void;
  onStandaloneControlsChange?: (controls: StandaloneStreamControls | null) => void;
  onExportPagerFeed?: () => Promise<void> | void;
  onSelectPagerExportStream?: (streamId: string) => void;
  pagerExporting?: boolean;
}

const StreamSection: React.FC<StreamSectionProps> = ({
  stream,
  isStandalone,
  recordingAudioRefs,
  playingRecording,
  playingTranscriptionId,
  playingSegmentId,
  onPlayAll,
  onPlaySegment,
  onStopPlayback,
  isSegmentCurrentlyPlaying,
  onReviewTranscription,
  onResetStream,
  onStandaloneControlsChange,
  onExportPagerFeed,
  onSelectPagerExportStream,
  pagerExporting = false,
}) => {
  const { authFetch, role, authenticated, requiresPassword } = useAuth();
  const isReadOnly = role !== "editor";
  const canViewWebhookDetails = !isReadOnly && (authenticated || !requiresPassword);
  const { transcriptCorrectionEnabled } = useUISettings();

  const [expanded, setExpanded] = useState<boolean>(isStandalone);
  const [openSearch, setOpenSearch] = useState<boolean>(false);
  const [jumpTimestampValue, setJumpTimestampValue] = useState<string>("");
  const [jumpWindowValue, setJumpWindowValue] = useState<number>(
    DEFAULT_FOCUS_WINDOW_MINUTES,
  );
  const [openPagerMessageIds, setOpenPagerMessageIds] = useState<Record<string, boolean>>({});
  const [openStandaloneTool, setOpenStandaloneTool] = useState<StandaloneTool | null>(null);

  const history = useStreamTranscriptions(stream.id, authFetch, HISTORY_FETCH_LIMIT);
  const search = useStreamSearch(stream.id, authFetch, MAX_SEARCH_RESULTS);
  const focus = useStreamFocusWindow(stream.id, authFetch, HISTORY_FETCH_LIMIT);

  const statusModifier = getStatusModifier(stream.status);
  const statusLabel = getStatusLabel(stream.status);
  const streamIsPager = isPagerStream(stream);
  const isTranscribing = stream.status === "transcribing";

  const visibleTranscriptions = useMemo(
    () =>
      selectVisibleTranscriptions(stream.transcriptions ?? [], {
        historyTranscriptions: history.state.transcriptions ?? [],
        windowMs: INITIAL_HISTORY_WINDOW_MS,
        fallbackLimit: 10,
      }),
    [stream.transcriptions, history.state.transcriptions],
  );

  const shouldPrepareDetails = isStandalone || expanded;
  const prepared = useMemo(() => {
    if (!shouldPrepareDetails || visibleTranscriptions.length === 0) {
      return { groupedTranscriptions: [] as TranscriptionGroup[], orderedTranscriptions: visibleTranscriptions };
    }
    const p = prepareTranscriptions(visibleTranscriptions);
    return { groupedTranscriptions: p.groupedTranscriptions, orderedTranscriptions: p.sortedTranscriptions };
  }, [shouldPrepareDetails, visibleTranscriptions]);

  const focusPrepared = useMemo(
    () => (focus.state ? prepareTranscriptions(focus.state.transcriptions) : null),
    [focus.state],
  );

  const hasTranscriptions = visibleTranscriptions.length > 0;
  const latestTranscription = hasTranscriptions
    ? visibleTranscriptions[visibleTranscriptions.length - 1]
    : null;
  const earliestTimestamp = hasTranscriptions ? visibleTranscriptions[0].timestamp : null;

  const canListenLive = !streamIsPager && stream.enabled;
  const liveAudioPath = `/api/streams/${encodeURIComponent(stream.id)}/live`;
  const {
    isActiveStream,
    isListening: isLiveSessionListening,
    listen: listenToStream,
    stop: stopLiveStream,
    error: liveSessionError,
  } = useLiveAudioSession();

  const isLiveStreamActive = isActiveStream(stream.id);
  const liveListening = isLiveStreamActive && isLiveSessionListening;
  const liveAudioError = liveListening ? liveSessionError : null;
  const liveStreamLabel = getStreamTitle(stream);

  useEffect(() => {
    if (!canListenLive && liveListening) {
      stopLiveStream();
    }
  }, [canListenLive, liveListening, stopLiveStream]);

  const canLoadMoreHistory = history.state.hasMoreBefore !== false;
  const pagerWebhookPath = canViewWebhookDetails ? buildPagerWebhookPath(stream) : null;

  const togglePagerMessageFragments = (messageId: string) => {
    setOpenPagerMessageIds((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  // Build standalone controls once per render; consumer decides placement
  const standaloneControls = useStandaloneControls({
      streamId: stream.id,
      isReadOnly,
      isPagerStream: streamIsPager,
      isTranscribing,
      visibleTranscriptions,
      liveAudio: {
        isListening: liveListening,
        error: liveAudioError,
        toggle: () => {
          if (!canListenLive) return;
          if (liveListening) {
            stopLiveStream();
            return;
          }
          listenToStream({
            id: stream.id,
            name: liveStreamLabel,
            baseUrl: liveAudioPath,
            canListen: canListenLive,
            url: stream.url ?? null,
          });
        },
      },
      canListenLive,
      search: {
        input: search.input,
        setInput: search.setInput,
        state: search.state && {
          loading: search.state.loading,
          error: search.state.error,
          results: search.state.results,
        },
        search: (q: string) => void search.search(q),
        clear: () => search.clear(),
      },
      focus: {
        state: focus.state && {
          loading: focus.state.loading,
          error: focus.state.error,
        },
        jumpTimestampValue,
        jumpWindowValue,
        setJumpTimestampValue,
        setJumpWindowValue,
        goToTimestamp: (ts: string, win: number) => void focus.goToTimestamp(ts, win),
      },
      onResetStream,
      onExportPagerFeed,
      onSelectPagerExportStream,
      pagerExporting,
      openTool: openStandaloneTool,
      setOpenTool: setOpenStandaloneTool,
  });

  // Side-effect: bubble standalone controls when focused
  useEffect(() => {
    if (!isStandalone || !onStandaloneControlsChange) return;
    onStandaloneControlsChange(standaloneControls);
    return () => onStandaloneControlsChange(null);
  }, [isStandalone, onStandaloneControlsChange, standaloneControls]);

  const handleReset = () => {
    if (isReadOnly) return;
    onResetStream(stream.id);
    history.clear();
    search.clear();
    focus.clear();
  };

  const renderGroupedTranscriptions = (groups: TranscriptionGroup[], orderedTranscriptions: TranscriptionResult[]) =>
    groups.map((group) => (
      <StreamTranscriptThread
        key={group.id}
        streamId={stream.id}
        group={group}
        orderedTranscriptions={orderedTranscriptions}
        streamIsPager={streamIsPager}
        transcriptCorrectionEnabled={transcriptCorrectionEnabled}
        isReadOnly={isReadOnly}
        playingRecording={playingRecording}
        playingTranscriptionId={playingTranscriptionId}
        playingSegmentId={playingSegmentId}
        recordingAudioRefs={recordingAudioRefs}
        onPlayAll={(_sid, t) => onPlayAll(stream.id, t, orderedTranscriptions)}
        onPlaySegment={onPlaySegment}
        onStopPlayback={onStopPlayback}
        isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
        openPagerMessageIds={openPagerMessageIds}
        onTogglePagerMessage={togglePagerMessageFragments}
        onReviewTranscription={onReviewTranscription}
        baseLocation={stream.baseLocation ?? null}
      />
    ));

  const sanitizedStreamId = stream.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const searchPopoverId = `stream-search-${sanitizedStreamId}`;
  const searchHeadingId = `${searchPopoverId}-title`;

  const listenButtonUse = liveListening ? "success" : "primary";

  const streamTitle = (
    <div className="d-flex align-items-center gap-3">
      {!isStandalone ? (
        expanded ? (
          <ChevronDown className="text-secondary" size={16} />
        ) : (
          <ChevronRight className="text-secondary" size={16} />
        )
      ) : null}
      <Radio className="text-secondary" size={20} aria-hidden="true" />
      <div>
        <div className="transcript-stream__title-group">
          <h3 className="h6 mb-0 text-body">{stream.name}</h3>
          {stream.status === "stopped" ? (
            <span className="transcript-stream__stopped-pill">[STOPPED]</span>
          ) : stream.status === "queued" ? (
            <span className="transcript-stream__queued-pill">[QUEUED]</span>
          ) : null}
        </div>
        {streamIsPager ? (
          <div className="small text-body-secondary d-flex flex-wrap align-items-center gap-2">
            <span className="badge text-bg-info-subtle text-info-emphasis text-uppercase">Pager feed</span>
            {pagerWebhookPath && <code>{pagerWebhookPath}</code>}
          </div>
        ) : stream.url ? (
          <a
            href={stream.url}
            target="_blank"
            rel="noopener noreferrer"
            className="small text-decoration-none link-primary"
          >
            {stream.url}
          </a>
        ) : null}
      </div>
    </div>
  );

  const streamMeta = (
    <div className="d-flex flex-wrap align-items-center gap-3">
      <div
        className={`transcript-stream__status transcript-stream__status--${statusModifier}`.trim()}
        role="status"
        aria-live="polite"
        aria-label={statusLabel}
        title={statusLabel}
      >
        {getStatusIcon(stream.status)}
      </div>

      <div className="small text-body-secondary">{visibleTranscriptions.length} visible</div>

      {latestTranscription && (
        <div className="small text-body-secondary">
          Last: <Timestamp value={latestTranscription.timestamp} />
        </div>
      )}

      {!isReadOnly && hasTranscriptions && (
        <Button
          size="sm"
          use="danger"
          onClick={(e) => {
            e.stopPropagation();
            if (
              window.confirm(
                `Are you sure you want to clear all transcriptions and recordings for "${stream.name}"? This action cannot be undone.`,
              )
            ) {
              handleReset();
            }
          }}
          title="Clear all transcriptions and recordings for this stream"
          startContent={<RotateCcw size={14} />}
        >
          Reset
        </Button>
      )}

      <Button
        size="sm"
        use={listenButtonUse}
        onClick={(e) => {
          e.stopPropagation();
          console.info("[live-audio] listen button clicked", {
            streamId: stream.id,
            canListenLive,
            status: stream.status,
          });
          if (liveListening) {
            stopLiveStream();
          } else {
            listenToStream({
              id: stream.id,
              name: liveStreamLabel,
              baseUrl: liveAudioPath,
              canListen: canListenLive,
              url: stream.url ?? null,
            });
          }
        }}
        title="Toggle live audio monitoring"
        startContent={
          liveListening ? (
            <span className="live-listening-icon" aria-hidden="true">
              <Volume2 size={14} />
            </span>
          ) : (
            <Play size={14} />
          )
        }
      >
        {liveListening ? "Stop listening" : "Listen live"}
      </Button>
    </div>
  );

  const detailsId = `stream-${stream.id}-details`;
  const headerElement = isStandalone ? null : (
    <Button
      use="unstyled"
      className={`transcript-stream__header${
        statusModifier ? ` transcript-stream__header--${statusModifier}` : ""
      }`}
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      aria-controls={detailsId}
    >
      {streamTitle}
      {streamMeta}
    </Button>
  );

  const summarySections: React.ReactElement[] = [];
  if (liveListening && liveAudioError) {
    summarySections.push(
      <div key="live-audio-error" className="transcript-stream__summary-block">
        <div className="small text-danger" role="alert">
          {liveAudioError}
        </div>
      </div>,
    );
  }
  if (!isStandalone) {
    summarySections.push(
      <StreamMetricsSummary key="metrics" transcriptions={visibleTranscriptions} />,
    );
  }
  const renderedSummarySections = summarySections.map((section, index) => {
    const className = ((section.props as { className?: string }).className ?? "")
      .split(" ")
      .filter(Boolean);
    if (headerElement && index === 0) {
      className.push("transcript-stream__summary-block--with-header");
    }
    return cloneElement(section, { className: className.join(" ") });
  });

  const streamControls = (
    <div className="transcript-stream__controls">
      <div className="transcript-stream__toolbar">
        {!isStandalone ? (
          <div className="transcript-stream__search">
            <Button
              size="sm"
              use="primary"
              appearance="outline"
              onClick={() => setOpenSearch((v) => !v)}
              aria-expanded={openSearch}
              aria-controls={openSearch ? searchPopoverId : undefined}
              startContent={<Search size={14} />}
              isCondensed
              tooltip={openSearch ? "Hide search" : "Search history"}
            >
              {openSearch ? "Hide search" : "Search history"}
            </Button>

            {openSearch ? (
              <SearchPanel
                variant="popover"
                id={searchPopoverId}
                headingId={searchHeadingId}
                searchValue={search.input}
                loading={Boolean(search.state?.loading)}
                error={search.state?.error ?? null}
                results={search.state?.results ?? []}
                onChange={(value) => search.setInput(value)}
                onSearch={(value) => void search.search(value)}
                onClear={() => search.clear()}
                onClose={() => setOpenSearch(false)}
                onViewContext={(timestamp) => {
                  setJumpTimestampValue(timestamp);
                  void focus.goToTimestamp(timestamp, jumpWindowValue);
                  setOpenSearch(false);
                }}
              />
            ) : null}
          </div>
        ) : null}

        {!isStandalone ? (
          <div className="transcript-stream__jump-form">
            <span className="transcript-stream__toolbar-label">Go to timestamp</span>
            <JumpForm
              timestampValue={jumpTimestampValue}
              windowMinutes={jumpWindowValue}
              isLoading={focus.state?.loading ?? false}
              onTimestampChange={(value) => setJumpTimestampValue(value)}
              onWindowMinutesChange={(value) => setJumpWindowValue(value)}
              onSubmit={(value, windowMinutes) => {
                if (!value) {
                  return;
                }
                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) {
                  return;
                }
                setJumpTimestampValue(value);
                void focus.goToTimestamp(parsed.toISOString(), windowMinutes);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className={`transcript-stream${expanded ? " transcript-stream--expanded" : ""}${
        statusModifier ? ` transcript-stream--${statusModifier}` : ""
      }`}
    >
      {headerElement}
      {renderedSummarySections}
      {(expanded || isStandalone) && (
        <div className="transcript-stream__details" id={detailsId}>
          {focus.state && (
            <FocusContextPanel
              anchor={focus.state.anchor}
              windowMinutes={focus.state.windowMinutes}
              transcriptionsCount={focus.state.transcriptions.length}
              loading={focus.state.loading}
              error={focus.state.error}
              onAddToTimeline={() => history.appendTranscriptions(focus.state?.transcriptions ?? [])}
              onClear={() => focus.clear()}
            >
              {focusPrepared &&
                renderGroupedTranscriptions(
                  focusPrepared.groupedTranscriptions,
                  focusPrepared.sortedTranscriptions,
                )}
            </FocusContextPanel>
          )}

          {streamControls}

          {hasTranscriptions ? (
            <div className="transcript">
              <StreamTranscriptList
                orderedTranscriptions={prepared.orderedTranscriptions}
                isTranscribing={stream.enabled}
                onLoadEarlier={
                  canLoadMoreHistory
                    ? () =>
                        history.loadEarlier(
                          earliestTimestamp ?? new Date().toISOString(),
                        )
                    : null
                }
                hasMoreHistory={canLoadMoreHistory}
                isLoadingHistory={history.state.loading}
                historyError={history.state.error}
              >
                {renderGroupedTranscriptions(
                  prepared.groupedTranscriptions,
                  prepared.orderedTranscriptions,
                )}
              </StreamTranscriptList>
            </div>
          ) : (
            <div className="transcript">
              <div className="text-center py-8 text-sm text-neutral">
                {visibleTranscriptions.length === 0 && history.state.transcriptions?.length ? (
                  "No transcriptions in recent history."
                ) : stream.enabled ? (
                  <span className="flex items-center justify-content-center gap-2 text-accent">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Listening for new audio…</span>
                  </span>
                ) : (
                  "No transcriptions yet for this stream."
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StreamSection;
