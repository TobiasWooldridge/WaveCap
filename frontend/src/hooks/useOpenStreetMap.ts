import { useEffect, useMemo, useState } from "react";
import type { MapLocationUrls } from "@types";
import { useUISettings } from "../contexts/UISettingsContext";

const DEFAULT_NOMINATIM_ENDPOINT =
  "https://nominatim.openstreetmap.org/search";
const DEFAULT_ZOOM = 15;

type GeocodeResult = {
  lat: number;
  lon: number;
  bbox: [number, number, number, number];
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  boundingbox?: string[];
};

const geocodeCache = new Map<string, GeocodeResult | null>();
const geocodeInflight = new Map<string, Promise<GeocodeResult | null>>();

const buildCacheKey = (
  query: string,
  endpoint: string,
  email: string | null,
): string => `${endpoint}|${email ?? ""}|${query}`;

const getCachedGeocode = (
  key: string,
): GeocodeResult | null | undefined => {
  if (!geocodeCache.has(key)) {
    return undefined;
  }
  return geocodeCache.get(key) ?? null;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseBoundingBox = (
  values: unknown,
): [number, number, number, number] | null => {
  if (!Array.isArray(values) || values.length < 4) {
    return null;
  }
  const south = parseNumber(values[0]);
  const north = parseNumber(values[1]);
  const west = parseNumber(values[2]);
  const east = parseNumber(values[3]);
  if (
    south === null ||
    north === null ||
    west === null ||
    east === null ||
    !Number.isFinite(south) ||
    !Number.isFinite(north) ||
    !Number.isFinite(west) ||
    !Number.isFinite(east)
  ) {
    return null;
  }
  return [south, north, west, east];
};

const buildSearchLink = (query: string): string => {
  const url = new URL("https://www.openstreetmap.org/search");
  url.searchParams.set("query", query);
  return url.toString();
};

const formatCoord = (value: number): string => value.toFixed(6);

const buildMapUrls = (result: GeocodeResult): MapLocationUrls => {
  const lat = formatCoord(result.lat);
  const lon = formatCoord(result.lon);
  const [south, north, west, east] = result.bbox;
  const bbox = [
    formatCoord(west),
    formatCoord(south),
    formatCoord(east),
    formatCoord(north),
  ].join(",");

  const embedUrl = new URL("https://www.openstreetmap.org/export/embed.html");
  embedUrl.searchParams.set("bbox", bbox);
  embedUrl.searchParams.set("layer", "mapnik");
  embedUrl.searchParams.set("marker", `${lat},${lon}`);

  const linkUrl = new URL("https://www.openstreetmap.org/");
  linkUrl.searchParams.set("mlat", lat);
  linkUrl.searchParams.set("mlon", lon);
  linkUrl.hash = `map=${DEFAULT_ZOOM}/${lat}/${lon}`;

  return { embed: embedUrl.toString(), link: linkUrl.toString() };
};

const parseGeocodeResult = (result: unknown): GeocodeResult | null => {
  if (!result || typeof result !== "object") {
    return null;
  }
  const candidate = result as NominatimResult;
  const lat = parseNumber(candidate.lat);
  const lon = parseNumber(candidate.lon);
  const bbox = parseBoundingBox(candidate.boundingbox);
  if (lat === null || lon === null || bbox === null) {
    return null;
  }
  return { lat, lon, bbox };
};

const buildNominatimUrl = (
  query: string,
  endpoint: string,
  email: string | null,
): string => {
  const baseOrigin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "http://localhost";
  const url = new URL(endpoint, baseOrigin);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  if (email) {
    url.searchParams.set("email", email);
  }
  return url.toString();
};

const fetchGeocode = async (
  query: string,
  endpoint: string,
  email: string | null,
): Promise<GeocodeResult | null> => {
  const response = await fetch(buildNominatimUrl(query, endpoint, email), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    return null;
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }
  return parseGeocodeResult(payload[0]);
};

const resolveGeocode = (
  query: string,
  endpoint: string,
  email: string | null,
): Promise<GeocodeResult | null> => {
  const key = buildCacheKey(query, endpoint, email);
  const cached = getCachedGeocode(key);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }
  const inflight = geocodeInflight.get(key);
  if (inflight) {
    return inflight;
  }
  const request = fetchGeocode(query, endpoint, email)
    .then((result) => {
      geocodeCache.set(key, result);
      geocodeInflight.delete(key);
      return result;
    })
    .catch(() => {
      geocodeCache.set(key, null);
      geocodeInflight.delete(key);
      return null;
    });
  geocodeInflight.set(key, request);
  return request;
};

export const useOpenStreetMapLocationUrls = (
  query: string | null | undefined,
): { urls: MapLocationUrls | null; isLoading: boolean } => {
  const { osmNominatimEndpoint, osmNominatimEmail } = useUISettings();
  const [state, setState] = useState<{
    urls: MapLocationUrls | null;
    isLoading: boolean;
  }>({ urls: null, isLoading: false });

  const normalizedQuery = useMemo(() => {
    if (typeof query !== "string") {
      return null;
    }
    const trimmed = query.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [query]);

  useEffect(() => {
    let active = true;

    if (!normalizedQuery) {
      setState({ urls: null, isLoading: false });
      return () => {
        active = false;
      };
    }

    const fallbackLink = buildSearchLink(normalizedQuery);
    const endpoint =
      typeof osmNominatimEndpoint === "string" &&
      osmNominatimEndpoint.trim().length > 0
        ? osmNominatimEndpoint.trim()
        : DEFAULT_NOMINATIM_ENDPOINT;
    const email =
      typeof osmNominatimEmail === "string" && osmNominatimEmail.trim().length > 0
        ? osmNominatimEmail.trim()
        : null;
    const cacheKey = buildCacheKey(normalizedQuery, endpoint, email);
    const cached = getCachedGeocode(cacheKey);

    if (cached !== undefined) {
      setState({
        urls: cached ? buildMapUrls(cached) : { embed: null, link: fallbackLink },
        isLoading: false,
      });
      return () => {
        active = false;
      };
    }

    setState({ urls: { embed: null, link: fallbackLink }, isLoading: true });

    resolveGeocode(normalizedQuery, endpoint, email)
      .then((result) => {
        if (!active) {
          return;
        }
        setState({
          urls: result ? buildMapUrls(result) : { embed: null, link: fallbackLink },
          isLoading: false,
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setState({ urls: { embed: null, link: fallbackLink }, isLoading: false });
      });

    return () => {
      active = false;
    };
  }, [normalizedQuery, osmNominatimEndpoint, osmNominatimEmail]);

  return state;
};
