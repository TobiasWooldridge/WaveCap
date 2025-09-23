import type { TranscriptionResult } from "@types";

import { isSystemTranscription } from "../utils/transcriptions";

export interface PerformanceMetrics {
  transcriptionCount: number;
  averageAccuracy: number;
  averageDuration: number;
  totalDuration: number;
  lastTranscriptionTime: number | null;
}

export const EMPTY_PERFORMANCE_METRICS: PerformanceMetrics = {
  transcriptionCount: 0,
  averageAccuracy: 0,
  averageDuration: 0,
  totalDuration: 0,
  lastTranscriptionTime: null,
};

export const calculatePerformanceMetrics = (
  transcriptions: TranscriptionResult[] | undefined | null,
): PerformanceMetrics => {
  if (!transcriptions || transcriptions.length === 0) {
    return { ...EMPTY_PERFORMANCE_METRICS };
  }

  let totalAccuracy = 0;
  let totalDuration = 0;
  let latestTimestamp: number | null = null;

  const validTranscriptions = transcriptions.filter(
    (item): item is TranscriptionResult =>
      Boolean(item && !isSystemTranscription(item)),
  );

  validTranscriptions.forEach((transcription) => {
    const confidence =
      typeof transcription.confidence === "number" &&
      Number.isFinite(transcription.confidence)
        ? transcription.confidence
        : 0.5;
    totalAccuracy += confidence * 100;

    const duration =
      typeof transcription.duration === "number" &&
      Number.isFinite(transcription.duration)
        ? transcription.duration
        : 0;
    totalDuration += duration;

    const timestamp = new Date(transcription.timestamp).getTime();
    if (!Number.isNaN(timestamp)) {
      latestTimestamp =
        latestTimestamp === null
          ? timestamp
          : Math.max(latestTimestamp, timestamp);
    }
  });

  if (validTranscriptions.length === 0) {
    return { ...EMPTY_PERFORMANCE_METRICS };
  }

  return {
    transcriptionCount: validTranscriptions.length,
    averageAccuracy: totalAccuracy / validTranscriptions.length,
    averageDuration: totalDuration / validTranscriptions.length,
    totalDuration,
    lastTranscriptionTime: latestTimestamp,
  };
};
