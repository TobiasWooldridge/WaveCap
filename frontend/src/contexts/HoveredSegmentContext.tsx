import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

interface HoveredSegmentContextValue {
  /**
   * Unique identifier for the currently hovered segment.
   * Format: "{transcriptionId}-{segmentId}" where segmentId is the segment.id
   */
  hoveredSegmentId: string | null;
  /** Set the hovered segment ID (null to clear) */
  setHoveredSegmentId: (id: string | null) => void;
}

const HoveredSegmentContext = createContext<
  HoveredSegmentContextValue | undefined
>(undefined);

export const HoveredSegmentProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [hoveredSegmentId, setHoveredSegmentIdState] = useState<string | null>(
    null,
  );

  const setHoveredSegmentId = useCallback((id: string | null) => {
    setHoveredSegmentIdState(id);
  }, []);

  const contextValue = useMemo<HoveredSegmentContextValue>(
    () => ({
      hoveredSegmentId,
      setHoveredSegmentId,
    }),
    [hoveredSegmentId, setHoveredSegmentId],
  );

  return (
    <HoveredSegmentContext.Provider value={contextValue}>
      {children}
    </HoveredSegmentContext.Provider>
  );
};

/**
 * Hook to access hovered segment state.
 * Must be used within a HoveredSegmentProvider.
 */
export const useHoveredSegment = () => {
  const context = useContext(HoveredSegmentContext);

  if (!context) {
    throw new Error(
      "useHoveredSegment must be used within a HoveredSegmentProvider",
    );
  }

  return context;
};

/**
 * Hook for optional access to hovered segment state.
 * Returns null if not within a HoveredSegmentProvider.
 */
export const useHoveredSegmentOptional = (): HoveredSegmentContextValue | null => {
  return useContext(HoveredSegmentContext) ?? null;
};

/**
 * Build a segment identifier for hover matching.
 */
export const buildHoveredSegmentId = (
  transcriptionId: string,
  segmentId: number,
): string => `${transcriptionId}-${segmentId}`;
