import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

/**
 * ClockContext provides a shared clock for components that need the current
 * time to update relative timestamps (e.g., "5 minutes ago"). Instead of each
 * TimeInterval component creating its own setInterval, they all subscribe to
 * this single clock, dramatically reducing timer overhead.
 *
 * The clock ticks every second when the page is visible and pauses when hidden.
 */

interface ClockContextValue {
  /** Current timestamp in milliseconds */
  nowMs: number;
}

const FastClockContext = createContext<ClockContextValue | null>(null);
const SlowClockContext = createContext<ClockContextValue | null>(null);

const FAST_TICK_INTERVAL_MS = 1000;
const SLOW_TICK_INTERVAL_MS = 60 * 1000;

interface ClockProviderProps {
  children: ReactNode;
}

export const ClockProvider: React.FC<ClockProviderProps> = ({ children }) => {
  const [fastNowMs, setFastNowMs] = useState(() => Date.now());
  const [slowNowMs, setSlowNowMs] = useState(() => Date.now());
  const fastIntervalRef = useRef<number | null>(null);
  const slowIntervalRef = useRef<number | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);

  const startClock = useCallback(() => {
    if (fastIntervalRef.current !== null) return;
    // Update immediately on start
    const now = Date.now();
    setFastNowMs(now);
    fastIntervalRef.current = window.setInterval(() => {
      setFastNowMs(Date.now());
    }, FAST_TICK_INTERVAL_MS);

    if (slowIntervalRef.current !== null || slowTimeoutRef.current !== null) {
      return;
    }

    setSlowNowMs(now);
    const delay = SLOW_TICK_INTERVAL_MS - (now % SLOW_TICK_INTERVAL_MS);
    slowTimeoutRef.current = window.setTimeout(() => {
      slowTimeoutRef.current = null;
      setSlowNowMs(Date.now());
      slowIntervalRef.current = window.setInterval(() => {
        setSlowNowMs(Date.now());
      }, SLOW_TICK_INTERVAL_MS);
    }, delay);
  }, []);

  const stopClock = useCallback(() => {
    if (fastIntervalRef.current !== null) {
      window.clearInterval(fastIntervalRef.current);
      fastIntervalRef.current = null;
    }
    if (slowIntervalRef.current !== null) {
      window.clearInterval(slowIntervalRef.current);
      slowIntervalRef.current = null;
    }
    if (slowTimeoutRef.current !== null) {
      window.clearTimeout(slowTimeoutRef.current);
      slowTimeoutRef.current = null;
    }
  }, []);

  // Start/stop based on page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopClock();
      } else {
        startClock();
      }
    };

    // Start initially if visible
    if (!document.hidden) {
      startClock();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopClock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startClock, stopClock]);

  return (
    <FastClockContext.Provider value={{ nowMs: fastNowMs }}>
      <SlowClockContext.Provider value={{ nowMs: slowNowMs }}>
        {children}
      </SlowClockContext.Provider>
    </FastClockContext.Provider>
  );
};

/**
 * Hook to access the shared fast clock. Returns the current time in milliseconds,
 * updated every second when the page is visible.
 */
export const useFastClock = (): number => {
  const context = useContext(FastClockContext);
  if (!context) {
    // Fallback for components rendered outside provider (shouldn't happen)
    return Date.now();
  }
  return context.nowMs;
};

/**
 * Hook to access the shared slow clock. Returns the current time in milliseconds,
 * updated once per minute when the page is visible.
 */
export const useSlowClock = (): number => {
  const context = useContext(SlowClockContext);
  if (!context) {
    return Date.now();
  }
  return context.nowMs;
};

export default FastClockContext;
