"""Pydantic models shared across the backend."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)

from .datetime_utils import ensure_utc, isoformat_utc, optional_isoformat, parse_iso8601
from . import state_paths


class APIModel(BaseModel):
    """Base class enabling consistent Pydantic configuration."""

    model_config = ConfigDict(populate_by_name=True)


class StreamStatus(str, Enum):
    """Possible lifecycle states for a stream."""

    STOPPED = "stopped"
    QUEUED = "queued"
    TRANSCRIBING = "transcribing"
    ERROR = "error"


class StreamSource(str, Enum):
    """Indicates how a stream receives its content."""

    AUDIO = "audio"
    PAGER = "pager"
    SDR = "sdr"


class AccessRole(str, Enum):
    """Represents the level of access granted to a viewer."""

    READ_ONLY = "read_only"
    EDITOR = "editor"


class TranscriptionReviewStatus(str, Enum):
    """Review workflow state."""

    PENDING = "pending"
    CORRECTED = "corrected"
    VERIFIED = "verified"


class TranscriptionEventType(str, Enum):
    """Classifies transcription entries for downstream consumers."""

    TRANSCRIPTION = "transcription"
    RECORDING_STARTED = "recording_started"
    RECORDING_STOPPED = "recording_stopped"
    TRANSCRIPTION_STARTED = "transcription_started"
    TRANSCRIPTION_STOPPED = "transcription_stopped"
    UPSTREAM_DISCONNECTED = "upstream_disconnected"
    UPSTREAM_RECONNECTED = "upstream_reconnected"


class TranscriptionSegment(APIModel):
    id: int
    text: str
    no_speech_prob: float
    temperature: float
    avg_logprob: float
    compression_ratio: float
    start: float
    end: float
    seek: int


class TranscriptionAlertTrigger(APIModel):
    ruleId: str = Field(alias="ruleId")
    label: Optional[str] = None
    matchedPhrases: List[str] = Field(default_factory=list, alias="matchedPhrases")
    playSound: Optional[bool] = Field(default=None, alias="playSound")
    notify: Optional[bool] = None


class PagerIncidentDetails(APIModel):
    incidentId: Optional[str] = Field(default=None, alias="incidentId")
    callType: Optional[str] = Field(default=None, alias="callType")
    address: Optional[str] = None
    alarmLevel: Optional[str] = Field(default=None, alias="alarmLevel")
    map: Optional[str] = None
    talkgroup: Optional[str] = None
    narrative: Optional[str] = None
    units: Optional[str] = None
    rawMessage: Optional[str] = Field(default=None, alias="rawMessage")

    @field_validator(
        "incidentId",
        "callType",
        "address",
        "alarmLevel",
        "map",
        "talkgroup",
        "narrative",
        "units",
        "rawMessage",
        mode="before",
    )
    @classmethod
    def _normalise_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            cleaned = value.strip()
        else:
            cleaned = str(value).strip()
        return cleaned or None


class TranscriptionResult(APIModel):
    id: str
    streamId: str = Field(alias="streamId")
    text: str
    timestamp: datetime
    eventType: TranscriptionEventType = Field(
        default=TranscriptionEventType.TRANSCRIPTION, alias="eventType"
    )
    confidence: Optional[float] = None
    duration: Optional[float] = None
    segments: Optional[List[TranscriptionSegment]] = None
    recordingUrl: Optional[str] = Field(default=None, alias="recordingUrl")
    recordingStartOffset: Optional[float] = Field(
        default=None, alias="recordingStartOffset"
    )
    correctedText: Optional[str] = Field(default=None, alias="correctedText")
    reviewStatus: TranscriptionReviewStatus = Field(
        default=TranscriptionReviewStatus.PENDING, alias="reviewStatus"
    )
    reviewedAt: Optional[datetime] = Field(default=None, alias="reviewedAt")
    reviewedBy: Optional[str] = Field(default=None, alias="reviewedBy")
    alerts: Optional[List[TranscriptionAlertTrigger]] = None
    pagerIncident: Optional["PagerIncidentDetails"] = Field(
        default=None, alias="pagerIncident"
    )

    @field_validator("recordingUrl", mode="before")
    @classmethod
    def _validate_recording_url(cls, value: Optional[str]) -> Optional[str]:
        """Return None if a recording path points to a missing file.

        This prevents the UI from attempting to play stale clips when
        the database contains older entries whose audio files have been
        removed from disk.
        """
        if not value:
            return None
        try:
            # Accept absolute/relative URLs; use the final path segment as the filename
            name = str(value).rsplit("/", 1)[-1]
            if not name:
                return None
            file_path = state_paths.RECORDINGS_DIR / name
            return value if file_path.exists() else None
        except Exception:
            # Be conservative on unexpected values
            return None

    @field_validator("timestamp", mode="before")
    @classmethod
    def _ensure_timestamp(cls, value: datetime | str) -> datetime:
        if isinstance(value, datetime):
            return ensure_utc(value)
        if isinstance(value, str):
            return ensure_utc(parse_iso8601(value))
        raise TypeError("timestamp must be a datetime or ISO 8601 string")

    @field_validator("reviewedAt", mode="before")
    @classmethod
    def _ensure_reviewed_at(cls, value: Optional[datetime | str]) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return ensure_utc(value)
        if isinstance(value, str):
            return ensure_utc(parse_iso8601(value))
        raise TypeError("reviewedAt must be a datetime or ISO 8601 string")

    @field_serializer("timestamp", when_used="json")
    def _serialize_timestamp(self, value: datetime) -> str:
        return isoformat_utc(value)

    @field_serializer("reviewedAt", when_used="json")
    def _serialize_reviewed_at(self, value: Optional[datetime]) -> Optional[str]:
        return optional_isoformat(value)


class Stream(APIModel):
    id: str
    name: str
    url: str
    status: StreamStatus
    enabled: bool = False
    pinned: bool = False
    createdAt: datetime = Field(alias="createdAt")
    language: Optional[str] = None
    error: Optional[str] = None
    transcriptions: List[TranscriptionResult] = Field(default_factory=list)
    source: StreamSource = Field(default=StreamSource.AUDIO)
    webhookToken: Optional[str] = Field(default=None, alias="webhookToken")
    ignoreFirstSeconds: float = Field(default=0.0, alias="ignoreFirstSeconds")
    lastActivityAt: Optional[datetime] = Field(default=None, alias="lastActivityAt")
    # Optional base location used by the UI to disambiguate partial addresses
    baseLocation: Optional["BaseLocationConfig"] = Field(
        default=None, alias="baseLocation"
    )

    @field_validator("createdAt", mode="before")
    @classmethod
    def _ensure_created_at(cls, value: datetime | str) -> datetime:
        if isinstance(value, datetime):
            return ensure_utc(value)
        if isinstance(value, str):
            return ensure_utc(parse_iso8601(value))
        raise TypeError("createdAt must be a datetime or ISO 8601 string")

    @field_serializer("createdAt", when_used="json")
    def _serialize_created_at(self, value: datetime) -> str:
        return isoformat_utc(value)

    @field_validator("ignoreFirstSeconds")
    @classmethod
    def _validate_ignore_first_seconds(cls, value: float) -> float:
        if value < 0:
            raise ValueError("ignoreFirstSeconds must be non-negative")
        return float(value)

    @field_validator("lastActivityAt", mode="before")
    @classmethod
    def _ensure_last_activity_at(
        cls, value: Optional[datetime | str]
    ) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return ensure_utc(value)
        if isinstance(value, str):
            return ensure_utc(parse_iso8601(value))
        raise TypeError("lastActivityAt must be a datetime or ISO 8601 string")

    @field_serializer("lastActivityAt", when_used="json")
    def _serialize_last_activity_at(self, value: Optional[datetime]) -> Optional[str]:
        return optional_isoformat(value)


class AlertRule(APIModel):
    id: str
    label: Optional[str] = None
    phrases: List[str]
    playSound: bool = True
    notify: bool = True
    caseSensitive: bool = Field(default=False, alias="caseSensitive")
    enabled: bool = True


class AlertsConfig(APIModel):
    enabled: bool = True
    rules: List[AlertRule] = Field(default_factory=list)


class LogTargetConfig(APIModel):
    enabled: bool = True
    clearOnStart: bool = Field(default=False, alias="clearOnStart")
    fileName: str = Field(default="backend.log", alias="fileName")


class LoggingConfig(APIModel):
    enabled: bool = True
    backend: LogTargetConfig = LogTargetConfig()
    frontend: LogTargetConfig = LogTargetConfig(fileName="frontend.log")


class ServerConfig(APIModel):
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    corsOrigin: str = Field(default="*", alias="corsOrigin")

    @field_validator("host")
    @classmethod
    def _validate_host(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("host must not be empty")
        return value

    @field_validator("port")
    @classmethod
    def _validate_port(cls, value: int) -> int:
        port = int(value)
        if not 0 < port <= 65535:
            raise ValueError("port must be between 1 and 65535")
        return port


class WhisperConfig(APIModel):
    model: str = "base"
    cpuFallbackModel: Optional[str] = Field(default="base", alias="cpuFallbackModel")
    language: Optional[str] = None
    sampleRate: int = Field(default=16000, alias="sampleRate")
    chunkLength: int = Field(default=60, alias="chunkLength")
    minChunkDurationSeconds: float = Field(default=4.5, alias="minChunkDurationSeconds")
    contextSeconds: float = Field(default=1.0, alias="contextSeconds")
    silenceThreshold: float = Field(default=0.015, alias="silenceThreshold")
    silenceLookbackSeconds: float = Field(default=4.0, alias="silenceLookbackSeconds")
    silenceHoldSeconds: float = Field(default=1.5, alias="silenceHoldSeconds")
    activeSamplesInLookbackPct: float = Field(
        default=0.15, alias="activeSamplesInLookbackPct"
    )
    maxConcurrentProcesses: int = Field(default=2, alias="maxConcurrentProcesses")
    beamSize: int = Field(default=5, alias="beamSize")
    decodeTemperature: float = Field(default=0.0, alias="decodeTemperature")
    temperatureIncrementOnFallback: float = Field(
        default=0.2, alias="temperatureIncrementOnFallback"
    )
    conditionOnPreviousText: bool = Field(
        default=False, alias="conditionOnPreviousText"
    )
    initialPrompt: Optional[str] = Field(default=None, alias="initialPrompt")
    # Named prompt presets that can be referenced by streams
    prompts: Dict[str, str] = Field(default_factory=dict, alias="prompts")
    blankAudioMinDurationSeconds: Optional[float] = Field(
        default=None, alias="blankAudioMinDurationSeconds"
    )
    blankAudioMinActiveRatio: Optional[float] = Field(
        default=None, alias="blankAudioMinActiveRatio"
    )
    blankAudioMinRms: Optional[float] = Field(default=None, alias="blankAudioMinRms")
    silenceHallucinationPhrases: List[str] = Field(
        default_factory=list, alias="silenceHallucinationPhrases"
    )
    noAudioReconnectSeconds: Optional[float] = Field(
        default=None, alias="noAudioReconnectSeconds"
    )
    highpassCutoffHz: Optional[float] = Field(default=250.0, alias="highpassCutoffHz")
    lowpassCutoffHz: Optional[float] = Field(default=3800.0, alias="lowpassCutoffHz")
    deemphasisTimeConstantMicros: Optional[float] = Field(
        default=75.0, alias="deemphasisTimeConstantMicros"
    )
    agcTargetRms: Optional[float] = Field(default=None, alias="agcTargetRms")
    segmentRepetitionMinCharacters: int = Field(
        default=16, alias="segmentRepetitionMinCharacters"
    )
    segmentRepetitionMaxAllowedConsecutiveRepeats: int = Field(
        default=4,
        alias="segmentRepetitionMaxAllowedConsecutiveRepeats",
        validation_alias=AliasChoices(
            "segmentRepetitionMaxAllowedConsecutiveRepeats",
            "segmentRepetitionMaxRepeats",
        ),
    )
    # When a remote HTTP audio source remains effectively silent for this long,
    # the worker restarts the upstream connection to nudge stuck transports.
    # Set to null or 0 to disable automatic reconnects on silence.
    silentStreamReconnectSeconds: Optional[float] = Field(
        default=3600.0, alias="silentStreamReconnectSeconds"
    )

    @field_validator("segmentRepetitionMinCharacters")
    @classmethod
    def _validate_segment_repetition_min_characters(cls, value: int) -> int:
        parsed = int(value)
        if parsed < 0:
            raise ValueError("segmentRepetitionMinCharacters must be non-negative")
        return parsed

    @field_validator("segmentRepetitionMaxAllowedConsecutiveRepeats")
    @classmethod
    def _validate_segment_repetition_max_allowed_repeats(cls, value: int) -> int:
        parsed = int(value)
        if parsed < 0:
            raise ValueError(
                "segmentRepetitionMaxAllowedConsecutiveRepeats must be non-negative"
            )
        return parsed

    @field_validator("noAudioReconnectSeconds")
    @classmethod
    def _validate_no_audio_reconnect_seconds(
        cls, value: Optional[float]
    ) -> Optional[float]:
        if value is None:
            return None
        seconds = float(value)
        if seconds <= 0:
            raise ValueError("noAudioReconnectSeconds must be positive when provided")
        return seconds


class ThemeMode(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"


class UISettingsConfig(APIModel):
    themeMode: ThemeMode = Field(default=ThemeMode.SYSTEM, alias="themeMode")
    colorCodingEnabled: bool = Field(default=False, alias="colorCodingEnabled")
    transcriptCorrectionEnabled: bool = Field(
        default=False, alias="transcriptCorrectionEnabled"
    )
    reviewExportStatuses: List[TranscriptionReviewStatus] = Field(
        default_factory=lambda: [
            TranscriptionReviewStatus.CORRECTED,
            TranscriptionReviewStatus.VERIFIED,
        ],
        alias="reviewExportStatuses",
    )
    # Optional base location used to disambiguate partial addresses in the UI
    baseLocation: Optional["BaseLocationConfig"] = Field(
        default=None, alias="baseLocation"
    )
    # Optional Google Maps Embed API key used for richer map previews.
    # When unset, the frontend falls back to a basic, unauthenticated embed URL.
    googleMapsApiKey: Optional[str] = Field(
        default=None, alias="googleMapsApiKey"
    )


class BaseLocationConfig(APIModel):
    """Represents a regional hint for address lookups.

    When pager incidents include an incomplete street address, the frontend can
    append these fields to the Google Maps query so results resolve within the
    intended region.
    """

    state: Optional[str] = None
    country: Optional[str] = None


class StreamConfig(APIModel):
    id: str
    name: str
    source: StreamSource = StreamSource.AUDIO
    url: Optional[str] = None
    enabled: bool = True
    pinned: bool = False
    language: Optional[str] = None
    webhookToken: Optional[str] = Field(default=None, alias="webhookToken")
    ignoreFirstSeconds: float = Field(default=0.0, alias="ignoreFirstSeconds")
    # SDR-specific configuration. Only used when source == "sdr".
    sdrDeviceId: Optional[str] = Field(default=None, alias="sdrDeviceId")
    sdrFrequencyHz: Optional[int] = Field(default=None, alias="sdrFrequencyHz")
    sdrMode: Optional[str] = Field(default="nfm", alias="sdrMode")
    sdrBandwidthHz: Optional[int] = Field(default=None, alias="sdrBandwidthHz")
    sdrSquelchDbFs: Optional[float] = Field(default=None, alias="sdrSquelchDbFs")
    # Optional reference to a named prompt in whisper.prompts
    initialPromptName: Optional[str] = Field(default=None, alias="initialPromptName")
    # Optional base location used by the UI to disambiguate partial addresses
    baseLocation: Optional["BaseLocationConfig"] = Field(
        default=None, alias="baseLocation"
    )

    @field_validator("ignoreFirstSeconds")
    @classmethod
    def _validate_ignore_first_seconds(cls, value: float) -> float:
        if value < 0:
            raise ValueError("ignoreFirstSeconds must be non-negative")
        return float(value)

    @model_validator(mode="after")
    def _validate_source_requirements(self) -> "StreamConfig":
        if self.source == StreamSource.AUDIO:
            if not self.url or not self.url.strip():
                raise ValueError("Audio streams require a non-empty url")
            if self.webhookToken is not None:
                raise ValueError("Audio streams must not define webhookToken")
        elif self.source == StreamSource.PAGER:
            if not self.webhookToken or not self.webhookToken.strip():
                raise ValueError("Pager streams require a webhookToken")
            if self.language is not None:
                raise ValueError("Pager streams do not support language settings")
        elif self.source == StreamSource.SDR:
            if self.webhookToken is not None:
                raise ValueError("SDR streams must not define webhookToken")
            if self.sdrDeviceId is None or not str(self.sdrDeviceId).strip():
                raise ValueError("SDR streams require sdrDeviceId")
            if self.sdrFrequencyHz is None or int(self.sdrFrequencyHz) <= 0:
                raise ValueError("SDR streams require a positive sdrFrequencyHz")
            if self.sdrMode is not None:
                mode = str(self.sdrMode).strip().lower()
                if mode not in {"nfm", "wfm", "am"}:
                    raise ValueError("Unsupported sdrMode; expected one of: nfm, wfm, am")
                self.sdrMode = mode
            if self.sdrBandwidthHz is not None and int(self.sdrBandwidthHz) <= 0:
                raise ValueError("sdrBandwidthHz must be positive when provided")
            if self.sdrSquelchDbFs is not None and float(self.sdrSquelchDbFs) > 0:
                raise ValueError("sdrSquelchDbFs must be <= 0 dBFS when provided")
            # Build a synthetic URL if missing so persistence stays simple
            if not self.url or not self.url.strip():
                self.url = f"sdr://{self.sdrDeviceId}/{int(self.sdrFrequencyHz)}"
        return self


class CombinedStreamViewConfig(APIModel):
    id: str
    name: str
    streamIds: List[str] = Field(alias="streamIds")
    description: Optional[str] = None

    @field_validator("streamIds")
    @classmethod
    def _validate_stream_ids(cls, value: List[str]) -> List[str]:
        if not value:
            raise ValueError("combined stream views must include at least one stream ID")

        cleaned: List[str] = []
        for candidate in value:
            if not isinstance(candidate, str):
                raise TypeError("streamIds must contain only strings")
            trimmed = candidate.strip()
            if not trimmed:
                raise ValueError("streamIds must not include empty values")
            cleaned.append(trimmed)
        return cleaned


class AccessCredential(APIModel):
    identifier: Optional[str] = None
    password: str
    role: AccessRole = AccessRole.EDITOR


class AccessControlConfig(APIModel):
    defaultRole: AccessRole = Field(default=AccessRole.READ_ONLY, alias="defaultRole")
    credentials: List[AccessCredential] = Field(default_factory=list)
    tokenTtlMinutes: Optional[int] = Field(default=None, alias="tokenTtlMinutes")


class LoginRequest(APIModel):
    password: str
    identifier: Optional[str] = None


class LoginResponse(APIModel):
    token: str
    role: AccessRole
    identifier: Optional[str] = None


class AccessDescriptor(APIModel):
    defaultRole: AccessRole = Field(alias="defaultRole")
    role: AccessRole
    authenticated: bool = False
    requiresPassword: bool = Field(default=False, alias="requiresPassword")
    identifier: Optional[str] = None


class AppConfig(APIModel):
    server: ServerConfig
    logging: LoggingConfig = LoggingConfig()
    whisper: WhisperConfig = WhisperConfig()
    alerts: AlertsConfig = AlertsConfig()
    streams: List[StreamConfig] = Field(
        default_factory=list,
        alias="streams",
        validation_alias=AliasChoices("streams", "defaultStreams"),
    )
    combinedStreamViews: List[CombinedStreamViewConfig] = Field(
        default_factory=list, alias="combinedStreamViews"
    )
    ui: UISettingsConfig = UISettingsConfig()
    access: AccessControlConfig = AccessControlConfig()
    # Optional SDR device registry
    sdr: Optional["SDRSystemConfig"] = None


class SDRDeviceConfig(APIModel):
    """Defines an SDR device available to the backend."""

    id: str
    # SoapySDR device string, e.g. "driver=sdrplay" or "driver=rtlsdr"
    soapy: str
    # Base sample rate used for IQ capture (e.g. 240000). 240k allows integer
    # decimation to 16kHz audio for speech with light CPU usage.
    sampleRateHz: int = Field(default=240000, alias="sampleRateHz")
    # Optional gain setting in dB; leave unset to use device defaults/AGC
    gainDb: Optional[float] = Field(default=None, alias="gainDb")
    # Optional discrete gain mode ("auto" or "manual")
    gainMode: Optional[str] = Field(default=None, alias="gainMode")
    # Expose hardware RF/IF bandwidth configuration when supported
    rfBandwidthHz: Optional[float] = Field(default=None, alias="rfBandwidthHz")
    antenna: Optional[str] = Field(default=None, alias="antenna")
    ppmCorrection: Optional[float] = Field(default=None, alias="ppmCorrection")
    loOffsetHz: Optional[float] = Field(default=None, alias="loOffsetHz")

    @model_validator(mode="after")
    def _validate_device(self) -> "SDRDeviceConfig":
        if self.sampleRateHz <= 0:
            raise ValueError("sampleRateHz must be positive")
        if self.gainMode is not None:
            normalised = str(self.gainMode).strip().lower()
            if normalised not in {"auto", "manual", ""}:
                raise ValueError("gainMode must be 'auto' or 'manual'")
            self.gainMode = normalised or None
        if self.rfBandwidthHz is not None and float(self.rfBandwidthHz) <= 0:
            raise ValueError("rfBandwidthHz must be positive when provided")
        if self.loOffsetHz is not None and float(self.loOffsetHz) == 0:
            self.loOffsetHz = 0.0
        return self


class SDRSystemConfig(APIModel):
    devices: List[SDRDeviceConfig] = Field(default_factory=list)


class UpdateAlertsRequest(AlertsConfig):
    @field_validator("rules")
    @classmethod
    def ensure_rule_enabled(cls, rules: List[AlertRule]) -> List[AlertRule]:
        for rule in rules:
            if not rule.phrases:
                raise ValueError("Each alert rule must provide at least one phrase")
        return rules


class UpdateStreamRequest(APIModel):
    name: Optional[str] = None
    language: Optional[str] = None
    ignoreFirstSeconds: Optional[float] = Field(
        default=None, alias="ignoreFirstSeconds"
    )

    @field_validator("ignoreFirstSeconds")
    @classmethod
    def _validate_ignore_first_seconds(
        cls, value: Optional[float]
    ) -> Optional[float]:
        if value is None:
            return None
        if value < 0:
            raise ValueError("ignoreFirstSeconds must be non-negative")
        return float(value)


class StreamLifecycleResponse(APIModel):
    stream: Stream


class PagerWebhookRequest(APIModel):
    message: str
    sender: Optional[str] = None
    priority: Optional[str] = None
    timestamp: Optional[datetime] = None
    details: Optional[List[str]] = None
    incident: Optional["PagerIncidentDetails"] = None

    @field_validator("timestamp", mode="before")
    @classmethod
    def _ensure_optional_timestamp(
        cls, value: Optional[datetime | str]
    ) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return ensure_utc(value)
        if isinstance(value, str):
            return ensure_utc(parse_iso8601(value))
        raise TypeError("timestamp must be a datetime or ISO 8601 string")

    @field_serializer("timestamp", when_used="json")
    def _serialize_optional_timestamp(self, value: Optional[datetime]) -> Optional[str]:
        return optional_isoformat(value)


class ReviewUpdateRequest(APIModel):
    correctedText: Optional[str] = Field(default=None, alias="correctedText")
    reviewStatus: TranscriptionReviewStatus = Field(alias="reviewStatus")
    reviewer: Optional[str] = None


class TranscriptionQueryResponse(APIModel):
    transcriptions: List[TranscriptionResult]
    hasMoreBefore: bool = Field(default=False, alias="hasMoreBefore")
    hasMoreAfter: bool = Field(default=False, alias="hasMoreAfter")


class ExportTranscriptionsRequest(APIModel):
    statuses: Optional[List[TranscriptionReviewStatus]] = None
