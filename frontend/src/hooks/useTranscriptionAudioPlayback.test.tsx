import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getRecordingElementId } from "../components/StreamTranscriptionPanel.logic";
import useTranscriptionAudioPlayback from "./useTranscriptionAudioPlayback";

const AUDIO_URL = "https://example.com/test.wav";

const createMockAudio = () => {
  let playCalls = 0;
  let pauseCalls = 0;
  const listeners: Record<string, Array<() => void>> = {};

  return {
    readyState: 4,
    currentTime: 0,
    loop: false,
    dataset: {} as Record<string, string>,
    src: "",
    ontimeupdate: null as null | (() => void),
    onended: null as null | (() => void),
    onerror: null as null | ((error: unknown) => void),
    addEventListener: (event: string, handler: () => void) => {
      listeners[event] ??= [];
      listeners[event].push(handler);
    },
    removeEventListener: (event: string, handler: () => void) => {
      listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== handler);
    },
    load: () => {
      /* no-op */
    },
    play: () => {
      playCalls += 1;
      return Promise.resolve();
    },
    pause: () => {
      pauseCalls += 1;
      return undefined;
    },
    invoke(event: string) {
      for (const handler of listeners[event] ?? []) {
        handler();
      }
    },
    get playCallCount() {
      return playCalls;
    },
    get pauseCallCount() {
      return pauseCalls;
    },
  } as unknown as HTMLAudioElement & {
    invoke: (event: string) => void;
    playCallCount: number;
    pauseCallCount: number;
  };
};

test("playSegment toggles off when the same segment is clicked again", () => {
  let playback = null;

  const Harness: React.FC = () => {
    playback = useTranscriptionAudioPlayback();
    return null;
  };

  renderToStaticMarkup(<Harness />);

  assert.ok(playback, "playback harness not initialised");
  const controls = playback as ReturnType<typeof useTranscriptionAudioPlayback>;

  const recordingId = getRecordingElementId(AUDIO_URL);
  const audio = createMockAudio();
  controls.recordingAudioRefs.current[recordingId] = audio;

  controls.playSegment(AUDIO_URL, 1, 3, "transcription-1");

  assert.equal(audio.playCallCount, 1);
  assert.equal(audio.pauseCallCount, 0);

  controls.playSegment(AUDIO_URL, 1, 3, "transcription-1");

  assert.equal(audio.pauseCallCount, 1, "second click should pause playback");
  assert.equal(audio.playCallCount, 1, "second click should not restart playback");
});
