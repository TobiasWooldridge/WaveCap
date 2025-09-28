export type LastViewedMap = Record<string, number>;

export const LAST_VIEWED_STORAGE_KEY = "wavecap-last-viewed-at";

const isNonNullObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

/**
 * Ensure an arbitrary value conforms to LastViewedMap. Filters out invalid keys/values.
 */
export const sanitizeLastViewedMap = (value: unknown): LastViewedMap => {
  if (!isNonNullObject(value)) {
    return {};
  }

  const result: LastViewedMap = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== "string") {
      continue;
    }
    const num = typeof raw === "number" ? raw : Number.NaN;
    if (!Number.isFinite(num) || num < 0) {
      continue;
    }
    // Truncate to integer milliseconds
    const ts = Math.floor(num);
    result[key] = ts;
  }
  return result;
};

/**
 * Parses a JSON string (or null) into a LastViewedMap, with validation.
 */
export const parseLastViewedMapString = (raw: string | null): LastViewedMap => {
  if (raw === null) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeLastViewedMap(parsed);
  } catch {
    return {};
  }
};

/**
 * Reads the stored LastViewedMap from localStorage. Returns an empty object in
 * non-browser environments or if the stored value is missing/invalid.
 */
export const getStoredLastViewedMap = (): LastViewedMap => {
  if (typeof window === "undefined") {
    return {};
  }
  const stored = window.localStorage.getItem(LAST_VIEWED_STORAGE_KEY);
  return parseLastViewedMapString(stored);
};

/**
 * Persists the LastViewedMap to localStorage. No-ops in non-browser envs.
 */
export const storeLastViewedMap = (map: LastViewedMap): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload = JSON.stringify(map);
    window.localStorage.setItem(LAST_VIEWED_STORAGE_KEY, payload);
  } catch {
    // Swallow storage exceptions (quota, invalid JSON, etc.) silently
  }
};

