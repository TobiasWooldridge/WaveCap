import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Stream } from "@types";

export const STREAM_QUERY_PARAM = "stream";

interface UseStreamSelectionOptions {
  streamsInitialized: boolean;
}

export const useStreamSelection = (
  streams: Stream[],
  { streamsInitialized }: UseStreamSelectionOptions,
): {
  selectedStreamId: string | null;
  selectStream: (streamId: string | null, options?: { replace?: boolean }) => void;
} => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(() => {
    return searchParams.get(STREAM_QUERY_PARAM);
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSelectedStreamId = params.get(STREAM_QUERY_PARAM);
    setSelectedStreamId((current) => {
      if (current === nextSelectedStreamId) {
        return current;
      }
      return nextSelectedStreamId;
    });
  }, [location.search]);

  const selectStream = useCallback(
    (streamId: string | null, options?: { replace?: boolean }) => {
      setSelectedStreamId(streamId);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (streamId) {
            next.set(STREAM_QUERY_PARAM, streamId);
          } else {
            next.delete(STREAM_QUERY_PARAM);
          }
          return next;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!streamsInitialized) {
      return;
    }

    if (streams.length === 0) {
      if (selectedStreamId !== null) {
        selectStream(null, { replace: true });
      }
      return;
    }

    if (
      selectedStreamId &&
      streams.some((stream) => stream.id === selectedStreamId)
    ) {
      return;
    }

    selectStream(streams[0].id, { replace: true });
  }, [streams, selectStream, selectedStreamId, streamsInitialized]);

  return { selectedStreamId, selectStream };
};
