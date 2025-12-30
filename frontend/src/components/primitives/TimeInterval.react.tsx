import React, { useMemo } from "react";
import { useFastClock, useHourClock, useSlowClock } from "../../contexts/ClockContext";

export interface TimeIntervalProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: string | number | Date;
  /**
   * Condense labels to short forms like "5m ago" or "in 5m".
   * When condensed, the full label is provided in the title attribute.
   */
  condensed?: boolean;
  /**
   * Control auto-refreshing the label as time passes. Provide a millisecond
   * interval, or set to 0/false to disable. If undefined, updates are only
   * enabled for recent timestamps to avoid re-rendering long lists.
   */
  refreshMs?: number | false;
  /**
   * For testing or custom baselines; defaults to Date.now().
   */
  now?: number | Date;
}

const parseDate = (value: string | number | Date): number | null => {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
};

const pluralize = (value: number, unit: string): string => {
  const v = Math.round(value);
  return `${v} ${unit}${v === 1 ? "" : "s"}`;
};

const toShortUnit = (unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year"): string => {
  switch (unit) {
    case "second":
      return "s";
    case "minute":
      return "m";
    case "hour":
      return "h";
    case "day":
      return "d";
    case "week":
      return "w";
    case "month":
      return "mo"; // avoid collision with minutes
    case "year":
      return "y";
  }
};

const formatInterval = (
  targetMs: number,
  nowMs: number,
  condensed: boolean,
): { label: string; longLabel: string } => {
  const diffMs = targetMs - nowMs;
  const past = diffMs <= 0;
  const absMs = Math.abs(diffMs);

  const sec = 1000;
  const min = 60 * sec;
  const hr = 60 * min;
  const day = 24 * hr;
  const week = 7 * day;
  const month = 30 * day; // coarse; adequate for relative labels
  const year = 365 * day;

  let unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
  let value: number;

  if (absMs < 45 * sec) {
    // "just now" / "in a few seconds"
    const longLabel = past ? "just now" : "in a few seconds";
    const label = condensed ? (past ? "now" : "<1m") : longLabel;
    return { label, longLabel };
  }

  if (absMs < 90 * sec) {
    unit = "minute";
    value = 1;
  } else if (absMs < 45 * min) {
    unit = "minute";
    value = Math.round(absMs / min);
  } else if (absMs < 90 * min) {
    unit = "hour";
    value = 1;
  } else if (absMs < 22 * hr) {
    unit = "hour";
    value = Math.round(absMs / hr);
  } else if (absMs < 36 * hr) {
    // Yesterday / Tomorrow
    const longLabel = past ? "yesterday" : "tomorrow";
    const label = condensed ? (past ? "1d ago" : "in 1d") : longLabel;
    return { label, longLabel };
  } else if (absMs < 7 * day) {
    unit = "day";
    value = Math.round(absMs / day);
  } else if (absMs < 4 * week) {
    unit = "week";
    value = Math.round(absMs / week);
  } else if (absMs < 12 * month) {
    unit = "month";
    value = Math.round(absMs / month);
  } else {
    unit = "year";
    value = Math.round(absMs / year);
  }

  const longCore = condensed
    ? `${Math.round(value)}${toShortUnit(unit)}`
    : pluralize(value, unit);
  const longLabel = past ? `${longCore} ago` : `in ${longCore}`;
  const label = condensed ? (past ? `${longCore} ago` : `in ${longCore}`) : longLabel;
  return { label, longLabel };
};

const DEFAULT_FAST_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_SLOW_WINDOW_MS = 60 * 60 * 1000;

const resolveNowMs = (now?: number | Date): number | null => {
  if (now instanceof Date) {
    const t = now.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof now === "number") {
    return Number.isFinite(now) ? now : null;
  }
  return null;
};

const LiveTimeInterval: React.FC<{
  targetMs: number;
  condensed: boolean;
  className?: string;
  title?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">> = ({
  targetMs,
  condensed,
  className,
  title,
  ...rest
}) => {
  const nowMs = useFastClock();
  const { label, longLabel } = formatInterval(targetMs, nowMs, condensed);

  return (
    <span
      {...rest}
      className={className}
      title={title ?? longLabel}
      aria-label={longLabel}
    >
      {label}
    </span>
  );
};

const SlowTimeInterval: React.FC<{
  targetMs: number;
  condensed: boolean;
  className?: string;
  title?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">> = ({
  targetMs,
  condensed,
  className,
  title,
  ...rest
}) => {
  const nowMs = useSlowClock();
  const { label, longLabel } = formatInterval(targetMs, nowMs, condensed);

  return (
    <span
      {...rest}
      className={className}
      title={title ?? longLabel}
      aria-label={longLabel}
    >
      {label}
    </span>
  );
};

const HourTimeInterval: React.FC<{
  targetMs: number;
  condensed: boolean;
  className?: string;
  title?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">> = ({
  targetMs,
  condensed,
  className,
  title,
  ...rest
}) => {
  const nowMs = useHourClock();
  const { label, longLabel } = formatInterval(targetMs, nowMs, condensed);

  return (
    <span
      {...rest}
      className={className}
      title={title ?? longLabel}
      aria-label={longLabel}
    >
      {label}
    </span>
  );
};

const StaticTimeInterval: React.FC<{
  targetMs: number;
  nowMs: number;
  condensed: boolean;
  className?: string;
  title?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">> = ({
  targetMs,
  nowMs,
  condensed,
  className,
  title,
  ...rest
}) => {
  const { label, longLabel } = formatInterval(targetMs, nowMs, condensed);

  return (
    <span
      {...rest}
      className={className}
      title={title ?? longLabel}
      aria-label={longLabel}
    >
      {label}
    </span>
  );
};

export const TimeInterval: React.FC<TimeIntervalProps> = ({
  value,
  condensed = false,
  refreshMs: _refreshMs,
  now,
  className,
  title,
  ...rest
}) => {
  const targetMs = useMemo(() => parseDate(value), [value]);
  const nowOverride = useMemo(() => resolveNowMs(now), [now]);

  if (typeof targetMs !== "number") {
    return null;
  }

  const baseNowMs = nowOverride ?? Date.now();
  const diffMs = Math.abs(targetMs - baseNowMs);
  const hasExplicitRefresh = typeof _refreshMs === "number" && _refreshMs > 0;
  const shouldUpdate =
    _refreshMs !== false && _refreshMs !== 0 && nowOverride === null;

  if (shouldUpdate && (hasExplicitRefresh || diffMs <= DEFAULT_FAST_WINDOW_MS)) {
    return (
      <LiveTimeInterval
        {...rest}
        targetMs={targetMs}
        condensed={condensed}
        className={className}
        title={title}
      />
    );
  }

  if (
    shouldUpdate &&
    diffMs > DEFAULT_FAST_WINDOW_MS &&
    diffMs <= DEFAULT_SLOW_WINDOW_MS
  ) {
    return (
      <SlowTimeInterval
        {...rest}
        targetMs={targetMs}
        condensed={condensed}
        className={className}
        title={title}
      />
    );
  }

  if (shouldUpdate && diffMs > DEFAULT_SLOW_WINDOW_MS) {
    return (
      <HourTimeInterval
        {...rest}
        targetMs={targetMs}
        condensed={condensed}
        className={className}
        title={title}
      />
    );
  }

  return (
    <StaticTimeInterval
      {...rest}
      targetMs={targetMs}
      nowMs={baseNowMs}
      condensed={condensed}
      className={className}
      title={title}
    />
  );
};

export default TimeInterval;
