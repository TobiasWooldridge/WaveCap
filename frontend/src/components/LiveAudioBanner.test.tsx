import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import LiveAudioBanner from "./LiveAudioBanner.react.js";
import LiveAudioContext, {
  type LiveAudioStreamDescriptor,
} from "../contexts/LiveAudioContext";

const baseContext = {
  activeStream: null,
  isListening: false,
  error: null,
  listen: () => {
    /* noop for tests */
  },
  stop: () => {
    /* noop for tests */
  },
  isActiveStream: () => false,
  streamNonce: null,
  source: "",
  audioRef: () => {
    /* noop */
  },
  onReady: () => {
    /* noop */
  },
  onPlay: () => {
    /* noop */
  },
  onError: () => {
    /* noop */
  },
} as const;

test("LiveAudioBanner renders nothing when playback is idle", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/"]}>
      <LiveAudioContext.Provider value={baseContext}>
        <LiveAudioBanner />
      </LiveAudioContext.Provider>
    </MemoryRouter>,
  );

  assert.strictEqual(html, "");
});

test("LiveAudioBanner shows the active stream name", () => {
  const stream: LiveAudioStreamDescriptor = {
    id: "alpha",
    name: "Alpha Dispatch",
    baseUrl: "/api/streams/alpha/live",
    canListen: true,
    url: "https://example.com/alpha",
  };

  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/"]}>
      <LiveAudioContext.Provider
        value={{
          ...baseContext,
          isListening: true,
          activeStream: stream,
        }}
      >
        <LiveAudioBanner />
      </LiveAudioContext.Provider>
    </MemoryRouter>,
  );

  assert.match(html, /Listening to/);
  assert.match(html, /Alpha Dispatch/);
  assert.match(html, /Stop/);
});

test("LiveAudioBanner surfaces playback errors", () => {
  const stream: LiveAudioStreamDescriptor = {
    id: "bravo",
    name: "Bravo Ops",
    baseUrl: "/api/streams/bravo/live",
    canListen: true,
  };
  const errorMessage = "Network error interrupted the live audio stream.";

  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/"]}>
      <LiveAudioContext.Provider
        value={{
          ...baseContext,
          isListening: true,
          activeStream: stream,
          error: errorMessage,
        }}
      >
        <LiveAudioBanner />
      </LiveAudioContext.Provider>
    </MemoryRouter>,
  );

  assert.match(html, /Bravo Ops/);
  assert.match(html, /Network error interrupted the live audio stream\./);
});
