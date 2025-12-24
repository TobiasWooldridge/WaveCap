import React, { useMemo } from "react";
import { useClock } from "../../contexts/ClockContext";

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
   * interval, or set to 0/false to disable. If undefined, an adaptive
   * interval is chosen based on the current difference.
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

export const TimeInterval: React.FC<TimeIntervalProps> = ({
  value,
  condensed = false,
  refreshMs: _refreshMs, // Kept for API compatibility but now ignored
  now,
  className,
  title,
  ...rest
}) => {
  const targetMs = useMemo(() => parseDate(value), [value]);

  // Use shared clock from context, or override if `now` prop is provided
  const clockNowMs = useClock();
  const nowMs = useMemo(() => {
    if (now instanceof Date) return now.getTime();
    if (typeof now === "number") return now;
    return clockNowMs;
  }, [now, clockNowMs]);

  if (typeof targetMs !== "number") {
    return null;
  }

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

export default TimeInterval;

