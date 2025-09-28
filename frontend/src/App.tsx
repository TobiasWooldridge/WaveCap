import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Play,
  RotateCcw,
  AlertTriangle,
  Pause,
  MicOff,
  Clock,
  Menu,
  SlidersHorizontal,
  LogIn,
  Activity,
  Pencil,
} from "lucide-react";
import { useStreams, STREAM_TRANSCRIPTION_PREVIEW_LIMIT } from "./hooks/useTranscriptions";
import {
  useWebSocket,
  type WebSocketCommandResult,
} from "./hooks/useWebSocket";
import {
  StreamTranscriptionPanel,
  type StandaloneStreamControls,
} from "./components/StreamTranscriptionPanel.react";
import {
  ClientCommandType,
  Stream,
  StreamUpdate,
  ThemeMode,
  TranscriptionResult,
  TranscriptionReviewStatus,
  StreamCommandState,
  CombinedStreamView,
} from "@types";
import { CombinedTranscriptionLog } from "./components/CombinedTranscriptionLog.react";
import { dedupeAndSortTranscriptions } from "./components/StreamTranscriptionPanel.logic";
import { useUISettings } from "./contexts/UISettingsContext";
import SettingsModal from "./components/SettingsModal.react";
import { useToast } from "./hooks/useToast";
import { useAuth } from "./contexts/AuthContext";
import AppHeader from "./components/AppHeader.react";
import StreamSidebar, {
  type StreamSidebarItem,
  type StreamSortMode,
} from "./components/StreamSidebar.react";
import { buildSidebarComparator } from "./utils/sidebarSort";
import StreamStatusIndicator from "./components/StreamStatusIndicator.react";
import Spinner from "./components/primitives/Spinner.react";
import { Timestamp } from "./components/primitives/Timestamp.react";
import { TimeInterval } from "./components/primitives/TimeInterval.react";
import Button from "./components/primitives/Button.react";
import ButtonGroup from "./components/primitives/ButtonGroup.react";
import InlineText from "./components/primitives/InlineText.react";
import { useResponsiveLayout } from "./hooks/useResponsiveLayout";
import { useKeywordAlerts } from "./hooks/useKeywordAlerts";
import { useStreamSelection } from "./hooks/useStreamSelection";
import { useExportSettings } from "./hooks/useExportSettings";
import { usePagerExport } from "./hooks/usePagerExport";
import { useCombinedStreamViews } from "./hooks/useCombinedStreamViews";
import { compareStreamsByName, getStreamTitle, getSdrFrequencyHz, formatFrequency } from "./utils/streams";
import {
  getStoredLastViewedMap,
  LAST_VIEWED_STORAGE_KEY,
  parseLastViewedMapString,
  storeLastViewedMap,
} from "./utils/unreadStorage";
import "./App.scss";

const REVIEW_STATUS_OPTIONS: Array<{
  value: TranscriptionReviewStatus;
  label: string;
}> = [
  { value: "verified", label: "Verified" },
  { value: "corrected", label: "Corrected" },
  { value: "pending", label: "Pending" },
];
const REVIEW_STATUS_ORDER = REVIEW_STATUS_OPTIONS.map((option) => option.value);
const GENERIC_SERVER_ERROR_MESSAGE = "An unexpected server error occurred.";

const DEFAULT_ACK_MESSAGES: Record<ClientCommandType, string> = {
  start_transcription: "Transcription started.",
  stop_transcription: "Transcription stopped.",
  reset_stream: "Stream reset.",
  update_stream: "Stream updated.",
};

const DEFAULT_ERROR_MESSAGES: Record<ClientCommandType, string> = {
  start_transcription: "Unable to start transcription. Please try again.",
  stop_transcription: "Unable to stop transcription. Please try again.",
  reset_stream: "Unable to reset stream. Please try again.",
  update_stream: "Unable to update stream. Please try again.",
};

const DEFAULT_DOCUMENT_TITLE = "WaveCap Transcription";
const MOBILE_ACTIONS_PANEL_ID = "conversation-mobile-actions-panel";

const STREAM_SORT_STORAGE_KEY = "wavecap-stream-sort-mode";
const STREAM_SORT_DEFAULT: StreamSortMode = "activity";

const resolveCommandMessage = (
  action: ClientCommandType,
  message: string | undefined,
  fallbacks: Record<ClientCommandType, string>,
): string => {
  const trimmed = message?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return fallbacks[action];
};

const parseStreamSortMode = (value: unknown): StreamSortMode | null => {
  if (value === "activity" || value === "name") {
    return value;
  }
  return null;
};

const getStoredStreamSortMode = (): StreamSortMode => {
  if (typeof window === "undefined") {
    return STREAM_SORT_DEFAULT;
  }

  const stored = window.localStorage.getItem(STREAM_SORT_STORAGE_KEY);
  return parseStreamSortMode(stored) ?? STREAM_SORT_DEFAULT;
};

const safeTimestamp = (timestamp?: string | null): number => {
  if (!timestamp) {
    return 0;
  }

  const value = new Date(timestamp).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const getLatestTranscription = (
  stream?: Stream | null,
): TranscriptionResult | null => {
  if (
    !stream ||
    !Array.isArray(stream.transcriptions) ||
    stream.transcriptions.length === 0
  ) {
    return null;
  }

  return stream.transcriptions.reduce<TranscriptionResult | null>(
    (latest, current) => {
      if (!current) {
        return latest;
      }

      if (!latest) {
        return current;
      }

      return safeTimestamp(current.timestamp) > safeTimestamp(latest.timestamp)
        ? current
        : latest;
    },
    null,
  );
};

const getLatestActivityTimestamp = (stream?: Stream | null): number => {
  if (!stream) {
    return 0;
  }

  const latestTranscription = getLatestTranscription(stream);
  const transcriptionTimestamp = latestTranscription
    ? safeTimestamp(latestTranscription.timestamp)
    : 0;
  const lastActivityTimestamp = safeTimestamp(stream.lastActivityAt);
  const createdTimestamp = safeTimestamp(stream.createdAt);

  return Math.max(transcriptionTimestamp, lastActivityTimestamp, createdTimestamp);
};

const countUnreadTranscriptions = (
  stream: Stream,
  lastViewedAt: number,
): number => {
  if (!stream?.transcriptions || stream.transcriptions.length === 0) {
    return 0;
  }

  return stream.transcriptions.reduce((count, transcription) => {
    return safeTimestamp(transcription.timestamp) > lastViewedAt
      ? count + 1
      : count;
  }, 0);
};

const isPagerStream = (stream?: Stream | null): boolean => {
  return (stream?.source ?? "audio") === "pager";
};

const buildPagerWebhookUrl = (stream: Stream): string | null => {
  if (!isPagerStream(stream)) {
    return null;
  }

  const base = stream.url ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  try {
    const url = origin ? new URL(base, origin) : new URL(base);
    if (stream.webhookToken) {
      url.searchParams.set("token", stream.webhookToken);
    }
    return url.toString();
  } catch (error) {
    console.warn("Failed to construct pager webhook URL:", error);
    if (stream.webhookToken) {
      const separator = base.includes("?") ? "&" : "?";
      return `${base}${separator}token=${stream.webhookToken}`;
    }
    return base || null;
  }
};

const buildPagerWebhookPath = (stream: Stream): string | null => {
  if (!isPagerStream(stream)) {
    return null;
  }

  const token = stream.webhookToken;
  const base = stream.url ?? "";
  if (!base && !token) {
    return null;
  }

  const suffix = token ? `${base.includes("?") ? "&" : "?"}token=${token}` : "";
  return `${base}${suffix}`;
};

const buildPreviewText = (
  transcription: TranscriptionResult | null,
): string => {
  if (!transcription) {
    return "No activity yet";
  }

  const text = transcription.correctedText ?? transcription.text ?? "";
  const trimmed = text.trim();

  if (!trimmed) {
    return "[Blank audio]";
  }

  if (trimmed.length > 200) {
    return `${trimmed.slice(0, 197)}…`;
  }

  return trimmed;
};

const renderStandaloneStatusIcon = (
  modifier: StandaloneStreamControls["statusModifier"],
) => {
  switch (modifier) {
    case "transcribing":
      return <Activity className="w-4 h-4" aria-hidden="true" />;
    case "queued":
      return <Clock className="w-4 h-4" aria-hidden="true" />;
    case "error":
      return <AlertTriangle className="w-4 h-4" aria-hidden="true" />;
    default:
      return <MicOff className="w-4 h-4" aria-hidden="true" />;
  }
};

type CombinedViewInstance = {
  view: CombinedStreamView;
  stream: Stream;
  members: Stream[];
  missingStreamIds: string[];
};

function App() {
  const {
    themeMode,
    setThemeMode,
    colorCodingEnabled,
    setColorCodingEnabled,
    transcriptCorrectionEnabled,
    setTranscriptCorrectionEnabled,
    defaultReviewExportStatuses,
  } = useUISettings();
  const [showSettings, setShowSettings] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const settingsCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const {
    streams,
    loading,
    initialized: streamsInitialized,
    error,
    addTranscription,
    updateStreams,
    reviewTranscription,
    patchStream,
    fetchStreams,
  } = useStreams();
  const {
    data: combinedStreamViews = [],
    isFetching: combinedViewsLoading,
    isFetched: combinedViewsFetched,
    error: combinedViewsError,
  } = useCombinedStreamViews();

  const {
    role,
    authenticated,
    token,
    login,
    logout,
    loginVisible,
    setLoginVisible,
    requestLogin,
    requiresPassword,
    authFetch,
  } = useAuth();
  const isReadOnly = role !== "editor";
  const canViewWebhookDetails =
    !isReadOnly && (authenticated || !requiresPassword);
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    isConnected: wsConnected,
    lastMessage,
    resetStream: wsResetStream,
    updateStream: wsUpdateStream,
  } = useWebSocket("/ws", { token, onUnauthorized: requestLogin });
  const { showToast } = useToast();
  const { keywordAlerts, handleAlertMatches, handleDismissAlert } =
    useKeywordAlerts(streams);
  const [pendingStreamCommands, setPendingStreamCommands] =
    useState<Record<string, StreamCommandState>>({});
  const hadWsConnectionRef = useRef(false);
  const shouldRefetchStreamsRef = useRef(false);
  const setStreamCommandState = useCallback(
    (streamId: string, action: StreamCommandState | null) => {
      setPendingStreamCommands((previous) => {
        if (action === null) {
          if (!(streamId in previous)) {
            return previous;
          }
          const next = { ...previous };
          delete next[streamId];
          return next;
        }
        if (previous[streamId] === action) {
          return previous;
        }
        return { ...previous, [streamId]: action };
      });
    },
    [],
  );

  const requireEditor = useCallback(
    (actionDescription: string) => {
      if (!isReadOnly) {
        return true;
      }
      requestLogin();
      showToast({
        variant: "info",
        title: "Read-only mode",
        message: `Sign in to ${actionDescription}.`,
      });
      return false;
    },
    [isReadOnly, requestLogin, showToast],
  );

  const {
    exportStatuses,
    exporting,
    exportError,
    handleExportStatusToggle,
    handleExportTranscriptions,
  } = useExportSettings({
    defaultStatuses: defaultReviewExportStatuses,
    statusOrder: REVIEW_STATUS_ORDER,
    requireEditor,
    authFetch,
  });

  const {
    pagerStreams,
    selectedStreamId: selectedPagerStreamId,
    exporting: exportingPagerFeed,
    exportError: pagerExportError,
    selectStream: selectPagerExportStream,
    exportPagerFeed,
  } = usePagerExport({
    streams,
    requireEditor,
    authFetch,
  });

  useEffect(() => {
    if (!loginVisible) {
      setLoginPassword("");
      setLoginError(null);
      setLoggingIn(false);
    }
  }, [loginVisible]);

  const {
    isMobileViewport,
    isMobileSidebarOpen,
    isMobileActionsOpen,
    setIsMobileActionsOpen,
    openMobileSidebar,
    closeMobileSidebar,
  } = useResponsiveLayout();

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    const trigger = settingsTriggerRef.current;
    if (trigger) {
      trigger.focus();
    }
  }, []);

  useEffect(() => {
    if (!showSettings) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const closeButton = settingsCloseButtonRef.current;
    if (closeButton) {
      closeButton.focus();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSettings, showSettings]);


  useEffect(() => {
    if (!wsConnected) {
      if (hadWsConnectionRef.current) {
        shouldRefetchStreamsRef.current = true;
      }
      return;
    }

    if (shouldRefetchStreamsRef.current) {
      shouldRefetchStreamsRef.current = false;
      void fetchStreams();
    }

    hadWsConnectionRef.current = true;
  }, [fetchStreams, wsConnected]);

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    if (lastMessage.type === "transcription" && lastMessage.data) {
      const transcription = lastMessage.data as TranscriptionResult;
      addTranscription(transcription);
      handleAlertMatches(transcription);
      return;
    }

    switch (lastMessage.type) {
      case "streams_update":
        if (lastMessage.data) {
          console.log("📡 Received streams_update:", lastMessage.data);
          updateStreams(lastMessage.data as StreamUpdate[]);
        }
        break;
      case "error":
        console.error("WebSocket error:", lastMessage.message);
        break;
    }
  }, [lastMessage, addTranscription, updateStreams, handleAlertMatches]);

  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    if (lastMessage.type === "ack") {
      const resolvedMessage = resolveCommandMessage(
        lastMessage.action,
        lastMessage.message,
        DEFAULT_ACK_MESSAGES,
      );
      showToast({ variant: "success", message: resolvedMessage });
    } else if (lastMessage.type === "error" && !lastMessage.requestId) {
      const message =
        lastMessage.message?.trim() || GENERIC_SERVER_ERROR_MESSAGE;
      const normalized = message.toLowerCase();
      if (
        normalized.includes("editor access required") ||
        normalized.includes("invalid or expired token")
      ) {
        requestLogin();
      }
      showToast({ variant: "error", title: "Action failed", message });
    }
  }, [lastMessage, requestLogin, showToast]);

  const reportCommandFailure = useCallback(
    (action: ClientCommandType, message?: string) => {
      const normalizedMessage = message?.toLowerCase() ?? "";
      if (
        normalizedMessage.includes("editor access required") ||
        normalizedMessage.includes("invalid or expired token")
      ) {
        requestLogin();
      }
      const resolvedMessage = resolveCommandMessage(
        action,
        message,
        DEFAULT_ERROR_MESSAGES,
      );
      showToast({
        variant: "error",
        title: "Action failed",
        message: resolvedMessage,
      });
      return resolvedMessage;
    },
    [requestLogin, showToast],
  );

  const optimisticallyUpdateStream = useCallback(
    (streamId: string, updates: Partial<Stream>) => {
      patchStream(streamId, (stream) => {
        const next: Partial<Stream> = { ...updates };

        if (next.status === "transcribing" && stream.error) {
          next.error = null;
        }

        const changed = Object.entries(next).some(([key, value]) => {
          if (value === undefined) {
            return false;
          }
          const currentValue = stream[key as keyof Stream];
          return currentValue !== value;
        });

        return changed ? next : null;
      });
    },
    [patchStream],
  );

  const handleUpdateStream = useCallback(
    async (
      streamId: string,
      updates: {
        name?: string;
        language?: string;
        ignoreFirstSeconds?: number;
      },
    ): Promise<WebSocketCommandResult> => {
      if (!requireEditor("edit streams")) {
        return {
          success: false,
          action: "update_stream",
          message: "Sign in to edit streams.",
        };
      }
      setStreamCommandState(streamId, "updating");
      try {
        const result = await wsUpdateStream(streamId, updates);
        if (!result.success) {
          reportCommandFailure(result.action, result.message);
          return result;
        }
        optimisticallyUpdateStream(streamId, updates as Partial<Stream>);
        return result;
      } catch (error) {
        console.error("Failed to update stream:", error);
        reportCommandFailure("update_stream");
        return { success: false, action: "update_stream" };
      } finally {
        setStreamCommandState(streamId, null);
      }
    },
    [
      optimisticallyUpdateStream,
      reportCommandFailure,
      requireEditor,
      setStreamCommandState,
      wsUpdateStream,
    ],
  );

  // Start/Stop are not controlled by UI anymore.

  const handleResetStream = useCallback(
    async (streamId: string) => {
      if (!requireEditor("reset streams")) {
        return;
      }
      setStreamCommandState(streamId, "resetting");
      try {
        const result = await wsResetStream(streamId);
        if (!result.success) {
          reportCommandFailure(result.action, result.message);
        }
      } catch (error) {
        console.error("Failed to reset stream:", error);
        reportCommandFailure("reset_stream");
      } finally {
        setStreamCommandState(streamId, null);
      }
    },
    [
      reportCommandFailure,
      requireEditor,
      setStreamCommandState,
      wsResetStream,
    ],
  );

  const handleThemeModeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setThemeMode(event.target.value as ThemeMode);
    },
    [setThemeMode],
  );

  const handleColorCodingToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setColorCodingEnabled(event.target.checked);
    },
    [setColorCodingEnabled],
  );

  const handleTranscriptCorrectionToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTranscriptCorrectionEnabled(event.target.checked);
    },
    [setTranscriptCorrectionEnabled],
  );

  const handleLoginPasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLoginPassword(event.target.value);
    },
    [],
  );

  const handleLoginSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoggingIn(true);
      setLoginError(null);
      try {
        await login({ password: loginPassword.trim() });
        setLoginVisible(false);
        setLoginPassword("");
      } catch (error) {
        setLoginError(
          error instanceof Error ? error.message : "Unable to sign in.",
        );
      } finally {
        setLoggingIn(false);
      }
    },
    [login, loginPassword, setLoginVisible],
  );

  const handleCancelLogin = useCallback(() => {
    setLoginVisible(false);
  }, [setLoginVisible]);

  const normalizedStreams = useMemo(
    () => (Array.isArray(streams) ? streams : []),
    [streams],
  );
  const combinedViewData = useMemo(() => {
    const map = new Map<string, CombinedViewInstance>();
    const virtualStreams: Stream[] = [];
    const streamLookup = new Map(
      normalizedStreams.map((stream) => [stream.id, stream]),
    );

    combinedStreamViews.forEach((view) => {
      const members = view.streamIds
        .map((streamId) => streamLookup.get(streamId))
        .filter((stream): stream is Stream => Boolean(stream));
      const missingStreamIds = view.streamIds.filter(
        (streamId) => !streamLookup.has(streamId),
      );

      const combinedTranscriptions = dedupeAndSortTranscriptions(
        members.flatMap((stream) => stream.transcriptions ?? []),
      );
      const trimmedTranscriptions =
        combinedTranscriptions.length > STREAM_TRANSCRIPTION_PREVIEW_LIMIT
          ? combinedTranscriptions.slice(
              combinedTranscriptions.length -
                STREAM_TRANSCRIPTION_PREVIEW_LIMIT,
            )
          : combinedTranscriptions;

      const activityCandidates: number[] = [];
      trimmedTranscriptions.forEach((transcription) => {
        activityCandidates.push(safeTimestamp(transcription.timestamp));
      });
      members.forEach((stream) => {
        const activity =
          safeTimestamp(stream.lastActivityAt) ||
          safeTimestamp(stream.createdAt);
        if (activity > 0) {
          activityCandidates.push(activity);
        }
      });
      const lastActivityMs =
        activityCandidates.length > 0 ? Math.max(...activityCandidates) : 0;
      const lastActivityAt =
        lastActivityMs > 0 ? new Date(lastActivityMs).toISOString() : null;

      const createdCandidates = members
        .map((stream) => safeTimestamp(stream.createdAt))
        .filter((value) => value > 0);
      const createdAtMs =
        createdCandidates.length > 0
          ? Math.min(...createdCandidates)
          : Date.now();
      const createdAt = new Date(createdAtMs).toISOString();

      const anyTranscribing = members.some(
        (stream) => stream.status === "transcribing",
      );
      const anyQueued = members.some((stream) => stream.status === "queued");
      const anyEnabled = members.some((stream) => stream.enabled);
      const anyError = members.some(
        (stream) => stream.status === "error" || Boolean(stream.error),
      );

      let status: Stream["status"] = "stopped";
      if (missingStreamIds.length > 0) {
        status = "error";
      } else if (anyError) {
        status = "error";
      } else if (anyTranscribing) {
        status = "transcribing";
      } else if (anyQueued) {
        status = "queued";
      }

      const enabled =
        status === "transcribing" || status === "queued" || anyEnabled;

      const errorMessage =
        missingStreamIds.length > 0
          ? `Missing streams: ${missingStreamIds.join(", ")}`
          : anyError
          ? "One or more streams reporting errors"
          : null;

      const combinedStream: Stream = {
        id: view.id,
        name: view.name,
        url: `combined:${view.id}`,
        status,
        enabled,
        pinned: false,
        createdAt,
        transcriptions: trimmedTranscriptions,
        source: "combined",
        ignoreFirstSeconds: 0,
        lastActivityAt,
        error: errorMessage,
        combinedStreamIds: [...view.streamIds],
      };

      map.set(view.id, {
        view,
        stream: combinedStream,
        members,
        missingStreamIds,
      });
      virtualStreams.push(combinedStream);
    });

    return { map, virtualStreams };
  }, [combinedStreamViews, normalizedStreams]);

  const combinedViewMap = combinedViewData.map;
  const virtualStreams = combinedViewData.virtualStreams;

  const displayStreams = useMemo(
    () => [...normalizedStreams, ...virtualStreams],
    [normalizedStreams, virtualStreams],
  );

  const totalTranscriptions = normalizedStreams.reduce(
    (total, stream) => total + (stream.transcriptions?.length || 0),
    0,
  );
  const activeStreams = normalizedStreams.filter(
    (stream) => stream.status === "transcribing",
  ).length;

  const [standaloneControls, setStandaloneControls] =
    useState<StandaloneStreamControls | null>(null);
  const [lastViewedAtByConversation, setLastViewedAtByConversation] = useState<
    Record<string, number>
  >(() => getStoredLastViewedMap());
  const [streamSortMode, setStreamSortMode] = useState<StreamSortMode>(() =>
    getStoredStreamSortMode(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STREAM_SORT_STORAGE_KEY, streamSortMode);
  }, [streamSortMode]);

  // Persist last-viewed timestamps to localStorage whenever they change
  useEffect(() => {
    storeLastViewedMap(lastViewedAtByConversation);
  }, [lastViewedAtByConversation]);

  // Update from other tabs when the storage changes
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LAST_VIEWED_STORAGE_KEY) {
        return;
      }
      const next = parseLastViewedMapString(event.newValue);
      setLastViewedAtByConversation((prev) => {
        // shallow equality check to avoid unnecessary renders
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) {
          return next;
        }
        for (const key of prevKeys) {
          if (prev[key] !== next[key]) {
            return next;
          }
        }
        return prev;
      });
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const sortedConversations = useMemo(() => {
    if (displayStreams.length === 0) {
      return [] as Stream[];
    }

    return [...displayStreams].sort((a, b) => {
      const aPinned = Boolean(a.pinned);
      const bPinned = Boolean(b.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }

      if (streamSortMode === "name") {
        // Explicit A–Z ordering by human-readable title
        const nameComparison = (() => {
          const collator = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: "base",
          });
          const aTitle = getStreamTitle(a);
          const bTitle = getStreamTitle(b);
          // A–Z ascending order
          return collator.compare(aTitle, bTitle);
        })();
        if (nameComparison !== 0) return nameComparison;
        const activityDifference =
          getLatestActivityTimestamp(b) - getLatestActivityTimestamp(a);
        if (activityDifference !== 0) {
          return activityDifference;
        }
        return a.id.localeCompare(b.id);
      }

      const activityDifference =
        getLatestActivityTimestamp(b) - getLatestActivityTimestamp(a);
      if (activityDifference !== 0) {
        return activityDifference;
      }

      return compareStreamsByName(a, b);
    });
  }, [displayStreams, streamSortMode]);

  const handleStreamSortModeChange = useCallback(
    (mode: StreamSortMode) => {
      setStreamSortMode((previous) => (previous === mode ? previous : mode));
    },
    [],
  );

  const selectionInitialized = streamsInitialized && combinedViewsFetched;
  const { selectedStreamId, selectStream } = useStreamSelection(
    sortedConversations,
    {
      streamsInitialized: selectionInitialized,
    },
  );
  const sidebarLoading = loading || combinedViewsLoading;
  const showAuthLoading = sidebarLoading && !selectionInitialized;
  const combinedViewsErrorMessage = combinedViewsError?.message ?? null;

  const streamSidebarItems = useMemo<StreamSidebarItem[]>(() => {
    const raw: StreamSidebarItem[] = displayStreams.map((stream) => {
      const latestTranscription = getLatestTranscription(stream);
      const title = getStreamTitle(stream);
      const latestTimestamp = getLatestActivityTimestamp(stream);

      return {
        id: stream.id,
        type: stream.source === "combined" ? "combined" : "stream",
        title,
        previewText: buildPreviewText(latestTranscription),
        previewTime:
          latestTimestamp > 0 ? (
            <Timestamp
              value={latestTimestamp}
              timeOptions={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            />
          ) : null,
        unreadCount: countUnreadTranscriptions(
          stream,
          lastViewedAtByConversation[stream.id] ?? 0,
        ),
        stream,
        isPager: isPagerStream(stream),
        isActive: selectedStreamId === stream.id,
        isPinned: Boolean(stream.pinned),
      };
    });

    const comparator = buildSidebarComparator(streamSortMode);
    const items = [...raw].sort(comparator);

    return items;
  }, [
    displayStreams,
    lastViewedAtByConversation,
    selectedStreamId,
    streamSortMode,
  ]);

  const selectedStream = useMemo(() => {
    if (!selectedStreamId) {
      return null;
    }

    return (
      sortedConversations.find((stream) => stream.id === selectedStreamId) ??
      null
    );
  }, [sortedConversations, selectedStreamId]);

  useEffect(() => {
    if (!selectedStream || selectedStream.source === "combined") {
      setStandaloneControls(null);
    }
  }, [selectedStream]);

  useEffect(() => {
    setIsMobileActionsOpen(false);
  }, [selectedStreamId, setIsMobileActionsOpen]);

  const selectedStreamLatestTimestamp = useMemo(
    () => (selectedStream ? getLatestActivityTimestamp(selectedStream) : 0),
    [selectedStream],
  );
  const selectedStreamTitle = selectedStream
    ? getStreamTitle(selectedStream)
    : "";
  const selectedStreamIsPager = useMemo(
    () => (selectedStream?.source ?? "audio") === "pager",
    [selectedStream],
  );
  const selectedStreamIsCombined = useMemo(
    () => (selectedStream?.source ?? "audio") === "combined",
    [selectedStream],
  );
  const selectedStreamIsSdr = useMemo(
    () => (selectedStream?.source ?? "audio") === "sdr",
    [selectedStream],
  );
  const selectedSdrFrequencyLabel = useMemo(() => {
    if (!selectedStream || !selectedStreamIsSdr) return null;
    const hz = getSdrFrequencyHz(selectedStream);
    return hz ? formatFrequency(hz) : null;
  }, [selectedStream, selectedStreamIsSdr]);
  const selectedCombinedMetadata = selectedStream
    ? combinedViewMap.get(selectedStream.id) ?? null
    : null;
  const selectedCombinedMembers = useMemo(
    () => selectedCombinedMetadata?.members ?? [],
    [selectedCombinedMetadata],
  );
  const selectedCombinedMissing =
    selectedCombinedMetadata?.missingStreamIds ?? [];
  const selectedCombinedView = selectedCombinedMetadata?.view ?? null;
  const combinedMemberNames = useMemo(
    () =>
      selectedCombinedMembers.map(
        (stream) => stream.name?.trim() || stream.url?.trim() || stream.id,
      ),
    [selectedCombinedMembers],
  );
  const combinedMemberList = combinedMemberNames.join(", ");

  useEffect(() => {
    if (selectedStream && (selectedStream.source ?? "audio") === "pager") {
      selectPagerExportStream(selectedStream.id);
    }
  }, [selectedStream, selectPagerExportStream]);
  const selectedStreamWebhookUrl = useMemo(() => {
    if (!selectedStream || !canViewWebhookDetails) {
      return null;
    }
    if ((selectedStream.source ?? "audio") !== "pager") {
      return null;
    }
    return buildPagerWebhookUrl(selectedStream);
  }, [canViewWebhookDetails, selectedStream]);
  const selectedStreamWebhookPath = useMemo(() => {
    if (!selectedStream || !canViewWebhookDetails) {
      return null;
    }
    if ((selectedStream.source ?? "audio") !== "pager") {
      return null;
    }
    return buildPagerWebhookPath(selectedStream);
  }, [canViewWebhookDetails, selectedStream]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!selectedStreamId || !selectedStreamTitle) {
      document.title = DEFAULT_DOCUMENT_TITLE;
      return;
    }

    document.title = `${selectedStreamTitle} – ${DEFAULT_DOCUMENT_TITLE}`;
  }, [selectedStreamId, selectedStreamTitle]);

  useEffect(() => {
    setLastViewedAtByConversation((current) => {
      let changed = false;
      const next = { ...current };

      sortedConversations.forEach((stream) => {
        if (!(stream.id in next)) {
          next[stream.id] = getLatestActivityTimestamp(stream);
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [sortedConversations]);

  useEffect(() => {
    if (!selectedStreamId || !selectedStream) {
      return;
    }

    const latestTimestamp = getLatestActivityTimestamp(selectedStream);

    if (!latestTimestamp) {
      return;
    }

    setLastViewedAtByConversation((current) => {
      const previous = current[selectedStreamId] ?? 0;
      if (previous >= latestTimestamp) {
        return current;
      }

      return {
        ...current,
        [selectedStreamId]: latestTimestamp,
      };
    });
  }, [selectedStream, selectedStreamId]);

  const handleSelectStream = useCallback(
    (streamId: string) => {
      selectStream(streamId);
      setIsMobileActionsOpen(false);
      if (isMobileViewport) {
        closeMobileSidebar();
      }
    },
    [closeMobileSidebar, isMobileViewport, selectStream, setIsMobileActionsOpen],
  );

  const renderConversationStatusBadge = () => {
    if (!standaloneControls) {
      return null;
    }

    return (
      <div
        className={`transcript-stream__status transcript-stream__status--${standaloneControls.statusModifier}`.trim()}
        role="status"
        aria-live="polite"
        aria-label={standaloneControls.statusLabel}
        title={standaloneControls.statusLabel}
      >
        {renderStandaloneStatusIcon(standaloneControls.statusModifier)}
      </div>
    );
  };

  const conversationActionButtons: JSX.Element[] = [];
  const conversationOverflowButtons: JSX.Element[] = [];

  if (standaloneControls?.canListenLive) {
    conversationActionButtons.push(
      <Button
        key="listen-live"
        size="sm"
        use={standaloneControls.isLiveListening ? "success" : "primary"}
        startContent={
          standaloneControls.isLiveListening ? (
            <Pause size={14} />
          ) : (
            <Play size={14} />
          )
        }
        onClick={() => {
          standaloneControls.onToggleLiveListening();
        }}
        tooltip="Toggle live audio monitoring"
      >
        <span className="conversation-panel__action-label">
          {standaloneControls.isLiveListening
            ? "Stop listening"
            : "Listen live"}
        </span>
      </Button>,
    );
  }

  // Start/Stop controls are disabled; streams are managed via config.yaml

  if (!isReadOnly && selectedStream && !selectedStreamIsCombined) {
    const pendingCommand = pendingStreamCommands[selectedStream.id];
    const commandPending = Boolean(pendingCommand);
    const isResetting = pendingCommand === "resetting";
    const isUpdating = pendingCommand === "updating";
    const renameButton = (
      <Button
        key="rename"
        size="sm"
        use="secondary"
        onClick={() => {
          if (!requireEditor("edit streams")) {
            return;
          }
          const defaultName =
            selectedStream.name?.trim() ||
            selectedStream.url?.trim() ||
            selectedStream.id;
          const nextName = window.prompt(
            "Update stream name",
            defaultName,
          );
          if (nextName === null) {
            return;
          }
          const trimmed = nextName.trim();
          if (trimmed.length === 0) {
            showToast({
              variant: "info",
              message: "Stream name cannot be empty.",
            });
            return;
          }
          const currentName = selectedStream.name?.trim() ?? "";
          if (trimmed === currentName) {
            return;
          }
          void handleUpdateStream(selectedStream.id, { name: trimmed });
        }}
        disabled={commandPending}
        startContent={
          isUpdating ? (
            <Spinner size="sm" variant="light" label="Saving stream" />
          ) : (
            <Pencil size={14} />
          )
        }
      >
        <span className="conversation-panel__action-label">
          {isUpdating ? "Saving…" : "Rename"}
        </span>
      </Button>
    );
    conversationOverflowButtons.push(renameButton);
    const resetDisabled = standaloneControls
      ? !standaloneControls.canReset
      : false;
    const resetButton = (
      <Button
        key="reset"
        size="sm"
        use="warning"
        onClick={() => {
          if (!requireEditor("reset streams")) {
            return;
          }
          if (
            window.confirm(
              `Reset "${selectedStreamTitle}"? This clears transcripts and recordings.`,
            )
          ) {
            if (standaloneControls) {
              standaloneControls.onReset();
            } else {
              void handleResetStream(selectedStream.id);
            }
          }
        }}
        aria-disabled={resetDisabled || commandPending}
        disabled={resetDisabled || commandPending}
        tooltip={
          standaloneControls && !standaloneControls.canReset
            ? "No transcripts available to reset"
            : undefined
        }
        startContent={
          isResetting ? (
            <Spinner size="sm" variant="light" label="Resetting stream" />
          ) : (
            <RotateCcw size={14} />
          )
        }
      >
        <span className="conversation-panel__action-label">
          {isResetting ? "Resetting…" : "Reset"}
        </span>
      </Button>
    );

    conversationOverflowButtons.push(resetButton);
  }

  const conversationActionButtonGroup =
    conversationActionButtons.length > 0 || conversationOverflowButtons.length > 0 ? (
      <ButtonGroup
        size="sm"
        aria-label="Stream controls"
        overflowButtons={conversationOverflowButtons}
      >
        {conversationActionButtons}
      </ButtonGroup>
    ) : null;

  const conversationToolButtons = standaloneControls?.toolButtons ?? null;
  const hasConversationControls =
    Boolean(standaloneControls) ||
    conversationActionButtons.length > 0 ||
    conversationOverflowButtons.length > 0 ||
    Boolean(conversationToolButtons);

  const loginOverlay = loginVisible ? (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75"
      style={{ zIndex: 1080 }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to unlock editing features"
    >
      <div className="card shadow-lg w-100" style={{ maxWidth: "400px" }}>
        <div className="card-body d-flex flex-column gap-3">
          <div>
            <h2 className="h5 mb-2">Unlock editing</h2>
            <p className="text-body-secondary small mb-0">
              {requiresPassword
                ? "Enter the shared password to add streams or control transcriptions."
                : "Authenticate to add streams or control transcriptions."}
            </p>
          </div>
          <form
            onSubmit={handleLoginSubmit}
            className="d-flex flex-column gap-3"
          >
            <div>
              <label
                htmlFor="auth-password"
                className="form-label text-uppercase small fw-semibold text-body-secondary"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className="form-control"
                value={loginPassword}
                onChange={handleLoginPasswordChange}
                disabled={loggingIn}
                required
                autoFocus
              />
            </div>
            {loginError && (
              <div
                className="alert alert-danger py-2 px-3 small mb-0"
                role="alert"
              >
                {loginError}
              </div>
            )}
            <div className="d-flex justify-content-end gap-2">
              <Button
                type="button"
                use="secondary"
                appearance="outline"
                size="sm"
                onClick={handleCancelLogin}
                disabled={loggingIn}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                use="primary"
                size="sm"
                disabled={loggingIn || loginPassword.trim().length === 0}
                startContent={
                  loggingIn ? (
                    <Spinner size="sm" variant="light" label="Signing in" />
                  ) : undefined
                }
              >
                <span>{loggingIn ? "Signing in…" : "Sign in"}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {loginOverlay}
      <div className="app-shell bg-body-secondary">
        <AppHeader
          isMobileViewport={isMobileViewport}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onOpenMobileSidebar={openMobileSidebar}
          transcriptCorrectionEnabled={transcriptCorrectionEnabled}
          onTranscriptCorrectionToggle={handleTranscriptCorrectionToggle}
          onOpenSettings={() => setShowSettings(true)}
          settingsTriggerRef={settingsTriggerRef}
          showSettings={showSettings}
          isReadOnly={isReadOnly}
          streamsLoading={showAuthLoading}
          onRequestLogin={requestLogin}
          onLogout={logout}
        />

        <SettingsModal
          open={showSettings}
          onClose={closeSettings}
          closeButtonRef={settingsCloseButtonRef}
          streams={streams}
          activeStreams={activeStreams}
          totalTranscriptions={totalTranscriptions}
          wsConnected={wsConnected}
          themeMode={themeMode}
          onThemeModeChange={handleThemeModeChange}
          colorCodingEnabled={colorCodingEnabled}
          onColorCodingToggle={handleColorCodingToggle}
          transcriptCorrectionEnabled={transcriptCorrectionEnabled}
          reviewStatusOptions={REVIEW_STATUS_OPTIONS}
          exportStatuses={exportStatuses}
          onExportStatusToggle={handleExportStatusToggle}
          exporting={exporting}
          onExportTranscriptions={handleExportTranscriptions}
          pagerStreams={pagerStreams}
          selectedPagerStreamId={selectedPagerStreamId}
          onSelectPagerStream={selectPagerExportStream}
          pagerExporting={exportingPagerFeed}
          pagerExportError={pagerExportError}
          onExportPagerFeed={exportPagerFeed}
          isReadOnly={isReadOnly}
          onRequestLogin={requestLogin}
        />

        <main className="app-main">
          <div className="app-layout app-container">
            <StreamSidebar
              isReadOnly={isReadOnly}
              onRequestLogin={requestLogin}
              items={streamSidebarItems}
              loading={sidebarLoading}
              onSelectStream={handleSelectStream}
              isMobileViewport={isMobileViewport}
              isMobileSidebarOpen={isMobileSidebarOpen}
              onCloseMobileSidebar={closeMobileSidebar}
              sortMode={streamSortMode}
              onSortModeChange={handleStreamSortModeChange}
            />

            {isMobileViewport && isMobileSidebarOpen ? (
              <Button
                use="unstyled"
                className="stream-sidebar-backdrop d-lg-none"
                onClick={closeMobileSidebar}
                aria-label="Close stream menu"
              />
            ) : null}

            <section className="conversation-panel">
              <div className="conversation-panel__content">
                <div className="conversation-panel__header">
                  <div className="conversation-panel__header-main">
                    <div className="conversation-panel__title">
                      {selectedStream ? (
                        <>
                          <h2 className="h5 mb-1">{selectedStreamTitle}</h2>
                          <div className="conversation-panel__meta small text-body-secondary">
                            <StreamStatusIndicator
                              stream={selectedStream}
                              showText
                              className="d-inline-flex align-items-center gap-2"
                              textClassName="text-capitalize"
                            />
                            {selectedStreamIsCombined ? (
                              <>
                                <span className="mx-1">·</span>
                                <span>Combined view</span>
                              </>
                            ) : selectedStreamIsPager ? (
                              <>
                                <span className="mx-1">·</span>
                                <span>Pager feed</span>
                                {selectedStreamWebhookPath && (
                                  <InlineText as="span" className="ms-2" gap={1}>
                                    <span>Webhook</span>
                                    <code
                                      className="conversation-panel__meta-code"
                                      title={selectedStreamWebhookUrl ?? undefined}
                                    >
                                      {selectedStreamWebhookPath}
                                    </code>
                                  </InlineText>
                                )}
                              </>
                            ) : selectedStreamIsSdr ? (
                              <>
                                <span className="mx-1">·</span>
                                <span>SDR</span>
                                {selectedSdrFrequencyLabel ? (
                                  <InlineText as="span" className="ms-2" gap={1}>
                                    <span>Frequency</span>
                                    <code className="conversation-panel__meta-code">
                                      {selectedSdrFrequencyLabel}
                                    </code>
                                  </InlineText>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <span className="mx-1">·</span>
                                <a
                                  href={selectedStream.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link-underline-opacity-0"
                                >
                                  Open stream
                                </a>
                              </>
                            )}
                            {selectedStreamIsCombined && combinedMemberList ? (
                              <InlineText as="span" className="ms-2" gap={1}>
                                <span>Includes</span>
                                <span>{combinedMemberList}</span>
                              </InlineText>
                            ) : null}
                            {selectedStreamIsCombined &&
                            selectedCombinedMissing.length > 0 ? (
                              <InlineText as="span" className="ms-2 text-danger" gap={1}>
                                <AlertTriangle size={14} />
                                Missing {selectedCombinedMissing.join(", ")}
                              </InlineText>
                            ) : null}
                            {selectedStreamLatestTimestamp ? (
                              <span className="ms-1">
                                · Last activity {" "}
                                <Timestamp
                                  value={selectedStreamLatestTimestamp}
                                  mode="datetime"
                                />
                                <TimeInterval
                                  value={selectedStreamLatestTimestamp}
                                  condensed
                                  className="ms-1"
                                />
                              </span>
                            ) : null}
                          </div>
                          {selectedStreamIsCombined &&
                          selectedCombinedView?.description ? (
                            <p className="small text-body-secondary mb-0 mt-1">
                              {selectedCombinedView.description}
                            </p>
                          ) : null}
                        </>
                      ) : sortedConversations.length === 0 ? (
                        <>
                          <h2 className="h5 mb-1">No streams available</h2>
                          <div className="small text-body-secondary">
                            {isReadOnly
                              ? "Sign in to add streams and start monitoring conversations."
                              : "Add a stream from the sidebar to start monitoring conversations."}
                          </div>
                          {isReadOnly ? (
                            <Button
                              size="sm"
                              use="primary"
                              className="mt-2"
                              startContent={<LogIn size={14} />}
                              onClick={requestLogin}
                            >
                              <span>Sign in</span>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            use="primary"
                            appearance="outline"
                            className="d-lg-none mt-2"
                            aria-controls="app-stream-sidebar"
                            aria-expanded={isMobileSidebarOpen}
                            onClick={openMobileSidebar}
                            startContent={<Menu size={14} />}
                          >
                            <span>Open stream menu</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <h2 className="h5 mb-1">Select a stream</h2>
                          <div className="small text-body-secondary">
                            Choose a stream from the left to open its
                            conversation.
                          </div>
                          <Button
                            size="sm"
                            use="primary"
                            appearance="outline"
                            className="d-lg-none mt-2"
                            aria-controls="app-stream-sidebar"
                            aria-expanded={isMobileSidebarOpen}
                            onClick={openMobileSidebar}
                            startContent={<Menu size={14} />}
                          >
                            <span>Open stream menu</span>
                          </Button>
                        </>
                      )}
                    </div>

                    {selectedStream && hasConversationControls ? (
                      isMobileViewport ? (
                        <div className="conversation-panel__mobile-actions">
                          <div className="conversation-panel__mobile-actions-header">
                            {standaloneControls ? (
                              <div className="conversation-panel__mobile-actions-summary">
                                {renderConversationStatusBadge()}
                              </div>
                            ) : null}
                            <Button
                              size="sm"
                              use="secondary"
                              appearance="outline"
                              className="conversation-panel__mobile-actions-toggle"
                              onClick={() => {
                                setIsMobileActionsOpen((current) => !current);
                              }}
                              aria-expanded={isMobileActionsOpen}
                              aria-controls={MOBILE_ACTIONS_PANEL_ID}
                              startContent={<SlidersHorizontal size={16} />}
                            >
                              <span>
                                {isMobileActionsOpen
                                  ? "Hide controls"
                                  : "Stream controls"}
                              </span>
                            </Button>
                          </div>
                          <div
                            id={MOBILE_ACTIONS_PANEL_ID}
                            className={`conversation-panel__mobile-actions-panel ${
                              isMobileActionsOpen
                                ? "conversation-panel__mobile-actions-panel--open"
                                : ""
                            }`}
                            aria-hidden={!isMobileActionsOpen}
                          >
                            {(conversationActionButtonGroup ||
                              conversationToolButtons) && (
                              <div className="conversation-panel__mobile-actions-grid">
                                {conversationActionButtonGroup}
                                {conversationToolButtons}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="conversation-panel__actions">
                          <div className="conversation-panel__primary-actions">
                            {renderConversationStatusBadge()}
                            {conversationActionButtonGroup}
                          </div>
                          {conversationToolButtons ? (
                            <div className="conversation-panel__tool-buttons">
                              {conversationToolButtons}
                            </div>
                          ) : null}
                        </div>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="conversation-panel__alerts">
                  {selectedStream &&
                    selectedStreamIsPager &&
                    selectedStreamWebhookPath && (
                      <div className="alert alert-info" role="status">
                        Send pager updates by POSTing JSON with a{" "}
                        <code>message</code> field to
                        <code className="ms-1">
                          {selectedStreamWebhookPath}
                        </code>
                        .
                      </div>
                    )}

                  {keywordAlerts.map((alert) => {
                    return (
                      <div
                        key={alert.id}
                        className="alert alert-danger keyword-alert"
                        role="alert"
                      >
                        <div className="keyword-alert__content">
                          <div className="keyword-alert__header">
                            <AlertTriangle
                              size={18}
                              className="keyword-alert__icon"
                            />
                            <div className="keyword-alert__title">
                              <span className="keyword-alert__label">
                                {alert.label}
                              </span>
                              <div className="keyword-alert__meta">
                                <span className="keyword-alert__stream">
                                  {alert.streamName}
                                </span>
                                {alert.timestamp ? (
                                  <Timestamp
                                    value={alert.timestamp}
                                    className="keyword-alert__time"
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>
                          {alert.matchedPhrases.length > 0 && (
                            <div className="keyword-alert__phrases">
                              Matched: {alert.matchedPhrases.join(", ")}
                            </div>
                          )}
                          <div className="keyword-alert__excerpt">
                            {alert.text}
                          </div>
                        </div>
                        <Button
                          use="close"
                          className="keyword-alert__dismiss"
                          aria-label="Dismiss keyword alert"
                          onClick={() => handleDismissAlert(alert.id)}
                        />
                      </div>
                    );
                  })}

                  {error && (
                    <div className="alert alert-danger" role="alert">
                      <div className="fw-semibold mb-1">Error</div>
                      <div>{error}</div>
                    </div>
                  )}

                  {combinedViewsErrorMessage && (
                    <div className="alert alert-warning" role="alert">
                      <div className="fw-semibold mb-1">
                        Unable to load combined views
                      </div>
                      <div>{combinedViewsErrorMessage}</div>
                    </div>
                  )}

                  {transcriptCorrectionEnabled && exportError && (
                    <div className="alert alert-warning" role="alert">
                      <div className="fw-semibold mb-1">Export error</div>
                      <div>{exportError}</div>
                    </div>
                  )}

                  {pagerExportError && (
                    <div className="alert alert-warning" role="alert">
                      <div className="fw-semibold mb-1">Pager export error</div>
                      <div>{pagerExportError}</div>
                    </div>
                  )}
                </div>

                <div className="conversation-panel__body">
                  {selectedStream ? (
                    selectedStreamIsCombined ? (
                      <CombinedTranscriptionLog
                        streams={selectedCombinedMembers}
                        loading={sidebarLoading}
                        limit={STREAM_TRANSCRIPTION_PREVIEW_LIMIT}
                      />
                    ) : (
                      <StreamTranscriptionPanel
                        streams={streams ?? []}
                        onResetStream={handleResetStream}
                        onReviewTranscription={reviewTranscription}
                        focusStreamId={selectedStream.id}
                        onStandaloneControlsChange={setStandaloneControls}
                        pagerExporting={exportingPagerFeed}
                        onExportPagerFeed={exportPagerFeed}
                        onSelectPagerExportStream={selectPagerExportStream}
                      />
                    )
                  ) : (
                    <div className="conversation-panel__placeholder text-body-secondary text-center">
                      {sortedConversations.length === 0 ? (
                        <>
                          <p className="fw-semibold mb-1">
                            No streams available
                          </p>
                          <p className="mb-0">
                            Add a stream to begin monitoring conversations.
                          </p>
                          <div className="mt-3 d-lg-none">
                            <Button
                              size="sm"
                              use="primary"
                              appearance="outline"
                              aria-controls="app-stream-sidebar"
                              aria-expanded={isMobileSidebarOpen}
                              onClick={openMobileSidebar}
                              startContent={<Menu size={14} />}
                            >
                              <span>Open stream menu</span>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="fw-semibold mb-1">No stream selected</p>
                          <p className="mb-0">
                            Choose a stream from the left to begin reviewing
                            transcripts.
                          </p>
                          <div className="mt-3 d-lg-none">
                            <Button
                              size="sm"
                              use="primary"
                              appearance="outline"
                              aria-controls="app-stream-sidebar"
                              aria-expanded={isMobileSidebarOpen}
                              onClick={openMobileSidebar}
                              startContent={<Menu size={14} />}
                            >
                              <span>Open stream menu</span>
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>

        {standaloneControls?.dialogs?.map((dialog) => dialog)}
      </div>
    </>
  );
}

export default App;
