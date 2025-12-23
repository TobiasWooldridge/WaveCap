import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptionResult } from "@types";
import {
  advancePlaybackQueue,
  getRecordingElementId,
  type PlaybackQueueState,
} from "../components/StreamTranscriptionPanel.logic";
import { setAudioElementSource } from "../utils/audio";
import { computePlaybackRange } from "../utils/playback";

const VOLUME_STORAGE_KEY = "wavecap-playback-volume";
const PRE_MUTE_VOLUME_KEY = "wavecap-pre-mute-volume";
const DEFAULT_VOLUME = 1.0;

function getStoredVolume(): number {
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch {
    // localStorage may be unavailable
  }
  return DEFAULT_VOLUME;
}

function storeVolume(volume: number): void {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
  } catch {
    // localStorage may be unavailable
  }
}

function getStoredPreMuteVolume(): number | null {
  try {
    const stored = localStorage.getItem(PRE_MUTE_VOLUME_KEY);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch {
    // localStorage may be unavailable
  }
  return null;
}

function storePreMuteVolume(volume: number | null): void {
  try {
    if (volume === null) {
      localStorage.removeItem(PRE_MUTE_VOLUME_KEY);
    } else {
      localStorage.setItem(PRE_MUTE_VOLUME_KEY, volume.toString());
    }
  } catch {
    // localStorage may be unavailable
  }
}

export interface SegmentPlayOptions {
  recordingStartOffset?: number;
}

export interface UseTranscriptionAudioPlayback {
  recordingAudioRefs: React.MutableRefObject<Record<string, HTMLAudioElement | null>>;
  playingRecording: string | null;
  playingTranscriptionId: string | null;
  playingSegment: string | null;
  currentPlayTime: number;
  playbackQueue: PlaybackQueueState | null;
  volume: number;
  isMuted: boolean;
  isLoadingAudio: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playRecording: (
    transcription: TranscriptionResult,
    options?: { queue?: PlaybackQueueState },
  ) => void;
  playSegment: (
    recordingUrl: string | undefined,
    startTime: number | null | undefined,
    endTime: number | null | undefined,
    transcriptionId: string,
    options?: SegmentPlayOptions,
  ) => void;
  stopCurrentRecording: () => void;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string | undefined,
    startTime: number,
    endTime: number,
  ) => boolean;
}

export const useTranscriptionAudioPlayback = (): UseTranscriptionAudioPlayback => {
  const recordingAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const [playingRecording, _setPlayingRecording] = useState<string | null>(null);
  const [playingTranscriptionId, _setPlayingTranscriptionId] = useState<string | null>(null);
  const [playingSegment, _setPlayingSegment] = useState<string | null>(null);
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(0);
  const [playbackQueue, _setPlaybackQueue] = useState<PlaybackQueueState | null>(null);
  const [volume, _setVolume] = useState<number>(getStoredVolume);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const volumeRef = useRef<number>(volume);

  const playbackQueueRef = useRef<PlaybackQueueState | null>(null);
  const playingRecordingRef = useRef<string | null>(null);
  const playingTranscriptionIdRef = useRef<string | null>(null);
  const playingSegmentRef = useRef<string | null>(null);
  // Ref to hold the latest playRecording function for use in handleEnded callback
  const playRecordingRef = useRef<((transcription: TranscriptionResult, options?: { queue?: PlaybackQueueState; isQueueTransition?: boolean }) => void) | null>(null);

  const setPlayingRecording = useCallback((value: string | null) => {
    playingRecordingRef.current = value;
    _setPlayingRecording(value);
  }, []);

  const setPlayingTranscriptionId = useCallback((value: string | null) => {
    playingTranscriptionIdRef.current = value;
    _setPlayingTranscriptionId(value);
  }, []);

  const setPlayingSegment = useCallback((value: string | null) => {
    playingSegmentRef.current = value;
    _setPlayingSegment(value);
  }, []);

  const setPlaybackQueue = useCallback((queue: PlaybackQueueState | null) => {
    playbackQueueRef.current = queue;
    _setPlaybackQueue(queue);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    volumeRef.current = clampedVolume;
    _setVolume(clampedVolume);
    storeVolume(clampedVolume);
    // Clear pre-mute volume when user explicitly sets volume to non-zero
    if (clampedVolume > 0) {
      storePreMuteVolume(null);
    }
    // Apply to all audio elements
    Object.values(recordingAudioRefs.current).forEach((audio) => {
      if (audio) {
        audio.volume = clampedVolume;
      }
    });
  }, []);

  const isMuted = volume === 0;

  const toggleMute = useCallback(() => {
    if (isMuted) {
      // Unmute: restore previous volume or default to 1.0
      const preMuteVolume = getStoredPreMuteVolume() ?? DEFAULT_VOLUME;
      storePreMuteVolume(null);
      setVolume(preMuteVolume);
    } else {
      // Mute: save current volume and set to 0
      storePreMuteVolume(volume);
      const clampedVolume = 0;
      volumeRef.current = clampedVolume;
      _setVolume(clampedVolume);
      storeVolume(clampedVolume);
      // Apply to all audio elements
      Object.values(recordingAudioRefs.current).forEach((audio) => {
        if (audio) {
          audio.volume = clampedVolume;
        }
      });
    }
  }, [isMuted, volume, setVolume]);

  useEffect(() => {
    playbackQueueRef.current = playbackQueue;
  }, [playbackQueue]);

  const resetAudioPlaybackState = useCallback(
    (audio: HTMLAudioElement | null, options?: { clearQueue?: boolean; keepPlayTime?: boolean }) => {
      if (audio) {
        audio.loop = false;
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
      }
      setPlayingRecording(null);
      setPlayingTranscriptionId(null);
      setPlayingSegment(null);
      setIsLoadingAudio(false);
      if (!options?.keepPlayTime) {
        setCurrentPlayTime(0);
      }
      if (options?.clearQueue ?? true) {
        setPlaybackQueue(null);
      }
    },
    [setPlaybackQueue, setPlayingRecording, setPlayingTranscriptionId, setPlayingSegment],
  );

  const stopCurrentRecording = useCallback(() => {
    const currentRecordingId = playingRecordingRef.current;
    if (!currentRecordingId) return;
    const currentAudio = recordingAudioRefs.current[currentRecordingId] ?? null;
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch {
        /* ignore */
      }
    }
    resetAudioPlaybackState(currentAudio, { clearQueue: true });
  }, [resetAudioPlaybackState]);

  useEffect(() => () => stopCurrentRecording(), [stopCurrentRecording]);

  const isSegmentCurrentlyPlaying = useCallback(
    (recordingUrl: string | undefined, startTime: number, endTime: number) => {
      if (!recordingUrl || !playingRecordingRef.current) return false;
      const recordingId = getRecordingElementId(recordingUrl);
      if (playingRecordingRef.current !== recordingId) return false;
      const time = typeof currentPlayTime === "number" ? currentPlayTime : 0;
      return time >= startTime && time <= endTime;
    },
    [currentPlayTime],
  );

  const playRecording = useCallback(
    (transcription: TranscriptionResult, options?: { queue?: PlaybackQueueState; isQueueTransition?: boolean }) => {
      if (!transcription.recordingUrl) {
        console.warn("⚠️ No recording available for this transcription");
        return;
      }

      const recordingId = getRecordingElementId(transcription.recordingUrl);
      const audio = recordingAudioRefs.current[recordingId] ?? null;
      if (!audio) {
        console.error(`❌ Audio element not found: ${recordingId}`);
        return;
      }

      setAudioElementSource(audio, transcription.recordingUrl);
      // Prefer speechStartOffset for instant speech playback, fall back to recordingStartOffset
      const startOffset = Math.max(
        0,
        transcription.speechStartOffset ?? transcription.recordingStartOffset ?? 0,
      );

      const currentRecordingId = playingRecordingRef.current;
      const currentTranscriptionId = playingTranscriptionIdRef.current;
      if (currentRecordingId === recordingId && currentTranscriptionId === transcription.id) {
        stopCurrentRecording();
        audio.currentTime = startOffset;
        return;
      }

      // During queue transitions, just pause the old audio without full reset
      if (currentRecordingId && currentRecordingId !== recordingId) {
        if (options?.isQueueTransition) {
          // Just pause without resetting state
          const oldAudio = recordingAudioRefs.current[currentRecordingId];
          if (oldAudio) {
            try {
              oldAudio.pause();
            } catch {
              /* ignore */
            }
          }
        } else {
          stopCurrentRecording();
        }
      }

      if (options?.queue) {
        setPlaybackQueue(options.queue);
      } else if (!options?.isQueueTransition) {
        setPlaybackQueue(null);
      }

      setPlayingRecording(recordingId);
      setPlayingTranscriptionId(transcription.id);
      setPlayingSegment(null);

      const handleEnded = () => {
        const queue = playbackQueueRef.current;
        const advance = advancePlaybackQueue(queue, transcription);
        if (advance) {
          // Clean up current audio handlers but keep play time during transition
          if (audio) {
            audio.ontimeupdate = null;
            audio.onended = null;
            audio.onerror = null;
          }
          // Use ref to get latest playRecording function (avoid stale closure)
          if (playRecordingRef.current) {
            playRecordingRef.current(advance.nextTranscription, { queue: advance.nextQueue, isQueueTransition: true });
          } else {
            console.error("❌ playRecordingRef.current is null, cannot advance queue");
            resetAudioPlaybackState(audio);
          }
          return;
        }
        // No more items in queue, or queue was cleared
        resetAudioPlaybackState(audio);
      };

      const handleError = (error: Event | string) => {
        console.error("❌ Error playing audio:", error);
        try {
          const globalAny = window as unknown as { __smartSpeakerShowToast?: (opts: { id?: string; title?: string; message: string; variant?: "success" | "error" | "info" }) => string };
          globalAny.__smartSpeakerShowToast?.({
            title: "Playback error",
            message: "Audio clip not available (file missing).",
            variant: "error",
          });
        } catch {
          /* ignore toast errors */
        }
        resetAudioPlaybackState(audio);
      };

      const updateTime = () => setCurrentPlayTime(audio.currentTime);

      const startPlayback = () => {
        audio.loop = false;
        audio.volume = volumeRef.current;
        audio.currentTime = startOffset;
        setCurrentPlayTime(startOffset);
        audio.ontimeupdate = updateTime;
        audio.onended = handleEnded;
        audio.onerror = handleError;
        audio.play().catch((error) => {
          console.error("❌ Error starting audio playback:", error);
          resetAudioPlaybackState(audio);
        });
      };

      if (audio.readyState >= 2) {
        startPlayback();
      } else {
        setIsLoadingAudio(true);
        const onReady = () => {
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("canplay", onReady);
          setIsLoadingAudio(false);
          startPlayback();
        };
        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("canplay", onReady, { once: true });
        if (audio.readyState === 0) {
          audio.load();
        }
      }
    },
    [resetAudioPlaybackState, setPlaybackQueue, setPlayingRecording, setPlayingSegment, setPlayingTranscriptionId, stopCurrentRecording],
  );

  // Keep ref updated with latest playRecording function (synchronous to avoid timing issues)
  playRecordingRef.current = playRecording;

  const playSegment = useCallback(
    (
      recordingUrl: string | undefined,
      startTime: number | null | undefined,
      endTime: number | null | undefined,
      transcriptionId: string,
      options?: SegmentPlayOptions,
    ) => {
      if (!recordingUrl) return;

      const recordingId = getRecordingElementId(recordingUrl);
      const audio = recordingAudioRefs.current[recordingId] ?? null;
      if (!audio) {
        console.error(`❌ Audio element not found: ${recordingId}`);
        return;
      }

      // Ensure only one audio element plays at a time. If another recording is
      // currently playing, stop it before starting this segment.
      const currentRecordingId = playingRecordingRef.current;
      if (currentRecordingId && currentRecordingId !== recordingId) {
        stopCurrentRecording();
      }

      const { start: playbackStart, end: playbackEnd } = computePlaybackRange(
        startTime ?? null,
        endTime ?? null,
        options?.recordingStartOffset ?? null,
      );

      const normalizedStart = startTime ?? playbackStart;
      const normalizedEnd = endTime ?? playbackEnd;
      const segmentKey = `${recordingId}-${normalizedStart}-${normalizedEnd}`;

      if (
        playingRecordingRef.current === recordingId &&
        playingSegmentRef.current === segmentKey
      ) {
        stopCurrentRecording();
        return;
      }

      setAudioElementSource(audio, recordingUrl);

      setPlaybackQueue(null);
      setPlayingRecording(recordingId);
      setPlayingTranscriptionId(transcriptionId);
      setPlayingSegment(segmentKey);

      const handleError = (error: Event | string) => {
        console.error("❌ Error playing audio:", error);
        try {
          const globalAny = window as unknown as { __smartSpeakerShowToast?: (opts: { id?: string; title?: string; message: string; variant?: "success" | "error" | "info" }) => string };
          globalAny.__smartSpeakerShowToast?.({
            title: "Playback error",
            message: "Audio clip not available (file missing).",
            variant: "error",
          });
        } catch {
          /* ignore toast errors */
        }
        resetAudioPlaybackState(audio);
      };

      const handleSegmentTimeUpdate = () => {
        const nextTime = audio.currentTime;
        setCurrentPlayTime(nextTime);
        const completionThreshold = Math.max(playbackStart, playbackEnd - 0.05);
        if (nextTime >= completionThreshold && playingSegmentRef.current === segmentKey) {
          setPlayingSegment(null);
        }
      };

      const handleEnded = () => resetAudioPlaybackState(audio);

      const startPlayback = () => {
        audio.loop = false;
        audio.volume = volumeRef.current;
        audio.currentTime = Math.max(0, playbackStart);
        setCurrentPlayTime(Math.max(0, playbackStart));
        audio.ontimeupdate = handleSegmentTimeUpdate;
        audio.onended = handleEnded;
        audio.onerror = handleError;
        audio.play().catch((error) => {
          console.error("❌ Error starting audio playback:", error);
          resetAudioPlaybackState(audio);
        });
      };

      if (audio.readyState >= 2) {
        startPlayback();
      } else {
        setIsLoadingAudio(true);
        const onReady = () => {
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("canplay", onReady);
          setIsLoadingAudio(false);
          startPlayback();
        };
        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("canplay", onReady, { once: true });
        if (audio.readyState === 0) audio.load();
      }
    },
    [resetAudioPlaybackState, setPlaybackQueue, setPlayingRecording, setPlayingSegment, setPlayingTranscriptionId, stopCurrentRecording],
  );

  return {
    recordingAudioRefs,
    playingRecording,
    playingTranscriptionId,
    playingSegment,
    currentPlayTime,
    playbackQueue,
    volume,
    isMuted,
    isLoadingAudio,
    setVolume,
    toggleMute,
    playRecording,
    playSegment,
    stopCurrentRecording,
    isSegmentCurrentlyPlaying,
  };
};

export default useTranscriptionAudioPlayback;
