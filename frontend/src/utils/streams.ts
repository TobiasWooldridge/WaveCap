import { Stream } from "@types";

const STREAM_TITLE_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export const getStreamTitle = (stream: Stream): string => {
  const trimmedName = stream.name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedUrl = stream.url?.trim();
  if (trimmedUrl) {
    return trimmedUrl;
  }

  return "Untitled stream";
};

export const compareStreamsByName = (a: Stream, b: Stream): number => {
  const nameComparison = STREAM_TITLE_COLLATOR.compare(
    getStreamTitle(a),
    getStreamTitle(b),
  );

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return a.id.localeCompare(b.id);
};
