type ConsoleMethod = "log" | "info" | "warn" | "error" | "debug";

interface FrontendLogEntry {
  level: ConsoleMethod;
  messages: string[];
  timestamp: string;
}

interface LoggingConfigResponse {
  enabled?: boolean;
  frontend?: {
    enabled?: boolean;
  };
}

const API_BASE = "/api";
const LOG_ENDPOINT = `${API_BASE}/logs/frontend`;
const CONFIG_ENDPOINT = `${API_BASE}/logging-config`;

const METHODS: ConsoleMethod[] = ["log", "info", "warn", "error", "debug"];

const formatArg = (value: unknown): string => {
  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      // Fall through to string conversion
    }
  }

  return String(value);
};

const sendEntry = (entry: FrontendLogEntry): void => {
  const body = JSON.stringify(entry);

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(LOG_ENDPOINT, blob)) {
        return;
      }
    } catch {
      // Ignore and fall back to fetch
    }
  }

  if (typeof fetch === "function") {
    void fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => {
      // Swallow errors to avoid recursive logging
    });
  }
};

export const setupConsoleLogging = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const globalScope = window as typeof window & {
    __WAVECAP_CONSOLE_LOGGING__?: boolean;
  };

  if (globalScope.__WAVECAP_CONSOLE_LOGGING__) {
    return;
  }

  globalScope.__WAVECAP_CONSOLE_LOGGING__ = true;

  const originals: Record<ConsoleMethod, (...args: unknown[]) => void> = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  let loggingEnabled: boolean | null = null;
  const pending: FrontendLogEntry[] = [];

  const flushQueue = () => {
    if (loggingEnabled) {
      while (pending.length > 0) {
        const entry = pending.shift();
        if (entry) {
          sendEntry(entry);
        }
      }
    } else {
      pending.length = 0;
    }
  };

  const enqueueEntry = (method: ConsoleMethod, args: unknown[]) => {
    const entry: FrontendLogEntry = {
      level: method,
      messages: args.map(formatArg),
      timestamp: new Date().toISOString(),
    };

    if (loggingEnabled === null) {
      pending.push(entry);
    } else if (loggingEnabled) {
      sendEntry(entry);
    }
  };

  METHODS.forEach((method) => {
    console[method] = ((...args: unknown[]) => {
      originals[method](...args);
      enqueueEntry(method, args);
    }) as (typeof console)[typeof method];
  });

  const finalizeConfig = (enabled: boolean) => {
    loggingEnabled = enabled;
    flushQueue();
  };

  if (typeof fetch !== "function") {
    finalizeConfig(true);
    return;
  }

  fetch(CONFIG_ENDPOINT)
    .then((response) => (response.ok ? response.json() : null))
    .then((data: LoggingConfigResponse | null) => {
      if (data?.enabled === false) {
        finalizeConfig(false);
        return;
      }

      if (data?.frontend?.enabled === false) {
        finalizeConfig(false);
        return;
      }

      finalizeConfig(true);
    })
    .catch(() => {
      finalizeConfig(true);
    });
};
