import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useLiveAudio } from "../hooks/useLiveAudio";
import { createFaviconState } from "../utils/faviconState";

export interface LiveAudioStreamDescriptor {
  id: string;
  name: string;
  baseUrl: string;
  canListen: boolean;
  url?: string | null;
}

interface LiveAudioContextValue {
  activeStream: LiveAudioStreamDescriptor | null;
  isListening: boolean;
  error: string | null;
  listen: (descriptor: LiveAudioStreamDescriptor) => void;
  stop: () => void;
  isActiveStream: (streamId: string) => boolean;
  streamNonce: string | null;
  source: string;
  audioRef: (node: HTMLAudioElement | null) => void;
  onReady: () => void;
  onPlay: () => void;
  onError: () => void;
}

const LiveAudioContext = createContext<LiveAudioContextValue | undefined>(
  undefined,
);

interface LiveAudioProviderProps {
  children: ReactNode;
}

export const LiveAudioProvider = ({ children }: LiveAudioProviderProps) => {
  const [activeStream, setActiveStream] =
    useState<LiveAudioStreamDescriptor | null>(null);
  const [pendingAction, setPendingAction] = useState<"start" | "stop" | null>(null);

  const liveAudio = useLiveAudio(Boolean(activeStream?.canListen), activeStream?.baseUrl ?? "");
  const faviconStateRef = useRef(createFaviconState());

  useEffect(() => {
    const faviconState = faviconStateRef.current;

    if (liveAudio.isListening) {
      faviconState.set("/favicon-live.svg");
    } else {
      faviconState.reset();
    }

    return () => {
      faviconState.reset();
    };
  }, [liveAudio.isListening]);

  useEffect(() => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction === "stop") {
      liveAudio.stop();
      setActiveStream(null);
      setPendingAction(null);
      return;
    }

    if (pendingAction === "start") {
      if (!activeStream) {
        setPendingAction(null);
        return;
      }
      liveAudio.start();
      setPendingAction(null);
    }
  }, [pendingAction, liveAudio, activeStream]);

  const listen = useCallback(
    (descriptor: LiveAudioStreamDescriptor) => {
      if (!descriptor.canListen) {
        console.info("[live-audio] listen skipped; stream unavailable", {
          streamId: descriptor.id,
        });
        return;
      }
      setActiveStream((current) => {
        if (current && current.id === descriptor.id) {
          return descriptor;
        }
        return descriptor;
      });
      setPendingAction("start");
    },
    [],
  );

  const stop = useCallback(() => {
    if (!liveAudio.isListening) {
      setActiveStream(null);
      setPendingAction(null);
      return;
    }
    setPendingAction("stop");
  }, [liveAudio.isListening]);

  const isActiveStream = useCallback(
    (streamId: string) => activeStream?.id === streamId,
    [activeStream],
  );

  const contextValue = useMemo<LiveAudioContextValue>(
    () => ({
      activeStream,
      isListening: liveAudio.isListening,
      error: liveAudio.error,
      listen,
      stop,
      isActiveStream,
      streamNonce: liveAudio.streamNonce,
      source: liveAudio.source,
      audioRef: liveAudio.audioRef,
      onReady: liveAudio.onReady,
      onPlay: liveAudio.onPlay,
      onError: liveAudio.onError,
    }),
    [activeStream, isActiveStream, listen, liveAudio, stop],
  );

  return (
    <LiveAudioContext.Provider value={contextValue}>
      {children}
      <audio
        ref={liveAudio.audioRef}
        className="visually-hidden"
        autoPlay
        preload="none"
        src={liveAudio.source}
        data-live-session={liveAudio.streamNonce ?? undefined}
        data-live-stream-id={activeStream?.id ?? undefined}
        onLoadedMetadata={liveAudio.onReady}
        onCanPlay={liveAudio.onReady}
        onPlay={liveAudio.onPlay}
        onPlaying={liveAudio.onPlay}
        onError={liveAudio.onError}
      />
    </LiveAudioContext.Provider>
  );
};

export const useLiveAudioSession = (): LiveAudioContextValue => {
  const context = useContext(LiveAudioContext);
  if (!context) {
    throw new Error("useLiveAudioSession must be used within a LiveAudioProvider");
  }
  return context;
};

export default LiveAudioContext;
