import { useQuery } from "@tanstack/react-query";
import { CombinedStreamView } from "@types";

const API_BASE = "/api";
const COMBINED_STREAM_VIEWS_QUERY_KEY = [
  "combined-stream-views",
] as const;

const fetchCombinedStreamViews = async (): Promise<CombinedStreamView[]> => {
  const response = await fetch(`${API_BASE}/combined-stream-views`);
  if (!response.ok) {
    throw new Error(`Failed to load combined stream views (status ${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter((entry): entry is CombinedStreamView => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const candidate = entry as Partial<CombinedStreamView>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      Array.isArray(candidate.streamIds)
    );
  });
};

export const useCombinedStreamViews = () => {
  return useQuery<CombinedStreamView[], Error>({
    queryKey: COMBINED_STREAM_VIEWS_QUERY_KEY,
    queryFn: fetchCombinedStreamViews,
  });
};
