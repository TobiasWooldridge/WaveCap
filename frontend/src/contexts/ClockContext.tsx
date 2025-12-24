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

const ClockContext = createContext<ClockContextValue | null>(null);

const TICK_INTERVAL_MS = 1000;

interface ClockProviderProps {
  children: ReactNode;
}

export const ClockProvider: React.FC<ClockProviderProps> = ({ children }) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const intervalRef = useRef<number | null>(null);

  const startClock = useCallback(() => {
    if (intervalRef.current !== null) return;
    // Update immediately on start
    setNowMs(Date.now());
    intervalRef.current = window.setInterval(() => {
      setNowMs(Date.now());
    }, TICK_INTERVAL_MS);
  }, []);

  const stopClock = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
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
    <ClockContext.Provider value={{ nowMs }}>
      {children}
    </ClockContext.Provider>
  );
};

/**
 * Hook to access the shared clock. Returns the current time in milliseconds,
 * updated every second when the page is visible.
 */
export const useClock = (): number => {
  const context = useContext(ClockContext);
  if (!context) {
    // Fallback for components rendered outside provider (shouldn't happen)
    return Date.now();
  }
  return context.nowMs;
};

export default ClockContext;
