import React, { useCallback, useEffect, useRef, useMemo } from "react";
import type { TranscriptionSegment } from "@types";
import { WaveformSegmentOverlay } from "./WaveformSegmentOverlay.react";
import "./WaveformDisplay.scss";

export interface WaveformDisplayProps {
  /** Array of amplitude values (0.0-1.0 normalized) */
  waveform: number[];
  /** Total duration of the audio in seconds */
  duration: number;
  /** Current playback time in seconds (for progress indicator) */
  currentTime?: number;
  /** Speech start offset in seconds (for highlighting speech region) */
  speechStart?: number | null;
  /** Speech end offset in seconds (for highlighting speech region) */
  speechEnd?: number | null;
  /** Whether this waveform is currently playing */
  isPlaying?: boolean;
  /** Click handler for seeking (receives time in seconds) */
  onSeek?: (time: number) => void;
  /** Height of the waveform in pixels */
  height?: number;
  /** Additional CSS class */
  className?: string;
  /** If true, waveform will be positioned as an overlay */
  overlay?: boolean;
  /** Optional transcription segments for segment overlay visualization */
  segments?: TranscriptionSegment[];
  /** ID of the parent transcription (required if segments provided) */
  transcriptionId?: string;
  /** Callback when a segment is clicked (for seek-to-segment) */
  onSegmentClick?: (segment: TranscriptionSegment) => void;
}

// Parse CSS rgb variable like "59, 130, 246" into [r, g, b]
function parseRgbVar(value: string): [number, number, number] | null {
  const parts = value.split(",").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
    return parts as [number, number, number];
  }
  return null;
}

/**
 * Renders an amplitude waveform visualization with playback progress
 * and optional speech region highlighting using Canvas for performance.
 */
export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  waveform,
  duration,
  currentTime = 0,
  speechStart,
  speechEnd,
  isPlaying = false,
  onSeek,
  height = 32,
  className,
  overlay = false,
  segments,
  transcriptionId,
  onSegmentClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<{
    barColor: string;
    speechColor: string;
  } | null>(null);

  const numBars = waveform.length;

  // Calculate speech region bar indices (memoized)
  const { speechStartBar, speechEndBar } = useMemo(() => {
    if (duration <= 0 || numBars === 0) {
      return { speechStartBar: null, speechEndBar: null };
    }
    const start =
      speechStart != null ? Math.floor((speechStart / duration) * numBars) : null;
    const end =
      speechEnd != null
        ? Math.min(Math.floor((speechEnd / duration) * numBars), numBars - 1)
        : null;
    return { speechStartBar: start, speechEndBar: end };
  }, [duration, speechStart, speechEnd, numBars]);

  // Calculate progress bar position
  const progressRatio = useMemo(() => {
    if (duration <= 0) return 0;
    return Math.min(1, Math.max(0, currentTime / duration));
  }, [currentTime, duration]);

  // Read CSS variables and cache them
  const getColors = useCallback(() => {
    if (colorsRef.current) return colorsRef.current;

    const container = containerRef.current;
    if (!container) {
      return {
        barColor: "rgba(59, 130, 246, 0.6)",
        speechColor: "rgba(59, 130, 246, 0.9)",
      };
    }

    const style = getComputedStyle(container);
    const accentRgb = style.getPropertyValue("--app-accent-rgb").trim();
    const parsed = parseRgbVar(accentRgb);

    if (parsed) {
      const [r, g, b] = parsed;
      colorsRef.current = {
        barColor: `rgba(${r}, ${g}, ${b}, 0.6)`,
        speechColor: `rgba(${r}, ${g}, ${b}, 0.9)`,
      };
    } else {
      colorsRef.current = {
        barColor: "rgba(59, 130, 246, 0.6)",
        speechColor: "rgba(59, 130, 246, 0.9)",
      };
    }

    return colorsRef.current;
  }, []);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || numBars === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get actual pixel dimensions
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = rect.width * dpr;
    const canvasHeight = rect.height * dpr;

    // Set canvas size for high DPI
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const colors = getColors();
    const padding = { top: 2, bottom: 2, left: 4, right: 4 };
    const gap = 1;

    const availableWidth = rect.width - padding.left - padding.right;
    const availableHeight = rect.height - padding.top - padding.bottom;

    // Calculate bar width: distribute space evenly with gaps
    const totalGapWidth = (numBars - 1) * gap;
    let barWidth = (availableWidth - totalGapWidth) / numBars;
    barWidth = Math.max(1, Math.min(4, barWidth)); // Clamp between 1-4px

    // Recalculate actual bar spacing
    const totalBarWidth = barWidth * numBars + (numBars - 1) * gap;
    const startX = padding.left + (availableWidth - totalBarWidth) / 2;

    // Draw bars
    for (let i = 0; i < numBars; i++) {
      const amp = waveform[i];
      const barHeight = Math.max(2, amp * availableHeight);
      const x = startX + i * (barWidth + gap);
      const y = rect.height - padding.bottom - barHeight;

      const inSpeechRegion =
        speechStartBar != null &&
        speechEndBar != null &&
        i >= speechStartBar &&
        i <= speechEndBar;

      ctx.fillStyle = inSpeechRegion ? colors.speechColor : colors.barColor;
      ctx.beginPath();
      // Draw rounded rectangle
      const radius = 1;
      ctx.roundRect(x, y, barWidth, barHeight, radius);
      ctx.fill();
    }

    // Reset scale for next render
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [waveform, numBars, height, speechStartBar, speechEndBar, getColors]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const seekTime = ratio * duration;
    onSeek(Math.max(0, Math.min(duration, seekTime)));
  };

  const overlayClass = overlay ? " waveform-display--overlay" : "";

  return (
    <div
      ref={containerRef}
      className={`waveform-display${isPlaying ? " waveform-display--playing" : ""}${overlayClass}${className ? ` ${className}` : ""}`}
      style={{ height, cursor: onSeek ? "pointer" : "default" }}
      onClick={handleClick}
      role={onSeek ? "slider" : "img"}
      aria-label="Audio waveform"
      aria-valuenow={onSeek ? currentTime : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? duration : undefined}
    >
      <canvas
        ref={canvasRef}
        className="waveform-display__canvas"
        style={{ width: "100%", height: "100%" }}
      />
      {segments && segments.length > 0 && transcriptionId && (
        <WaveformSegmentOverlay
          segments={segments}
          transcriptionId={transcriptionId}
          duration={duration}
          onSegmentClick={onSegmentClick}
          height={height}
        />
      )}
      {progressRatio > 0 && progressRatio < 1 && (
        <div
          className={`waveform-display__playhead${isPlaying ? "" : " waveform-display__playhead--paused"}`}
          style={{ left: `${progressRatio * 100}%` }}
        />
      )}
    </div>
  );
};

export default WaveformDisplay;
