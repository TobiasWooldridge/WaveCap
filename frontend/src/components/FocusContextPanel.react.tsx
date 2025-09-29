import React from "react";
import { Loader2, X } from "lucide-react";
import { Timestamp } from "./primitives/Timestamp.react";
import Button from "./primitives/Button.react";

export interface FocusContextPanelProps {
  anchor: string | null;
  windowMinutes: number;
  transcriptionsCount: number;
  loading: boolean;
  error: string | null;
  onClear: () => void;
  children?: React.ReactNode; // content (grouped transcriptions)
}

const FocusContextPanel: React.FC<FocusContextPanelProps> = ({
  anchor,
  windowMinutes,
  transcriptionsCount,
  loading,
  error,
  onClear,
  children,
}) => {
  return (
    <div className="border border-border rounded-md p-3 text-sm bg-surface-subtle transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium text-ink-muted">
            Context around {anchor ? <Timestamp value={anchor} mode="datetime" /> : "selected time"} (±{windowMinutes} min)
          </div>
          {anchor ? (
            <div className="text-xs text-ink-subtle">{transcriptionsCount} transcripts in window</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            use="unstyled"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-xs text-ink-subtle flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading context...
        </div>
      ) : error ? (
        <div className="text-xs text-danger">{error}</div>
      ) : transcriptionsCount > 0 ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <div className="text-xs text-ink-subtle">No transcripts found in this window.</div>
      )}
    </div>
  );
};

export default FocusContextPanel;
