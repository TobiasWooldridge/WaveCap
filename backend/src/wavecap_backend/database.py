"""SQLite persistence implemented with SQLModel."""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import AsyncIterator, List, Optional, Sequence

from sqlalchemy import Boolean, Column, DateTime, Float, Index, String, Text, func, or_
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlmodel import Field, SQLModel, delete, select, update
from sqlmodel.ext.asyncio.session import AsyncSession

from .datetime_utils import ensure_utc, utcnow
from .models import (
    PagerIncidentDetails,
    Stream,
    StreamSource,
    StreamStatus,
    TranscriptionEventType,
    TranscriptionResult,
    TranscriptionReviewStatus,
    TranscriptionSegment,
)


class StreamRecord(SQLModel, table=True):
    __tablename__ = "streams"
    __table_args__ = (
        Index("ix_streams_last_activity", "lastActivityAt"),
        {"extend_existing": True},
    )

    id: str = Field(primary_key=True)
    name: str
    url: str
    # Historical schema kept for compatibility; status/enabled no longer authoritative
    status: StreamStatus = Field(sa_column=Column("status", String, nullable=False))
    enabled: Optional[bool] = Field(
        default=None, sa_column=Column("enabled", Boolean, nullable=True)
    )
    pinned: bool = Field(
        default=False,
        sa_column=Column("pinned", Boolean, nullable=False, server_default="0"),
    )
    createdAt: datetime = Field(
        sa_column=Column("createdAt", DateTime(timezone=True), nullable=False)
    )
    language: Optional[str] = Field(
        default=None, sa_column=Column("language", String, nullable=True)
    )
    error: Optional[str] = Field(
        default=None, sa_column=Column("error", Text, nullable=True)
    )
    source: StreamSource = Field(
        default=StreamSource.AUDIO, sa_column=Column("source", String, nullable=False)
    )
    webhookToken: Optional[str] = Field(
        default=None, sa_column=Column("webhookToken", String, nullable=True)
    )
    ignoreFirstSeconds: float = Field(
        default=0.0,
        sa_column=Column("ignoreFirstSeconds", Float, nullable=False, default=0.0),
    )
    lastActivityAt: Optional[datetime] = Field(
        default=None,
        sa_column=Column("lastActivityAt", DateTime(timezone=True), nullable=True),
    )


class TranscriptionRecord(SQLModel, table=True):
    __tablename__ = "transcriptions"
    __table_args__ = (
        Index("ix_transcriptions_stream_timestamp", "streamId", "timestamp"),
        Index("ix_transcriptions_timestamp", "timestamp"),
        {"extend_existing": True},
    )

    id: str = Field(primary_key=True)
    streamId: str = Field(foreign_key="streams.id", nullable=False)
    text: str
    timestamp: datetime = Field(
        sa_column=Column("timestamp", DateTime(timezone=True), nullable=False)
    )
    confidence: Optional[float] = Field(
        default=None, sa_column=Column("confidence", Float, nullable=True)
    )
    duration: Optional[float] = Field(
        default=None, sa_column=Column("duration", Float, nullable=True)
    )
    segments: Optional[str] = Field(
        default=None, sa_column=Column("segments", Text, nullable=True)
    )
    recordingUrl: Optional[str] = Field(
        default=None, sa_column=Column("recordingUrl", String, nullable=True)
    )
    # Speech boundary offsets for optimized playback (seconds from recording start)
    speechStartOffset: Optional[float] = Field(
        default=None, sa_column=Column("speechStartOffset", Float, nullable=True)
    )
    speechEndOffset: Optional[float] = Field(
        default=None, sa_column=Column("speechEndOffset", Float, nullable=True)
    )
    # Precomputed amplitude waveform for UI visualization (JSON array of 0.0-1.0 floats)
    waveform: Optional[str] = Field(
        default=None, sa_column=Column("waveform", Text, nullable=True)
    )
    correctedText: Optional[str] = Field(
        default=None, sa_column=Column("correctedText", Text, nullable=True)
    )
    reviewStatus: TranscriptionReviewStatus = Field(
        default=TranscriptionReviewStatus.PENDING,
        sa_column=Column("reviewStatus", String, nullable=False),
    )
    reviewedAt: Optional[datetime] = Field(
        default=None,
        sa_column=Column("reviewedAt", DateTime(timezone=True), nullable=True),
    )
    reviewedBy: Optional[str] = Field(
        default=None, sa_column=Column("reviewedBy", String, nullable=True)
    )
    eventType: TranscriptionEventType = Field(
        default=TranscriptionEventType.TRANSCRIPTION,
        sa_column=Column(
            "eventType",
            String,
            nullable=False,
            default=TranscriptionEventType.TRANSCRIPTION.value,
        ),
    )
    pagerIncident: Optional[str] = Field(
        default=None,
        sa_column=Column("pagerIncident", Text, nullable=True),
    )
    # Hidden metadata for tracing event sources - stored as JSON
    eventMetadata: Optional[str] = Field(
        default=None,
        sa_column=Column("eventMetadata", Text, nullable=True),
    )


class StreamDatabase:
    """Persistence layer backed by SQLModel ORM."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._engine: AsyncEngine = create_async_engine(
            f"sqlite+aiosqlite:///{db_path}", connect_args={"check_same_thread": False}
        )
        self._session_factory = async_sessionmaker(
            self._engine, class_=AsyncSession, expire_on_commit=False
        )
        self._initialized = False
        self._init_lock: Optional[asyncio.Lock] = None

    async def initialize(self) -> None:
        """Create tables and ensure schema migrations are applied."""

        if self._initialized:
            return
        if self._init_lock is None:
            self._init_lock = asyncio.Lock()
        async with self._init_lock:
            if self._initialized:
                return
            async with self._engine.begin() as connection:
                await connection.run_sync(SQLModel.metadata.create_all)
                # Ensure optional columns exist for older installations.
                for statement in (
                    "ALTER TABLE streams ADD COLUMN source TEXT DEFAULT 'audio'",
                    "ALTER TABLE streams ADD COLUMN webhookToken TEXT",
                    "ALTER TABLE streams ADD COLUMN ignoreFirstSeconds REAL DEFAULT 0",
                    "ALTER TABLE streams ADD COLUMN lastActivityAt DATETIME",
                    "ALTER TABLE streams ADD COLUMN enabled BOOLEAN",
                    "ALTER TABLE streams ADD COLUMN pinned BOOLEAN DEFAULT 0",
                    "ALTER TABLE transcriptions ADD COLUMN eventType TEXT DEFAULT 'transcription'",
                    "ALTER TABLE transcriptions ADD COLUMN pagerIncident TEXT",
                    "ALTER TABLE transcriptions ADD COLUMN eventMetadata TEXT",
                    "ALTER TABLE transcriptions ADD COLUMN speechStartOffset REAL",
                    "ALTER TABLE transcriptions ADD COLUMN speechEndOffset REAL",
                    "ALTER TABLE transcriptions ADD COLUMN waveform TEXT",
                    "CREATE INDEX IF NOT EXISTS ix_streams_last_activity ON streams (lastActivityAt)",
                    "CREATE INDEX IF NOT EXISTS ix_transcriptions_stream_timestamp ON transcriptions (streamId, timestamp)",
                    "CREATE INDEX IF NOT EXISTS ix_transcriptions_timestamp ON transcriptions (timestamp)",
                ):
                    try:
                        await connection.exec_driver_sql(statement)
                    except Exception as exc:  # pragma: no cover - depends on existing schema
                        message = str(exc).lower()
                        if (
                            "duplicate column" not in message
                            and "already exists" not in message
                        ):
                            raise
            self._initialized = True

    @asynccontextmanager
    async def _session(self, *, commit: bool = True) -> AsyncIterator[AsyncSession]:
        await self.initialize()
        async with self._session_factory() as session:
            try:
                yield session
                if commit:
                    await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def close(self) -> None:
        await self._engine.dispose()

    # Stream operations -------------------------------------------------

    async def load_streams(self) -> List[Stream]:
        async with self._session(commit=False) as session:
            result = await session.exec(
                select(StreamRecord).order_by(StreamRecord.createdAt.asc())
            )
            records = result.all()
            return [self._record_to_stream(record) for record in records]

    async def save_stream(self, stream: Stream) -> None:
        async with self._session() as session:
            record = await session.get(StreamRecord, stream.id)
            if record is None:
                record = StreamRecord(id=stream.id)
            record.name = stream.name
            record.url = stream.url
            record.status = StreamStatus(stream.status)
            record.enabled = bool(stream.enabled)
            record.pinned = bool(stream.pinned)
            record.createdAt = stream.createdAt
            record.language = stream.language
            record.error = stream.error
            record.source = StreamSource(stream.source)
            record.webhookToken = stream.webhookToken
            record.ignoreFirstSeconds = float(stream.ignoreFirstSeconds)
            record.lastActivityAt = stream.lastActivityAt
            session.add(record)

    async def update_stream_activity(self, stream_id: str, timestamp: datetime) -> None:
        async with self._session() as session:
            await session.exec(
                update(StreamRecord)
                .where(StreamRecord.id == stream_id)
                .values(lastActivityAt=ensure_utc(timestamp))
            )

    async def delete_stream(self, stream_id: str) -> None:
        async with self._session() as session:
            await session.exec(
                delete(TranscriptionRecord).where(
                    TranscriptionRecord.streamId == stream_id
                )
            )
            await session.exec(
                delete(StreamRecord).where(StreamRecord.id == stream_id)
            )

    async def clear_all(self) -> None:
        """Remove all persisted streams and transcriptions."""

        async with self._session() as session:
            await session.exec(delete(TranscriptionRecord))
            await session.exec(delete(StreamRecord))

    # Transcription operations ------------------------------------------

    async def append_transcription(self, transcription: TranscriptionResult) -> None:
        segments_json: Optional[str]
        if transcription.segments:
            if isinstance(transcription.segments[0], dict):
                segments_json = json.dumps(transcription.segments)
            else:
                segments_json = json.dumps(
                    [segment.model_dump() for segment in transcription.segments]
                )
        else:
            segments_json = None
        async with self._session() as session:
            record = await session.get(TranscriptionRecord, transcription.id)
            if record is None:
                record = TranscriptionRecord(
                    id=transcription.id, streamId=transcription.streamId
                )
            record.streamId = transcription.streamId
            record.text = transcription.text
            record.timestamp = transcription.timestamp
            record.confidence = transcription.confidence
            record.duration = transcription.duration
            record.segments = segments_json
            record.recordingUrl = transcription.recordingUrl
            record.speechStartOffset = transcription.speechStartOffset
            record.speechEndOffset = transcription.speechEndOffset
            # Store waveform as JSON array
            if transcription.waveform:
                record.waveform = json.dumps(transcription.waveform)
            else:
                record.waveform = None
            record.correctedText = transcription.correctedText
            record.reviewStatus = transcription.reviewStatus
            record.reviewedAt = transcription.reviewedAt
            record.reviewedBy = transcription.reviewedBy
            record.eventType = TranscriptionEventType(transcription.eventType)
            if transcription.pagerIncident:
                if hasattr(transcription.pagerIncident, "model_dump"):
                    incident_json = json.dumps(
                        transcription.pagerIncident.model_dump(
                            by_alias=True, exclude_none=True
                        )
                    )
                else:
                    incident_json = json.dumps(transcription.pagerIncident)
            else:
                incident_json = None
            record.pagerIncident = incident_json
            # Store eventMetadata as JSON for tracing/debugging
            if transcription.eventMetadata:
                record.eventMetadata = json.dumps(transcription.eventMetadata)
            else:
                record.eventMetadata = None
            session.add(record)

    async def load_recent_transcriptions(
        self, stream_id: str, limit: int = 100
    ) -> List[TranscriptionResult]:
        async with self._session(commit=False) as session:
            result = await session.exec(
                select(TranscriptionRecord)
                .where(TranscriptionRecord.streamId == stream_id)
                .order_by(
                    TranscriptionRecord.timestamp.desc(),
                    TranscriptionRecord.id.desc(),
                )
                .limit(limit)
            )
            records = result.all()
            return [self._record_to_transcription(record) for record in records]

    async def load_last_system_event(
        self, stream_id: str
    ) -> Optional[TranscriptionResult]:
        async with self._session(commit=False) as session:
            result = await session.exec(
                select(TranscriptionRecord)
                .where(TranscriptionRecord.streamId == stream_id)
                .where(
                    TranscriptionRecord.eventType
                    != TranscriptionEventType.TRANSCRIPTION.value
                )
                .order_by(TranscriptionRecord.timestamp.desc())
                .limit(1)
            )
            record = result.first()
            if record is None:
                return None
            return self._record_to_transcription(record)

    def _record_to_transcription(
        self, record: TranscriptionRecord
    ) -> TranscriptionResult:
        segments_data = json.loads(record.segments) if record.segments else None
        segments: Optional[List[TranscriptionSegment]]
        if segments_data:
            segments = [
                TranscriptionSegment.model_validate(segment)
                for segment in segments_data
            ]
        else:
            segments = None
        pager_incident_data = (
            json.loads(record.pagerIncident) if record.pagerIncident else None
        )
        pager_incident: Optional[PagerIncidentDetails]
        if pager_incident_data:
            pager_incident = PagerIncidentDetails.model_validate(pager_incident_data)
        else:
            pager_incident = None
        waveform_data: Optional[List[float]] = (
            json.loads(record.waveform) if record.waveform else None
        )
        return TranscriptionResult(
            id=record.id,
            streamId=record.streamId,
            text=record.text,
            timestamp=record.timestamp,
            confidence=record.confidence,
            duration=record.duration,
            segments=segments,
            recordingUrl=record.recordingUrl,
            speechStartOffset=record.speechStartOffset,
            speechEndOffset=record.speechEndOffset,
            waveform=waveform_data,
            correctedText=record.correctedText,
            reviewStatus=TranscriptionReviewStatus(record.reviewStatus),
            reviewedAt=record.reviewedAt,
            reviewedBy=record.reviewedBy,
            eventType=TranscriptionEventType(record.eventType),
            pagerIncident=pager_incident,
        )

    async def query_transcriptions(
        self,
        stream_id: str,
        limit: int = 100,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None,
        search: Optional[str] = None,
        order: str = "desc",
    ) -> tuple[List[TranscriptionResult], bool]:
        statement = select(TranscriptionRecord).where(
            TranscriptionRecord.streamId == stream_id
        )
        if before is not None:
            statement = statement.where(TranscriptionRecord.timestamp < before)
        if after is not None:
            statement = statement.where(TranscriptionRecord.timestamp > after)

        if search:
            like_term = f"%{search.lower()}%"
            statement = statement.where(
                or_(
                    func.lower(TranscriptionRecord.text).like(like_term),
                    func.lower(TranscriptionRecord.correctedText).like(like_term),
                )
            )

        fetch_limit = max(0, limit)
        normalized_order = order.lower()
        if normalized_order == "asc":
            order_clause = (
                TranscriptionRecord.timestamp.asc(),
                TranscriptionRecord.id.asc(),
            )
        else:
            order_clause = (
                TranscriptionRecord.timestamp.desc(),
                TranscriptionRecord.id.desc(),
            )
        if fetch_limit == 0:
            statement = statement.order_by(*order_clause).limit(1)
        else:
            statement = statement.order_by(*order_clause).limit(fetch_limit + 1)

        async with self._session(commit=False) as session:
            result = await session.exec(statement)
            records = result.all()

        has_more_before = False
        if fetch_limit == 0:
            has_more_before = len(records) > 0
            trimmed_records: List[TranscriptionRecord] = []
        else:
            has_more_before = len(records) > fetch_limit
            trimmed_records = records[:fetch_limit]

        transcriptions = [
            self._record_to_transcription(record) for record in trimmed_records
        ]
        return transcriptions, has_more_before

    async def update_review(
        self,
        transcription_id: str,
        corrected_text: Optional[str],
        status: TranscriptionReviewStatus,
        reviewer: Optional[str],
    ) -> TranscriptionResult:
        now = utcnow()
        async with self._session() as session:
            record = await session.get(TranscriptionRecord, transcription_id)
            if record is None:
                raise KeyError(f"Transcription {transcription_id} not found")
            record.correctedText = corrected_text
            record.reviewStatus = status
            record.reviewedAt = now
            record.reviewedBy = reviewer
            session.add(record)
            return self._record_to_transcription(record)

    async def export_transcriptions(
        self,
        statuses: Optional[Sequence[TranscriptionReviewStatus]] = None,
    ) -> List[TranscriptionResult]:
        statement = select(TranscriptionRecord).order_by(
            TranscriptionRecord.timestamp.asc()
        )
        if statuses:
            statement = statement.where(
                TranscriptionRecord.reviewStatus.in_(list(statuses))
            )
        async with self._session(commit=False) as session:
            result = await session.exec(statement)
            records = result.all()
            return [self._record_to_transcription(record) for record in records]

    async def export_pager_messages(self, stream_id: str) -> List[TranscriptionResult]:
        statement = (
            select(TranscriptionRecord)
            .join(StreamRecord, StreamRecord.id == TranscriptionRecord.streamId)
            .where(
                StreamRecord.source == StreamSource.PAGER,
                TranscriptionRecord.streamId == stream_id,
            )
            .order_by(TranscriptionRecord.timestamp.asc())
        )

        async with self._session(commit=False) as session:
            result = await session.exec(statement)
            records = result.all()
            return [self._record_to_transcription(record) for record in records]

    def _record_to_stream(self, record: StreamRecord) -> Stream:
        # Database no longer dictates enabled state; default to False.
        enabled = bool(record.enabled) if record.enabled is not None else False
        return Stream(
            id=record.id,
            name=record.name,
            url=record.url,
            status=StreamStatus(record.status),
            enabled=bool(enabled),
            pinned=bool(record.pinned),
            createdAt=record.createdAt,
            language=record.language,
            error=record.error,
            transcriptions=[],
            source=StreamSource(record.source) if record.source else StreamSource.AUDIO,
            webhookToken=record.webhookToken,
            ignoreFirstSeconds=float(record.ignoreFirstSeconds or 0.0),
            lastActivityAt=record.lastActivityAt,
        )


__all__ = ["StreamDatabase"]
