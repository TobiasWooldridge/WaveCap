import React, { useCallback, useMemo } from "react";
import { Pause, Play, Square, Radio, Volume2, VolumeX, Loader2 } from "lucide-react";
import type { TranscriptionResult } from "@types";
import Button from "./primitives/Button.react";
import { Timestamp } from "./primitives/Timestamp.react";
import { WaveformDisplay } from "./WaveformDisplay.react";
import "./PlaybackBar.scss";

export interface PlaybackBarProps {
  /** Currently playing transcription, or null if nothing is playing */
  transcription: TranscriptionResult | null;
  /** Name of the stream being played */
  streamName: string | null;
  /** Current playback time in seconds */
  currentPlayTime: number;
  /** Reference to audio elements for seeking */
  recordingAudioRefs: React.MutableRefObject<Record<string, HTMLAudioElement | null>>;
  /** Recording element ID for the current playback */
  playingRecordingId: string | null;
  /** Current volume level (0-1) */
  volume: number;
  /** Whether audio is currently muted */
  isMuted: boolean;
  /** Whether audio is currently loading/buffering */
  isLoadingAudio?: boolean;
  /** Called when user clicks play/pause */
  onTogglePlayback: () => void;
  /** Called when user clicks stop */
  onStop: () => void;
  /** Called when user changes volume */
  onVolumeChange: (volume: number) => void;
  /** Called when user toggles mute */
  onToggleMute: () => void;
}

/**
 * Fixed playback bar displayed at the bottom of the stream panel.
 * Shows waveform, playback progress, and controls for the currently playing transcription.
 */
export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  transcription,
  streamName,
  currentPlayTime,
  recordingAudioRefs,
  playingRecordingId,
  volume,
  isMuted,
  isLoadingAudio = false,
  onTogglePlayback,
  onStop,
  onVolumeChange,
  onToggleMute,
}) => {
  const isPlaying = transcription !== null;

  const handleSeek = useMemo(() => {
    if (!playingRecordingId) return undefined;
    return (time: number) => {
      const audio = recordingAudioRefs.current[playingRecordingId];
      if (audio) {
        audio.currentTime = time;
      }
    };
  }, [playingRecordingId, recordingAudioRefs]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onVolumeChange(parseFloat(e.target.value));
    },
    [onVolumeChange],
  );

  const waveform = transcription?.waveform;
  const duration = transcription?.duration;
  const speechStartOffset = transcription?.speechStartOffset;
  const speechEndOffset = transcription?.speechEndOffset;
  const timestamp = transcription?.timestamp;
  const segments = transcription?.segments;
  const transcriptionId = transcription?.id;

  return (
    <div className={`playback-bar${isPlaying ? " playback-bar--active" : ""}`}>
      <div className="playback-bar__controls">
        <Button
          use="unstyled"
          onClick={onTogglePlayback}
          className="playback-bar__button playback-bar__button--play"
          aria-label={isLoadingAudio ? "Loading audio" : isPlaying ? "Pause" : "Play"}
          disabled={!isPlaying || isLoadingAudio}
        >
          {isLoadingAudio ? (
            <Loader2 size={18} className="playback-bar__spinner" />
          ) : isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}
        </Button>
        <Button
          use="unstyled"
          onClick={onStop}
          className="playback-bar__button playback-bar__button--stop"
          aria-label="Stop"
          disabled={!isPlaying}
        >
          <Square size={16} />
        </Button>
      </div>

      <div className="playback-bar__info">
        <Radio size={16} className="playback-bar__icon" />
        <div className="playback-bar__meta">
          {isPlaying && streamName ? (
            <span className="playback-bar__stream">{streamName}</span>
          ) : (
            <span className="playback-bar__stream playback-bar__stream--idle">
              No audio playing
            </span>
          )}
          {isPlaying && timestamp ? (
            <Timestamp
              value={timestamp}
              className="playback-bar__timestamp"
              showDate
              dateClassName="ms-1"
            />
          ) : null}
        </div>
      </div>

      <div className="playback-bar__waveform">
        {isPlaying && waveform && duration ? (
          <WaveformDisplay
            waveform={waveform}
            duration={duration}
            currentTime={currentPlayTime}
            speechStart={speechStartOffset}
            speechEnd={speechEndOffset}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            height={40}
            segments={segments}
            transcriptionId={transcriptionId}
          />
        ) : (
          <div className="playback-bar__empty">
            Click play on any transcription to listen
          </div>
        )}
      </div>

      <div className="playback-bar__volume">
        <Button
          use="unstyled"
          onClick={onToggleMute}
          className="playback-bar__volume-button"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="playback-bar__volume-slider"
          aria-label="Volume"
        />
      </div>
    </div>
  );
};

export default PlaybackBar;
