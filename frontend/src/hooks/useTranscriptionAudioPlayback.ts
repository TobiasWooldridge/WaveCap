import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptionResult } from "@types";
import {
  advancePlaybackQueue,
  getRecordingElementId,
  type PlaybackQueueState,
} from "../components/StreamTranscriptionPanel.logic";
import { setAudioElementSource } from "../utils/audio";

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

  const playbackQueueRef = useRef<PlaybackQueueState | null>(null);
  const playingRecordingRef = useRef<string | null>(null);
  const playingTranscriptionIdRef = useRef<string | null>(null);
  const playingSegmentRef = useRef<string | null>(null);

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

  useEffect(() => {
    playbackQueueRef.current = playbackQueue;
  }, [playbackQueue]);

  const resetAudioPlaybackState = useCallback(
    (audio: HTMLAudioElement | null, options?: { clearQueue?: boolean }) => {
      if (audio) {
        audio.loop = false;
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
      }
      setPlayingRecording(null);
      setPlayingTranscriptionId(null);
      setPlayingSegment(null);
      setCurrentPlayTime(0);
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
    (transcription: TranscriptionResult, options?: { queue?: PlaybackQueueState }) => {
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
      const startOffset = Math.max(0, transcription.recordingStartOffset ?? 0);

      const currentRecordingId = playingRecordingRef.current;
      const currentTranscriptionId = playingTranscriptionIdRef.current;
      if (currentRecordingId === recordingId && currentTranscriptionId === transcription.id) {
        stopCurrentRecording();
        audio.currentTime = startOffset;
        return;
      }

      if (currentRecordingId && currentRecordingId !== recordingId) {
        stopCurrentRecording();
      }

      if (options?.queue) {
        setPlaybackQueue(options.queue);
      } else {
        setPlaybackQueue(null);
      }

      setPlayingRecording(recordingId);
      setPlayingTranscriptionId(transcription.id);
      setPlayingSegment(null);

      const handleEnded = () => {
        const advance = advancePlaybackQueue(playbackQueueRef.current, transcription);
        if (advance) {
          resetAudioPlaybackState(audio, { clearQueue: false });
          setPlaybackQueue(advance.nextQueue);
          setTimeout(() => {
            playRecording(advance.nextTranscription, { queue: advance.nextQueue });
          }, 0);
          return;
        }
        resetAudioPlaybackState(audio);
      };

      const handleError = (error: Event | string) => {
        console.error("❌ Error playing audio:", error);
        resetAudioPlaybackState(audio);
      };

      const updateTime = () => setCurrentPlayTime(audio.currentTime);

      const startPlayback = () => {
        audio.loop = false;
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
        const onReady = () => {
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("canplay", onReady);
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

      setAudioElementSource(audio, recordingUrl);

      const safeStart = typeof startTime === "number" && Number.isFinite(startTime) ? startTime : null;
      const safeEnd = typeof endTime === "number" && Number.isFinite(endTime) ? endTime : null;
      const recordingOffset =
        typeof options?.recordingStartOffset === "number" && Number.isFinite(options.recordingStartOffset)
          ? Math.max(0, options.recordingStartOffset)
          : null;

      const playbackStart = safeStart !== null && safeStart > 0 ? safeStart : (recordingOffset ?? (safeStart !== null ? Math.max(0, safeStart) : 0));
      const segmentDuration = safeEnd !== null && safeStart !== null ? Math.max(0, safeEnd - safeStart) : null;

      let playbackEnd = segmentDuration !== null ? playbackStart + segmentDuration : safeEnd !== null && safeEnd > playbackStart ? safeEnd : playbackStart;
      if (!Number.isFinite(playbackEnd)) playbackEnd = playbackStart;
      if (playbackEnd <= playbackStart) playbackEnd = playbackStart + 0.25;

      const segmentKey = `${recordingId}-${startTime ?? playbackStart}-${endTime ?? playbackEnd}`;

      setPlaybackQueue(null);
      setPlayingRecording(recordingId);
      setPlayingTranscriptionId(transcriptionId);
      setPlayingSegment(segmentKey);

      const handleError = (error: Event | string) => {
        console.error("❌ Error playing audio:", error);
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
        const onReady = () => {
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("canplay", onReady);
          startPlayback();
        };
        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("canplay", onReady, { once: true });
        if (audio.readyState === 0) audio.load();
      }
    },
    [resetAudioPlaybackState, setPlaybackQueue, setPlayingRecording, setPlayingSegment, setPlayingTranscriptionId],
  );

  return {
    recordingAudioRefs,
    playingRecording,
    playingTranscriptionId,
    playingSegment,
    currentPlayTime,
    playbackQueue,
    playRecording,
    playSegment,
    stopCurrentRecording,
    isSegmentCurrentlyPlaying,
  };
};

export default useTranscriptionAudioPlayback;
