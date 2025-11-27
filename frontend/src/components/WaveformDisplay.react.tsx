import React, { useMemo } from "react";
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
}

/**
 * Renders an amplitude waveform visualization with playback progress
 * and optional speech region highlighting.
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
}) => {
  const numBars = waveform.length;

  // Calculate progress and speech region bar indices
  const { progressBar, speechStartBar, speechEndBar } = useMemo(() => {
    if (duration <= 0) {
      return { progressBar: 0, speechStartBar: null, speechEndBar: null };
    }
    const progress = Math.floor((currentTime / duration) * numBars);
    const start =
      speechStart != null ? Math.floor((speechStart / duration) * numBars) : null;
    const end =
      speechEnd != null
        ? Math.min(Math.floor((speechEnd / duration) * numBars), numBars - 1)
        : null;
    return { progressBar: progress, speechStartBar: start, speechEndBar: end };
  }, [duration, currentTime, speechStart, speechEnd, numBars]);

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
      className={`waveform-display${isPlaying ? " waveform-display--playing" : ""}${overlayClass}${className ? ` ${className}` : ""}`}
      style={{ height, cursor: onSeek ? "pointer" : "default" }}
      onClick={handleClick}
      role={onSeek ? "slider" : "img"}
      aria-label="Audio waveform"
      aria-valuenow={onSeek ? currentTime : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? duration : undefined}
    >
      <div className="waveform-display__bars">
        {waveform.map((amp, i) => {
          const inSpeechRegion =
            speechStartBar != null &&
            speechEndBar != null &&
            i >= speechStartBar &&
            i <= speechEndBar;
          const barHeight = Math.max(2, amp * (height - 4));

          return (
            <div
              key={i}
              className={`waveform-display__bar${inSpeechRegion ? " waveform-display__bar--speech" : ""}`}
              style={{
                height: barHeight,
              }}
            />
          );
        })}
      </div>
      {progressBar > 0 && progressBar < numBars && (
        <div
          className={`waveform-display__playhead${isPlaying ? "" : " waveform-display__playhead--paused"}`}
          style={{ left: `${(progressBar / numBars) * 100}%` }}
        />
      )}
    </div>
  );
};

export default WaveformDisplay;
