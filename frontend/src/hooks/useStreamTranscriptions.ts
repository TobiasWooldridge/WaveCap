import { useCallback, useState } from "react";
import type { TranscriptionQueryResponse, TranscriptionResult } from "@types";
import { dedupeAndSortTranscriptions } from "../components/StreamTranscriptionPanel.logic";

export interface StreamHistoryState {
  transcriptions: TranscriptionResult[];
  hasMoreBefore: boolean;
  loading: boolean;
  error: string | null;
}

export interface UseStreamTranscriptionsResult {
  state: StreamHistoryState;
  loadEarlier: (before?: string | null) => Promise<void>;
  clear: () => void;
}

export const useStreamTranscriptions = (
  streamId: string,
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  historyFetchLimit: number,
): UseStreamTranscriptionsResult => {
  const [state, setState] = useState<StreamHistoryState>({
    transcriptions: [],
    hasMoreBefore: true,
    loading: false,
    error: null,
  });

  const fetchTranscriptions = useCallback(
    async (query: Record<string, string>): Promise<TranscriptionQueryResponse> => {
      const params = new URLSearchParams(query);
      const response = await authFetch(
        `/api/streams/${streamId}/transcriptions?${params.toString()}`,
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to fetch transcriptions (${response.status})`);
      }
      return (await response.json()) as TranscriptionQueryResponse;
    },
    [authFetch, streamId],
  );

  const loadEarlier = useCallback(
    async (before?: string | null) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const query: Record<string, string> = { limit: String(historyFetchLimit) };
        if (before) query.before = before;
        const data = await fetchTranscriptions(query);
        setState((prev) => {
          const combined = dedupeAndSortTranscriptions([
            ...data.transcriptions,
            ...prev.transcriptions,
          ]);
          const hasMore = data.hasMoreBefore ?? data.transcriptions.length >= historyFetchLimit;
          return {
            transcriptions: combined,
            hasMoreBefore: hasMore,
            loading: false,
            error: null,
          };
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load history",
        }));
      }
    },
    [fetchTranscriptions, historyFetchLimit],
  );

  const clear = useCallback(() => {
    setState({ transcriptions: [], hasMoreBefore: true, loading: false, error: null });
  }, []);

  return { state, loadEarlier, clear };
};

export default useStreamTranscriptions;
