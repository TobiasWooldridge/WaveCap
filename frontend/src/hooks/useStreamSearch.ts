import { useCallback, useState } from "react";
import type { TranscriptionQueryResponse, TranscriptionResult } from "@types";

export interface StreamSearchState {
  query: string;
  results: TranscriptionResult[];
  loading: boolean;
  error: string | null;
}

export interface UseStreamSearchResult {
  input: string;
  setInput: (value: string) => void;
  state: StreamSearchState | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export const useStreamSearch = (
  streamId: string,
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  maxResults: number,
): UseStreamSearchResult => {
  const [input, setInput] = useState<string>("");
  const [state, setState] = useState<StreamSearchState | null>(null);

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

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setState(null);
        setInput("");
        return;
      }

      setState({ query: trimmed, results: [], loading: true, error: null });
      try {
        const data = await fetchTranscriptions({
          search: trimmed,
          limit: String(maxResults),
          order: "desc",
        });
        setState({
          query: trimmed,
          results: data.transcriptions,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState({
          query: trimmed,
          results: [],
          loading: false,
          error: error instanceof Error ? error.message : "Search failed",
        });
      }
    },
    [fetchTranscriptions, maxResults],
  );

  const clear = useCallback(() => {
    setState(null);
    setInput("");
  }, []);

  return { input, setInput, state, search, clear };
};

export default useStreamSearch;

