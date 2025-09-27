import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  cloneElement,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Radio,
  Clock,
  Activity,
  Target,
  BarChart3,
  Play,
  Pause,
  Volume2,
  RotateCcw,
  Search,
  CalendarClock,
  Loader2,
  X,
  AlertTriangle,
  MicOff,
  Wifi,
  WifiOff,
  Download,
  MapPin,
} from "lucide-react";
import {
  Stream,
  TranscriptionResult,
  TranscriptionQueryResponse,
  TranscriptionReviewStatus,
} from "@types";
import { useAuth } from "../contexts/AuthContext";
import { TranscriptionReviewControls } from "./TranscriptionReviewControls.react";
import {
  buildPlaybackQueue,
  advancePlaybackQueue,
  dedupeAndSortTranscriptions,
  getRecordingElementId,
  prepareTranscriptions,
  selectVisibleTranscriptions,
  type PlaybackQueueState,
  type TranscriptionGroup,
} from "./StreamTranscriptionPanel.logic";
import {
  condensePagerTranscriptions,
  type CondensedPagerMessage,
} from "../utils/pagerMessages";
import { calculatePerformanceMetrics } from "../hooks/usePerformance";
import { useUISettings } from "../contexts/UISettingsContext";
import { useAutoScroll } from "../hooks/useAutoScroll";
import {
  getNotifiableAlerts,
  isBlankAudioText,
  isSystemTranscription,
} from "../utils/transcriptions";
import { setAudioElementSource } from "../utils/audio";
import { StreamTranscriptList } from "./StreamTranscriptList.react";
import { Timestamp } from "./primitives/Timestamp.react";
import Button from "./primitives/Button.react";
import ButtonGroup from "./primitives/ButtonGroup.react";
import { TranscriptionSegmentChips } from "./TranscriptionSegmentChips.react";
import "./StreamTranscriptionPanel.scss";

export interface StandaloneStreamControls {
  streamId: string;
  statusLabel: string;
  statusModifier: "transcribing" | "queued" | "error" | "stopped";
  isLiveListening: boolean;
  canListenLive: boolean;
  canReset: boolean;
  liveAudioError: string | null;
  onToggleLiveListening: () => void;
  onReset: () => void;
  toolButtons: ReactNode | null;
  dialogs: ReactNode[];
}

type StandaloneTool = "search" | "jump" | "stats";

interface StreamTranscriptionPanelProps {
  streams: Stream[];
  onResetStream: (streamId: string) => void;
  onReviewTranscription: (
    transcriptionId: string,
    updates: {
      correctedText?: string | null;
      reviewStatus: TranscriptionReviewStatus;
      reviewer?: string | null;
    },
  ) => Promise<unknown>;
  focusStreamId?: string;
  onStandaloneControlsChange?: (
    controls: StandaloneStreamControls | null,
  ) => void;
  onExportPagerFeed?: () => Promise<void> | void;
  onSelectPagerExportStream?: (streamId: string) => void;
  pagerExporting?: boolean;
}

const INITIAL_HISTORY_WINDOW_MINUTES = 180;
const HISTORY_FETCH_LIMIT = 50;
const MAX_SEARCH_RESULTS = 100;
const DEFAULT_FOCUS_WINDOW_MINUTES = 10;
const describeMediaError = (error: MediaError | null): string => {
  if (!error) {
    return "Unable to play live audio.";
  }

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

interface StreamHistoryState {
  transcriptions: TranscriptionResult[];
  hasMoreBefore: boolean;
  loading: boolean;
  error: string | null;
}

interface StreamSearchState {
  query: string;
  results: TranscriptionResult[];
  loading: boolean;
  error: string | null;
}

interface FocusWindowState {
  anchor: string | null;
  windowMinutes: number;
  transcriptions: TranscriptionResult[];
  loading: boolean;
  error: string | null;
}

const toDatetimeLocalValue = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDurationSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }

  if (seconds < 60) {
    const rounded = seconds.toFixed(seconds >= 10 ? 0 : 1);
    return `${rounded.replace(/\.0$/, "")}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const roundedSeconds = remainingSeconds.toFixed(
    remainingSeconds >= 10 ? 0 : 1,
  );

  if (Number(roundedSeconds) === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${roundedSeconds.replace(/\.0$/, "")}s`;
};

const clampAccuracyPercentage = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
};

const INITIAL_HISTORY_WINDOW_MS = INITIAL_HISTORY_WINDOW_MINUTES * 60 * 1000;

const FALLBACK_VISIBLE_TRANSCRIPTION_COUNT = 10;

const isPagerStream = (stream: Stream): boolean => {
  return (stream.source ?? "audio") === "pager";
};

const sanitizeStreamId = (streamId: string) =>
  streamId.replace(/[^a-zA-Z0-9_-]/g, "-");

const buildPagerWebhookPath = (stream: Stream): string | null => {
  if (!isPagerStream(stream)) {
    return null;
  }
  const base = stream.url ?? "";
  const token = stream.webhookToken;
  if (!base && !token) {
    return null;
  }
  const suffix = token ? `${base.includes("?") ? "&" : "?"}token=${token}` : "";
  return `${base}${suffix}`;
};

export const StreamTranscriptionPanel = ({
  streams,
  onResetStream,
  onReviewTranscription,
  focusStreamId,
  onStandaloneControlsChange,
  onExportPagerFeed,
  onSelectPagerExportStream,
  pagerExporting = false,
}: StreamTranscriptionPanelProps) => {
  const { authFetch, role, authenticated, requiresPassword } = useAuth();
  const isReadOnly = role !== "editor";
  const canViewWebhookDetails =
    !isReadOnly && (authenticated || !requiresPassword);
  const [expandedStreams, setExpandedStreams] = useState<Set<string>>(
    new Set(),
  );
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [playingTranscriptionId, setPlayingTranscriptionId] = useState<
    string | null
  >(null);
  const [playingSegment, setPlayingSegment] = useState<string | null>(null);
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(0);
  const [playbackQueue, setPlaybackQueue] = useState<PlaybackQueueState | null>(
    null,
  );
  const playbackQueueRef = useRef<PlaybackQueueState | null>(null);
  const playingRecordingRef = useRef<string | null>(null);
  const playingTranscriptionIdRef = useRef<string | null>(null);
  const playingSegmentRef = useRef<string | null>(null);
  // Track playback state in refs so event callbacks always see the latest values.
  // Without this the auto-advance logic would read stale state between renders,
  // treat queued clips as "new" recordings, and clear the playback queue.
  const updatePlayingRecording = useCallback(
    (value: string | null) => {
      playingRecordingRef.current = value;
      setPlayingRecording(value);
    },
    [setPlayingRecording],
  );
  const updatePlayingTranscriptionId = useCallback(
    (value: string | null) => {
      playingTranscriptionIdRef.current = value;
      setPlayingTranscriptionId(value);
    },
    [setPlayingTranscriptionId],
  );
  const updatePlayingSegment = useCallback(
    (value: string | null) => {
      playingSegmentRef.current = value;
      setPlayingSegment(value);
    },
    [setPlayingSegment],
  );
  const updatePlaybackQueue = useCallback(
    (queue: PlaybackQueueState | null) => {
      playbackQueueRef.current = queue;
      setPlaybackQueue(queue);
    },
    [setPlaybackQueue],
  );
  const [historyByStream, setHistoryByStream] = useState<
    Record<string, StreamHistoryState>
  >({});
  const [searchInputByStream, setSearchInputByStream] = useState<
    Record<string, string>
  >({});
  const [searchStateByStream, setSearchStateByStream] = useState<
    Record<string, StreamSearchState>
  >({});
  const [jumpTimestampByStream, setJumpTimestampByStream] = useState<
    Record<string, string>
  >({});
  const [jumpWindowByStream, setJumpWindowByStream] = useState<
    Record<string, number>
  >({});
  const [focusByStream, setFocusByStream] = useState<
    Record<string, FocusWindowState>
  >({});
  const [liveListeningByStream, setLiveListeningByStream] = useState<
    Record<string, boolean>
  >({});
  const [liveAudioErrorByStream, setLiveAudioErrorByStream] = useState<
    Record<string, string | null>
  >({});
  const [openPagerMessageIds, setOpenPagerMessageIds] = useState<
    Record<string, boolean>
  >({});
  const [activeSearchPanelStreamId, setActiveSearchPanelStreamId] = useState<
    string | null
  >(null);
  const [openStandaloneTool, setOpenStandaloneTool] =
    useState<StandaloneTool | null>(null);
  const liveAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const recordingAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const togglePagerMessageFragments = useCallback((messageId: string) => {
    setOpenPagerMessageIds((previous) => ({
      ...previous,
      [messageId]: !previous[messageId],
    }));
  }, []);

  const shouldAutoScrollFocusedView = Boolean(focusStreamId);
  const {
    attachRef: attachFocusedViewRef,
    notifyContentChanged: notifyFocusedViewContentChanged,
    scrollToBottom: scrollFocusedViewToBottom,
  } = useAutoScroll();
  const focusedViewLatestEntryKeyRef = useRef<string | null>(null);
  const focusedViewPreviousCountRef = useRef(0);
  const focusedViewStreamIdRef = useRef<string | null>(null);

  useEffect(() => {
    playbackQueueRef.current = playbackQueue;
  }, [playbackQueue]);

  const visibleStreams = useMemo<Stream[]>(() => {
    if (!Array.isArray(streams) || streams.length === 0) {
      return [];
    }

    if (!focusStreamId) {
      return streams;
    }

    return streams.filter((stream) => stream.id === focusStreamId);
  }, [streams, focusStreamId]);

  const focusedVisibleStream =
    visibleStreams.length === 1 ? visibleStreams[0] : null;
  const focusedVisibleStreamId = focusedVisibleStream?.id ?? null;
  const isStandaloneView = Boolean(focusedVisibleStreamId);

  useEffect(() => {
    setOpenStandaloneTool(null);
  }, [focusedVisibleStreamId]);

  const handleFocusedViewRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (shouldAutoScrollFocusedView) {
        attachFocusedViewRef(node);
      } else {
        attachFocusedViewRef(null);
      }
    },
    [shouldAutoScrollFocusedView, attachFocusedViewRef],
  );

  useEffect(() => {
    if (!focusStreamId) {
      return;
    }

    setExpandedStreams((previous) => {
      if (previous.size === 1 && previous.has(focusStreamId)) {
        return previous;
      }

      return new Set([focusStreamId]);
    });
  }, [focusStreamId, visibleStreams]);

  useEffect(() => {
    if (!shouldAutoScrollFocusedView || !focusedVisibleStreamId) {
      focusedViewPreviousCountRef.current = 0;
      focusedViewLatestEntryKeyRef.current = null;
      focusedViewStreamIdRef.current = null;
      return;
    }

    if (focusedViewStreamIdRef.current !== focusedVisibleStreamId) {
      focusedViewPreviousCountRef.current = 0;
      focusedViewLatestEntryKeyRef.current = null;
      focusedViewStreamIdRef.current = focusedVisibleStreamId;
      scrollFocusedViewToBottom("auto");
    }

    const historyState = historyByStream[focusedVisibleStreamId];
    const visibleTranscriptions = focusedVisibleStream
      ? selectVisibleTranscriptions(focusedVisibleStream.transcriptions ?? [], {
          historyTranscriptions: historyState?.transcriptions ?? [],
          windowMs: INITIAL_HISTORY_WINDOW_MS,
          fallbackLimit: FALLBACK_VISIBLE_TRANSCRIPTION_COUNT,
        })
      : [];

    const nextCount = visibleTranscriptions.length;
    const latestEntry = visibleTranscriptions[nextCount - 1];
    const latestKey = latestEntry
      ? `${latestEntry.id}-${latestEntry.timestamp}`
      : null;
    const prevCount = focusedViewPreviousCountRef.current;
    const prevKey = focusedViewLatestEntryKeyRef.current;

    if (nextCount === 0) {
      focusedViewPreviousCountRef.current = 0;
      focusedViewLatestEntryKeyRef.current = null;
      return;
    }

    if (nextCount > prevCount || (latestKey && latestKey !== prevKey)) {
      notifyFocusedViewContentChanged({
        behavior: prevCount === 0 ? "auto" : "smooth",
      });
    }

    focusedViewPreviousCountRef.current = nextCount;
    focusedViewLatestEntryKeyRef.current = latestKey;
  }, [
    shouldAutoScrollFocusedView,
    focusedVisibleStream,
    focusedVisibleStreamId,
    historyByStream,
    notifyFocusedViewContentChanged,
    scrollFocusedViewToBottom,
  ]);

  const toggleStream = (streamId: string) => {
    let willExpand = false;
    setExpandedStreams((prev) => {
      const next = new Set(prev);
      if (next.has(streamId)) {
        next.delete(streamId);
        willExpand = false;
      } else {
        next.add(streamId);
        willExpand = true;
      }
      return next;
    });

    if (!willExpand && activeSearchPanelStreamId === streamId) {
      setActiveSearchPanelStreamId(null);
    }
  };

  const toggleSearchPanel = useCallback((streamId: string) => {
    setActiveSearchPanelStreamId((prev) =>
      prev === streamId ? null : streamId,
    );
  }, []);

  const closeSearchPanel = useCallback(() => {
    setActiveSearchPanelStreamId(null);
  }, []);

  const toggleLiveListening = useCallback((streamId: string) => {
    setLiveListeningByStream((prev) => {
      const next = { ...prev };
      if (next[streamId]) {
        delete next[streamId];
      } else {
        next[streamId] = true;
      }
      return next;
    });

    setLiveAudioErrorByStream((prev) => {
      if (!(streamId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[streamId];
      return next;
    });
  }, []);

  const handleLiveAudioError = useCallback((streamId: string) => {
    const audioElement = liveAudioRefs.current[streamId];
    const errorMessage = describeMediaError(audioElement?.error ?? null);
    if (audioElement?.error) {
      console.error("❌ Live audio playback error:", audioElement.error);
    }
    setLiveAudioErrorByStream((prev) => ({
      ...prev,
      [streamId]: errorMessage,
    }));
  }, []);

  const syncLiveAudioToLiveEdge = useCallback((streamId: string) => {
    const audioElement = liveAudioRefs.current[streamId];
    if (!audioElement) {
      return;
    }

    try {
      const { seekable } = audioElement;
      if (!seekable || seekable.length === 0) {
        return;
      }

      const lastIndex = seekable.length - 1;
      const liveEdge = seekable.end(lastIndex);
      if (!Number.isFinite(liveEdge)) {
        return;
      }

      const timeDifference = Math.abs(audioElement.currentTime - liveEdge);
      if (timeDifference < 1) {
        return;
      }

      audioElement.currentTime = liveEdge;
    } catch (error) {
      console.warn("⚠️ Unable to synchronize live audio position:", error);
    }
  }, []);

  const handleLiveAudioReady = useCallback(
    (streamId: string) => {
      syncLiveAudioToLiveEdge(streamId);
    },
    [syncLiveAudioToLiveEdge],
  );

  const handleLiveAudioPlay = useCallback(
    (streamId: string) => {
      setLiveAudioErrorByStream((prev) => {
        if (!prev[streamId]) {
          return prev;
        }
        const next = { ...prev };
        next[streamId] = null;
        return next;
      });

      syncLiveAudioToLiveEdge(streamId);
    },
    [syncLiveAudioToLiveEdge],
  );

  useEffect(() => {
    const activeStreamIds = new Set(Object.keys(liveListeningByStream));

    for (const [streamId, element] of Object.entries(liveAudioRefs.current)) {
      if (!activeStreamIds.has(streamId) && element) {
        element.pause();
        element.removeAttribute("src");
        element.load();
        delete liveAudioRefs.current[streamId];
      }
    }
  }, [liveListeningByStream]);

  useEffect(() => {
    setLiveListeningByStream((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev;
      }
      const activeIds = new Set(
        streams
          .filter((stream) => stream.status === "transcribing")
          .map((stream) => stream.id),
      );
      let changed = false;
      const next = { ...prev };
      for (const [streamId, isListening] of Object.entries(prev)) {
        if (!isListening) {
          continue;
        }
        if (!activeIds.has(streamId)) {
          delete next[streamId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [streams]);

  useEffect(() => {
    Object.entries(liveListeningByStream).forEach(([streamId, isListening]) => {
      if (!isListening) {
        return;
      }

      const audioElement = liveAudioRefs.current[streamId];
      if (!audioElement) {
        return;
      }

      const playPromise = audioElement.play();
      if (playPromise) {
        playPromise.catch((error) => {
          console.warn(
            "⚠️ Live audio playback was blocked by the browser:",
            error,
          );
        });
      }
    });
  }, [liveListeningByStream]);

  useEffect(() => {
    setLiveAudioErrorByStream((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const streamId of Object.keys(prev)) {
        if (!liveListeningByStream[streamId]) {
          delete next[streamId];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [liveListeningByStream]);

  useEffect(
    () => () => {
      for (const element of Object.values(liveAudioRefs.current)) {
        if (element) {
          element.pause();
          element.removeAttribute("src");
          element.load();
        }
      }
      liveAudioRefs.current = {};
    },
    [],
  );

  const getStatusIcon = (status: Stream["status"]) => {
    switch (status) {
      case "transcribing":
        return <Activity className="w-4 h-4" aria-hidden="true" />;
      case "queued":
        return <Clock className="w-4 h-4" aria-hidden="true" />;
      case "error":
        return <AlertTriangle className="w-4 h-4" aria-hidden="true" />;
      case "stopped":
      default:
        return <MicOff className="w-4 h-4" aria-hidden="true" />;
    }
  };

  const getStatusLabel = (status: Stream["status"]) => {
    switch (status) {
      case "transcribing":
        return "Live transcription";
      case "queued":
        return "Queued for transcription";
      case "error":
        return "Stream error";
      case "stopped":
      default:
        return "Transcription stopped";
    }
  };

  const getStatusModifier = (status: Stream["status"]) => {
    switch (status) {
      case "transcribing":
        return "transcribing";
      case "queued":
        return "queued";
      case "error":
        return "error";
      case "stopped":
      default:
        return "stopped";
    }
  };

  const isSegmentCurrentlyPlaying = (
    recordingUrl: string | undefined,
    startTime: number,
    endTime: number,
  ) => {
    if (!recordingUrl || !playingRecording) return false;
    const recordingId = getRecordingElementId(recordingUrl);
    if (playingRecording !== recordingId) return false;
    return currentPlayTime >= startTime && currentPlayTime <= endTime;
  };

  const resetAudioPlaybackState = useCallback(
    (audio: HTMLAudioElement | null, options?: { clearQueue?: boolean }) => {
      if (audio) {
        audio.loop = false;
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
      }
      updatePlayingRecording(null);
      updatePlayingTranscriptionId(null);
      updatePlayingSegment(null);
      setCurrentPlayTime(0);
      if (options?.clearQueue ?? true) {
        updatePlaybackQueue(null);
      }
    },
    [
      updatePlaybackQueue,
      updatePlayingRecording,
      updatePlayingSegment,
      updatePlayingTranscriptionId,
    ],
  );

  const stopCurrentRecording = () => {
    const currentRecordingId = playingRecordingRef.current;
    if (!currentRecordingId) {
      return;
    }
    const currentAudio = recordingAudioRefs.current[currentRecordingId] ?? null;
    if (currentAudio) {
      currentAudio.pause();
    }
    resetAudioPlaybackState(currentAudio, { clearQueue: true });
  };

  const playRecording = (
    transcription: TranscriptionResult,
    options?: { queue?: PlaybackQueueState },
  ) => {
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

    if (
      currentRecordingId === recordingId &&
      currentTranscriptionId === transcription.id
    ) {
      stopCurrentRecording();
      audio.currentTime = startOffset;
      return;
    }

    if (currentRecordingId && currentRecordingId !== recordingId) {
      stopCurrentRecording();
    }

    if (options?.queue) {
      updatePlaybackQueue(options.queue);
    } else {
      updatePlaybackQueue(null);
    }

    updatePlayingRecording(recordingId);
    updatePlayingTranscriptionId(transcription.id);
    updatePlayingSegment(null);

    const handleEnded = () => {
      const advance = advancePlaybackQueue(
        playbackQueueRef.current,
        transcription,
      );
      if (advance) {
        resetAudioPlaybackState(audio, { clearQueue: false });
        updatePlaybackQueue(advance.nextQueue);
        setTimeout(() => {
          playRecording(advance.nextTranscription, {
            queue: advance.nextQueue,
          });
        }, 0);
        return;
      }

      resetAudioPlaybackState(audio);
    };

    const handleError = (error: Event | string) => {
      console.error("❌ Error playing audio:", error);
      resetAudioPlaybackState(audio);
    };

    const updateTime = () => {
      setCurrentPlayTime(audio.currentTime);
    };

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
  };

  const playSegment = (
    recordingUrl: string,
    startTime: number | undefined,
    endTime: number | undefined,
    transcriptionId: string,
    options?: { recordingStartOffset?: number },
  ) => {
    const recordingId = getRecordingElementId(recordingUrl);
    const audio = recordingAudioRefs.current[recordingId] ?? null;

    if (!audio) {
      console.error(`❌ Audio element not found: ${recordingId}`);
      return;
    }

    setAudioElementSource(audio, recordingUrl);

    const currentRecordingId = playingRecordingRef.current;
    if (currentRecordingId && currentRecordingId !== recordingId) {
      stopCurrentRecording();
    }

    const safeStart =
      typeof startTime === "number" && Number.isFinite(startTime)
        ? startTime
        : null;
    const safeEnd =
      typeof endTime === "number" && Number.isFinite(endTime) ? endTime : null;
    const recordingOffset =
      typeof options?.recordingStartOffset === "number" &&
      Number.isFinite(options.recordingStartOffset)
        ? Math.max(0, options.recordingStartOffset)
        : null;

    const playbackStart =
      safeStart !== null && safeStart > 0
        ? safeStart
        : (recordingOffset ??
          (safeStart !== null ? Math.max(0, safeStart) : 0));
    const segmentDuration =
      safeEnd !== null && safeStart !== null
        ? Math.max(0, safeEnd - safeStart)
        : null;

    let playbackEnd =
      segmentDuration !== null
        ? playbackStart + segmentDuration
        : safeEnd !== null && safeEnd > playbackStart
          ? safeEnd
          : playbackStart;

    if (!Number.isFinite(playbackEnd)) {
      playbackEnd = playbackStart;
    }

    if (playbackEnd <= playbackStart) {
      playbackEnd = playbackStart + 0.25;
    }

    const segmentKey = `${recordingId}-${startTime ?? playbackStart}-${endTime ?? playbackEnd}`;

    updatePlaybackQueue(null);
    updatePlayingRecording(recordingId);
    updatePlayingTranscriptionId(transcriptionId);
    updatePlayingSegment(segmentKey);

    const handleError = (error: Event | string) => {
      console.error("❌ Error playing audio:", error);
      resetAudioPlaybackState(audio);
    };

    const handleSegmentTimeUpdate = () => {
      const nextTime = audio.currentTime;
      setCurrentPlayTime(nextTime);

      const completionThreshold = Math.max(playbackStart, playbackEnd - 0.05);

      if (
        nextTime >= completionThreshold &&
        playingSegmentRef.current === segmentKey
      ) {
        updatePlayingSegment(null);
      }
    };

    const handleEnded = () => {
      resetAudioPlaybackState(audio);
    };

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
      if (audio.readyState === 0) {
        audio.load();
      }
    }
  };

  const handlePlayAll = (
    streamId: string,
    transcription: TranscriptionResult,
    orderedTranscriptions: TranscriptionResult[],
  ) => {
    const queue = buildPlaybackQueue(
      streamId,
      orderedTranscriptions,
      transcription.id,
    );
    if (queue) {
      playRecording(transcription, { queue });
      return;
    }

    playRecording(transcription);
  };

  const fetchTranscriptions = useCallback(
    async (
      streamId: string,
      query: Record<string, string>,
    ): Promise<TranscriptionQueryResponse> => {
      const params = new URLSearchParams(query);

      const response = await authFetch(
        `/api/streams/${streamId}/transcriptions?${params.toString()}`,
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `Failed to fetch transcriptions (${response.status})`,
        );
      }

      return (await response.json()) as TranscriptionQueryResponse;
    },
    [authFetch],
  );

  const handleLoadEarlierHistory = useCallback(
    async (streamId: string, before?: string | null) => {
      setHistoryByStream((prev) => ({
        ...prev,
        [streamId]: {
          transcriptions: prev[streamId]?.transcriptions ?? [],
          hasMoreBefore: prev[streamId]?.hasMoreBefore ?? true,
          loading: true,
          error: null,
        },
      }));

      try {
        const query: Record<string, string> = {
          limit: String(HISTORY_FETCH_LIMIT),
        };
        if (before) {
          query.before = before;
        }
        const data = await fetchTranscriptions(streamId, query);

        setHistoryByStream((prev) => {
          const prevState = prev[streamId] ?? {
            transcriptions: [],
            hasMoreBefore: true,
            loading: false,
            error: null,
          };
          const combined = dedupeAndSortTranscriptions([
            ...data.transcriptions,
            ...prevState.transcriptions,
          ]);
          const hasMore =
            data.hasMoreBefore ??
            data.transcriptions.length >= HISTORY_FETCH_LIMIT;

          return {
            ...prev,
            [streamId]: {
              transcriptions: combined,
              hasMoreBefore: hasMore,
              loading: false,
              error: null,
            },
          };
        });
      } catch (error) {
        setHistoryByStream((prev) => ({
          ...prev,
          [streamId]: {
            transcriptions: prev[streamId]?.transcriptions ?? [],
            hasMoreBefore: prev[streamId]?.hasMoreBefore ?? true,
            loading: false,
            error:
              error instanceof Error ? error.message : "Failed to load history",
          },
        }));
      }
    },
    [fetchTranscriptions],
  );

  const handleClearHistory = useCallback((streamId: string) => {
    setHistoryByStream((prev) => {
      if (!prev[streamId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[streamId];
      return next;
    });
  }, []);

  const handleSearch = useCallback(
    async (streamId: string, query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchStateByStream((prev) => {
          if (!prev[streamId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[streamId];
          return next;
        });
        return;
      }

      setSearchStateByStream((prev) => ({
        ...prev,
        [streamId]: {
          query: trimmed,
          results: [],
          loading: true,
          error: null,
        },
      }));

      try {
        const data = await fetchTranscriptions(streamId, {
          search: trimmed,
          limit: String(MAX_SEARCH_RESULTS),
          order: "asc",
        });

        setSearchStateByStream((prev) => ({
          ...prev,
          [streamId]: {
            query: trimmed,
            results: data.transcriptions,
            loading: false,
            error: null,
          },
        }));
      } catch (error) {
        setSearchStateByStream((prev) => ({
          ...prev,
          [streamId]: {
            query: trimmed,
            results: [],
            loading: false,
            error: error instanceof Error ? error.message : "Search failed",
          },
        }));
      }
    },
    [fetchTranscriptions],
  );

  const handleClearSearch = useCallback((streamId: string) => {
    setSearchStateByStream((prev) => {
      if (!prev[streamId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[streamId];
      return next;
    });
    setSearchInputByStream((prev) => ({
      ...prev,
      [streamId]: "",
    }));
  }, []);

  const handleGoToTimestamp = useCallback(
    async (streamId: string, timestamp: string, windowMinutes: number) => {
      setFocusByStream((prev) => ({
        ...prev,
        [streamId]: {
          anchor: timestamp,
          windowMinutes,
          transcriptions: [],
          loading: true,
          error: null,
        },
      }));

      try {
        const data = await fetchTranscriptions(streamId, {
          around: timestamp,
          windowMinutes: String(windowMinutes),
          limit: String(Math.max(HISTORY_FETCH_LIMIT, windowMinutes * 6)),
          order: "asc",
        });

        setFocusByStream((prev) => ({
          ...prev,
          [streamId]: {
            anchor: timestamp,
            windowMinutes,
            transcriptions: data.transcriptions,
            loading: false,
            error: null,
          },
        }));
      } catch (error) {
        setFocusByStream((prev) => ({
          ...prev,
          [streamId]: {
            anchor: timestamp,
            windowMinutes,
            transcriptions: [],
            loading: false,
            error:
              error instanceof Error ? error.message : "Failed to load context",
          },
        }));
      }
    },
    [fetchTranscriptions],
  );

  const handleClearFocus = useCallback((streamId: string) => {
    setFocusByStream((prev) => {
      if (!prev[streamId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[streamId];
      return next;
    });
  }, []);

  const handleMergeFocusIntoHistory = (streamId: string) => {
    const focusState = focusByStream[streamId];
    if (!focusState || focusState.transcriptions.length === 0) {
      return;
    }

    setHistoryByStream((prev) => {
      const prevState = prev[streamId] ?? {
        transcriptions: [],
        hasMoreBefore: true,
        loading: false,
        error: null,
      };
      const combined = dedupeAndSortTranscriptions([
        ...prevState.transcriptions,
        ...focusState.transcriptions,
      ]);
      return {
        ...prev,
        [streamId]: {
          ...prevState,
          transcriptions: combined,
        },
      };
    });

  };

  const renderSearchContent = useCallback(
    (
      streamId: string,
      close: () => void,
      {
        id,
        headingId,
        variant = "popover",
      }: {
        id?: string;
        headingId?: string;
        variant?: "popover" | "dialog";
      } = {},
    ): ReactNode => {
      const searchState = searchStateByStream[streamId];
      const searchValue = searchInputByStream[streamId] ?? "";
      const isPopover = variant === "popover";
      const titleId = headingId ?? (id ? `${id}-heading` : undefined);

      return (
        <div
          className="transcript-stream__search-popover"
          id={id}
          role={isPopover ? "dialog" : undefined}
          aria-modal={isPopover ? "false" : undefined}
          aria-labelledby={isPopover ? titleId : undefined}
        >
          {isPopover ? (
            <div className="transcript-stream__search-header" id={titleId}>
              <div className="fw-semibold text-body">Search history</div>
              <Button
                size="sm"
                use="link"
                className="p-0 text-body-secondary"
                onClick={close}
                aria-label="Close search panel"
              >
                <X size={16} />
              </Button>
            </div>
          ) : (
            <div className="text-body-secondary small">
              Search saved transcripts by keyword.
            </div>
          )}

          <form
            className="transcript-stream__search-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSearch(streamId, searchValue);
            }}
          >
            <div className="transcript-stream__search-input-group">
              <Search size={16} aria-hidden="true" />
              <input
                type="text"
                value={searchValue}
                onChange={(event) =>
                  setSearchInputByStream((prev) => ({
                    ...prev,
                    [streamId]: event.target.value,
                  }))
                }
                placeholder="Keywords or phrases"
                className="form-control form-control-sm"
              />
              <Button
                type="submit"
                size="sm"
                use="primary"
                disabled={searchState?.loading ?? false}
                startContent={
                  searchState?.loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search size={14} />
                  )
                }
              >
                Search
              </Button>
            </div>
          </form>

          {searchState ? (
            <div className="transcript-stream__search-results">
              <div className="transcript-stream__search-summary">
                <div className="fw-semibold text-body">
                  Results for “{searchState.query}” (
                  {searchState.results.length})
                </div>
                <Button
                  size="sm"
                  use="link"
                  onClick={() => handleClearSearch(streamId)}
                  className="text-accent p-0"
                >
                  <X size={14} />
                  Clear
                </Button>
              </div>

              {searchState.loading ? (
                <div className="text-xs text-ink-subtle d-flex align-items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Searching…
                </div>
              ) : searchState.error ? (
                <div className="text-xs text-danger">{searchState.error}</div>
              ) : searchState.results.length === 0 ? (
                <div className="text-xs text-accent-strong">
                  No matches found.
                </div>
              ) : (
                <ul className="transcript-stream__search-results-list">
                  {searchState.results.map((result) => (
                    <li
                      key={`${result.id}-${result.timestamp}`}
                      className="bg-surface border border-accent/30 rounded p-2 transition-colors"
                    >
                      <div className="d-flex align-items-start justify-content-between gap-3">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 text-xs text-ink-subtle mb-1">
                            <Clock className="w-3 h-3 text-neutral" />
                            {result.timestamp ? (
                              <Timestamp value={result.timestamp} mode="datetime" />
                            ) : (
                              <span>Unknown time</span>
                            )}
                          </div>
                          <div>{result.text}</div>
                        </div>
                        <div className="d-flex flex-column align-items-end gap-1 text-xs">
                          <Button
                            size="sm"
                            use="primary"
                            onClick={() => {
                              setJumpTimestampByStream((prev) => ({
                                ...prev,
                                [streamId]: toDatetimeLocalValue(
                                  result.timestamp,
                                ),
                              }));
                              const windowMinutes =
                                jumpWindowByStream[streamId] ??
                                DEFAULT_FOCUS_WINDOW_MINUTES;
                              void handleGoToTimestamp(
                                streamId,
                                result.timestamp,
                                windowMinutes,
                              );
                              close();
                            }}
                          >
                            View context
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="text-xs text-ink-subtle">
              Search saved transcripts by keyword.
            </div>
          )}
        </div>
      );
    },
    [
      searchStateByStream,
      searchInputByStream,
      setSearchInputByStream,
      handleSearch,
      handleClearSearch,
      setJumpTimestampByStream,
      jumpWindowByStream,
      handleGoToTimestamp,
    ],
  );

  const standaloneControls = useMemo<StandaloneStreamControls | null>(() => {
    if (!focusedVisibleStream) {
      return null;
    }

    const streamId = focusedVisibleStream.id;
    const historyState = historyByStream[streamId];
    const visibleTranscriptions = selectVisibleTranscriptions(
      focusedVisibleStream.transcriptions ?? [],
      {
        historyTranscriptions: historyState?.transcriptions ?? [],
        windowMs: INITIAL_HISTORY_WINDOW_MS,
        fallbackLimit: FALLBACK_VISIBLE_TRANSCRIPTION_COUNT,
      },
    );

    const statusModifier = getStatusModifier(focusedVisibleStream.status);
    const statusLabel = getStatusLabel(focusedVisibleStream.status);
    const isLiveListening = Boolean(liveListeningByStream[streamId]);
    const liveAudioError = liveAudioErrorByStream[streamId] ?? null;
    const canReset = !isReadOnly && visibleTranscriptions.length > 0;
    const isTranscribing = focusedVisibleStream.status === "transcribing";
    const canListenLive =
      !isPagerStream(focusedVisibleStream) && isTranscribing;

    const handleToggleLiveListening = () => {
      if (!canListenLive) {
        return;
      }
      toggleLiveListening(streamId);
    };

    const handleReset = () => {
      if (isReadOnly) {
        return;
      }
      onResetStream(streamId);
      handleClearHistory(streamId);
      handleClearSearch(streamId);
      handleClearFocus(streamId);
    };

    const jumpTimestampValue = jumpTimestampByStream[streamId] ?? "";
    const jumpWindowValue =
      jumpWindowByStream[streamId] ?? DEFAULT_FOCUS_WINDOW_MINUTES;
    const sanitizedStreamId = sanitizeStreamId(streamId);
    const focusState = focusByStream[streamId];
    const metrics = calculatePerformanceMetrics(visibleTranscriptions);
    const lastMetricsTimestamp =
      typeof metrics.lastTranscriptionTime === "number" &&
      Number.isFinite(metrics.lastTranscriptionTime)
        ? metrics.lastTranscriptionTime
        : null;
    const hasMetricsData = metrics.transcriptionCount > 0;

    const closeStandaloneDialog = () => {
      setOpenStandaloneTool(null);
    };

    const toolButtonItems: ReactNode[] = [
      <Button
        key="search"
        size="sm"
        use="primary"
        appearance="outline"
        onClick={() => setOpenStandaloneTool("search")}
        startContent={<Search size={14} />}
        isCondensed
        tooltip="Search history"
      >
        Search history
      </Button>,
      <Button
        key="jump"
        size="sm"
        use="secondary"
        appearance="outline"
        onClick={() => setOpenStandaloneTool("jump")}
        startContent={<CalendarClock size={14} />}
        isCondensed
        tooltip="Go to time"
      >
        Go to time
      </Button>,
      <Button
        key="stats"
        size="sm"
        use="secondary"
        appearance="outline"
        onClick={() => setOpenStandaloneTool("stats")}
        startContent={<BarChart3 size={14} />}
        isCondensed
        tooltip="Stream stats"
      >
        Stream stats
      </Button>,
    ];

    if (isPagerStream(focusedVisibleStream) && onExportPagerFeed) {
      toolButtonItems.push(
        <Button
          key="export-pager"
          size="sm"
          use="secondary"
          appearance="outline"
          onClick={() => {
            onSelectPagerExportStream?.(streamId);
            void onExportPagerFeed();
          }}
          startContent={
            pagerExporting ? (
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            ) : (
              <Download size={14} />
            )
          }
          isCondensed
          tooltip="Export pager feed"
          disabled={pagerExporting}
        >
          {pagerExporting ? "Exporting…" : "Export feed"}
        </Button>,
      );
    }

    const toolButtons =
      toolButtonItems.length > 0 ? (
        <ButtonGroup size="sm">{toolButtonItems}</ButtonGroup>
      ) : null;

    const dialogs: ReactNode[] = [];

    if (openStandaloneTool === "search") {
      const dialogTitleId = `standalone-search-${sanitizedStreamId}-title`;

      dialogs.push(
        <div
          key="search"
          className="app-modal"
          role="presentation"
          onClick={closeStandaloneDialog}
        >
          <div
            className="app-modal__dialog standalone-tool-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal__header d-flex align-items-start justify-content-between gap-3">
              <h2 className="h5 mb-0" id={dialogTitleId}>
                Search transcripts
              </h2>
              <Button
                size="sm"
                use="secondary"
                onClick={closeStandaloneDialog}
                aria-label="Close search dialog"
              >
                <X size={16} />
              </Button>
            </div>
            <div className="app-modal__body standalone-tool-dialog__body">
              {renderSearchContent(streamId, closeStandaloneDialog, {
                variant: "dialog",
              })}
            </div>
          </div>
        </div>,
      );
    }

    if (openStandaloneTool === "jump") {
      const dialogTitleId = `standalone-jump-${sanitizedStreamId}-title`;

      dialogs.push(
        <div
          key="jump"
          className="app-modal"
          role="presentation"
          onClick={closeStandaloneDialog}
        >
          <div
            className="app-modal__dialog standalone-tool-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal__header d-flex align-items-start justify-content-between gap-3">
              <h2 className="h5 mb-0" id={dialogTitleId}>
                Go to timestamp
              </h2>
              <Button
                size="sm"
                use="secondary"
                onClick={closeStandaloneDialog}
                aria-label="Close go to timestamp dialog"
              >
                <X size={16} />
              </Button>
            </div>
            <div className="app-modal__body standalone-tool-dialog__body">
              <form
                className="transcript-stream__jump-form standalone-tool-dialog__form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const timestampValue = jumpTimestampValue;
                  const windowMinutes = jumpWindowValue;
                  if (!timestampValue) {
                    setFocusByStream((prev) => ({
                      ...prev,
                      [streamId]: {
                        anchor: null,
                        windowMinutes,
                        transcriptions: [],
                        loading: false,
                        error: "Enter a date and time to jump to.",
                      },
                    }));
                    return;
                  }
                  const parsed = new Date(timestampValue);
                  if (Number.isNaN(parsed.getTime())) {
                    setFocusByStream((prev) => ({
                      ...prev,
                      [streamId]: {
                        anchor: null,
                        windowMinutes,
                        transcriptions: [],
                        loading: false,
                        error: "Invalid date or time value.",
                      },
                    }));
                    return;
                  }
                  setJumpTimestampByStream((prev) => ({
                    ...prev,
                    [streamId]: timestampValue,
                  }));
                  void handleGoToTimestamp(
                    streamId,
                    parsed.toISOString(),
                    windowMinutes,
                  );
                  closeStandaloneDialog();
                }}
              >
                <div className="transcript-stream__jump-inputs">
                  <div className="transcript-stream__jump-input">
                    <CalendarClock size={16} aria-hidden="true" />
                    <input
                      type="datetime-local"
                      value={jumpTimestampValue}
                      onChange={(event) =>
                        setJumpTimestampByStream((prev) => ({
                          ...prev,
                          [streamId]: event.target.value,
                        }))
                      }
                      className="form-control form-control-sm"
                    />
                  </div>
                  <select
                    value={String(jumpWindowValue)}
                    onChange={(event) =>
                      setJumpWindowByStream((prev) => ({
                        ...prev,
                        [streamId]: Number(event.target.value),
                      }))
                    }
                    className="form-select form-select-sm"
                  >
                    <option value="5">±5 min</option>
                    <option value="10">±10 min</option>
                    <option value="30">±30 min</option>
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    use="success"
                    disabled={focusState?.loading ?? false}
                    isContentInline={focusState?.loading ? false : undefined}
                  >
                    {focusState?.loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Go"
                    )}
                  </Button>
                </div>
              </form>
              {focusState?.error ? (
                <div className="text-danger small" role="alert">
                  {focusState.error}
                </div>
              ) : null}
            </div>
          </div>
        </div>,
      );
    }

    if (openStandaloneTool === "stats") {
      const dialogTitleId = `standalone-stats-${sanitizedStreamId}-title`;

      dialogs.push(
        <div
          key="stats"
          className="app-modal"
          role="presentation"
          onClick={closeStandaloneDialog}
        >
          <div
            className="app-modal__dialog standalone-tool-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal__header d-flex align-items-start justify-content-between gap-3">
              <h2 className="h5 mb-0" id={dialogTitleId}>
                Stream statistics
              </h2>
              <Button
                size="sm"
                use="secondary"
                onClick={closeStandaloneDialog}
                aria-label="Close stats dialog"
              >
                <X size={16} />
              </Button>
            </div>
            <div className="app-modal__body standalone-tool-dialog__body">
              {hasMetricsData ? (
                <>
                  <div className="conversation-panel__stats-title">
                    Performance summary
                  </div>
                  <dl className="conversation-panel__stats-list">
                    <div className="conversation-panel__stats-item">
                      <dt>Transcriptions</dt>
                      <dd>{metrics.transcriptionCount}</dd>
                    </div>
                    <div className="conversation-panel__stats-item">
                      <dt>Avg confidence</dt>
                      <dd>
                        {clampAccuracyPercentage(
                          metrics.averageAccuracy,
                        ).toFixed(1)}
                        %
                      </dd>
                    </div>
                    <div className="conversation-panel__stats-item">
                      <dt>Avg duration</dt>
                      <dd>{formatDurationSeconds(metrics.averageDuration)}</dd>
                    </div>
                    <div className="conversation-panel__stats-item">
                      <dt>Total duration</dt>
                      <dd>{formatDurationSeconds(metrics.totalDuration)}</dd>
                    </div>
                  </dl>
                  {lastMetricsTimestamp ? (
                    <div className="conversation-panel__stats-footer">
                      Last transcription: {" "}
                      <Timestamp value={lastMetricsTimestamp} mode="datetime" />
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="conversation-panel__stats-empty">
                  No transcription metrics available yet.
                </div>
              )}
            </div>
          </div>
        </div>,
      );
    }

    return {
      streamId,
      statusLabel,
      statusModifier,
      isLiveListening,
      canListenLive,
      canReset,
      liveAudioError,
      onToggleLiveListening: handleToggleLiveListening,
      onReset: handleReset,
      toolButtons,
      dialogs,
    };
  }, [
    focusedVisibleStream,
    historyByStream,
    liveAudioErrorByStream,
    liveListeningByStream,
    handleClearFocus,
    handleClearHistory,
    handleClearSearch,
    onResetStream,
    toggleLiveListening,
    jumpTimestampByStream,
    jumpWindowByStream,
    focusByStream,
    handleGoToTimestamp,
    setJumpTimestampByStream,
    setJumpWindowByStream,
    setFocusByStream,
    renderSearchContent,
    setOpenStandaloneTool,
    openStandaloneTool,
    isReadOnly,
    onExportPagerFeed,
    onSelectPagerExportStream,
    pagerExporting,
  ]);

  useEffect(() => {
    if (onStandaloneControlsChange) {
      onStandaloneControlsChange(standaloneControls ?? null);
    }
  }, [onStandaloneControlsChange, standaloneControls]);

  useEffect(() => {
    if (!onStandaloneControlsChange) {
      return;
    }

    return () => {
      onStandaloneControlsChange(null);
    };
  }, [onStandaloneControlsChange]);

  const { transcriptCorrectionEnabled } = useUISettings();

  const renderGroupedTranscriptions = (
    streamId: string,
    groups: TranscriptionGroup[],
    orderedTranscriptions: TranscriptionResult[],
    streamIsPager: boolean,
  ) =>
    groups.map((group) => {
      const renderedRecordings = new Set<string>();
      const audioElements: JSX.Element[] = [];
      const incidentSource = group.transcriptions.find(
        (item) => item.pagerIncident?.incidentId,
      );
      const incidentDetails = incidentSource?.pagerIncident ?? null;
      const incidentIdLabel = (() => {
        const value =
          incidentDetails?.incidentId ?? group.pagerIncidentId ?? null;
        if (typeof value !== "string") {
          return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      })();
      const incidentCallType = incidentDetails?.callType ?? null;
      const incidentMetaParts: string[] = [];
      if (incidentDetails?.address) {
        incidentMetaParts.push(incidentDetails.address);
      }
      if (incidentDetails?.alarmLevel) {
        incidentMetaParts.push(`Alarm level ${incidentDetails.alarmLevel}`);
      }
      if (incidentDetails?.talkgroup) {
        incidentMetaParts.push(`Talkgroup ${incidentDetails.talkgroup}`);
      }
      if (incidentDetails?.map) {
        incidentMetaParts.push(`Map ${incidentDetails.map}`);
      }
      const incidentNarrative = incidentDetails?.narrative ?? null;
      const incidentLocationQuery = (() => {
        if (!incidentDetails) {
          return null;
        }
        const parts: string[] = [];
        if (incidentDetails.address) {
          parts.push(incidentDetails.address);
        }
        if (incidentDetails.map && !parts.includes(incidentDetails.map)) {
          parts.push(`Map ${incidentDetails.map}`);
        }
        return parts.length > 0 ? parts.join(", ") : null;
      })();

      const incidentLocationUrls = incidentLocationQuery
        ? (() => {
            const encodedQuery = encodeURIComponent(incidentLocationQuery);
            // The iframe embed intentionally uses the public Google Maps Embed
            // endpoint instead of a heavier npm integration. Dedicated Google
            // Maps libraries require shipping an API key and latitude/longitude
            // coordinates, but pager incidents only provide freeform address
            // text. The embed URL lets Google handle geocoding while keeping
            // secrets out of the frontend bundle.
            return {
              embed: `https://maps.google.com/maps?hl=en&q=${encodedQuery}&ie=UTF8&output=embed`,
              link: `https://maps.google.com/maps?hl=en&q=${encodedQuery}&ie=UTF8&z=15`,
            } as const;
          })()
        : null;

      const transcriptionElements = group.transcriptions.map((transcription) => {
        const items: JSX.Element[] = [];
          const recordingUrl = transcription.recordingUrl;
          const recordingId = recordingUrl
            ? getRecordingElementId(recordingUrl)
            : null;
          const isSystemEvent = isSystemTranscription(transcription);

          if (
            recordingUrl &&
            recordingId &&
            !renderedRecordings.has(recordingId)
          ) {
            renderedRecordings.add(recordingId);
            audioElements.push(
              <audio
                key={recordingId}
                id={recordingId}
                data-recording-url={recordingUrl}
                preload="none"
                className="hidden"
                ref={(element) => {
                  if (element) {
                    recordingAudioRefs.current[recordingId] = element;
                  } else {
                    delete recordingAudioRefs.current[recordingId];
                  }
                }}
              />,
            );
          }

          if (isSystemEvent) {
            const label =
              typeof transcription.text === "string"
                ? transcription.text.trim()
                : "";
            if (label) {
              const eventType = transcription.eventType ?? "transcription";
              const IconComponent =
                eventType === "recording_started"
                  ? Radio
                  : eventType === "recording_stopped"
                    ? MicOff
                    : eventType === "transcription_started"
                      ? Play
                      : eventType === "transcription_stopped"
                        ? Pause
                        : eventType === "upstream_disconnected"
                          ? WifiOff
                          : eventType === "upstream_reconnected"
                            ? Wifi
                            : Activity;
              items.push(
                <span
                  key={`${transcription.id}-system`}
                  className="chip-button chip-button--surface transcript-system-event"
                >
                  <IconComponent size={14} />
                  {label}
                </span>,
              );
            }
            return { id: transcription.id, items };
          }

          const blankAudio = isBlankAudioText(transcription.text);
          const reviewStatus: TranscriptionReviewStatus =
            transcription.reviewStatus ?? "pending";
          const correctedText =
            typeof transcription.correctedText === "string" &&
            transcription.correctedText.trim().length > 0
              ? transcription.correctedText
              : null;
          const displayText = correctedText ?? transcription.text;
          const alertTriggers = getNotifiableAlerts(transcription.alerts);

          if (alertTriggers.length > 0) {
            items.push(
              <span
                key={`${transcription.id}-alert`}
                className="chip-button chip-button--danger"
              >
                <AlertTriangle size={14} />
                {alertTriggers
                  .map((trigger) => trigger.label || trigger.ruleId)
                  .join(", ")}
              </span>,
            );
          }

          items.push(
            <TranscriptionSegmentChips
              key={`${transcription.id}-segments`}
              transcription={transcription}
              displayText={displayText}
              blankAudio={blankAudio}
              transcriptCorrectionEnabled={transcriptCorrectionEnabled}
              recordingUrl={recordingUrl}
              recordingId={recordingId}
              playingSegmentId={playingSegment}
              onPlaySegment={playSegment}
              isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
              boundaryKey="end-marker"
            />,
          );

          if (transcriptCorrectionEnabled && reviewStatus !== "pending") {
            items.push(
              <span
                key={`${transcription.id}-status`}
                className={`review-badge review-badge--${reviewStatus}`}
              >
                {reviewStatus === "verified" ? "Verified" : "Correction saved"}
              </span>,
            );
          }

          if (transcriptCorrectionEnabled) {
            items.push(
              <div key={`${transcription.id}-review`} className="w-full">
                <TranscriptionReviewControls
                  transcription={transcription}
                  onReview={onReviewTranscription}
                  readOnly={isReadOnly}
                />
              </div>,
            );
          }

          return { id: transcription.id, items };
        });
      const transcriptionItems = transcriptionElements.flatMap(
        (entry) => entry.items,
      );

      const groupHasAlerts = group.transcriptions.some(
        (item) => getNotifiableAlerts(item.alerts).length > 0,
      );
      const hasStandardTranscriptions = group.transcriptions.some(
        (item) => !isSystemTranscription(item),
      );
      const firstPlayableTranscription = group.transcriptions.find(
        (transcription) => Boolean(transcription.recordingUrl),
      );
      const isGroupPlaying = group.transcriptions.some((transcription) => {
        if (!transcription.recordingUrl) {
          return false;
        }
        const recordingId = getRecordingElementId(transcription.recordingUrl);
        return (
          playingRecording === recordingId &&
          playingTranscriptionId === transcription.id
        );
      });
      const playButton = firstPlayableTranscription ? (
        <Button
          key={`${group.id}-play`}
          use="unstyled"
          onClick={() => {
            if (isGroupPlaying) {
              stopCurrentRecording();
              return;
            }
            handlePlayAll(streamId, firstPlayableTranscription, orderedTranscriptions);
          }}
          className="chip-button chip-button--accent"
        >
          {isGroupPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isGroupPlaying ? "Stop" : "Play all"}
        </Button>
      ) : null;

      const pagerMessages = streamIsPager
        ? condensePagerTranscriptions(
            group.transcriptions.filter((item) => !isSystemTranscription(item)),
          )
        : [];

      const elementMap = new Map(
        transcriptionElements.map((entry) => [entry.id, entry.items] as const),
      );

      const aggregatedIds =
        pagerMessages.length > 0
          ? new Set<string>(
              pagerMessages.flatMap((message) =>
                message.fragments.map((fragment) => fragment.id),
              ),
            )
          : null;

      const baseItems =
        aggregatedIds !== null
          ? transcriptionElements
              .filter((entry) => !aggregatedIds.has(entry.id))
              .flatMap((entry) => entry.items)
          : transcriptionItems;

      const pagerContent =
        pagerMessages.length > 0
          ? [
              <div
                className="transcript-thread__pager-group"
                key={`${group.id}-pager`}
              >
                {pagerMessages.map((message: CondensedPagerMessage, index) => {
                  const shouldShowIncidentMap = Boolean(
                    incidentLocationUrls && index === 0,
                  );
                  const fragmentElements = message.fragments.flatMap((fragment) =>
                    elementMap.get(fragment.id) ?? [],
                  );
                  const alertMap = new Map<
                    string,
                    ReturnType<typeof getNotifiableAlerts>[number]
                  >();
                  message.fragments.forEach((fragment) => {
                    getNotifiableAlerts(fragment.alerts).forEach((trigger) => {
                      if (!alertMap.has(trigger.ruleId)) {
                        alertMap.set(trigger.ruleId, trigger);
                      }
                    });
                  });
                  const alertChips = Array.from(alertMap.values()).map((trigger) => (
                    <span
                      key={`${message.id}-alert-${trigger.ruleId}`}
                      className="chip-button chip-button--danger pager-transcript__chip"
                    >
                      <AlertTriangle size={14} />
                      {trigger.label ?? trigger.ruleId}
                    </span>
                  ));
                  const fragmentChip =
                    message.fragments.length > 1
                      ? (
                          <span
                            key={`${message.id}-fragments`}
                            className="chip-button chip-button--surface pager-transcript__chip"
                          >
                            {message.fragments.length} fragments combined
                          </span>
                        )
                      : null;

                  const summaryText =
                    message.summary ||
                    (message.fragments[0]?.text
                      ? message.fragments[0].text.split(/\r?\n/, 1)[0]
                      : "Pager update");
                  const isFragmentsOpen = Boolean(
                    openPagerMessageIds[message.id],
                  );
                  const fragmentCountLabel = `${message.fragments.length} ${
                    message.fragments.length === 1 ? "fragment" : "fragments"
                  }`;

                  const detailFields = message.fields.filter(
                    (field) => field.key !== "raw_message",
                  );

                  const mapSection =
                    shouldShowIncidentMap && incidentLocationUrls
                      ? (
                          <div className="pager-transcript__map" key="map">
                            <iframe
                              title={`Incident map for ${incidentLocationQuery}`}
                              src={incidentLocationUrls.embed}
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              allowFullScreen
                              className="pager-transcript__map-frame"
                            />
                            {incidentLocationUrls.link ? (
                              <a
                                href={incidentLocationUrls.link}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="pager-transcript__map-link"
                              >
                                <MapPin size={14} />
                                Open in Google Maps
                              </a>
                            ) : null}
                          </div>
                        )
                      : null;

                  const notesSection =
                    message.notes.length > 0
                      ? (
                          <div className="pager-transcript__notes-card" key="notes">
                            <div className="pager-transcript__notes-title">Notes</div>
                            <ul className="pager-transcript__notes">
                              {message.notes.map((note, index) => (
                                <li key={`${message.id}-note-${index}`}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )
                      : null;

                  const sidebarSections = [
                    ...(mapSection ? [mapSection] : []),
                    ...(notesSection ? [notesSection] : []),
                  ];

                  const chipElements = [
                    ...(fragmentChip ? [fragmentChip] : []),
                    ...alertChips,
                  ];

                  return (
                    <div
                      key={message.id}
                      className={`pager-transcript${
                        sidebarSections.length > 0
                          ? " pager-transcript--with-sidebar"
                          : ""
                      }`}
                    >
                      {(summaryText || chipElements.length > 0) && (
                        <div className="pager-transcript__header">
                          {summaryText ? (
                            <div className="pager-transcript__summary">
                              {summaryText}
                            </div>
                          ) : null}
                          {chipElements.length > 0 ? (
                            <div className="pager-transcript__chips">{chipElements}</div>
                          ) : null}
                        </div>
                      )}
                      {detailFields.length > 0 || sidebarSections.length > 0 ? (
                        <div className="pager-transcript__body">
                          {detailFields.length > 0 ? (
                            <div className="pager-transcript__main">
                              <dl className="pager-transcript__details">
                                {detailFields.map((field) => (
                                  <div
                                    key={`${message.id}-${field.key}`}
                                    className="pager-transcript__detail"
                                  >
                                    <dt>{field.label}</dt>
                                    <dd>
                                      {field.values.map((value, index) =>
                                        field.format === "code" ? (
                                          <code
                                            key={`${message.id}-${field.key}-${index}`}
                                          >
                                            {value}
                                          </code>
                                        ) : (
                                          <span
                                            key={`${message.id}-${field.key}-${index}`}
                                          >
                                            {value}
                                          </span>
                                        ),
                                      )}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          ) : null}
                          {sidebarSections.length > 0 ? (
                            <aside className="pager-transcript__sidebar">
                              {sidebarSections}
                            </aside>
                          ) : null}
                        </div>
                      ) : null}
                      {fragmentElements.length > 0 ? (
                        <div
                          className={`pager-transcript__fragments${
                            isFragmentsOpen
                              ? " pager-transcript__fragments--open"
                              : ""
                          }`}
                        >
                          <Button
                            use="secondary"
                            appearance="outline"
                            size="sm"
                            className={`pager-transcript__fragments-toggle${
                              isFragmentsOpen
                                ? " pager-transcript__fragments-toggle--open"
                                : ""
                            }`}
                            startContent={
                              isFragmentsOpen ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )
                            }
                            onClick={() => togglePagerMessageFragments(message.id)}
                          >
                            {isFragmentsOpen ? "Hide raw message" : "View raw message"}
                            <span className="pager-transcript__fragment-count">
                              {fragmentCountLabel}
                            </span>
                          </Button>
                          {isFragmentsOpen ? (
                            <div className="pager-transcript__fragment-panel">
                              <div className="pager-transcript__fragment-list">
                                {fragmentElements}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>,
            ]
          : [];

      const groupContent = [
        ...(playButton ? [playButton] : []),
        ...pagerContent,
        ...baseItems,
      ];

      const transcriptContentClassName = streamIsPager
        ? "transcript-thread__content transcript-thread__content--pager"
        : "transcript-thread__content";

      return (
        <article
          key={group.id}
          className={`transcript-thread${groupHasAlerts ? " transcript-thread--alert" : ""}`}
        >
          <div className="transcript-thread__body">
            <header className="transcript-thread__header">
              {group.startTimestamp ? (
                <Timestamp
                  value={group.startTimestamp}
                  className="transcript-thread__time"
                />
              ) : (
                <span className="transcript-thread__time">Unknown</span>
              )}
              {group.transcriptions.length > 1 ? (
                <span className="transcript-thread__updates">
                  +{group.transcriptions.length - 1} updates
                </span>
              ) : null}
              {!hasStandardTranscriptions ? (
                <span className="transcript-meta__confidence transcript-meta__confidence--system">
                  System event
                </span>
              ) : null}
            </header>
            {incidentIdLabel || incidentCallType || incidentMetaParts.length > 0 || incidentNarrative ? (
              <div className="transcript-thread__incident-summary">
                {incidentIdLabel || incidentCallType ? (
                  <div className="transcript-thread__incident">
                    {incidentIdLabel ? (
                      <span className="transcript-thread__incident-id">
                        {incidentIdLabel}
                      </span>
                    ) : null}
                    {incidentCallType ? (
                      <span className="transcript-thread__incident-type">
                        {incidentCallType}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {incidentMetaParts.length > 0 ? (
                  <div className="transcript-thread__incident-meta">
                    {incidentMetaParts.map((part, index) => (
                      <span key={`${group.id}-incident-meta-${index}`}>{part}</span>
                    ))}
                  </div>
                ) : null}
                {incidentNarrative ? (
                  <div className="transcript-thread__incident-narrative">
                    {incidentNarrative}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className={transcriptContentClassName}>{groupContent}</div>
            {audioElements}
          </div>
        </article>
      );
    });

  if (visibleStreams.length === 0) {
    return (
      <section className="transcript-view">
        <div className="transcript-view__header">
          <div className="transcript-view__title">
            <Radio size={18} className="text-primary" />
            <div>
              <h2 className="h5 mb-0">Live transcriptions</h2>
              <div className="transcript-view__summary text-body-secondary small">
                Waiting for streams to come online
              </div>
            </div>
          </div>
        </div>

        <div className="transcript-view__scroller">
          <div className="transcript-view__empty">
            <Radio className="mb-3" size={36} />
            <p className="fw-semibold mb-1">No streams available</p>
            <p className="mb-0">Add a stream to see transcriptions here.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="transcript-view transcript-view--stacked transcript-view--frameless">
      <div
        className="transcript-view__scroller transcript-view__scroller--stacked"
        ref={handleFocusedViewRef}
      >
        {visibleStreams.map((stream) => {
          const statusModifier = getStatusModifier(stream.status);
          const streamIsPager = isPagerStream(stream);
          const isStandaloneStreamView =
            isStandaloneView && stream.id === focusedVisibleStreamId;
          const isExpanded = isStandaloneStreamView
            ? true
            : expandedStreams.has(stream.id);
          const historyState = historyByStream[stream.id];
          const focusState = focusByStream[stream.id];
          const statusLabel = getStatusLabel(stream.status);

          const visibleTranscriptions = selectVisibleTranscriptions(
            stream.transcriptions ?? [],
            {
              historyTranscriptions: historyState?.transcriptions ?? [],
              windowMs: INITIAL_HISTORY_WINDOW_MS,
              fallbackLimit: FALLBACK_VISIBLE_TRANSCRIPTION_COUNT,
            },
          );

          const shouldPrepareDetails = isStandaloneStreamView || isExpanded;
          let groupedTranscriptions: TranscriptionGroup[] = [];
          let orderedTranscriptions: TranscriptionResult[] =
            visibleTranscriptions;
          if (shouldPrepareDetails && visibleTranscriptions.length > 0) {
            const preparedTranscriptions = prepareTranscriptions(
              visibleTranscriptions,
            );
            groupedTranscriptions =
              preparedTranscriptions.groupedTranscriptions;
            orderedTranscriptions = preparedTranscriptions.sortedTranscriptions;
          }
          const focusPrepared = focusState
            ? prepareTranscriptions(focusState.transcriptions)
            : null;
          const hasTranscriptions = visibleTranscriptions.length > 0;
          const latestTranscription = hasTranscriptions
            ? visibleTranscriptions[visibleTranscriptions.length - 1]
            : null;
          const earliestTimestamp = hasTranscriptions
            ? visibleTranscriptions[0].timestamp
              : null;
          const isLiveListening = Boolean(liveListeningByStream[stream.id]);
          const liveAudioError = liveAudioErrorByStream[stream.id];
          const liveAudioPath = `/api/streams/${encodeURIComponent(stream.id)}/live`;
          const liveAudioUrl = liveAudioPath;
          const listenButtonUse = isLiveListening ? "success" : "primary";
          const registerLiveAudioElement = (
            element: HTMLAudioElement | null,
          ) => {
            if (element) {
              liveAudioRefs.current[stream.id] = element;
            } else {
              delete liveAudioRefs.current[stream.id];
            }
          };

          const canLoadMoreHistory = historyState?.hasMoreBefore !== false;
          const metrics = calculatePerformanceMetrics(visibleTranscriptions);
          const lastMetricsTimestamp =
            typeof metrics.lastTranscriptionTime === "number" &&
            Number.isFinite(metrics.lastTranscriptionTime)
              ? metrics.lastTranscriptionTime
              : null;
          const hasMetricsData = metrics.transcriptionCount > 0;
          const searchPanelOpen = activeSearchPanelStreamId === stream.id;
          const sanitizedStreamId = sanitizeStreamId(stream.id);
          const searchPopoverId = `stream-search-${sanitizedStreamId}`;
          const searchHeadingId = `${searchPopoverId}-title`;

          const pagerWebhookPath = canViewWebhookDetails
            ? buildPagerWebhookPath(stream)
            : null;

          const streamTitle = (
            <div className="d-flex align-items-center gap-3">
              {!isStandaloneStreamView ? (
                isExpanded ? (
                  <ChevronDown className="text-secondary" size={16} />
                ) : (
                  <ChevronRight className="text-secondary" size={16} />
                )
              ) : null}
              <Radio className="text-secondary" size={20} aria-hidden="true" />
              <div>
                <div className="transcript-stream__title-group">
                  <h3 className="h6 mb-0 text-body">{stream.name}</h3>
                  {stream.status === "stopped" ? (
                    <span className="transcript-stream__stopped-pill">
                      [STOPPED]
                    </span>
                  ) : stream.status === "queued" ? (
                    <span className="transcript-stream__queued-pill">
                      [QUEUED]
                    </span>
                  ) : null}
                </div>
                {streamIsPager ? (
                  <div className="small text-body-secondary d-flex flex-wrap align-items-center gap-2">
                    <span className="badge text-bg-info-subtle text-info-emphasis text-uppercase">
                      Pager feed
                    </span>
                    {pagerWebhookPath && <code>{pagerWebhookPath}</code>}
                  </div>
                ) : stream.url ? (
                  <a
                    href={stream.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="small text-decoration-none link-primary"
                  >
                    {stream.url}
                  </a>
                ) : null}
              </div>
            </div>
          );

          const streamMeta = (
            <div className="d-flex flex-wrap align-items-center gap-3">
              <div
                className={`transcript-stream__status transcript-stream__status--${statusModifier}`.trim()}
                role="status"
                aria-live="polite"
                aria-label={statusLabel}
                title={statusLabel}
              >
                {getStatusIcon(stream.status)}
              </div>

              <div className="small text-body-secondary">
                {visibleTranscriptions.length} visible
              </div>

              {latestTranscription && (
                <div className="small text-body-secondary">
                  Last: {" "}
                  {latestTranscription.timestamp ? (
                    <Timestamp value={latestTranscription.timestamp} />
                  ) : (
                    <span>Unknown</span>
                  )}
                </div>
              )}

              {!isReadOnly && hasTranscriptions && (
                <Button
                  size="sm"
                  use="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Are you sure you want to clear all transcriptions and recordings for "${stream.name}"? This action cannot be undone.`,
                      )
                    ) {
                      onResetStream(stream.id);
                      handleClearHistory(stream.id);
                      handleClearSearch(stream.id);
                      handleClearFocus(stream.id);
                    }
                  }}
                  title="Clear all transcriptions and recordings for this stream"
                  startContent={<RotateCcw size={14} />}
                >
                  Reset
                </Button>
              )}

              <Button
                size="sm"
                use={listenButtonUse}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLiveListening(stream.id);
                }}
                title="Toggle live audio monitoring"
                startContent={
                  isLiveListening ? (
                    <span className="live-listening-icon" aria-hidden="true">
                      <Volume2 size={14} />
                    </span>
                  ) : (
                    <Play size={14} />
                  )
                }
              >
                {isLiveListening ? "Stop listening" : "Listen live"}
              </Button>
              {isLiveListening && liveAudioUrl ? (
                <audio
                  key="live-audio-element"
                  ref={registerLiveAudioElement}
                  src={liveAudioUrl}
                  autoPlay
                  preload="none"
                  className="visually-hidden"
                  onLoadedMetadata={() => handleLiveAudioReady(stream.id)}
                  onCanPlay={() => handleLiveAudioReady(stream.id)}
                  onPlay={() => handleLiveAudioPlay(stream.id)}
                  onPlaying={() => handleLiveAudioPlay(stream.id)}
                  onError={() => handleLiveAudioError(stream.id)}
                />
              ) : null}
            </div>
          );

          const detailsId = `stream-${stream.id}-details`;

          const headerElement = isStandaloneStreamView ? null : (
            <Button
              use="unstyled"
              className={`transcript-stream__header${
                statusModifier
                  ? ` transcript-stream__header--${statusModifier}`
                  : ""
              }`}
              onClick={() => toggleStream(stream.id)}
              aria-expanded={isExpanded}
              aria-controls={detailsId}
            >
              {streamTitle}
              {streamMeta}
            </Button>
          );

          const summarySections: ReactElement[] = [];

          if (isLiveListening && liveAudioUrl && liveAudioError) {
            summarySections.push(
              <div key="live-audio-error" className="transcript-stream__summary-block">
                <div className="small text-danger" role="alert">
                  {liveAudioError}
                </div>
              </div>,
            );
          }

          if (!isStandaloneStreamView) {
            summarySections.push(
              <div key="metrics" className="transcript-stream__summary-block">
                {hasMetricsData ? (
                  <>
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
                      <div className="col">
                        <div className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3">
                          <div className="d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold">
                            <Activity size={14} className="text-primary" />
                            <span>Transcriptions</span>
                          </div>
                          <div className="fw-semibold text-body">
                            {metrics.transcriptionCount}
                          </div>
                        </div>
                      </div>

                      <div className="col">
                        <div className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3">
                          <div className="d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold">
                            <Target size={14} className="text-success" />
                            <span>Avg confidence</span>
                          </div>
                          <div className="fw-semibold text-success">
                            {clampAccuracyPercentage(
                              metrics.averageAccuracy,
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                      </div>

                      <div className="col">
                        <div className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3">
                          <div className="d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold">
                            <Clock size={14} className="text-info" />
                            <span>Avg duration</span>
                          </div>
                          <div className="fw-semibold text-info">
                            {formatDurationSeconds(metrics.averageDuration)}
                          </div>
                        </div>
                      </div>

                      <div className="col">
                        <div className="d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3">
                          <div className="d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold">
                            <BarChart3 size={14} className="text-warning" />
                            <span>Total duration</span>
                          </div>
                          <div className="fw-semibold text-warning">
                            {formatDurationSeconds(metrics.totalDuration)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {lastMetricsTimestamp ? (
                      <div className="mt-2 small text-body-secondary">
                        Last transcription: {" "}
                        <Timestamp value={lastMetricsTimestamp} mode="datetime" />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="small text-body-secondary">
                    No transcription metrics available yet.
                  </div>
                )}
              </div>,
            );
          }

          const renderedSummarySections = summarySections.map(
            (section, index) =>
              cloneElement(section, {
                className: [
                  section.props.className ?? "",
                  headerElement && index === 0
                    ? "transcript-stream__summary-block--with-header"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" "),
              }),
          );

          return (
            <div
              key={stream.id}
              className={`transcript-stream${
                isExpanded ? " transcript-stream--expanded" : ""
              }${statusModifier ? ` transcript-stream--${statusModifier}` : ""}`}
            >
              {headerElement}

              {renderedSummarySections}

              {isExpanded && (
                <div className="transcript-stream__details" id={detailsId}>
                  {focusState && (
                    <div className="border border-border rounded-md p-3 text-sm bg-surface-subtle transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-ink-muted">
                            Context around{" "}
                            {focusState.anchor ? (
                              <Timestamp
                                value={focusState.anchor}
                                mode="datetime"
                              />
                            ) : (
                              "selected time"
                            )}{" "}
                            (±{focusState.windowMinutes} min)
                          </div>
                          {focusState.anchor && (
                            <div className="text-xs text-ink-subtle">
                              {focusState.transcriptions.length} transcripts in
                              window
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            use="unstyled"
                            onClick={() =>
                              handleMergeFocusIntoHistory(stream.id)
                            }
                            disabled={focusState.transcriptions.length === 0}
                            className="px-2 py-1 text-xs bg-insight text-on-accent rounded hover:bg-insight-strong disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Add to timeline
                          </Button>
                          <Button
                            use="unstyled"
                            onClick={() => handleClearFocus(stream.id)}
                            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                          >
                            <X className="w-3 h-3" />
                            Clear
                          </Button>
                        </div>
                      </div>
                      {focusState.loading ? (
                        <div className="text-xs text-ink-subtle flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading context...
                        </div>
                      ) : focusState.error ? (
                        <div className="text-xs text-danger">
                          {focusState.error}
                        </div>
                      ) : focusState.transcriptions.length > 0 ? (
                        <div className="space-y-2">
                          {focusPrepared &&
                            renderGroupedTranscriptions(
                              stream.id,
                              focusPrepared.groupedTranscriptions,
                              focusPrepared.sortedTranscriptions,
                              streamIsPager,
                            )}
                        </div>
                      ) : (
                        <div className="text-xs text-ink-subtle">
                          No transcripts found in this window.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="transcript-stream__controls">
                    <div className="transcript-stream__toolbar">

                      {!isStandaloneStreamView ? (
                        <div className="transcript-stream__search">
                          <Button
                            size="sm"
                            use="primary"
                            appearance="outline"
                            onClick={() => toggleSearchPanel(stream.id)}
                            aria-expanded={searchPanelOpen}
                            aria-controls={
                              searchPanelOpen ? searchPopoverId : undefined
                            }
                            startContent={<Search size={14} />}
                            isCondensed
                            tooltip={
                              searchPanelOpen ? "Hide search" : "Search history"
                            }
                          >
                            {searchPanelOpen ? "Hide search" : "Search history"}
                          </Button>

                          {searchPanelOpen
                            ? renderSearchContent(stream.id, closeSearchPanel, {
                                id: searchPopoverId,
                                headingId: searchHeadingId,
                                variant: "popover",
                              })
                            : null}
                        </div>
                      ) : null}

                      {!isStandaloneStreamView ? (
                        <form
                          className="transcript-stream__jump-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const timestampValue =
                              jumpTimestampByStream[stream.id];
                            const windowMinutes =
                              jumpWindowByStream[stream.id] ??
                              DEFAULT_FOCUS_WINDOW_MINUTES;
                            if (!timestampValue) {
                              setFocusByStream((prev) => ({
                                ...prev,
                                [stream.id]: {
                                  anchor: null,
                                  windowMinutes,
                                  transcriptions: [],
                                  loading: false,
                                  error: "Enter a date and time to jump to.",
                                },
                              }));
                              return;
                            }
                            const parsed = new Date(timestampValue);
                            if (Number.isNaN(parsed.getTime())) {
                              setFocusByStream((prev) => ({
                                ...prev,
                                [stream.id]: {
                                  anchor: null,
                                  windowMinutes,
                                  transcriptions: [],
                                  loading: false,
                                  error: "Invalid date or time value.",
                                },
                              }));
                              return;
                            }
                            setJumpTimestampByStream((prev) => ({
                              ...prev,
                              [stream.id]: timestampValue,
                            }));
                            void handleGoToTimestamp(
                              stream.id,
                              parsed.toISOString(),
                              windowMinutes,
                            );
                          }}
                        >
                          <span className="transcript-stream__toolbar-label">
                            Go to timestamp
                          </span>
                          <div className="transcript-stream__jump-inputs">
                            <div className="transcript-stream__jump-input">
                              <CalendarClock size={16} aria-hidden="true" />
                              <input
                                type="datetime-local"
                                value={jumpTimestampByStream[stream.id] ?? ""}
                                onChange={(event) =>
                                  setJumpTimestampByStream((prev) => ({
                                    ...prev,
                                    [stream.id]: event.target.value,
                                  }))
                                }
                                className="form-control form-control-sm"
                              />
                            </div>
                            <select
                              value={String(
                                jumpWindowByStream[stream.id] ??
                                  DEFAULT_FOCUS_WINDOW_MINUTES,
                              )}
                              onChange={(event) =>
                                setJumpWindowByStream((prev) => ({
                                  ...prev,
                                  [stream.id]: Number(event.target.value),
                                }))
                              }
                              className="form-select form-select-sm"
                            >
                              <option value="5">±5 min</option>
                              <option value="10">±10 min</option>
                              <option value="30">±30 min</option>
                            </select>
                            <Button
                              type="submit"
                              size="sm"
                              use="success"
                              disabled={focusState?.loading ?? false}
                              isContentInline={focusState?.loading ? false : undefined}
                            >
                              {focusState?.loading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Go"
                              )}
                            </Button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  {hasTranscriptions ? (
                    <div className="transcript">
                      <StreamTranscriptList
                        orderedTranscriptions={orderedTranscriptions}
                        isTranscribing={stream.enabled}
                        onLoadEarlier={
                          canLoadMoreHistory
                            ? () =>
                                handleLoadEarlierHistory(
                                  stream.id,
                                  earliestTimestamp ?? new Date().toISOString(),
                                )
                            : null
                        }
                        hasMoreHistory={canLoadMoreHistory}
                        isLoadingHistory={historyState?.loading ?? false}
                        historyError={historyState?.error ?? null}
                      >
                        {renderGroupedTranscriptions(
                          stream.id,
                          groupedTranscriptions,
                          orderedTranscriptions,
                          streamIsPager,
                        )}
                      </StreamTranscriptList>
                    </div>
                  ) : (
                    <div className="transcript">
                      <div className="text-center py-8 text-sm text-neutral">
                        {visibleTranscriptions.length === 0 &&
                        historyState?.transcriptions?.length ? (
                          "No transcriptions in recent history."
                        ) : stream.enabled ? (
                          <span className="flex items-center justify-center gap-2 text-accent">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Listening for new audio…</span>
                          </span>
                        ) : (
                          "No transcriptions yet for this stream."
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
