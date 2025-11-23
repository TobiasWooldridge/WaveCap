import React, { type MutableRefObject } from "react";
import { Clock, Loader2, Radio, Search, X } from "lucide-react";
import type { Stream, TranscriptionResult } from "@types";
import Button from "./primitives/Button.react";
import { Timestamp } from "./primitives/Timestamp.react";
import { TimeInterval } from "./primitives/TimeInterval.react";
import AlertChips from "./chips/AlertChips.react";
import { TranscriptionSegmentChips } from "./TranscriptionSegmentChips.react";
import { getRecordingElementId } from "./StreamTranscriptionPanel.logic";
import StreamStatusIndicator from "./StreamStatusIndicator.react";
import AudioElement from "./primitives/AudioElement.react";
import {
  getNotifiableAlerts,
  getTranscriptionDisplayText,
  isBlankAudioText,
} from "../utils/transcriptions";

export interface SearchPanelProps {
  variant?: "popover" | "dialog";
  id?: string;
  headingId?: string;
  searchValue: string;
  activeQuery?: string | null;
  loading: boolean;
  error: string | null;
  results: TranscriptionResult[];
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onViewContext: (timestamp: string) => void;
  transcriptContext?: SearchPanelTranscriptContext;
}

type PlaySegmentHandler = (
  recordingUrl: string,
  startTime: number | undefined,
  endTime: number | undefined,
  transcriptionId: string,
  options?: { recordingStartOffset?: number },
) => void;

export interface SearchPanelTranscriptContext {
  streamName?: string;
  stream?: Stream | null;
  transcriptCorrectionEnabled?: boolean;
  playingSegmentId?: string | null;
  onPlaySegment?: PlaySegmentHandler;
  isSegmentCurrentlyPlaying?: (
    recordingUrl: string,
    startTime: number,
    endTime: number,
  ) => boolean;
  recordingAudioRefs?: MutableRefObject<Record<string, HTMLAudioElement | null>>;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  variant = "popover",
  id,
  headingId,
  searchValue,
  activeQuery,
  loading,
  error,
  results,
  onChange,
  onSearch,
  onClear,
  onClose,
  onViewContext,
  transcriptContext,
}) => {
  const isPopover = variant === "popover";
  const titleId = headingId ?? (id ? `${id}-heading` : undefined);
  const hasExecutedSearch = Boolean(activeQuery);
  const resultCount = hasExecutedSearch ? results.length : null;
  const containerClassName = [
    "transcript-stream__search-popover",
    isPopover
      ? "transcript-stream__search-popover--inline"
      : "transcript-stream__search-popover--dialog",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={containerClassName}
      id={id}
      role={isPopover ? "dialog" : undefined}
      aria-modal={isPopover ? "false" : undefined}
      aria-labelledby={isPopover ? titleId : undefined}
    >
      {isPopover ? (
        <div className="transcript-stream__search-header" id={titleId}>
          <div className="fw-semibold text-body">Search history</div>
          <Button
            size="sm"
            use="link"
            className="p-0 text-body-secondary"
            onClick={onClose}
            aria-label="Close search panel"
          >
            <X size={16} />
          </Button>
        </div>
      ) : (
        <div className="text-body-secondary small">
          Search saved transcripts by keyword.
        </div>
      )}

      <form
        className="transcript-stream__search-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(searchValue);
        }}
      >
        <div className="transcript-stream__search-input-group">
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Keywords or phrases"
            className="form-control form-control-sm"
          />
          <Button
            type="submit"
            size="sm"
            use="primary"
            disabled={loading}
            startContent={
              loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search size={14} />
            }
          >
            Search
          </Button>
        </div>
      </form>

      {hasExecutedSearch || loading || error ? (
        <div className="transcript-stream__search-results">
          <div className="transcript-stream__search-summary">
            <div className="fw-semibold text-body">
              {hasExecutedSearch ? (
                <>
                  Results for “{activeQuery}”
                  {typeof resultCount === "number" ? ` (${resultCount})` : ""}
                </>
              ) : (
                "Search"
              )}
            </div>
            <Button size="sm" use="link" onClick={onClear} className="text-accent p-0">
              <X size={14} />
              Clear
            </Button>
          </div>

          {loading ? (
            <div className="text-xs text-ink-subtle d-flex align-items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Searching…
            </div>
          ) : error ? (
            <div className="text-xs text-danger">{error}</div>
          ) : results.length === 0 ? (
            <div className="text-xs text-accent-strong">No matches found.</div>
          ) : (
            <ul className="transcript-stream__search-results-list transcript-message-list">
              {results.map((result) => (
                <li key={`${result.id}-${result.timestamp}`}>
                  <SearchResultCard
                    result={result}
                    onViewContext={onViewContext}
                    transcriptContext={transcriptContext}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="text-xs text-ink-subtle">Search saved transcripts by keyword.</div>
      )}
    </div>
  );
};

const formatDurationLabel = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  if (totalSeconds === 0) {
    return "<1s";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`);
  }

  return parts.join(" ");
};

interface SearchResultCardProps {
  result: TranscriptionResult;
  onViewContext: (timestamp: string) => void;
  transcriptContext?: SearchPanelTranscriptContext;
}

const SearchResultMeta: React.FC<{ result: TranscriptionResult }> = ({ result }) => {
  const { timestamp, duration } = result;

  if (!timestamp) {
    return (
      <span className="transcript-message__timestamp">Unknown timestamp</span>
    );
  }

  const startDate = new Date(timestamp);
  if (Number.isNaN(startDate.getTime())) {
    return (
      <span className="transcript-message__timestamp">Unknown timestamp</span>
    );
  }

  const hasDuration = typeof duration === "number" && duration > 0;
  const durationLabel = hasDuration ? formatDurationLabel(duration as number) : null;

  return (
    <div className="transcript-stream__search-result-time">
      <Clock className="w-3 h-3 text-neutral" />
      <Timestamp value={startDate} mode="datetime" className="transcript-message__timestamp" />
      <span className="transcript-stream__search-result-separator" aria-hidden="true">
        •
      </span>
      <TimeInterval
        value={startDate}
        condensed
        className="transcript-stream__search-result-interval"
      />
      {durationLabel ? (
        <span className="transcript-stream__search-result-duration">{durationLabel}</span>
      ) : null}
    </div>
  );
};

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  onViewContext,
  transcriptContext,
}) => {
  const streamLabel = transcriptContext?.streamName ?? result.streamId;
  const stream = transcriptContext?.stream ?? null;
  const displayText =
    getTranscriptionDisplayText(result)?.trim() ?? result.text ?? "";
  const blankAudio = isBlankAudioText(result.text ?? "");
  // Show original text in tooltip when LLM-corrected
  const originalTextTooltip = result.correctedText ? `Original: ${result.text}` : undefined;
  const alertTriggers = getNotifiableAlerts(result.alerts);
  const hasAlerts = alertTriggers.length > 0;
  const transcriptCorrectionEnabled =
    transcriptContext?.transcriptCorrectionEnabled ?? false;
  const playingSegmentId = transcriptContext?.playingSegmentId ?? null;
  const onPlaySegment = transcriptContext?.onPlaySegment;
  const isSegmentCurrentlyPlaying = transcriptContext?.isSegmentCurrentlyPlaying;
  const recordingAudioRefs = transcriptContext?.recordingAudioRefs;
  const recordingUrl = result.recordingUrl ?? null;
  const recordingId = recordingUrl ? getRecordingElementId(recordingUrl) : null;
  const metaElements: React.ReactNode[] = [];

  if (alertTriggers.length > 0) {
    metaElements.push(
      <AlertChips key="alerts" triggers={alertTriggers} mode="collapsed" />,
    );
  }

  const segmentChips = onPlaySegment && isSegmentCurrentlyPlaying ? (
    <TranscriptionSegmentChips
      transcription={result}
      displayText={displayText}
      blankAudio={blankAudio}
      transcriptCorrectionEnabled={transcriptCorrectionEnabled}
      recordingUrl={recordingUrl}
      recordingId={recordingId}
      playingSegmentId={playingSegmentId}
      onPlaySegment={onPlaySegment}
      isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
    />
  ) : null;

  const canViewContext = Boolean(result.timestamp);

  return (
    <article
      className={`transcript-message${hasAlerts ? " transcript-message--alert" : ""}`}
    >
      <div className="transcript-message__avatar" aria-hidden="true">
        {stream ? (
          <StreamStatusIndicator
            stream={stream}
            className="d-inline-flex align-items-baseline"
          />
        ) : (
          <Radio size={18} />
        )}
      </div>
      <div className="transcript-message__content">
        <header className="transcript-message__header">
          <span className="transcript-message__channel">{streamLabel}</span>
          <SearchResultMeta result={result} />
        </header>
        {metaElements.length > 0 ? (
          <div className="transcript-message__meta">{metaElements}</div>
        ) : null}
        {segmentChips ? (
          <div className="transcript-message__chips">{segmentChips}</div>
        ) : null}
        {displayText ? (
          <p className="transcript-message__text" title={originalTextTooltip}>{displayText}</p>
        ) : null}
        {recordingUrl && recordingId && recordingAudioRefs ? (
          <AudioElement
            recordingId={recordingId}
            recordingUrl={recordingUrl}
            refsMap={recordingAudioRefs}
          />
        ) : null}
        <div className="d-flex justify-content-end gap-2 flex-wrap">
          <Button
            size="sm"
            use="primary"
            appearance="outline"
            onClick={() => {
              if (result.timestamp) {
                onViewContext(result.timestamp);
              }
            }}
            disabled={!canViewContext}
          >
            View context
          </Button>
        </div>
      </div>
    </article>
  );
};

export default SearchPanel;
