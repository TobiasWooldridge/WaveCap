import { useEffect, useRef, useState, useCallback } from "react";
import {
  ClientCommandType,
  ClientToServerMessage,
  ServerToClientMessage,
} from "@types";

export interface WebSocketCommandResult {
  success: boolean;
  action: ClientCommandType;
  message?: string;
}

interface PendingRequest {
  resolve: (result: WebSocketCommandResult) => void;
  timeoutId: number;
  action: ClientCommandType;
}

const COMMAND_TIMEOUT_MS = 10000;
const IDLE_DISCONNECT_DELAY_MS = 15 * 60 * 1000;
const IDLE_DISCONNECT_CLOSE_CODE = 4000;
// If no message received for this long while tab is visible, reconnect
const STALE_CONNECTION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
// How often to check for stale connections
const STALE_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds
// Maximum backoff delay for reconnection attempts (5 minutes)
const MAX_RECONNECT_DELAY_MS = 5 * 60 * 1000;
// After this many fast retries, switch to slower reconnection
const FAST_RETRY_THRESHOLD = 5;

const createRequestId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

type UseWebSocketOptions = {
  token?: string | null;
  onUnauthorized?: () => void;
};

export const useWebSocket = (
  url: string,
  options: UseWebSocketOptions = {},
) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ServerToClientMessage | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttempts = useRef(0);
  const pendingRequestsRef = useRef<Map<string, PendingRequest>>(new Map());
  const shouldReloadOnReconnectRef = useRef(false);
  const isManualCloseRef = useRef(false);
  const idleDisconnectRef = useRef(false);
  const idleTimeoutRef = useRef<number>();
  const connectionIdRef = useRef(0);
  const lastMessageTimeRef = useRef<number>(Date.now());
  const staleCheckIntervalRef = useRef<number>();
  // Each WebSocket we create gets a monotonically increasing identifier. When
  // we reconnect (e.g. after the user logs in) the previous socket may close a
  // moment later. We ignore events from those stale sockets so they cannot wipe
  // out the state for the connection that actually owns the UI.
  const authToken = options.token ?? null;
  const handleUnauthorized = options.onUnauthorized;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const clearIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) {
      window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = undefined;
    }
  }, []);

  const clearStaleCheckInterval = useCallback(() => {
    if (staleCheckIntervalRef.current) {
      window.clearInterval(staleCheckIntervalRef.current);
      staleCheckIntervalRef.current = undefined;
    }
  }, []);

  const resolveBaseUrl = useCallback(() => {
    const baseUrl = authToken
      ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(authToken)}`
      : url;
    if (baseUrl.startsWith("ws://") || baseUrl.startsWith("wss://")) {
      return baseUrl;
    }

    if (typeof window === "undefined") {
      return baseUrl;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    if (baseUrl.startsWith("/")) {
      return `${protocol}//${window.location.host}${baseUrl}`;
    }

    try {
      const absolute = new URL(baseUrl, window.location.href);
      if (absolute.protocol === "http:" || absolute.protocol === "https:") {
        absolute.protocol = absolute.protocol === "https:" ? "wss:" : "ws:";
      }
      return absolute.toString();
    } catch {
      const normalized = baseUrl.startsWith("//") ? baseUrl.slice(2) : baseUrl;
      return `${protocol}//${normalized}`;
    }
  }, [authToken, url]);

  const connect = useCallback(() => {
    try {
      const connectionId = connectionIdRef.current + 1;
      connectionIdRef.current = connectionId;
      const ws = new WebSocket(resolveBaseUrl());

      ws.onopen = () => {
        if (connectionIdRef.current !== connectionId) {
          // Another connection became active before this one finished opening.
          return;
        }
        console.log("🔌 WebSocket connected to:", url);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        idleDisconnectRef.current = false;
        // Reset reload flag - we no longer do page reloads on reconnect
        // The App component will refetch streams when wsConnected changes
        shouldReloadOnReconnectRef.current = false;
      };

      ws.onmessage = (event) => {
        if (connectionIdRef.current !== connectionId) {
          // Ignore messages from stale sockets so they cannot overwrite the
          // state that belongs to the active connection.
          return;
        }
        // Update last message time for stale connection detection
        lastMessageTimeRef.current = Date.now();
        try {
          const message: ServerToClientMessage = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", message.type, message);

          if (message.type === "ack") {
            const pending = pendingRequestsRef.current.get(message.requestId);
            if (pending) {
              window.clearTimeout(pending.timeoutId);
              pending.resolve({
                success: true,
                action: message.action,
                message: message.message,
              });
              pendingRequestsRef.current.delete(message.requestId);
            }
            setLastMessage(message);
            return;
          }

          if (message.type === "error" && message.requestId) {
            const pending = pendingRequestsRef.current.get(message.requestId);
            if (pending) {
              window.clearTimeout(pending.timeoutId);
              pending.resolve({
                success: false,
                action: pending.action,
                message: message.message,
              });
              pendingRequestsRef.current.delete(message.requestId);
            }
            if (
              message.message &&
              message.message.toLowerCase().includes("editor access required")
            ) {
              handleUnauthorized?.();
            }
            setLastMessage(message);
            return;
          }

          if (message.type === "error" && message.message) {
            if (
              message.message.toLowerCase().includes("editor access required")
            ) {
              handleUnauthorized?.();
            }
          }

          setLastMessage(message);
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = (event) => {
        if (connectionIdRef.current !== connectionId) {
          // Stale sockets can close after a new connection has been
          // established. We ignore those events so that they do not clear the
          // state for the active socket.
          return;
        }
        console.log("WebSocket disconnected", event.code, event.reason);
        setIsConnected(false);
        setSocket(null);
        socketRef.current = null;

        const wasManualClose = isManualCloseRef.current;
        const wasIdleClose = idleDisconnectRef.current;
        isManualCloseRef.current = false;

        pendingRequestsRef.current.forEach((pending) => {
          window.clearTimeout(pending.timeoutId);
          pending.resolve({
            success: false,
            action: pending.action,
            message: "WebSocket disconnected before the server responded.",
          });
        });
        pendingRequestsRef.current.clear();

        if (event.code === 4401) {
          handleUnauthorized?.();
          return;
        }

        if (wasIdleClose) {
          reconnectAttempts.current = 0;
          shouldReloadOnReconnectRef.current = false;
          setError("WebSocket connection paused while this tab was inactive.");
          return;
        }

        if (wasManualClose) {
          reconnectAttempts.current = 0;
          shouldReloadOnReconnectRef.current = false;
          return;
        }

        // Always attempt to reconnect with exponential backoff
        reconnectAttempts.current++;
        const attempt = reconnectAttempts.current;

        // Calculate delay with exponential backoff, capped at MAX_RECONNECT_DELAY_MS
        const baseDelay = attempt <= FAST_RETRY_THRESHOLD
          ? 1000 * Math.pow(2, attempt) // 2s, 4s, 8s, 16s, 32s for first 5 attempts
          : 30000 * Math.pow(1.5, attempt - FAST_RETRY_THRESHOLD); // Then slower growth
        const delay = Math.min(baseDelay, MAX_RECONNECT_DELAY_MS);

        // Update error message to show we're still trying
        if (attempt > FAST_RETRY_THRESHOLD) {
          setError(`Connection lost. Retrying in ${Math.round(delay / 1000)}s... (attempt ${attempt})`);
        }

        console.log(`🔌 WebSocket reconnecting in ${Math.round(delay / 1000)}s (attempt ${attempt})...`);
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = (event) => {
        if (connectionIdRef.current !== connectionId) {
          return;
        }
        console.error("WebSocket error:", event);
        setError("WebSocket connection error - server may not be running");
      };

      setSocket(ws);
      socketRef.current = ws;
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      setError("Failed to create WebSocket connection");
    }
  }, [handleUnauthorized, resolveBaseUrl, url]);

  useEffect(() => {
    connect();

    return () => {
      clearReconnectTimer();
      clearIdleTimeout();
      if (socketRef.current) {
        isManualCloseRef.current = true;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [clearIdleTimeout, clearReconnectTimer, connect]);

  useEffect(() => {
    return () => {
      clearReconnectTimer();
    };
  }, [clearReconnectTimer]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const startIdleTimer = () => {
      clearIdleTimeout();
      if (!document.hidden) {
        return;
      }

      idleTimeoutRef.current = window.setTimeout(() => {
        idleTimeoutRef.current = undefined;
        if (!document.hidden) {
          return;
        }

        const activeSocket = socketRef.current;
        if (!activeSocket) {
          return;
        }

        idleDisconnectRef.current = true;
        shouldReloadOnReconnectRef.current = false;
        isManualCloseRef.current = true;
        activeSocket.close(
          IDLE_DISCONNECT_CLOSE_CODE,
          "WebSocket idle disconnect",
        );
      }, IDLE_DISCONNECT_DELAY_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        startIdleTimer();
        return;
      }

      clearIdleTimeout();
      if (idleDisconnectRef.current && !socketRef.current && !isConnected) {
        connect();
      }
    };

    const handleInteraction = () => {
      if (document.hidden) {
        return;
      }

      clearIdleTimeout();
      if (idleDisconnectRef.current && !socketRef.current && !isConnected) {
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleInteraction);
    window.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    if (document.hidden) {
      startIdleTimer();
    }

    return () => {
      clearIdleTimeout();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleInteraction);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [clearIdleTimeout, connect, isConnected]);

  // Stale connection detection: periodically check if we've received messages
  // If connected but no messages for STALE_CONNECTION_TIMEOUT_MS, reconnect
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Clear any existing interval
    clearStaleCheckInterval();

    if (!isConnected) {
      return;
    }

    // Reset the last message time when we first connect
    lastMessageTimeRef.current = Date.now();

    staleCheckIntervalRef.current = window.setInterval(() => {
      // Only check when tab is visible
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;
      if (timeSinceLastMessage > STALE_CONNECTION_TIMEOUT_MS) {
        console.warn(
          `🔌 WebSocket connection appears stale (no messages for ${Math.round(timeSinceLastMessage / 1000)}s), reconnecting...`
        );
        // Close and reconnect - the onclose handler will trigger reconnection
        // and the App component will refetch streams when connection is restored
        if (socketRef.current) {
          socketRef.current.close();
        }
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => {
      clearStaleCheckInterval();
    };
  }, [clearStaleCheckInterval, isConnected]);

  const sendMessage = useCallback(
    (message: ClientToServerMessage) => {
      if (!socket || !isConnected) {
        const connectionError = new Error(
          "Cannot send message - WebSocket not connected",
        );
        console.warn("⚠️ Cannot send message - WebSocket not connected:", {
          socket: !!socket,
          isConnected,
        });
        throw connectionError;
      }

      console.log("📤 Sending WebSocket message:", message);
      socket.send(JSON.stringify(message));
    },
    [socket, isConnected],
  );

  const sendCommand = useCallback(
    (message: ClientToServerMessage): Promise<WebSocketCommandResult> => {
      if (!socket || !isConnected) {
        return Promise.resolve({
          success: false,
          action: message.type,
          message: "WebSocket is disconnected. Please try again.",
        });
      }

      const requestId = message.requestId ?? createRequestId();
      const payload: ClientToServerMessage = {
        ...message,
        requestId,
      };

      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          pendingRequestsRef.current.delete(requestId);
          resolve({
            success: false,
            action: message.type,
            message: "Server did not respond. Please try again.",
          });
        }, COMMAND_TIMEOUT_MS);

        pendingRequestsRef.current.set(requestId, {
          resolve,
          timeoutId,
          action: message.type,
        });

        try {
          sendMessage(payload);
        } catch (error) {
          window.clearTimeout(timeoutId);
          pendingRequestsRef.current.delete(requestId);
          resolve({
            success: false,
            action: message.type,
            message:
              error instanceof Error
                ? error.message
                : "Failed to send command.",
          });
        }
      });
    },
    [isConnected, sendMessage, socket],
  );

  const reconnect = useCallback(() => {
    // Clear any pending reconnect timer
    clearReconnectTimer();
    // Reset attempt counter for manual reconnect
    reconnectAttempts.current = 0;
    setError(null);
    // Close existing socket if any
    if (socketRef.current) {
      isManualCloseRef.current = true;
      socketRef.current.close();
      socketRef.current = null;
    }
    // Connect immediately
    connect();
  }, [clearReconnectTimer, connect]);

  const startTranscription = useCallback(
    (streamId: string) => {
      return sendCommand({
        type: "start_transcription",
        streamId,
      });
    },
    [sendCommand],
  );

  const stopTranscription = useCallback(
    (streamId: string) => {
      return sendCommand({
        type: "stop_transcription",
        streamId,
      });
    },
    [sendCommand],
  );

  const resetStream = useCallback(
    (streamId: string) => {
      return sendCommand({
        type: "reset_stream",
        streamId,
      });
    },
    [sendCommand],
  );

  const updateStream = useCallback(
    (
      streamId: string,
      {
        name,
        language,
        ignoreFirstSeconds,
      }: {
        name?: string;
        language?: string;
        ignoreFirstSeconds?: number;
      },
    ) => {
      const message: ClientToServerMessage = {
        type: "update_stream",
        streamId,
        ...(name !== undefined ? { name } : {}),
        ...(language !== undefined ? { language } : {}),
        ...(ignoreFirstSeconds !== undefined
          ? { ignoreFirstSeconds }
          : {}),
      };
      return sendCommand(message);
    },
    [sendCommand],
  );

  return {
    socket,
    isConnected,
    lastMessage,
    error,
    sendMessage,
    sendCommand,
    startTranscription,
    stopTranscription,
    resetStream,
    updateStream,
    reconnect,
  };
};
