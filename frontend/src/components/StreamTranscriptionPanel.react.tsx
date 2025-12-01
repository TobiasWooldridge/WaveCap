import { useMemo } from "react";
import { Radio } from "lucide-react";
import type { Stream, TranscriptionResult, TranscriptionReviewStatus } from "@types";
import { compareStreamsByName } from "../utils/streams";
import { buildPlaybackQueue } from "./StreamTranscriptionPanel.logic";
import { useTranscriptionAudioPlayback } from "../hooks/useTranscriptionAudioPlayback";
import { HoveredSegmentProvider } from "../contexts/HoveredSegmentContext";
import StreamSection from "./StreamSection.react";
import { PlaybackBar } from "./PlaybackBar.react";
import "./StreamTranscriptionPanel.scss";
import type { StandaloneStreamControls } from "./streamControls";

export type { StandaloneStreamControls } from "./streamControls";

interface StreamTranscriptionPanelProps {
  streams: Stream[];
  onResetStream: (streamId: string) => void;
  onReviewTranscription: (
    transcriptionId: string,
    updates: {
      correctedText?: string | null;
      reviewStatus: TranscriptionReviewStatus;
      reviewer?: string | null;
    },
  ) => Promise<unknown>;
  focusStreamId?: string;
  onStandaloneControlsChange?: (controls: StandaloneStreamControls | null) => void;
  onExportPagerFeed?: () => Promise<void> | void;
  onSelectPagerExportStream?: (streamId: string) => void;
  pagerExporting?: boolean;
}

export const StreamTranscriptionPanel = ({
  streams,
  onResetStream,
  onReviewTranscription,
  focusStreamId,
  onStandaloneControlsChange,
  onExportPagerFeed,
  onSelectPagerExportStream,
  pagerExporting = false,
}: StreamTranscriptionPanelProps) => {
  const {
    recordingAudioRefs,
    playingRecording,
    playingTranscriptionId,
    playingSegment,
    currentPlayTime,
    volume,
    setVolume,
    playRecording,
    playSegment,
    stopCurrentRecording,
    isSegmentCurrentlyPlaying,
  } = useTranscriptionAudioPlayback();

  const baseVisibleStreams = useMemo<Stream[]>(() => {
    if (!Array.isArray(streams) || streams.length === 0) return [];
    if (!focusStreamId) return streams;
    return streams.filter((stream) => stream.id === focusStreamId);
  }, [streams, focusStreamId]);

  const visibleStreams = useMemo<Stream[]>(() => {
    if (focusStreamId) return baseVisibleStreams;
    // Sort Z–A by name for consistent ordering
    return [...baseVisibleStreams].sort((a, b) => compareStreamsByName(b, a));
  }, [baseVisibleStreams, focusStreamId]);

  const focusedVisibleStream = visibleStreams.length === 1 ? visibleStreams[0] : null;
  const focusedVisibleStreamId = focusedVisibleStream?.id ?? null;
  const isStandaloneView = Boolean(focusedVisibleStreamId);

  // Find the currently playing transcription and its stream
  const playingInfo = useMemo(() => {
    if (!playingTranscriptionId) return null;
    for (const stream of streams) {
      const transcription = stream.transcriptions?.find(
        (t) => t.id === playingTranscriptionId,
      );
      if (transcription) {
        return { transcription, streamName: stream.name };
      }
    }
    return null;
  }, [streams, playingTranscriptionId]);

  const handlePlayAll = (
    streamId: string,
    transcription: TranscriptionResult,
    orderedTranscriptions: TranscriptionResult[],
  ) => {
    const queue = buildPlaybackQueue(streamId, orderedTranscriptions, transcription.id);
    if (queue) {
      playRecording(transcription, { queue });
      return;
    }
    playRecording(transcription);
  };

  if (visibleStreams.length === 0) {
    return (
      <section className="transcript-view">
        <div className="transcript-view__header">
          <div className="transcript-view__title">
            <Radio size={18} className="text-primary" />
            <div>
              <h2 className="h5 mb-0">Live transcriptions</h2>
              <div className="transcript-view__summary text-body-secondary small">
                Waiting for streams to come online
              </div>
            </div>
          </div>
        </div>

        <div className="transcript-view__scroller">
          <div className="transcript-view__empty">
            <Radio className="mb-3" size={36} />
            <p className="fw-semibold mb-1">No streams available</p>
            <p className="mb-0">Add a stream to see transcriptions here.</p>
          </div>
        </div>
      </section>
    );
  }

  const handleTogglePlayback = () => {
    if (playingInfo?.transcription) {
      // For now, toggle acts as stop since we don't have pause state
      stopCurrentRecording();
    }
  };

  return (
    <HoveredSegmentProvider>
      <section className="transcript-view transcript-view--stacked transcript-view--frameless">
        <div className="transcript-view__scroller transcript-view__scroller--stacked">
          {visibleStreams.map((stream) => (
            <StreamSection
              key={stream.id}
              stream={stream}
              isStandalone={isStandaloneView && stream.id === focusedVisibleStreamId}
              recordingAudioRefs={recordingAudioRefs}
              playingRecording={playingRecording}
              playingTranscriptionId={playingTranscriptionId}
              playingSegmentId={playingSegment}
              onPlayAll={handlePlayAll}
              onPlaySegment={playSegment}
              isSegmentCurrentlyPlaying={isSegmentCurrentlyPlaying}
              onStopPlayback={stopCurrentRecording}
              onReviewTranscription={onReviewTranscription}
              onResetStream={onResetStream}
              onStandaloneControlsChange={onStandaloneControlsChange}
              onExportPagerFeed={onExportPagerFeed}
              onSelectPagerExportStream={onSelectPagerExportStream}
              pagerExporting={pagerExporting}
            />
          ))}
        </div>
        <PlaybackBar
          transcription={playingInfo?.transcription ?? null}
          streamName={playingInfo?.streamName ?? null}
          currentPlayTime={currentPlayTime}
          recordingAudioRefs={recordingAudioRefs}
          playingRecordingId={playingRecording}
          volume={volume}
          onTogglePlayback={handleTogglePlayback}
          onStop={stopCurrentRecording}
          onVolumeChange={setVolume}
        />
      </section>
    </HoveredSegmentProvider>
  );
};

export default StreamTranscriptionPanel;
