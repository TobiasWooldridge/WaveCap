import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  ThemeMode,
  TranscriptionReviewStatus,
  UISettingsConfig,
  BaseLocation,
} from "@types";

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (
    listener: (this: MediaQueryList, event: MediaQueryListEvent) => void,
  ) => void;
  removeListener?: (
    listener: (this: MediaQueryList, event: MediaQueryListEvent) => void,
  ) => void;
};

interface UISettingsContextValue {
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
  colorCodingEnabled: boolean;
  setColorCodingEnabled: (enabled: boolean) => void;
  transcriptCorrectionEnabled: boolean;
  setTranscriptCorrectionEnabled: (enabled: boolean) => void;
  defaultReviewExportStatuses: TranscriptionReviewStatus[];
  baseLocation: BaseLocation | null;
  googleMapsApiKey: string | null;
}

const THEME_STORAGE_KEY = "wavecap-theme-mode";
const COLOR_CODING_STORAGE_KEY = "wavecap-color-coding-enabled";
const TRANSCRIPT_CORRECTION_STORAGE_KEY =
  "wavecap-transcript-correction-enabled";

const REVIEW_STATUS_VALUES: TranscriptionReviewStatus[] = [
  "pending",
  "corrected",
  "verified",
];
const FALLBACK_REVIEW_EXPORT_STATUSES: TranscriptionReviewStatus[] = [
  "corrected",
  "verified",
];

const UISettingsContext = createContext<UISettingsContextValue | undefined>(
  undefined,
);

const parseThemeMode = (value: string | null): ThemeMode | null => {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return null;
};

const isThemeMode = (value: unknown): value is ThemeMode => {
  return value === "light" || value === "dark" || value === "system";
};

const isTranscriptionReviewStatus = (
  value: unknown,
): value is TranscriptionReviewStatus => {
  return (
    typeof value === "string" &&
    REVIEW_STATUS_VALUES.includes(value as TranscriptionReviewStatus)
  );
};

const getStoredThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "system";
  }

  return (
    parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY)) ?? "system"
  );
};

const getStoredColorCoding = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = window.localStorage.getItem(COLOR_CODING_STORAGE_KEY);
  if (stored === null) {
    return false;
  }

  return stored === "true";
};

export const UISettingsProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    getStoredThemeMode(),
  );
  const [colorCodingEnabled, setColorCodingEnabledState] = useState<boolean>(
    () => getStoredColorCoding(),
  );
  const [transcriptCorrectionEnabled, setTranscriptCorrectionEnabledState] =
    useState<boolean>(() => {
      if (typeof window === "undefined") {
        return false;
      }

      const stored = window.localStorage.getItem(
        TRANSCRIPT_CORRECTION_STORAGE_KEY,
      );
      if (stored === null) {
        return false;
      }

      return stored === "true";
    });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [defaultReviewExportStatuses, setDefaultReviewExportStatuses] =
    useState<TranscriptionReviewStatus[]>(() => [
      ...FALLBACK_REVIEW_EXPORT_STATUSES,
    ]);
  const [baseLocation, setBaseLocation] = useState<BaseLocation | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);
  const [uiDefaultsApplied, setUiDefaultsApplied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    const legacyMediaQuery = mediaQuery as LegacyMediaQueryList;
    const supportsAddEventListener =
      typeof mediaQuery.addEventListener === "function";

    if (supportsAddEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else if (typeof legacyMediaQuery.addListener === "function") {
      legacyMediaQuery.addListener(handleChange);
    }

    return () => {
      if (supportsAddEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else if (typeof legacyMediaQuery.removeListener === "function") {
        legacyMediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const resolvedTheme: "light" | "dark" =
    themeMode === "system" ? (systemPrefersDark ? "dark" : "light") : themeMode;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const { document } = window;
    const root = document.documentElement;
    const body = document.body;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.dataset.theme = resolvedTheme;
    root.dataset.bsTheme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    if (body) {
      body.style.colorScheme = resolvedTheme;
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const nextThemeMode = parseThemeMode(event.newValue) ?? "system";
        setThemeModeState((prev) =>
          prev === nextThemeMode ? prev : nextThemeMode,
        );
        return;
      }

      if (event.key === COLOR_CODING_STORAGE_KEY) {
        const nextEnabled = event.newValue === "true";
        setColorCodingEnabledState((prev) =>
          prev === nextEnabled ? prev : nextEnabled,
        );
        return;
      }

      if (event.key === TRANSCRIPT_CORRECTION_STORAGE_KEY) {
        const nextEnabled = event.newValue === "true";
        setTranscriptCorrectionEnabledState((prev) =>
          prev === nextEnabled ? prev : nextEnabled,
        );
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      COLOR_CODING_STORAGE_KEY,
      colorCodingEnabled ? "true" : "false",
    );
  }, [colorCodingEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      TRANSCRIPT_CORRECTION_STORAGE_KEY,
      transcriptCorrectionEnabled ? "true" : "false",
    );
  }, [transcriptCorrectionEnabled]);

  useEffect(() => {
    if (uiDefaultsApplied) {
      return;
    }

    let cancelled = false;

    const loadUiConfig = async () => {
      try {
        const response = await fetch("/api/ui-config");
        if (!response.ok) {
          throw new Error(
            `Failed to load UI configuration (status ${response.status})`,
          );
        }
        const data = (await response.json()) as UISettingsConfig;
        if (cancelled || !data) {
          return;
        }

        const hasStoredTheme =
          typeof window !== "undefined"
            ? window.localStorage.getItem(THEME_STORAGE_KEY) !== null
            : false;
        if (!hasStoredTheme && isThemeMode(data.themeMode)) {
          setThemeModeState(data.themeMode);
        }

        const hasStoredColorCoding =
          typeof window !== "undefined"
            ? window.localStorage.getItem(COLOR_CODING_STORAGE_KEY) !== null
            : false;
        if (
          !hasStoredColorCoding &&
          typeof data.colorCodingEnabled === "boolean"
        ) {
          setColorCodingEnabledState(data.colorCodingEnabled);
        }

        const hasStoredTranscriptCorrection =
          typeof window !== "undefined"
            ? window.localStorage.getItem(TRANSCRIPT_CORRECTION_STORAGE_KEY) !==
              null
            : false;
        if (
          !hasStoredTranscriptCorrection &&
          typeof data.transcriptCorrectionEnabled === "boolean"
        ) {
          setTranscriptCorrectionEnabledState(data.transcriptCorrectionEnabled);
        }

        if (Array.isArray(data.reviewExportStatuses)) {
          const seen = new Set<TranscriptionReviewStatus>();
          const validStatuses: TranscriptionReviewStatus[] = [];
          data.reviewExportStatuses.forEach((status) => {
            if (isTranscriptionReviewStatus(status) && !seen.has(status)) {
              seen.add(status);
              validStatuses.push(status);
            }
          });
          if (validStatuses.length > 0) {
            setDefaultReviewExportStatuses(validStatuses);
          }
        }

        // Optional base location for Google Maps queries
        const cfgBase = (data as UISettingsConfig).baseLocation as
          | BaseLocation
          | null
          | undefined;
        if (cfgBase && typeof cfgBase === "object") {
          const state = typeof cfgBase.state === "string" ? cfgBase.state.trim() : null;
          const country =
            typeof cfgBase.country === "string" ? cfgBase.country.trim() : null;
          if ((state && state.length > 0) || (country && country.length > 0)) {
            setBaseLocation({ state: state || undefined, country: country || undefined });
          }
        }

        // Optional Google Maps API key for richer embeds
        const key = (data as UISettingsConfig).googleMapsApiKey;
        if (typeof key === "string" && key.trim().length > 0) {
          setGoogleMapsApiKey(key.trim());
        }
      } catch (error) {
        console.warn("Unable to load UI configuration", error);
      } finally {
        if (!cancelled) {
          setUiDefaultsApplied(true);
        }
      }
    };

    void loadUiConfig();

    return () => {
      cancelled = true;
    };
  }, [
    uiDefaultsApplied,
    setThemeModeState,
    setColorCodingEnabledState,
    setTranscriptCorrectionEnabledState,
    setDefaultReviewExportStatuses,
    setUiDefaultsApplied,
  ]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const setColorCodingEnabled = useCallback((enabled: boolean) => {
    setColorCodingEnabledState(enabled);
  }, []);

  const setTranscriptCorrectionEnabled = useCallback((enabled: boolean) => {
    setTranscriptCorrectionEnabledState(enabled);
  }, []);

  const contextValue = useMemo<UISettingsContextValue>(
    () => ({
      themeMode,
      resolvedTheme,
      setThemeMode,
      colorCodingEnabled,
      setColorCodingEnabled,
      transcriptCorrectionEnabled,
      setTranscriptCorrectionEnabled,
      defaultReviewExportStatuses,
      baseLocation,
      googleMapsApiKey,
    }),
    [
      themeMode,
      resolvedTheme,
      setThemeMode,
      colorCodingEnabled,
      setColorCodingEnabled,
      transcriptCorrectionEnabled,
      setTranscriptCorrectionEnabled,
      defaultReviewExportStatuses,
      baseLocation,
      googleMapsApiKey,
    ],
  );

  return (
    <UISettingsContext.Provider value={contextValue}>
      {children}
    </UISettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUISettings = () => {
  const context = useContext(UISettingsContext);

  if (!context) {
    throw new Error("useUISettings must be used within a UISettingsProvider");
  }

  return context;
};
