import React, { useMemo } from "react";
import type { TranscriptionSegment } from "@types";
import {
  useHoveredSegmentOptional,
  buildHoveredSegmentId,
} from "../contexts/HoveredSegmentContext";
import "./WaveformSegmentOverlay.scss";

export interface WaveformSegmentOverlayProps {
  /** Array of transcription segments with timing data */
  segments: TranscriptionSegment[];
  /** ID of the parent transcription (for hover matching) */
  transcriptionId: string;
  /** Total duration of the audio in seconds */
  duration: number;
  /** Callback when a segment is clicked */
  onSegmentClick?: (segment: TranscriptionSegment) => void;
  /** Height of the overlay container (should match waveform height) */
  height?: number;
}

/** Minimum width in pixels before showing inline text label */
const MIN_LABEL_WIDTH_PX = 60;
/** Reference width for percentage calculations (approximate waveform width) */
const REFERENCE_WIDTH_PX = 400;

/**
 * Overlay component that renders interactive segment regions on top of a waveform.
 * Shows colored bars for each segment with hover highlighting and click-to-seek.
 */
export const WaveformSegmentOverlay: React.FC<WaveformSegmentOverlayProps> = ({
  segments,
  transcriptionId,
  duration,
  onSegmentClick,
  height = 40,
}) => {
  const hoveredContext = useHoveredSegmentOptional();

  // Calculate segment positions as percentages
  const segmentPositions = useMemo(() => {
    if (duration <= 0 || segments.length === 0) {
      return [];
    }

    return segments.map((segment, index) => {
      const leftPercent = Math.max(0, (segment.start / duration) * 100);
      const rightPercent = Math.min(100, (segment.end / duration) * 100);
      const widthPercent = Math.max(0.5, rightPercent - leftPercent); // Min 0.5% width

      // Estimate if segment is wide enough for label (rough approximation)
      const estimatedWidthPx = (widthPercent / 100) * REFERENCE_WIDTH_PX;
      const showLabel = estimatedWidthPx >= MIN_LABEL_WIDTH_PX;

      return {
        segment,
        index,
        leftPercent,
        widthPercent,
        showLabel,
        segmentId: buildHoveredSegmentId(transcriptionId, segment.id),
      };
    });
  }, [segments, duration, transcriptionId]);

  if (segmentPositions.length === 0) {
    return null;
  }

  const handleMouseEnter = (segmentId: string) => {
    hoveredContext?.setHoveredSegmentId(segmentId);
  };

  const handleMouseLeave = () => {
    hoveredContext?.setHoveredSegmentId(null);
  };

  const handleClick = (
    segment: TranscriptionSegment,
    e: React.MouseEvent,
  ) => {
    // Let clicks bubble up to waveform for position-based seeking
    // Only stop propagation if we have a custom segment click handler
    if (onSegmentClick) {
      e.stopPropagation();
      onSegmentClick(segment);
    }
    // Otherwise, click bubbles to waveform and seeks to clicked position
  };

  return (
    <div
      className="waveform-segment-overlay"
      style={{ height }}
    >
      {segmentPositions.map(
        ({ segment, index, leftPercent, widthPercent, showLabel, segmentId }) => {
          const isHovered = hoveredContext?.hoveredSegmentId === segmentId;
          const colorClass = index % 2 === 0 ? "even" : "odd";

          return (
            <div
              key={segmentId}
              className={`waveform-segment waveform-segment--${colorClass}${isHovered ? " waveform-segment--hovered" : ""}`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              onMouseEnter={() => handleMouseEnter(segmentId)}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => handleClick(segment, e)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSegmentClick?.(segment);
                }
              }}
              aria-label={`Segment ${index + 1}: ${segment.text.slice(0, 50)}${segment.text.length > 50 ? "..." : ""}`}
            >
              {showLabel && (
                <span className="waveform-segment__label">
                  {segment.text}
                </span>
              )}
            </div>
          );
        },
      )}
    </div>
  );
};

export default WaveformSegmentOverlay;
