import { useCallback, useEffect, useRef, useState } from "react";

const describeMediaError = (error: MediaError | null): string => {
  if (!error) return "Unable to play live audio.";
  switch (error.code) {
    case 1:
      return "Live audio playback was aborted.";
    case 2:
      return "Network error interrupted the live audio stream.";
    case 3:
      return "The browser could not decode the live audio stream.";
    case 4:
      return "Live audio stream format is not supported by this browser.";
    default:
      return "Unable to play live audio.";
  }
};

export interface UseLiveAudioResult {
  isListening: boolean;
  error: string | null;
  audioRef: (node: HTMLAudioElement | null) => void;
  toggle: () => void;
  onReady: () => void;
  onPlay: () => void;
  onError: () => void;
  cleanup: () => void;
}

export const useLiveAudio = (
  canListen: boolean,
): UseLiveAudioResult => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<HTMLAudioElement | null>(null);

  const setAudio = useCallback((node: HTMLAudioElement | null) => {
    elementRef.current = node;
  }, []);

  const toggle = useCallback(() => {
    if (!canListen) return;
    setIsListening((prev) => !prev);
    setError(null);
  }, [canListen]);

  const syncToLiveEdge = useCallback(() => {
    const audio = elementRef.current;
    if (!audio) return;
    try {
      const { seekable } = audio;
      if (!seekable || seekable.length === 0) return;
      const lastIndex = seekable.length - 1;
      const liveEdge = seekable.end(lastIndex);
      if (!Number.isFinite(liveEdge)) return;
      const diff = Math.abs(audio.currentTime - liveEdge);
      if (diff < 1) return;
      audio.currentTime = liveEdge;
    } catch (err) {
      console.warn("⚠️ Unable to synchronize live audio position:", err);
    }
  }, []);

  const onReady = useCallback(() => {
    syncToLiveEdge();
  }, [syncToLiveEdge]);

  const onPlay = useCallback(() => {
    setError(null);
    syncToLiveEdge();
  }, [syncToLiveEdge]);

  const onError = useCallback(() => {
    const audio = elementRef.current;
    const message = describeMediaError(audio?.error ?? null);
    if (audio?.error) {
      console.error("❌ Live audio playback error:", audio.error);
    }
    setError(message);
  }, []);

  useEffect(() => {
    if (!isListening) return;
    const audio = elementRef.current;
    if (!audio) return;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((err) =>
        console.warn("⚠️ Live audio playback was blocked by the browser:", err),
      );
    }
  }, [isListening]);

  useEffect(() => {
    if (isListening && !canListen) {
      setIsListening(false);
    }
  }, [canListen, isListening]);

  const cleanup = useCallback(() => {
    const audio = elementRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      /* ignore */
    }
    elementRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  return { isListening, error, audioRef: setAudio, toggle, onReady, onPlay, onError, cleanup };
};

export default useLiveAudio;
