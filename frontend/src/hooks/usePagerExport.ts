import { useCallback, useEffect, useMemo, useState } from "react";
import { Stream } from "@types";
import { parseFilenameFromContentDisposition } from "../utils/contentDisposition";

interface UsePagerExportOptions {
  streams: Stream[];
  requireEditor: (actionDescription: string) => boolean;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

interface PagerExportState {
  pagerStreams: Stream[];
  selectedStreamId: string | null;
  exporting: boolean;
  exportError: string | null;
  selectStream: (streamId: string) => void;
  exportPagerFeed: () => Promise<void>;
}

export const usePagerExport = ({
  streams,
  requireEditor,
  authFetch,
}: UsePagerExportOptions): PagerExportState => {
  const pagerStreams = useMemo(
    () => streams.filter((stream) => stream.source === "pager"),
    [streams],
  );
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (pagerStreams.length === 0) {
      setSelectedStreamId(null);
      return;
    }

    setSelectedStreamId((current) => {
      if (current && pagerStreams.some((stream) => stream.id === current)) {
        return current;
      }
      return pagerStreams[0].id;
    });
  }, [pagerStreams]);

  const selectStream = useCallback((streamId: string) => {
    setExportError(null);
    setSelectedStreamId(streamId);
  }, []);

  const exportPagerFeed = useCallback(async () => {
    if (!selectedStreamId) {
      setExportError("Select a pager feed to export.");
      return;
    }

    if (!requireEditor("export pager feeds")) {
      setExportError("Sign in to export pager feeds.");
      return;
    }

    try {
      setExportError(null);
      setExporting(true);

      const response = await authFetch(
        `/api/pager-feeds/${encodeURIComponent(selectedStreamId)}/export`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const suggestedFilename = parseFilenameFromContentDisposition(
        response.headers.get("Content-Disposition"),
      );
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download =
        suggestedFilename ?? `pager-feed-${selectedStreamId}-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export pager feed:", error);
      setExportError(
        error instanceof Error
          ? error.message
          : "Failed to export pager feed",
      );
    } finally {
      setExporting(false);
    }
  }, [authFetch, requireEditor, selectedStreamId]);

  return {
    pagerStreams,
    selectedStreamId,
    exporting,
    exportError,
    selectStream,
    exportPagerFeed,
  };
};
