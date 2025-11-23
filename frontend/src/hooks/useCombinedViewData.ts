import { useMemo } from "react";
import type { CombinedStreamView, Stream, TranscriptionResult } from "@types";
import { STREAM_TRANSCRIPTION_PREVIEW_LIMIT } from "./useTranscriptions";

export interface CombinedViewInstance {
  view: CombinedStreamView;
  stream: Stream;
  members: Stream[];
  missingStreamIds: string[];
}

export interface CombinedViewData {
  map: Map<string, CombinedViewInstance>;
  virtualStreams: Stream[];
}

const safeTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const dedupeAndSortTranscriptions = (
  transcriptions: TranscriptionResult[],
): TranscriptionResult[] => {
  const seen = new Set<string>();
  const deduped = transcriptions.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
  return deduped.sort((a, b) => {
    const timeA = safeTimestamp(a.timestamp);
    const timeB = safeTimestamp(b.timestamp);
    return timeA - timeB;
  });
};

interface UseCombinedViewDataOptions {
  streams: Stream[];
  combinedStreamViews: CombinedStreamView[];
  streamsInitialized: boolean;
  loading: boolean;
}

export const useCombinedViewData = ({
  streams,
  combinedStreamViews,
  streamsInitialized,
  loading,
}: UseCombinedViewDataOptions): CombinedViewData => {
  const normalizedStreams = useMemo(
    () => (Array.isArray(streams) ? streams : []),
    [streams],
  );

  return useMemo(() => {
    const map = new Map<string, CombinedViewInstance>();
    const virtualStreams: Stream[] = [];
    const streamLookup = new Map(
      normalizedStreams.map((stream) => [stream.id, stream]),
    );

    combinedStreamViews.forEach((view) => {
      const members = view.streamIds
        .map((streamId) => streamLookup.get(streamId))
        .filter((stream): stream is Stream => Boolean(stream));
      const missingStreamIds = view.streamIds.filter(
        (streamId) => !streamLookup.has(streamId),
      );

      const combinedTranscriptions = dedupeAndSortTranscriptions(
        members.flatMap((stream) => stream.transcriptions ?? []),
      );
      const trimmedTranscriptions =
        combinedTranscriptions.length > STREAM_TRANSCRIPTION_PREVIEW_LIMIT
          ? combinedTranscriptions.slice(
              combinedTranscriptions.length - STREAM_TRANSCRIPTION_PREVIEW_LIMIT,
            )
          : combinedTranscriptions;

      const activityCandidates: number[] = [];
      trimmedTranscriptions.forEach((transcription) => {
        activityCandidates.push(safeTimestamp(transcription.timestamp));
      });
      members.forEach((stream) => {
        const activity =
          safeTimestamp(stream.lastActivityAt) ||
          safeTimestamp(stream.createdAt);
        if (activity > 0) {
          activityCandidates.push(activity);
        }
      });
      const lastActivityMs =
        activityCandidates.length > 0 ? Math.max(...activityCandidates) : 0;
      const lastActivityAt =
        lastActivityMs > 0 ? new Date(lastActivityMs).toISOString() : null;

      const createdCandidates = members
        .map((stream) => safeTimestamp(stream.createdAt))
        .filter((value) => value > 0);
      const createdAtMs =
        createdCandidates.length > 0
          ? Math.min(...createdCandidates)
          : Date.now();
      const createdAt = new Date(createdAtMs).toISOString();

      const anyTranscribing = members.some(
        (stream) => stream.status === "transcribing",
      );
      const anyQueued = members.some((stream) => stream.status === "queued");
      const anyEnabled = members.some((stream) => stream.enabled);
      const anyError = members.some(
        (stream) => stream.status === "error" || Boolean(stream.error),
      );

      // Only report missing streams as an error after streams have fully loaded;
      // during initial load all streams appear "missing" temporarily.
      const hasMissingAfterLoad =
        streamsInitialized &&
        !loading &&
        normalizedStreams.length > 0 &&
        missingStreamIds.length > 0;

      let status: Stream["status"] = "stopped";
      if (hasMissingAfterLoad) {
        status = "error";
      } else if (anyError) {
        status = "error";
      } else if (anyTranscribing) {
        status = "transcribing";
      } else if (anyQueued) {
        status = "queued";
      }

      const enabled =
        status === "transcribing" || status === "queued" || anyEnabled;

      const errorMessage =
        hasMissingAfterLoad
          ? `Missing streams: ${missingStreamIds.join(", ")}`
          : anyError
            ? "One or more streams reporting errors"
            : null;

      const combinedStream: Stream = {
        id: view.id,
        name: view.name,
        url: `combined:${view.id}`,
        status,
        enabled,
        pinned: false,
        createdAt,
        transcriptions: trimmedTranscriptions,
        source: "combined",
        ignoreFirstSeconds: 0,
        lastActivityAt,
        error: errorMessage,
        combinedStreamIds: [...view.streamIds],
      };

      map.set(view.id, {
        view,
        stream: combinedStream,
        members,
        missingStreamIds,
      });
      virtualStreams.push(combinedStream);
    });

    return { map, virtualStreams };
  }, [combinedStreamViews, normalizedStreams, streamsInitialized, loading]);
};
