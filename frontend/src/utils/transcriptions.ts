import type {
  TranscriptionAlertTrigger,
  TranscriptionEventType,
  TranscriptionResult,
  TranscriptionReviewStatus,
} from "@types";

export const BLANK_AUDIO_TOKEN = "[BLANK_AUDIO]";

export const isBlankAudioText = (text?: string | null): boolean =>
  typeof text === "string" && text.trim().toUpperCase() === BLANK_AUDIO_TOKEN;

const isSystemEventType = (eventType?: TranscriptionEventType): boolean =>
  Boolean(eventType && eventType !== "transcription");

export const getTranscriptionDisplayText = (
  transcription: TranscriptionResult,
): string | null => {
  if (isBlankAudioText(transcription.text)) {
    return null;
  }

  const corrected =
    typeof transcription.correctedText === "string"
      ? transcription.correctedText.trim()
      : "";
  if (corrected.length > 0) {
    return corrected;
  }

  const original =
    typeof transcription.text === "string" ? transcription.text.trim() : "";
  return original.length > 0 ? original : null;
};

export const getNotifiableAlerts = (
  alerts?: TranscriptionAlertTrigger[] | null,
): TranscriptionAlertTrigger[] => {
  if (!Array.isArray(alerts)) {
    return [];
  }

  return alerts.filter((trigger): trigger is TranscriptionAlertTrigger =>
    Boolean(trigger && trigger.notify !== false),
  );
};

export const getReviewStatus = (
  transcription: TranscriptionResult,
): TranscriptionReviewStatus => transcription.reviewStatus ?? "pending";

export const isSystemTranscription = (
  transcription: TranscriptionResult,
): boolean => isSystemEventType(transcription.eventType);
