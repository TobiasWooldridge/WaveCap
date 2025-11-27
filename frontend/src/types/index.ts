export type StreamStatus = "stopped" | "queued" | "transcribing" | "error";

export type StreamSource = "audio" | "pager" | "combined" | "remote";

export type ThemeMode = "light" | "dark" | "system";

export type StreamCommandState =
  | "starting"
  | "stopping"
  | "resetting"
  | "updating";

export type AccessRole = "read_only" | "editor";

export interface TranscriptionSegment {
  id: number;
  text: string;
  no_speech_prob: number;
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  start: number;
  end: number;
  seek: number;
}

export type TranscriptionReviewStatus = "pending" | "corrected" | "verified";

/**
 * ISO 8601 timestamp string guaranteed to include a timezone offset (UTC by default).
 */
export type IsoDateTimeString = string;

export type TranscriptionEventType =
  | "transcription"
  | "recording_started"
  | "recording_stopped"
  | "transcription_started"
  | "transcription_stopped"
  | "upstream_disconnected"
  | "upstream_reconnected";

export interface PagerIncidentDetails {
  incidentId?: string | null;
  callType?: string | null;
  address?: string | null;
  alarmLevel?: string | null;
  map?: string | null;
  talkgroup?: string | null;
  narrative?: string | null;
  units?: string | null;
  rawMessage?: string | null;
}

export interface TranscriptionResult {
  id: string;
  streamId: string;
  text: string;
  timestamp: IsoDateTimeString;
  eventType?: TranscriptionEventType;
  confidence?: number | null;
  duration?: number | null;
  segments?: TranscriptionSegment[];
  recordingUrl?: string;
  recordingStartOffset?: number;
  /** Seconds from recording start where speech begins (for optimized playback) */
  speechStartOffset?: number | null;
  /** Seconds from recording start where speech ends */
  speechEndOffset?: number | null;
  /** Precomputed amplitude waveform for UI visualization (0.0-1.0 normalized values) */
  waveform?: number[] | null;
  correctedText?: string | null;
  reviewStatus?: TranscriptionReviewStatus;
  reviewedAt?: IsoDateTimeString | null;
  reviewedBy?: string | null;
  alerts?: TranscriptionAlertTrigger[];
  pagerIncident?: PagerIncidentDetails | null;
}

export interface TranscriptionQueryResponse {
  transcriptions: TranscriptionResult[];
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
}

export interface Stream {
  id: string;
  name: string;
  url: string;
  status: StreamStatus;
  enabled: boolean;
  pinned?: boolean;
  createdAt: IsoDateTimeString;
  transcriptions: TranscriptionResult[];
  language?: string;
  error?: string | null;
  source?: StreamSource;
  webhookToken?: string | null;
  ignoreFirstSeconds?: number;
  lastActivityAt?: IsoDateTimeString | null;
  combinedStreamIds?: string[];
  baseLocation?: BaseLocation | null;
  // Optional metadata for remote streams
  upstreams?: RemoteUpstreamState[];
}

export type StreamUpdate = Pick<Stream, "id"> & Partial<Omit<Stream, "id">>;

export type ClientCommandType =
  | "start_transcription"
  | "stop_transcription"
  | "reset_stream"
  | "update_stream";

export interface ClientMessageBase {
  requestId?: string;
}

export type ClientToServerMessage =
  | ({ type: "start_transcription"; streamId: string } & ClientMessageBase)
  | ({ type: "stop_transcription"; streamId: string } & ClientMessageBase)
  | ({ type: "reset_stream"; streamId: string } & ClientMessageBase)
  | ({
        type: "update_stream";
        streamId: string;
        name?: string;
        language?: string;
        ignoreFirstSeconds?: number;
      } & ClientMessageBase);

export type ServerToClientMessage =
  | { type: "transcription"; data: TranscriptionResult }
  | { type: "streams_update"; data: StreamUpdate[] }
  | { type: "ping"; timestamp: number }
  | { type: "error"; message: string; requestId?: string }
  | {
      type: "ack";
      requestId: string;
      action: ClientCommandType;
      message?: string;
    };

export interface StreamConfig {
  id: string;
  name: string;
  url: string;
  enabled?: boolean;
  pinned?: boolean;
  language?: string;
  ignoreFirstSeconds?: number;
  source?: StreamSource;
  webhookToken?: string;
}

export interface ServerConfig {
  host: string;
  port: number;
  corsOrigin: string;
}

export interface WhisperConfig {
  model?: string;
  cpuFallbackModel?: string;
  language?: string;
  sampleRate?: number;
  chunkLength?: number;
  silenceThreshold?: number;
  silenceLookbackSeconds?: number;
  activeSamplesInLookbackPct?: number;
  silenceHoldSeconds?: number;
  contextSeconds?: number;
  minChunkDurationSeconds?: number;
  noSpeechThreshold?: number;
  silenceHallucinationPhrases?: string[];
  blankAudioMinDurationSeconds?: number;
  blankAudioMinActiveRatio?: number;
  blankAudioMinRms?: number;
  maxConcurrentProcesses?: number;
  [key: string]: unknown;
}

export interface AlertRule {
  id: string;
  label?: string;
  phrases: string[];
  playSound?: boolean;
  notify?: boolean;
  caseSensitive?: boolean;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface AlertsConfig {
  enabled: boolean;
  rules: AlertRule[];
  [key: string]: unknown;
}

export interface TranscriptionAlertTrigger {
  ruleId: string;
  label?: string;
  matchedPhrases: string[];
  playSound?: boolean;
  notify?: boolean;
}

export interface LogTargetConfig {
  enabled?: boolean;
  clearOnStart?: boolean;
  fileName?: string;
}

export interface LoggingConfig {
  enabled?: boolean;
  backend?: LogTargetConfig;
  frontend?: LogTargetConfig;
}

export interface UISettingsConfig {
  themeMode?: ThemeMode;
  colorCodingEnabled?: boolean;
  transcriptCorrectionEnabled?: boolean;
  reviewExportStatuses?: TranscriptionReviewStatus[];
  googleMapsApiKey?: string;
  baseLocation?: BaseLocation | null;
}

export interface AppConfig {
  streams: StreamConfig[];
  server: ServerConfig;
  whisper?: WhisperConfig;
  logging?: LoggingConfig;
  alerts?: AlertsConfig;
  ui?: UISettingsConfig;
}

export interface RemoteUpstreamState {
  id: string;
  mode: "pull" | "push" | string;
  connected: boolean;
  active: boolean;
  lastBytesAt?: IsoDateTimeString | null;
  sampleRate?: number | null;
  format?: string | null;
  snr?: number | null;
  rssi?: number | null;
  label?: string | null;
}

export interface BaseLocation {
  state?: string | null;
  country?: string | null;
}

export interface CombinedStreamView {
  id: string;
  name: string;
  description?: string;
  streamIds: string[];
}

export interface AccessDescriptor {
  defaultRole: AccessRole;
  role: AccessRole;
  authenticated: boolean;
  requiresPassword: boolean;
  identifier?: string | null;
}

export interface LoginResponse {
  token: string;
  role: AccessRole;
  identifier?: string | null;
}
