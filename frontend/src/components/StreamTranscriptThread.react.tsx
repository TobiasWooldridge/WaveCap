import React, { useMemo } from "react";
import { Pause, Play } from "lucide-react";
import type {
  TranscriptionGroup,
} from "./StreamTranscriptionPanel.logic";
import type { TranscriptionResult, TranscriptionReviewStatus, BaseLocation } from "@types";
import {
  getNotifiableAlerts,
  isBlankAudioText,
  isSystemTranscription,
} from "../utils/transcriptions";
import { getRecordingElementId } from "./StreamTranscriptionPanel.logic";
import Button from "./primitives/Button.react";
import { Timestamp } from "./primitives/Timestamp.react";
import { TimeInterval } from "./primitives/TimeInterval.react";
import { AlertChips } from "./chips/AlertChips.react";
import { SystemEventChip } from "./chips/SystemEventChip.react";
import { TranscriptionSegmentChips } from "./TranscriptionSegmentChips.react";
import { condensePagerTranscriptions } from "../utils/pagerMessages";
import { PagerTranscriptTable } from "./PagerTranscriptTable.react";
import { TranscriptionReviewControls } from "./TranscriptionReviewControls.react";
import AudioElement from "./primitives/AudioElement.react";
import { useUISettings } from "../contexts/UISettingsContext";

type PlayAllHandler = (
  streamId: string,
  transcription: TranscriptionResult,
  orderedTranscriptions: TranscriptionResult[],
) => void;

type PlaySegmentHandler = (
  recordingUrl: string,
  startTime: number | undefined,
  endTime: number | undefined,
  transcriptionId: string,
  options?: { recordingStartOffset?: number },
) => void;

export interface StreamTranscriptThreadProps {
  streamId: string;
  group: TranscriptionGroup;
  orderedTranscriptions: TranscriptionResult[];
  streamIsPager: boolean;
  transcriptCorrectionEnabled: boolean;
  isReadOnly: boolean;
  playingRecording: string | null;
  playingTranscriptionId: string | null;
  playingSegmentId: string | null;
  recordingAudioRefs: React.MutableRefObject<Record<string, HTMLAudioElement | null>>;
  onPlayAll: PlayAllHandler;
  onPlaySegment: PlaySegmentHandler;
  onStopPlayback: () => void;
  isSegmentCurrentlyPlaying: (
    recordingUrl: string,
    startTime: number,
    endTime: number,
  ) => boolean;
  openPagerMessageIds: Record<string, boolean>;
  onTogglePagerMessage: (id: string) => void;
  onReviewTranscription: (
    id: string,
    updates: {
      correctedText?: string | null;
      reviewStatus: TranscriptionReviewStatus;
      reviewer?: string | null;
    },
  ) => Promise<unknown>;
  baseLocation?: BaseLocation | null;
}

const StreamTranscriptThread: React.FC<StreamTranscriptThreadProps> = ({
  streamId,
  group,
  orderedTranscriptions,
  streamIsPager,
  transcriptCorrectionEnabled,
  isReadOnly,
  playingRecording,
  playingTranscriptionId,
  playingSegmentId,
  recordingAudioRefs,
  onPlayAll,
  onPlaySegment,
  onStopPlayback,
  isSegmentCurrentlyPlaying,
  openPagerMessageIds,
  onTogglePagerMessage,
  onReviewTranscription,
  baseLocation: streamBaseLocation,
}) => {
  const renderedRecordings = new Set<string>();
  const audioElements: React.ReactNode[] = [];

  const incidentSource = group.transcriptions.find(
    (item) => item.pagerIncident?.incidentId,
  );
  const incidentDetails = incidentSource?.pagerIncident ?? null;
  const { baseLocation } = useUISettings();
  const effectiveBaseLocation = streamBaseLocation ?? baseLocation;
  const baseLocationSuffix = useMemo(() => {
    if (!effectiveBaseLocation) return null;
    const parts: string[] = [];
    if (effectiveBaseLocation.state) parts.push(effectiveBaseLocation.state);
    if (effectiveBaseLocation.country) parts.push(effectiveBaseLocation.country);
    return parts.length > 0 ? parts.join(", ") : null;
  }, [effectiveBaseLocation]);
  const incidentIdLabel = (() => {
    const value = incidentDetails?.incidentId ?? group.pagerIncidentId ?? null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();
  const incidentCallType = incidentDetails?.callType ?? null;
  const incidentMetaParts: string[] = [];
  if (incidentDetails?.address) incidentMetaParts.push(incidentDetails.address);
  if (incidentDetails?.alarmLevel)
    incidentMetaParts.push(`Alarm level ${incidentDetails.alarmLevel}`);
  if (incidentDetails?.talkgroup)
    incidentMetaParts.push(`Talkgroup ${incidentDetails.talkgroup}`);
  if (incidentDetails?.map) incidentMetaParts.push(`Map ${incidentDetails.map}`);
  const incidentNarrative = incidentDetails?.narrative ?? null;
  const incidentLocationQuery = (() => {
    if (!incidentDetails) return null;
    const parts: string[] = [];
    if (incidentDetails.address) parts.push(incidentDetails.address);
    if (incidentDetails.map && !parts.includes(incidentDetails.map)) {
      parts.push(`Map ${incidentDetails.map}`);
    }
    if (baseLocationSuffix) {
      parts.push(baseLocationSuffix);
    }
    return parts.length > 0 ? parts.join(", ") : null;
  })();

  const incidentLocationUrls = incidentLocationQuery
    ? (() => {
        const encodedQuery = encodeURIComponent(incidentLocationQuery);
        return {
          embed: `https://maps.google.com/maps?hl=en&q=${encodedQuery}&ie=UTF8&output=embed`,
          link: `https://maps.google.com/maps?hl=en&q=${encodedQuery}&ie=UTF8&z=15`,
        } as const;
      })()
    : null;

  const transcriptionElements = group.transcriptions.map((transcription) => {
    const items: JSX.Element[] = [];
    const recordingUrl = transcription.recordingUrl;
    const recordingId = recordingUrl ? getRecordingElementId(recordingUrl) : null;
    const isSystemEvent = isSystemTranscription(transcription);

    if (recordingUrl && recordingId && !renderedRecordings.has(recordingId)) {
      renderedRecordings.add(recordingId);
      audioElements.push(
        <AudioElement
          key={recordingId}
          recordingId={recordingId}
          recordingUrl={recordingUrl}
          refsMap={recordingAudioRefs}
        />,
      );
    }

    if (isSystemEvent) {
      const label =
        typeof transcription.text === "string" ? transcription.text.trim() : "";
      if (label) {
        items.push(
          <SystemEventChip
            key={`${transcription.id}-system`}
            label={label}
            eventType={transcription.eventType}
          />,
        );
      }
      return { id: transcription.id, items } as const;
    }

    const blankAudio = isBlankAudioText(transcription.text);
    const reviewStatus: TranscriptionReviewStatus =
      transcription.reviewStatus ?? "pending";
    const correctedText =
      typeof transcription.correctedText === "string" &&
      transcription.correctedText.trim().length > 0
        ? transcription.correctedText
        : null;
    const displayText = correctedText ?? transcription.text;
    const alertTriggers = getNotifiableAlerts(transcription.alerts);

    if (alertTriggers.length > 0) {
      items.push(
        <AlertChips key={`${transcription.id}-alert`} triggers={alertTriggers} mode="collapsed" />,
      );
    }

    items.push(
      <TranscriptionSegmentChips
        key={`${transcription.id}-segments`}
        transcription={transcription}
        displayText={displayText}
        blankAudio={blankAudio}
        transcriptCorrectionEnabled={transcriptCorrectionEnabled}
        recordingUrl={recordingUrl}
        recordingId={recordingId}
        playingSegmentId={playingSegmentId}
        onPlaySegment={onPlaySegment}
        isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
        boundaryKey="end-marker"
      />,
    );

    if (transcriptCorrectionEnabled && reviewStatus !== "pending") {
      items.push(
        <span
          key={`${transcription.id}-status`}
          className={`review-badge review-badge--${reviewStatus}`}
        >
          {reviewStatus === "verified" ? "Verified" : "Correction saved"}
        </span>,
      );
    }

    if (transcriptCorrectionEnabled) {
      items.push(
        <div key={`${transcription.id}-review`} className="w-full">
          <TranscriptionReviewControls
            transcription={transcription}
            onReview={onReviewTranscription}
            readOnly={isReadOnly}
          />
        </div>,
      );
    }

    return { id: transcription.id, items } as const;
  });

  const transcriptionItems = transcriptionElements.flatMap((entry) => entry.items);
  const groupHasAlerts = group.transcriptions.some(
    (item) => getNotifiableAlerts(item.alerts).length > 0,
  );
  const hasStandardTranscriptions = group.transcriptions.some(
    (item) => !isSystemTranscription(item),
  );
  const firstPlayableTranscription = group.transcriptions.find((t) => Boolean(t.recordingUrl));
  const isGroupPlaying = group.transcriptions.some((t) => {
    if (!t.recordingUrl) return false;
    const rid = getRecordingElementId(t.recordingUrl);
    return playingRecording === rid && playingTranscriptionId === t.id;
  });
  const playButton = firstPlayableTranscription ? (
    <Button
      key={`${group.id}-play`}
      use="unstyled"
      onClick={() => {
        if (isGroupPlaying) {
          onStopPlayback();
        } else {
          onPlayAll(streamId, firstPlayableTranscription, orderedTranscriptions);
        }
      }}
      className="chip-button chip-button--accent"
    >
      {isGroupPlaying ? <Pause size={14} /> : <Play size={14} />}
      {isGroupPlaying ? "Stop" : "Play all"}
    </Button>
  ) : null;

  const pagerMessages = streamIsPager
    ? condensePagerTranscriptions(
        group.transcriptions.filter((item) => !isSystemTranscription(item)),
      )
    : [];

  const elementMap = new Map(
    transcriptionElements.map((entry) => [entry.id, entry.items] as const),
  );

  const aggregatedIds =
    pagerMessages.length > 0
      ? new Set<string>(
          pagerMessages.flatMap((message) =>
            message.fragments.map((fragment) => fragment.id),
          ),
        )
      : null;

  const baseItems =
    aggregatedIds !== null
      ? transcriptionElements
          .filter((entry) => !aggregatedIds.has(entry.id))
          .flatMap((entry) => entry.items)
      : transcriptionItems;

  const pagerContent =
    pagerMessages.length > 0
      ? [
          <PagerTranscriptTable
            key={`${group.id}-pager`}
            groupId={group.id}
            messages={pagerMessages}
            elementMap={elementMap}
            openMessageIds={openPagerMessageIds}
            onToggleMessage={onTogglePagerMessage}
            incidentLocationUrls={incidentLocationUrls}
            incidentLocationQuery={incidentLocationQuery ?? undefined}
          />,
        ]
      : [];

  const groupContent = [
    ...(playButton ? [playButton] : []),
    ...pagerContent,
    ...baseItems,
  ];

  const transcriptContentClassName = streamIsPager
    ? "transcript-thread__content transcript-thread__content--pager"
    : "transcript-thread__content";

  // Only render the header map when not using the pager detail view.
  // Compute a narrowed reference so TypeScript knows it's non-null in JSX.
  const headerLocationUrls =
    incidentLocationUrls && !(streamIsPager && pagerMessages.length > 0)
      ? incidentLocationUrls
      : null;

  // When rendering the compact pager table, keep only a short header
  // (incident id + call type). Suppress address/meta/narrative.
  const useCompactPagerHeader = streamIsPager && pagerMessages.length > 0;

  return (
    <article
      className={`transcript-thread${groupHasAlerts ? " transcript-thread--alert" : ""}`}
    >
      <div className="transcript-thread__body">
        <header className="transcript-thread__header">
          {group.startTimestamp ? (
            <>
              <Timestamp value={group.startTimestamp} className="transcript-thread__time" />
              <TimeInterval
                value={group.startTimestamp}
                className="ms-1 transcript-thread__time"
                condensed
              />
            </>
          ) : (
            <span className="transcript-thread__time">Unknown</span>
          )}
          {group.transcriptions.length > 1 ? (
            <span className="transcript-thread__updates">+{group.transcriptions.length - 1} updates</span>
          ) : null}
          {!hasStandardTranscriptions ? (
            <span className="transcript-meta__confidence transcript-meta__confidence--system">System event</span>
          ) : null}
        </header>

        {incidentIdLabel || incidentCallType || (!useCompactPagerHeader && (incidentMetaParts.length > 0 || incidentNarrative)) ? (
          <div className="transcript-thread__incident-summary">
            {incidentIdLabel || incidentCallType ? (
              <div className="transcript-thread__incident">
                {incidentIdLabel ? (
                  <span className="transcript-thread__incident-id">{incidentIdLabel}</span>
                ) : null}
                {incidentCallType ? (
                  <span className="transcript-thread__incident-type">{incidentCallType}</span>
                ) : null}
              </div>
            ) : null}
            {!useCompactPagerHeader && incidentMetaParts.length > 0 ? (
              <div className="transcript-thread__incident-meta">
                {incidentMetaParts.map((part, index) => (
                  <span key={`${group.id}-incident-meta-${index}`}>{part}</span>
                ))}
              </div>
            ) : null}
            {!useCompactPagerHeader && incidentNarrative ? (
              <div className="transcript-thread__incident-narrative">{incidentNarrative}</div>
            ) : null}
            {headerLocationUrls ? (
              <div className="transcript-thread__incident-map">
                <iframe
                  className="transcript-thread__incident-map-frame"
                  src={headerLocationUrls.embed}
                  title="Incident location"
                  aria-label="Incident map"
                />
                <a
                  className="transcript-thread__incident-map-link"
                  href={headerLocationUrls.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View in Google Maps
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={transcriptContentClassName}>{groupContent}</div>

        {audioElements.length > 0 ? (
          <div className="hidden" aria-hidden>
            {audioElements}
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default StreamTranscriptThread;
