import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Stream,
  StreamSource,
  StreamUpdate,
  TranscriptionResult,
  TranscriptionReviewStatus,
} from "@types";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = "/api";
export const STREAM_TRANSCRIPTION_PREVIEW_LIMIT = 100;
const STREAMS_QUERY_KEY = ["streams"] as const;

type AddStreamArgs = {
  url?: string;
  name?: string;
  language?: string;
  source?: StreamSource;
  ignoreFirstSeconds?: number;
};

const toError = (value: unknown, fallback: string): Error => {
  if (value instanceof Error) {
    return value;
  }
  return new Error(fallback);
};

const normalizeStream = (stream: Stream): Stream => ({
  ...stream,
  transcriptions: (stream.transcriptions ?? []).slice(
    0,
    STREAM_TRANSCRIPTION_PREVIEW_LIMIT,
  ),
});

export const useStreams = () => {
  const [error, setError] = useState<string | null>(null);
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();

  const buildHeaders = useCallback((contentType?: string): HeadersInit => {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    return headers;
  }, []);

  const fetchStreamsRequest = useCallback(async (): Promise<Stream[]> => {
    try {
      const params = new URLSearchParams({
        maxTranscriptions: String(STREAM_TRANSCRIPTION_PREVIEW_LIMIT),
      });

      const response = await authFetch(
        `${API_BASE}/streams?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as Stream[];
      const normalized = data.map(normalizeStream);
      setError(null);
      return normalized;
    } catch (err) {
      const errorObject = toError(err, "Failed to fetch streams");
      console.error("Error fetching streams:", errorObject);
      setError(errorObject.message);
      throw errorObject;
    }
  }, [authFetch]);

  const streamsQuery = useQuery<Stream[], Error>({
    queryKey: STREAMS_QUERY_KEY,
    queryFn: fetchStreamsRequest,
  });

  const { data: streamsData, isFetching, isFetched, refetch } = streamsQuery;

  const updateCachedStreams = useCallback(
    (updater: (current: Stream[]) => Stream[]) => {
      queryClient.setQueryData<Stream[]>(STREAMS_QUERY_KEY, (current) => {
        const currentArray = Array.isArray(current) ? current : [];
        return updater(currentArray);
      });
    },
    [queryClient],
  );

  const fetchStreams = useCallback(async () => {
    try {
      await refetch({ throwOnError: true });
    } catch (err) {
      const errorObject = toError(err, "Failed to fetch streams");
      setError(errorObject.message);
      throw errorObject;
    }
  }, [refetch]);

  const addStreamMutation = useMutation<Stream, Error, AddStreamArgs>({
    mutationFn: async ({
      url,
      name,
      language,
      source = "audio",
      ignoreFirstSeconds,
    }) => {
      const response = await authFetch(`${API_BASE}/streams`, {
        method: "POST",
        headers: buildHeaders("application/json"),
        body: JSON.stringify({
          url,
          name,
          language,
          source,
          ignoreFirstSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newStream = (await response.json()) as Stream;
      return normalizeStream(newStream);
    },
    onSuccess: (newStream) => {
      setError(null);
      updateCachedStreams((previous) => {
        if (previous.some((stream) => stream.id === newStream.id)) {
          return previous.map((stream) =>
            stream.id === newStream.id ? newStream : stream,
          );
        }
        return [...previous, newStream];
      });
    },
    onError: (err) => {
      const errorObject = toError(err, "Failed to add stream");
      console.error("Error adding stream:", errorObject);
      setError(errorObject.message);
    },
  });

  const removeStreamMutation = useMutation<void, Error, string>({
    mutationFn: async (streamId: string) => {
      const response = await authFetch(`${API_BASE}/streams/${streamId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: (_, streamId) => {
      setError(null);
      updateCachedStreams((previous) => {
        const next = previous.filter((stream) => stream.id !== streamId);
        return next.length === previous.length ? previous : next;
      });
    },
    onError: (err) => {
      const errorObject = toError(err, "Failed to remove stream");
      console.error("Error removing stream:", errorObject);
      setError(errorObject.message);
    },
  });

  const startStreamMutation = useMutation<void, Error, string>({
    mutationFn: async (streamId: string) => {
      const response = await authFetch(`${API_BASE}/streams/${streamId}/start`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: (_, streamId) => {
      setError(null);
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== streamId) {
            return stream;
          }

          const nextStatus =
            (stream.source ?? "audio") === "audio"
              ? ("queued" as const)
              : ("transcribing" as const);

          if (
            stream.enabled === true &&
            stream.status === nextStatus &&
            stream.error === null
          ) {
            return stream;
          }

          changed = true;
          return {
            ...stream,
            enabled: true,
            status: nextStatus,
            error: null,
          };
        });

        return changed ? next : previous;
      });
    },
    onError: (err) => {
      const errorObject = toError(
        err,
        "Failed to start stream transcription",
      );
      console.error("Error starting stream transcription:", errorObject);
      setError(errorObject.message);
    },
  });

  const stopStreamMutation = useMutation<void, Error, string>({
    mutationFn: async (streamId: string) => {
      const response = await authFetch(`${API_BASE}/streams/${streamId}/stop`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: (_, streamId) => {
      setError(null);
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== streamId) {
            return stream;
          }

          if (
            stream.enabled === false &&
            stream.status === "stopped" &&
            stream.error === null
          ) {
            return stream;
          }

          changed = true;
          return {
            ...stream,
            enabled: false,
            status: "stopped" as const,
            error: null,
          };
        });

        return changed ? next : previous;
      });
    },
    onError: (err) => {
      const errorObject = toError(
        err,
        "Failed to stop stream transcription",
      );
      console.error("Error stopping stream transcription:", errorObject);
      setError(errorObject.message);
    },
  });

  const resetStreamMutation = useMutation<void, Error, string>({
    mutationFn: async (streamId: string) => {
      const response = await authFetch(`${API_BASE}/streams/${streamId}/reset`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: (_, streamId) => {
      setError(null);
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== streamId) {
            return stream;
          }

          if (!stream.transcriptions || stream.transcriptions.length === 0) {
            return stream;
          }

          changed = true;
          return {
            ...stream,
            transcriptions: [],
          };
        });

        return changed ? next : previous;
      });
    },
    onError: (err) => {
      const errorObject = toError(err, "Failed to reset stream");
      console.error("Error resetting stream:", errorObject);
      setError(errorObject.message);
    },
  });

  const reviewTranscriptionMutation = useMutation<
    TranscriptionResult,
    Error,
    {
      transcriptionId: string;
      updates: {
        correctedText?: string | null;
        reviewStatus: TranscriptionReviewStatus;
        reviewer?: string | null;
      };
    }
  >({
    mutationFn: async ({ transcriptionId, updates }) => {
      const response = await authFetch(
        `${API_BASE}/transcriptions/${transcriptionId}/review`,
        {
          method: "PATCH",
          headers: buildHeaders("application/json"),
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        let message = `HTTP error! status: ${response.status}`;
        try {
          const data = (await response.json()) as { error?: string };
          if (typeof data?.error === "string" && data.error.length > 0) {
            message = data.error;
          }
        } catch {
          // ignore non-JSON error responses
        }
        throw new Error(message);
      }

      return (await response.json()) as TranscriptionResult;
    },
    onSuccess: (updated) => {
      setError(null);
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== updated.streamId) {
            return stream;
          }

          const existingTranscriptions = stream.transcriptions ?? [];
          const filtered = existingTranscriptions.filter(
            (item) => item.id !== updated.id,
          );
          const nextTranscriptions = [updated, ...filtered].slice(
            0,
            STREAM_TRANSCRIPTION_PREVIEW_LIMIT,
          );

          changed = true;
          return {
            ...stream,
            transcriptions: nextTranscriptions,
          };
        });

        return changed ? next : previous;
      });
    },
    onError: (err) => {
      const errorObject = toError(
        err,
        "Failed to update transcription review",
      );
      console.error("Error updating transcription review:", errorObject);
      setError(errorObject.message);
    },
  });

  const addStream = useCallback(
    (args: AddStreamArgs) => addStreamMutation.mutateAsync(args),
    [addStreamMutation],
  );

  const removeStream = useCallback(
    (streamId: string) => removeStreamMutation.mutateAsync(streamId),
    [removeStreamMutation],
  );

  const startStreamTranscription = useCallback(
    (streamId: string) => startStreamMutation.mutateAsync(streamId),
    [startStreamMutation],
  );

  const stopStreamTranscription = useCallback(
    (streamId: string) => stopStreamMutation.mutateAsync(streamId),
    [stopStreamMutation],
  );

  const resetStream = useCallback(
    (streamId: string) => resetStreamMutation.mutateAsync(streamId),
    [resetStreamMutation],
  );

  const reviewTranscription = useCallback(
    (
      transcriptionId: string,
      updates: {
        correctedText?: string | null;
        reviewStatus: TranscriptionReviewStatus;
        reviewer?: string | null;
      },
    ) =>
      reviewTranscriptionMutation.mutateAsync({
        transcriptionId,
        updates,
      }),
    [reviewTranscriptionMutation],
  );

  const addTranscription = useCallback(
    (transcription: TranscriptionResult) => {
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== transcription.streamId) {
            return stream;
          }

          const existingTranscriptions = stream.transcriptions ?? [];
          const filtered = existingTranscriptions.filter(
            (item) => item.id !== transcription.id,
          );
          const nextTranscriptions = [transcription, ...filtered].slice(
            0,
            STREAM_TRANSCRIPTION_PREVIEW_LIMIT,
          );

          changed = true;
          return {
            ...stream,
            transcriptions: nextTranscriptions,
          };
        });

        return changed ? next : previous;
      });
    },
    [updateCachedStreams],
  );

  const patchStream = useCallback(
    (
      streamId: string,
      updates:
        | Partial<Stream>
        | ((stream: Stream) => Partial<Stream> | null | undefined),
    ) => {
      updateCachedStreams((previous) => {
        if (!Array.isArray(previous) || previous.length === 0) {
          return previous;
        }

        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== streamId) {
            return stream;
          }

          const resolvedUpdates =
            typeof updates === "function" ? updates(stream) : updates;
          if (!resolvedUpdates) {
            return stream;
          }

          let needsUpdate = false;
          for (const key of Object.keys(resolvedUpdates) as Array<
            keyof Stream
          >) {
            if (
              resolvedUpdates[key] !== undefined &&
              stream[key] !== resolvedUpdates[key]
            ) {
              needsUpdate = true;
              break;
            }
          }

          if (!needsUpdate) {
            return stream;
          }

          changed = true;
          return {
            ...stream,
            ...resolvedUpdates,
          };
        });

        return changed ? next : previous;
      });
    },
    [updateCachedStreams],
  );

  const updateStreams = useCallback(
    (newStreams: StreamUpdate[]) => {
      updateCachedStreams((previous) => mergeStreamUpdates(previous, newStreams));
    },
    [updateCachedStreams],
  );

  const streams: Stream[] = streamsData ?? [];

  return {
    streams,
    loading: isFetching,
    initialized: isFetched,
    error,
    fetchStreams,
    addStream,
    removeStream,
    startStreamTranscription,
    stopStreamTranscription,
    resetStream,
    addTranscription,
    patchStream,
    updateStreams,
    reviewTranscription,
  };
};

export const mergeStreamUpdates = (
  previous: Stream[],
  incoming: StreamUpdate[],
): Stream[] => {
  if (!Array.isArray(incoming)) {
    return previous;
  }

  if (incoming.length === 0) {
    return previous;
  }

  const previousById = new Map(previous.map((stream) => [stream.id, stream]));
  const incomingById = new Map(incoming.map((stream) => [stream.id, stream]));

  let hasChanges = false;
  const updatedExisting = previous.map((stream) => {
    const update = incomingById.get(stream.id);
    if (!update) {
      return stream;
    }

    const hasIncomingTranscriptions = Array.isArray(update.transcriptions);
    const mergedTranscriptions = hasIncomingTranscriptions
      ? (update.transcriptions ?? [])
      : (stream.transcriptions ?? []);

    const next = normalizeStream({
      ...stream,
      ...update,
      transcriptions: mergedTranscriptions,
    });

    for (const key of Object.keys(next) as Array<keyof Stream>) {
      if (next[key] !== stream[key]) {
        hasChanges = true;
        return next;
      }
    }

    return stream;
  });

  const newStreams = incoming
    .filter((stream) => !previousById.has(stream.id))
    .map((stream) =>
      normalizeStream({
        id: stream.id,
        name: stream.name ?? "Unnamed stream",
        url: stream.url ?? "",
        status: stream.status ?? "stopped",
        enabled: stream.enabled ?? false,
        createdAt: stream.createdAt ?? new Date(0).toISOString(),
        language: stream.language,
        error: stream.error ?? null,
        source: stream.source,
        webhookToken: stream.webhookToken ?? null,
        ignoreFirstSeconds: stream.ignoreFirstSeconds,
        lastActivityAt: stream.lastActivityAt ?? null,
        transcriptions: stream.transcriptions ?? [],
      } as Stream),
    );

  if (newStreams.length > 0) {
    hasChanges = true;
  }

  if (!hasChanges) {
    return previous;
  }

  return [...updatedExisting, ...newStreams];
};
