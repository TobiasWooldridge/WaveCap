import React from "react";
import { Activity, BarChart3, Clock } from "lucide-react";
import { Timestamp } from "./primitives/Timestamp.react";
import { calculatePerformanceMetrics, type PerformanceMetrics } from "../hooks/usePerformance";
import { clampAccuracyPercentage, formatDurationSeconds } from "../utils/datetime";
import type { TranscriptionResult } from "@types";

export interface StreamMetricsSummaryProps {
  transcriptions: TranscriptionResult[];
}

export const StreamMetricsSummary: React.FC<StreamMetricsSummaryProps> = ({ transcriptions }) => {
  const metrics: PerformanceMetrics = calculatePerformanceMetrics(transcriptions);
  const hasMetricsData = metrics.transcriptionCount > 0;
  const lastMetricsTimestamp =
    typeof metrics.lastTranscriptionTime === "number" && Number.isFinite(metrics.lastTranscriptionTime)
      ? metrics.lastTranscriptionTime
      : null;

  return (
    <div className="transcript-stream__summary-block">
      {hasMetricsData ? (
        <>
          <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
            <div className="col">
              <div className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3">
                <div className="d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold">
                  <Activity size={14} className="text-primary" />
                  <span>Transcriptions</span>
                </div>
                <div className="fw-semibold text-body">{metrics.transcriptionCount}</div>
              </div>
            </div>

            <div className="col">
              <div className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3">
                <div className="d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold">
                  <span className="text-success">Accuracy</span>
                </div>
                <div className="fw-semibold text-success">
                  {clampAccuracyPercentage(metrics.averageAccuracy).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="col">
              <div className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3">
                <div className="d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold">
                  <Clock size={14} className="text-info" />
                  <span>Avg duration</span>
                </div>
                <div className="fw-semibold text-info">{formatDurationSeconds(metrics.averageDuration)}</div>
              </div>
            </div>

            <div className="col">
              <div className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3">
                <div className="d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold">
                  <BarChart3 size={14} className="text-warning" />
                  <span>Total duration</span>
                </div>
                <div className="fw-semibold text-warning">{formatDurationSeconds(metrics.totalDuration)}</div>
              </div>
            </div>
          </div>

          {lastMetricsTimestamp ? (
            <div className="mt-2 small text-body-secondary">
              Last transcription: <Timestamp value={lastMetricsTimestamp} mode="datetime" />
            </div>
          ) : null}
        </>
      ) : (
        <div className="small text-body-secondary">No transcription metrics available yet.</div>
      )}
    </div>
  );
};

export default StreamMetricsSummary;

