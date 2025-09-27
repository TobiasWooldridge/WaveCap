export const toDatetimeLocalValue = (timestamp: string): string => {
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

export const formatDurationSeconds = (seconds: number): string => {
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

export const clampAccuracyPercentage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
};

