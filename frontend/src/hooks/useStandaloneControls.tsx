import { useCallback, useMemo, type MutableRefObject } from "react";
import { BarChart3, CalendarClock, Download, Loader2, Search } from "lucide-react";
import type { ReactNode } from "react";
import Button from "../components/primitives/Button.react";
import ButtonGroup from "../components/primitives/ButtonGroup.react";
import StandaloneSearchDialog from "../components/dialogs/StandaloneSearchDialog.react";
import StandaloneJumpDialog from "../components/dialogs/StandaloneJumpDialog.react";
import StandaloneStatsDialog from "../components/dialogs/StandaloneStatsDialog.react";
import SearchPanel from "../components/SearchPanel.react";
import type { StandaloneStreamControls } from "../components/streamControls";
import { toDatetimeLocalValue } from "../utils/datetime";
import type { Stream, TranscriptionResult } from "@types";
import { calculatePerformanceMetrics } from "./usePerformance";

export type StandaloneTool = "search" | "jump" | "stats";

const sanitizeStreamId = (streamId: string) => streamId.replace(/[^a-zA-Z0-9_-]/g, "-");

export interface UseStandaloneControlsOptions {
  streamId: string;
  streamName: string;
  stream: Stream;
  isReadOnly: boolean;
  isPagerStream: boolean;
  isTranscribing: boolean;
  canListenLive?: boolean;
  visibleTranscriptions: TranscriptionResult[];
  liveAudio: {
    isListening: boolean;
    error: string | null;
    toggle: () => void;
  };
  recordingAudioRefs: MutableRefObject<Record<string, HTMLAudioElement | null>>;
  search: {
    input: string;
    setInput: (value: string) => void;
    state: {
      query: string;
      loading: boolean;
      error: string | null;
      results: TranscriptionResult[];
    } | null;
    search: (query: string) => void | Promise<void>;
    clear: () => void;
  };
  focus: {
    state: {
      loading: boolean;
      error: string | null;
    } | null;
    jumpTimestampValue: string;
    jumpWindowValue: number;
    setJumpTimestampValue: (value: string) => void;
    setJumpWindowValue: (value: number) => void;
    goToTimestamp: (timestamp: string, windowMinutes: number) => void | Promise<void>;
  };
  transcriptCorrectionEnabled: boolean;
  playingSegmentId: string | null;
  onPlaySegment: (
    recordingUrl: string,
    startTime: number | undefined,
    endTime: number | undefined,
    transcriptionId: string,
    options?: { recordingStartOffset?: number },
  ) => void;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string,
    startTime: number,
    endTime: number,
  ) => boolean;
  onResetStream: (streamId: string) => void;
  onExportPagerFeed?: () => Promise<void> | void;
  onSelectPagerExportStream?: (streamId: string) => void;
  pagerExporting?: boolean;
  openTool: StandaloneTool | null;
  setOpenTool: (tool: StandaloneTool | null) => void;
}

export const useStandaloneControls = (options: UseStandaloneControlsOptions): StandaloneStreamControls => {
  const {
    streamId,
    streamName,
    stream,
    isReadOnly,
    isPagerStream,
    isTranscribing,
    canListenLive: canListenLiveOverride,
    visibleTranscriptions,
    liveAudio,
    recordingAudioRefs,
    search,
    focus,
    transcriptCorrectionEnabled,
    playingSegmentId,
    onPlaySegment,
    isSegmentCurrentlyPlaying,
    onResetStream,
    onExportPagerFeed,
    onSelectPagerExportStream,
    pagerExporting = false,
    openTool,
    setOpenTool,
  } = options;

  const sanitizedStreamId = sanitizeStreamId(streamId);
  const metrics = calculatePerformanceMetrics(visibleTranscriptions);
  const canReset = !isReadOnly && visibleTranscriptions.length > 0;
  const canListenLive =
    canListenLiveOverride ?? (!isPagerStream && isTranscribing);
  const statusLabel = isTranscribing
    ? "Live transcription"
    : "Transcription stopped";
  const statusModifier: "transcribing" | "queued" | "error" | "stopped" = isTranscribing
    ? "transcribing"
    : "stopped";

  const closeDialog = useCallback(() => setOpenTool(null), [setOpenTool]);

  const toolButtonItems: ReactNode[] = useMemo(
    () => [
      <Button
        key="search"
        size="sm"
        use="primary"
        appearance="outline"
        onClick={() => setOpenTool("search")}
        startContent={<Search size={14} />}
        isCondensed
        tooltip="Search history"
      >
        Search history
      </Button>,
      <Button
        key="jump"
        size="sm"
        use="secondary"
        appearance="outline"
        onClick={() => setOpenTool("jump")}
        startContent={<CalendarClock size={14} />}
        isCondensed
        tooltip="Go to time"
      >
        Go to time
      </Button>,
      <Button
        key="stats"
        size="sm"
        use="secondary"
        appearance="outline"
        onClick={() => setOpenTool("stats")}
        startContent={<BarChart3 size={14} />}
        isCondensed
        tooltip="Stream stats"
      >
        Stream stats
      </Button>,
      ...(isPagerStream && onExportPagerFeed
        ? [
            <Button
              key="export-pager"
              size="sm"
              use="secondary"
              appearance="outline"
              onClick={() => {
                onSelectPagerExportStream?.(streamId);
                void onExportPagerFeed();
              }}
              startContent={
                pagerExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Download size={14} />
                )
              }
              isCondensed
              tooltip="Export pager feed"
              disabled={pagerExporting}
            >
              {pagerExporting ? "Exporting…" : "Export feed"}
            </Button>,
          ]
        : []),
    ],
    [
      isPagerStream,
      onExportPagerFeed,
      onSelectPagerExportStream,
      pagerExporting,
      setOpenTool,
      streamId,
    ],
  );

  return useMemo<StandaloneStreamControls>(
    () => ({
      streamId,
      statusLabel,
      statusModifier,
      isLiveListening: liveAudio.isListening,
      canListenLive,
      canReset,
      liveAudioError: liveAudio.error,
      onToggleLiveListening: () => {
        if (!canListenLive) return;
        liveAudio.toggle();
      },
      onReset: () => {
        if (isReadOnly) return;
        onResetStream(streamId);
      },
      openSearchDialog: () => setOpenTool("search"),
      toolButtons:
        toolButtonItems.length > 0 ? (
          <ButtonGroup size="sm">{toolButtonItems}</ButtonGroup>
        ) : null,
      dialogs: (() => {
        const arr: ReactNode[] = [];
        if (openTool === "search") {
          arr.push(
            <StandaloneSearchDialog
              key="search"
              open
              onClose={closeDialog}
              streamId={streamId}
              sanitizedStreamId={sanitizedStreamId}
            >
              <SearchPanel
                variant="dialog"
                searchValue={search.input}
                activeQuery={search.state?.query ?? null}
                loading={Boolean(search.state?.loading)}
                error={search.state?.error ?? null}
                results={search.state?.results ?? []}
                onChange={(value) => search.setInput(value)}
                onSearch={(value) => void search.search(value)}
                onClear={() => search.clear()}
                onClose={closeDialog}
                transcriptContext={{
                  streamName,
                  stream,
                  transcriptCorrectionEnabled,
                  playingSegmentId,
                  onPlaySegment,
                  isSegmentCurrentlyPlaying,
                  recordingAudioRefs,
                }}
                onViewContext={(timestamp) => {
                  focus.setJumpTimestampValue(toDatetimeLocalValue(timestamp));
                  void focus.goToTimestamp(timestamp, focus.jumpWindowValue);
                  closeDialog();
                }}
              />
            </StandaloneSearchDialog>,
          );
        }
        if (openTool === "jump") {
          arr.push(
            <StandaloneJumpDialog
              key="jump"
              open
              onClose={closeDialog}
              sanitizedStreamId={sanitizedStreamId}
              timestampValue={focus.jumpTimestampValue}
              windowMinutes={focus.jumpWindowValue}
              isLoading={focus.state?.loading ?? false}
              error={focus.state?.error ?? null}
              onTimestampChange={(value) => focus.setJumpTimestampValue(value)}
              onWindowMinutesChange={(value) => focus.setJumpWindowValue(value)}
              onSubmit={(value, windowMinutes) => {
                if (!value) return;
                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) return;
                focus.setJumpTimestampValue(value);
                void focus.goToTimestamp(parsed.toISOString(), windowMinutes);
                closeDialog();
              }}
            />,
          );
        }
        if (openTool === "stats") {
          arr.push(
            <StandaloneStatsDialog
              key="stats"
              open
              onClose={closeDialog}
              sanitizedStreamId={sanitizedStreamId}
              metrics={metrics}
            />,
          );
        }
        return arr;
      })(),
    }),
    [
      canListenLive,
      canReset,
      isReadOnly,
      liveAudio,
      streamName,
      stream,
      transcriptCorrectionEnabled,
      recordingAudioRefs,
      playingSegmentId,
      onPlaySegment,
      isSegmentCurrentlyPlaying,
      onResetStream,
      statusLabel,
      statusModifier,
      streamId,
      toolButtonItems,
      openTool,
      metrics,
      search,
      focus,
      closeDialog,
      sanitizedStreamId,
      setOpenTool,
    ],
  );
};

export default useStandaloneControls;
// file moved to .tsx to allow JSX usage
