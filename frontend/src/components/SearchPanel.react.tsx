import React from "react";
import { Clock, Loader2, Search, X } from "lucide-react";
import type { TranscriptionResult } from "@types";
import Button from "./primitives/Button.react";
import { Timestamp } from "./primitives/Timestamp.react";

export interface SearchPanelProps {
  variant?: "popover" | "dialog";
  id?: string;
  headingId?: string;
  searchValue: string;
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

  return (
    <div
      className="transcript-stream__search-popover"
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

      {searchValue || results.length > 0 || loading || error ? (
        <div className="transcript-stream__search-results">
          <div className="transcript-stream__search-summary">
            <div className="fw-semibold text-body">
              {searchValue ? (
                <>
                  Results for “{searchValue}” ({results.length})
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
                      <div className="d-flex align-items-center gap-2 text-xs text-ink-subtle mb-1">
                        <Clock className="w-3 h-3 text-neutral" />
                        {result.timestamp ? (
                          <Timestamp value={result.timestamp} mode="datetime" />
                        ) : (
                          <span>Unknown time</span>
                        )}
                      </div>
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

export default SearchPanel;

