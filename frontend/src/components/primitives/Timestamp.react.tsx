import React from "react";

export type TimestampMode = "time" | "date" | "datetime";

export interface TimestampFormatDetails {
  date: Date;
  label: string;
  dateLabel: string;
  iso: string;
  title: string;
  mode: TimestampMode;
}

const defaultTimeOptions: Intl.DateTimeFormatOptions = { hour12: false };
const defaultDateTimeOptions: Intl.DateTimeFormatOptions = { hour12: false };
const defaultTitleOptions: Intl.DateTimeFormatOptions = {
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
};

const parseTimestampValue = (
  value: string | number | Date | null | undefined,
): Date | null => {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : new Date(time);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatLabel = (
  date: Date,
  mode: TimestampMode,
  {
    timeOptions,
    dateOptions,
    dateTimeOptions,
  }: {
    timeOptions?: Intl.DateTimeFormatOptions;
    dateOptions?: Intl.DateTimeFormatOptions;
    dateTimeOptions?: Intl.DateTimeFormatOptions;
  },
): string => {
  switch (mode) {
    case "date":
      return date.toLocaleDateString([], dateOptions);
    case "datetime":
      return date.toLocaleString([], dateTimeOptions ?? defaultDateTimeOptions);
    case "time":
    default:
      return date.toLocaleTimeString([], timeOptions ?? defaultTimeOptions);
  }
};

export interface TimestampProps
  extends Omit<React.TimeHTMLAttributes<HTMLTimeElement>, "prefix"> {
  value: string | number | Date;
  mode?: TimestampMode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  showDate?: boolean;
  dateClassName?: string;
  timeOptions?: Intl.DateTimeFormatOptions;
  dateOptions?: Intl.DateTimeFormatOptions;
  dateTimeOptions?: Intl.DateTimeFormatOptions;
  titleOptions?: Intl.DateTimeFormatOptions;
  titleFormatter?: (details: TimestampFormatDetails) => string | undefined;
  renderLabel?: (details: TimestampFormatDetails) => React.ReactNode;
}

export const Timestamp: React.FC<TimestampProps> = ({
  value,
  mode = "time",
  prefix = null,
  suffix = null,
  showDate = false,
  dateClassName,
  timeOptions,
  dateOptions,
  dateTimeOptions,
  titleOptions,
  titleFormatter,
  renderLabel,
  className,
  ...rest
}) => {
  const { title: explicitTitle, ...restProps } = rest;
  const parsedDate = parseTimestampValue(value);

  if (!parsedDate) {
    return null;
  }

  const label = formatLabel(parsedDate, mode, {
    timeOptions,
    dateOptions,
    dateTimeOptions,
  });
  const dateLabel = parsedDate.toLocaleDateString([], dateOptions);
  const iso = parsedDate.toISOString();
  const baseTitle = parsedDate.toLocaleString([], titleOptions ?? defaultTitleOptions);

  const details: TimestampFormatDetails = {
    date: parsedDate,
    label,
    dateLabel,
    iso,
    title: baseTitle,
    mode,
  };

  const formattedTitle = titleFormatter ? titleFormatter(details) : undefined;
  const computedTitle = explicitTitle ?? formattedTitle ?? details.title;

  const content = renderLabel ? (
    renderLabel(details)
  ) : (
    <>
      {prefix}
      {details.label}
      {suffix}
      {showDate && details.dateLabel ? (
        <span className={dateClassName}>({details.dateLabel})</span>
      ) : null}
    </>
  );

  return (
    <time
      {...(restProps as React.TimeHTMLAttributes<HTMLTimeElement>)}
      className={className}
      dateTime={details.iso}
      title={computedTitle}
    >
      {content}
    </time>
  );
};

