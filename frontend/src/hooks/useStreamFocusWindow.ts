import { useCallback, useState } from "react";
import type { TranscriptionQueryResponse, TranscriptionResult } from "@types";

export interface FocusWindowState {
  anchor: string | null;
  windowMinutes: number;
  transcriptions: TranscriptionResult[];
  loading: boolean;
  error: string | null;
}

export interface UseStreamFocusWindowResult {
  state: FocusWindowState | null;
  goToTimestamp: (timestamp: string, windowMinutes: number) => Promise<void>;
  clear: () => void;
}

export const useStreamFocusWindow = (
  streamId: string,
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  historyFetchLimit: number,
): UseStreamFocusWindowResult => {
  const [state, setState] = useState<FocusWindowState | null>(null);

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

  const goToTimestamp = useCallback(
    async (timestamp: string, windowMinutes: number) => {
      setState({
        anchor: timestamp,
        windowMinutes,
        transcriptions: [],
        loading: true,
        error: null,
      });
      try {
        const data = await fetchTranscriptions({
          around: timestamp,
          windowMinutes: String(windowMinutes),
          limit: String(Math.max(historyFetchLimit, windowMinutes * 6)),
          order: "asc",
        });
        setState({
          anchor: timestamp,
          windowMinutes,
          transcriptions: data.transcriptions,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState({
          anchor: timestamp,
          windowMinutes,
          transcriptions: [],
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load context",
        });
      }
    },
    [fetchTranscriptions, historyFetchLimit],
  );

  const clear = useCallback(() => setState(null), []);

  return { state, goToTimestamp, clear };
};

export default useStreamFocusWindow;

