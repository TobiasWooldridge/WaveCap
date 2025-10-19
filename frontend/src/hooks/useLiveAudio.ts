import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  start: () => void;
  stop: () => void;
  onReady: () => void;
  onPlay: () => void;
  onError: () => void;
  cleanup: () => void;
  streamNonce: string | null;
  source: string;
}

export const useLiveAudio = (
  canListen: boolean,
  baseUrl: string,
): UseLiveAudioResult => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<HTMLAudioElement | null>(null);
  const [attachVersion, setAttachVersion] = useState(0);
  const [streamNonce, setStreamNonce] = useState<string | null>(null);
  const source = useMemo(() => {
    if (!baseUrl) return "";
    const url = new URL(baseUrl, window.location.origin);
    if (streamNonce) {
      url.searchParams.set("session", streamNonce);
    }
    // Always return an absolute URL to avoid origin/BASE href pitfalls
    return url.toString();
  }, [baseUrl, streamNonce]);

  const setAudio = useCallback((node: HTMLAudioElement | null) => {
    elementRef.current = node;
    if (node) {
      console.info("[live-audio] element attached", {
        canPlayType: node.canPlayType("audio/wav"),
      });
      setAttachVersion((prev) => prev + 1);
    } else {
      console.info("[live-audio] element detached");
      setAttachVersion((prev) => prev + 1);
    }
  }, []);

  const cleanup = useCallback(() => {
    const audio = elementRef.current;
    if (!audio) return;
    console.info("[live-audio] cleanup invoked");
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    if (!canListen) {
      console.info("[live-audio] start skipped", { canListen });
      return;
    }
    setIsListening(true);
    setStreamNonce(`${Date.now()}`);
    setError(null);
    console.info("[live-audio] start requested", { canListen });
  }, [canListen]);

  const stop = useCallback(() => {
    if (!isListening) {
      setStreamNonce(null);
      setError(null);
      return;
    }
    console.info("[live-audio] stop requested");
    setIsListening(false);
    setStreamNonce(null);
    setError(null);
    cleanup();
  }, [cleanup, isListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
      return;
    }
    start();
  }, [isListening, start, stop]);

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
    console.debug("[live-audio] ready event fired");
    syncToLiveEdge();
  }, [syncToLiveEdge]);

  const onPlay = useCallback(() => {
    setError(null);
    console.info("[live-audio] playback started");
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
    if (!audio) {
      console.debug("[live-audio] awaiting audio element attachment");
      return;
    }
    if (source) {
      const absoluteSrc = new URL(source, window.location.origin).toString();
      const needsUpdate = audio.src !== absoluteSrc;
      if (needsUpdate) {
        console.info("[live-audio] updating audio src", { source });
        audio.src = source;
      }
      console.info("[live-audio] loading audio", { needsUpdate, absoluteSrc });
      audio.load();
    }
    if (streamNonce) {
      console.info("[live-audio] initiating playback", { streamNonce });
    }
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((err) =>
        console.warn("⚠️ Live audio playback was blocked by the browser:", err),
      );
    }
  }, [isListening, source, streamNonce, attachVersion]);

  useEffect(() => {
    if (isListening && !canListen) {
      setIsListening(false);
    }
  }, [canListen, isListening]);

  useEffect(() => cleanup, [cleanup]);

  return {
    isListening,
    error,
    audioRef: setAudio,
    toggle,
    start,
    stop,
    onReady,
    onPlay,
    onError,
    cleanup,
    streamNonce,
    source,
  };
};

export default useLiveAudio;
