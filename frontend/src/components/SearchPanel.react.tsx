import React from "react";
import { Clock, Loader2, Search, X } from "lucide-react";
import type { TranscriptionResult } from "@types";
import Button from "./primitives/Button.react";
import { Timestamp } from "./primitives/Timestamp.react";
import { TimeInterval } from "./primitives/TimeInterval.react";

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
            <ul className="transcript-stream__search-results-list">
              {results.map((result) => (
                <li
                  key={`${result.id}-${result.timestamp}`}
                  className="bg-surface border border-accent/30 rounded p-2 transition-colors"
                >
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <div className="flex-grow-1">
                      <SearchResultTime result={result} />
                      <div>{result.text}</div>
                    </div>
                    <div className="d-flex flex-column align-items-end gap-1 text-xs">
                      <Button
                        size="sm"
                        use="primary"
                        onClick={() => onViewContext(result.timestamp)}
                      >
                        View context
                      </Button>
                    </div>
                  </div>
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

interface SearchResultTimeProps {
  result: TranscriptionResult;
}

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

const SearchResultTime: React.FC<SearchResultTimeProps> = ({ result }) => {
  const { timestamp, duration } = result;

  if (!timestamp) {
    return (
      <div className="transcript-stream__search-result-time">
        <Clock className="w-3 h-3 text-neutral" />
        <span>Unknown time</span>
      </div>
    );
  }

  const startDate = new Date(timestamp);
  if (Number.isNaN(startDate.getTime())) {
    return (
      <div className="transcript-stream__search-result-time">
        <Clock className="w-3 h-3 text-neutral" />
        <span>Unknown time</span>
      </div>
    );
  }

  const hasDuration = typeof duration === "number" && duration > 0;
  const durationLabel = hasDuration ? formatDurationLabel(duration as number) : null;

  return (
    <div className="transcript-stream__search-result-time">
      <Clock className="w-3 h-3 text-neutral" />
      <Timestamp value={startDate} mode="datetime" className="fw-semibold text-ink" />
      <span className="transcript-stream__search-result-separator" aria-hidden="true">
        •
      </span>
      <TimeInterval value={startDate} className="transcript-stream__search-result-interval" />
      {durationLabel ? (
        <span className="transcript-stream__search-result-duration">{durationLabel}</span>
      ) : null}
    </div>
  );
};

export default SearchPanel;
