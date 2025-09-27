import React from "react";
import Dialog from "../primitives/Dialog.react";
import type { PerformanceMetrics } from "../../hooks/usePerformance";
import { Timestamp } from "../primitives/Timestamp.react";

export interface StandaloneStatsDialogProps {
  open: boolean;
  onClose: () => void;
  sanitizedStreamId: string;
  metrics: PerformanceMetrics;
}

const clampAccuracyPercentage = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

const formatDurationSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds < 60) {
    const rounded = seconds.toFixed(seconds >= 10 ? 0 : 1);
    return `${rounded.replace(/\.0$/, "")}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const roundedSeconds = remainingSeconds.toFixed(remainingSeconds >= 10 ? 0 : 1);
  if (Number(roundedSeconds) === 0) return `${minutes}m`;
  return `${minutes}m ${roundedSeconds.replace(/\.0$/, "")}s`;
};

const StandaloneStatsDialog: React.FC<StandaloneStatsDialogProps> = ({
  open,
  onClose,
  sanitizedStreamId,
  metrics,
}) => {
  const titleId = `standalone-stats-${sanitizedStreamId}-title`;
  const hasMetricsData = metrics.transcriptionCount > 0;
  const lastMetricsTimestamp =
    typeof metrics.lastTranscriptionTime === "number" && Number.isFinite(metrics.lastTranscriptionTime)
      ? metrics.lastTranscriptionTime
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Stream statistics"
      id={`standalone-stats-${sanitizedStreamId}`}
      titleId={titleId}
      dialogClassName="standalone-tool-dialog"
      bodyClassName="standalone-tool-dialog__body"
      closeAriaLabel="Close stats dialog"
    >
      {hasMetricsData ? (
        <>
          <div className="conversation-panel__stats-title">Performance summary</div>
          <dl className="conversation-panel__stats-list">
            <div className="conversation-panel__stats-item">
              <dt>Transcriptions</dt>
              <dd>{metrics.transcriptionCount}</dd>
            </div>
            <div className="conversation-panel__stats-item">
              <dt>Avg confidence</dt>
              <dd>{clampAccuracyPercentage(metrics.averageAccuracy).toFixed(1)}%</dd>
            </div>
            <div className="conversation-panel__stats-item">
              <dt>Avg duration</dt>
              <dd>{formatDurationSeconds(metrics.averageDuration)}</dd>
            </div>
            <div className="conversation-panel__stats-item">
              <dt>Total duration</dt>
              <dd>{formatDurationSeconds(metrics.totalDuration)}</dd>
            </div>
          </dl>
          {lastMetricsTimestamp ? (
            <div className="conversation-panel__stats-footer">
              Last transcription: <Timestamp value={lastMetricsTimestamp} mode="datetime" />
            </div>
          ) : null}
        </>
      ) : (
        <div className="conversation-panel__stats-empty">No transcription metrics available yet.</div>
      )}
    </Dialog>
  );
};

export default StandaloneStatsDialog;

