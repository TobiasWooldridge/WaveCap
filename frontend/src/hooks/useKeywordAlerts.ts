import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stream, TranscriptionResult } from "@types";

export interface KeywordAlertNotification {
  id: string;
  ruleId: string;
  label: string;
  streamId: string;
  streamName: string;
  transcriptionId: string;
  text: string;
  matchedPhrases: string[];
  timestamp: string;
  playSound: boolean;
}

const ALERT_EXPIRY_MS = 15000;
const MAX_ALERTS = 5;

export const useKeywordAlerts = (
  streams: Stream[] | null | undefined,
): {
  keywordAlerts: KeywordAlertNotification[];
  handleAlertMatches: (transcription: TranscriptionResult) => void;
  handleDismissAlert: (id: string) => void;
} => {
  const [keywordAlerts, setKeywordAlerts] = useState<KeywordAlertNotification[]>(
    [],
  );
  const keywordAlertsRef = useRef<KeywordAlertNotification[]>([]);
  const removalTimeoutsRef = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamLookup = useMemo(() => {
    if (!streams) {
      return new Map<string, Stream>();
    }
    return new Map(streams.map((stream) => [stream.id, stream] as const));
  }, [streams]);

  const playAlertSound = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;
      if (!context) {
        return;
      }

      if (context.state === "suspended") {
        void context.resume().catch(() => {});
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(880, context.currentTime);

      gain.gain.setValueAtTime(0.0001, context.currentTime);
      oscillator.connect(gain);
      gain.connect(context.destination);
      gain.gain.exponentialRampToValueAtTime(0.3, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.6);

      oscillator.addEventListener("ended", () => {
        try {
          oscillator.disconnect();
        } catch {
          // ignore disconnect failures
        }
        try {
          gain.disconnect();
        } catch {
          // ignore disconnect failures
        }
      });
    } catch (error) {
      console.warn("Unable to play alert sound:", error);
    }
  }, []);

  useEffect(() => {
    keywordAlertsRef.current = keywordAlerts;
  }, [keywordAlerts]);

  useEffect(
    () => () => {
      removalTimeoutsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
      removalTimeoutsRef.current = [];
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    },
    [],
  );

  const handleAlertMatches = useCallback(
    (transcription: TranscriptionResult) => {
      if (
        !Array.isArray(transcription.alerts) ||
        transcription.alerts.length === 0
      ) {
        return;
      }

      const stream = streamLookup.get(transcription.streamId);
      const streamName = stream?.name || stream?.url || transcription.streamId;
      const baseText =
        typeof transcription.correctedText === "string" &&
        transcription.correctedText.trim().length > 0
          ? transcription.correctedText.trim()
          : transcription.text;
      const excerpt = typeof baseText === "string" ? baseText.trim() : "";
      const finalExcerpt = excerpt.length > 0 ? excerpt : "[Blank audio]";

      const pendingAlerts: KeywordAlertNotification[] = transcription.alerts
        .filter((match) => match && match.notify !== false)
        .map((match) => ({
          id: `${transcription.id}:${match.ruleId}`,
          ruleId: match.ruleId,
          label:
            match.label && match.label.trim().length > 0
              ? match.label
              : match.ruleId,
          streamId: transcription.streamId,
          streamName,
          transcriptionId: transcription.id,
          text: finalExcerpt,
          matchedPhrases: Array.isArray(match.matchedPhrases)
            ? match.matchedPhrases
            : [],
          timestamp: transcription.timestamp,
          playSound: match.playSound !== false,
        }));

      if (pendingAlerts.length === 0) {
        return;
      }

      const existingIds = new Set(keywordAlertsRef.current.map((alert) => alert.id));
      const deduped = pendingAlerts.filter(
        (alert) => !existingIds.has(alert.id),
      );

      if (deduped.length === 0) {
        return;
      }

      setKeywordAlerts((prev) => {
        const merged = [...deduped, ...prev];
        return merged.slice(0, MAX_ALERTS);
      });

      deduped.forEach((alert) => {
        if (alert.playSound) {
          playAlertSound();
        }
        const timeoutId = window.setTimeout(() => {
          setKeywordAlerts((current) =>
            current.filter((item) => item.id !== alert.id),
          );
          removalTimeoutsRef.current = removalTimeoutsRef.current.filter(
            (id) => id !== timeoutId,
          );
        }, ALERT_EXPIRY_MS);
        removalTimeoutsRef.current.push(timeoutId);
      });
    },
    [playAlertSound, streamLookup],
  );

  const handleDismissAlert = useCallback((id: string) => {
    setKeywordAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  return { keywordAlerts, handleAlertMatches, handleDismissAlert };
};
