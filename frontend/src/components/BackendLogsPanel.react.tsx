import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Terminal, X } from "lucide-react";

import Button from "./primitives/Button.react";
import "./BackendLogsPanel.scss";

type LogEntry = {
  source: "app" | "stderr";
  line: string;
};

type LogsResponse = {
  entries: LogEntry[];
  total: number;
  maxLines: number;
};

type BackendLogsPanelProps = {
  open: boolean;
  onClose: () => void;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "stderr", label: "Service Errors (stderr)" },
  { value: "app", label: "Application Log" },
] as const;

const LINE_OPTIONS = [
  { value: 100, label: "100 lines" },
  { value: 250, label: "250 lines" },
  { value: 500, label: "500 lines" },
  { value: 1000, label: "1000 lines" },
] as const;

const BackendLogsPanel = ({
  open,
  onClose,
  authFetch,
}: BackendLogsPanelProps) => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"all" | "app" | "stderr">("stderr");
  const [maxLines, setMaxLines] = useState(250);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterText, setFilterText] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        source,
        lines: String(maxLines),
      });
      const response = await authFetch(`/api/logs/backend?${params}`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Editor access required to view logs");
        }
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
      const data: LogsResponse = await response.json();
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [authFetch, source, maxLines]);

  // Fetch on open and when filters change
  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, fetchLogs]);

  // Auto-refresh
  useEffect(() => {
    if (!open || !autoRefresh) return;

    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [open, autoRefresh, fetchLogs]);

  // Filter entries
  const filteredEntries = filterText
    ? entries.filter((e) =>
        e.line.toLowerCase().includes(filterText.toLowerCase())
      )
    : entries;

  // Highlight error patterns
  const isErrorLine = (line: string): boolean => {
    const lower = line.toLowerCase();
    return (
      lower.includes("error") ||
      lower.includes("exception") ||
      lower.includes("failed") ||
      lower.includes("traceback") ||
      lower.includes("assertion")
    );
  };

  const isWarningLine = (line: string): boolean => {
    const lower = line.toLowerCase();
    return lower.includes("warning") || lower.includes("warn");
  };

  if (!open) {
    return null;
  }

  return (
    <div className="app-modal" role="presentation" onClick={onClose}>
      <div
        className="app-modal__dialog backend-logs-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backend-logs-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="backend-logs-panel__header">
          <div className="backend-logs-panel__header-text">
            <h2 className="backend-logs-panel__title" id="backend-logs-title">
              <Terminal size={20} />
              Backend Logs
            </h2>
            <p className="backend-logs-panel__subtitle text-body-secondary small mb-0">
              View server errors and application logs
            </p>
          </div>
          <Button
            size="sm"
            use="secondary"
            appearance="outline"
            onClick={onClose}
            aria-label="Close logs"
          >
            <X size={16} />
          </Button>
        </header>

        <div className="backend-logs-panel__controls">
          <div className="backend-logs-panel__filters">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              className="backend-logs-panel__select"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={maxLines}
              onChange={(e) => setMaxLines(Number(e.target.value))}
              className="backend-logs-panel__select"
            >
              {LINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Filter logs..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="backend-logs-panel__filter-input"
            />
          </div>

          <div className="backend-logs-panel__actions">
            <label className="backend-logs-panel__auto-refresh">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>

            <Button
              size="sm"
              use="secondary"
              appearance="outline"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "spinning" : ""} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="backend-logs-panel__error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="backend-logs-panel__content">
          {filteredEntries.length === 0 ? (
            <div className="backend-logs-panel__empty">
              {loading ? "Loading..." : "No log entries found"}
            </div>
          ) : (
            <pre className="backend-logs-panel__log">
              {filteredEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className={`backend-logs-panel__line ${
                    isErrorLine(entry.line)
                      ? "backend-logs-panel__line--error"
                      : isWarningLine(entry.line)
                        ? "backend-logs-panel__line--warning"
                        : ""
                  }`}
                >
                  <span className="backend-logs-panel__source">
                    [{entry.source}]
                  </span>
                  {entry.line}
                </div>
              ))}
            </pre>
          )}
        </div>

        <footer className="backend-logs-panel__footer">
          <span className="text-body-secondary small">
            Showing {filteredEntries.length} of {entries.length} entries
            {filterText && " (filtered)"}
          </span>
        </footer>
      </div>
    </div>
  );
};

export default BackendLogsPanel;
