import { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptionReviewStatus } from "@types";

interface UseExportSettingsOptions {
  defaultStatuses: TranscriptionReviewStatus[];
  statusOrder: TranscriptionReviewStatus[];
  requireEditor: (actionDescription: string) => boolean;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const parseFilenameFromContentDisposition = (
  header: string | null,
): string | null => {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (error) {
      console.warn(
        "Failed to decode UTF-8 filename from Content-Disposition header:",
        error,
      );
    }
  }

  const fallbackMatch = header.match(/filename="?([^";]+)"?/i);
  return fallbackMatch && fallbackMatch[1] ? fallbackMatch[1] : null;
};

export const useExportSettings = ({
  defaultStatuses,
  statusOrder,
  requireEditor,
  authFetch,
}: UseExportSettingsOptions) => {
  const [exportStatuses, setExportStatuses] = useState<TranscriptionReviewStatus[]>(
    () => [...defaultStatuses],
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const hasUserAdjusted = useRef(false);

  useEffect(() => {
    setExportStatuses((current) => {
      if (hasUserAdjusted.current) {
        return current;
      }
      const isEqual =
        current.length === defaultStatuses.length &&
        current.every((status, index) => status === defaultStatuses[index]);
      if (isEqual) {
        return current;
      }
      return [...defaultStatuses];
    });
  }, [defaultStatuses]);

  const handleExportStatusToggle = useCallback(
    (status: TranscriptionReviewStatus) => {
      setExportError(null);
      hasUserAdjusted.current = true;
      setExportStatuses((current) => {
        const hasStatus = current.includes(status);
        if (hasStatus) {
          if (current.length === 1) {
            return current;
          }
          const next = current.filter((item) => item !== status);
          return statusOrder.filter((value) => next.includes(value));
        }
        const next = [...current, status];
        return statusOrder.filter((value) => next.includes(value));
      });
    },
    [statusOrder],
  );

  const handleExportTranscriptions = useCallback(async () => {
    if (exportStatuses.length === 0) {
      setExportError("Select at least one review status to export.");
      return;
    }

    if (!requireEditor("export transcriptions")) {
      setExportError("Sign in to export transcriptions.");
      return;
    }

    try {
      setExportError(null);
      setExporting(true);

      const params = new URLSearchParams();
      for (const status of exportStatuses) {
        params.append("status", status);
      }
      const query = params.toString();

      const response = await authFetch(
        `/api/transcriptions/export-reviewed${query ? `?${query}` : ""}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const suggestedFilename = parseFilenameFromContentDisposition(
        response.headers.get("Content-Disposition"),
      );
      link.download =
        suggestedFilename ?? `reviewed-transcriptions-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export transcriptions:", error);
      setExportError(
        error instanceof Error
          ? error.message
          : "Failed to export transcriptions",
      );
    } finally {
      setExporting(false);
    }
  }, [authFetch, exportStatuses, requireEditor]);

  return {
    exportStatuses,
    exporting,
    exportError,
    setExportError,
    handleExportStatusToggle,
    handleExportTranscriptions,
  } as const;
};
