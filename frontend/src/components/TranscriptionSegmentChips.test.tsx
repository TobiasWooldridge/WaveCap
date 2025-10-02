import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  TranscriptionResult,
  TranscriptionSegment,
} from "@types";
import { TranscriptionSegmentChips } from "./TranscriptionSegmentChips.react";

const createSegment = (overrides: Partial<TranscriptionSegment> = {}): TranscriptionSegment => ({
  id: overrides.id ?? 1,
  text: overrides.text ?? "Example segment",
  start: overrides.start ?? 0,
  end: overrides.end ?? 5,
  avg_logprob: overrides.avg_logprob ?? 0,
  no_speech_prob: overrides.no_speech_prob ?? 0,
  temperature: overrides.temperature ?? 0,
  compression_ratio: overrides.compression_ratio ?? 0,
  seek: overrides.seek ?? 0,
});

const createTranscription = (
  overrides: Partial<TranscriptionResult> = {},
): TranscriptionResult => ({
  id: overrides.id ?? "transcription-1",
  streamId: overrides.streamId ?? "stream-1",
  text: overrides.text ?? "Example transcript",
  timestamp:
    overrides.timestamp ?? new Date("2024-01-01T00:00:00Z").toISOString(),
  duration: overrides.duration ?? 5,
  recordingUrl: overrides.recordingUrl ?? "https://example.com/audio.wav",
  recordingStartOffset: overrides.recordingStartOffset ?? 0,
  segments: overrides.segments ?? [createSegment()],
  alerts: overrides.alerts ?? [],
});

const sharedProps = {
  blankAudio: false,
  transcriptCorrectionEnabled: false,
  playingSegmentId: null,
  onPlaySegment: () => {
    /* noop for tests */
  },
  isSegmentCurrentlyPlaying: () => false,
};

test("renders a download button for segments with recordings", () => {
  const transcription = createTranscription();

  const html = renderToStaticMarkup(
    <TranscriptionSegmentChips
      transcription={transcription}
      blankAudio={sharedProps.blankAudio}
      transcriptCorrectionEnabled={sharedProps.transcriptCorrectionEnabled}
      playingSegmentId={sharedProps.playingSegmentId}
      onPlaySegment={sharedProps.onPlaySegment}
      isSegmentCurrentlyPlaying={sharedProps.isSegmentCurrentlyPlaying}
      recordingUrl={transcription.recordingUrl}
      recordingId="recording-1"
    />,
  );

  assert.match(html, /transcript-segment__download-button/);
  assert.match(html, /Download audio from 0:00 to 0:05/);
  assert.match(html, /transcript-segment__inline-action/);
});

test("omits the download button when no recording is available", () => {
  const transcription = createTranscription({ recordingUrl: undefined });

  const html = renderToStaticMarkup(
    <TranscriptionSegmentChips
      transcription={transcription}
      blankAudio={sharedProps.blankAudio}
      transcriptCorrectionEnabled={sharedProps.transcriptCorrectionEnabled}
      playingSegmentId={sharedProps.playingSegmentId}
      onPlaySegment={sharedProps.onPlaySegment}
      isSegmentCurrentlyPlaying={sharedProps.isSegmentCurrentlyPlaying}
      recordingUrl={transcription.recordingUrl}
      recordingId={undefined}
    />,
  );

  assert.doesNotMatch(html, /transcript-segment__download-button/);
});
