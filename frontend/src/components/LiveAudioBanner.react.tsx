import { useCallback } from "react";
import { AlertTriangle, Volume2, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Button from "./primitives/Button.react";
import { useLiveAudioSession } from "../contexts/LiveAudioContext";
import { STREAM_QUERY_PARAM } from "../hooks/useStreamSelection";

if (typeof window !== "undefined") {
  void import("./LiveAudioBanner.scss");
}

const LiveAudioBanner = () => {
  const liveAudio = useLiveAudioSession();
  const stream = liveAudio.isListening ? liveAudio.activeStream : null;
  const [, setSearchParams] = useSearchParams();
  const streamId = stream?.id ?? null;
  const label = stream?.name?.trim() || streamId || "";
  const handleFocusStream = useCallback(() => {
    if (!streamId) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set(STREAM_QUERY_PARAM, streamId);
      return next;
    });
  }, [setSearchParams, streamId]);

  if (!stream) {
    return null;
  }

  const showError = Boolean(liveAudio.error);

  return (
    <div className="live-audio-banner" role="status" aria-live="polite">
      <div className="live-audio-banner__container app-container">
        <div className="live-audio-banner__content">
          <div className="live-audio-banner__info">
            {showError ? (
              <AlertTriangle className="live-audio-banner__icon live-audio-banner__icon--error" size={18} />
            ) : (
              <Volume2 className="live-audio-banner__icon" size={18} />
            )}
            <span className="live-audio-banner__label">Listening to</span>
            <button
              type="button"
              className="live-audio-banner__stream"
              onClick={handleFocusStream}
              title={`View ${label}`}
            >
              {label}
            </button>
          </div>

          <div className="live-audio-banner__actions">
            {showError ? (
              <div className="live-audio-banner__error" role="alert">
                {liveAudio.error}
              </div>
            ) : null}
            <Button
              size="sm"
              use="danger"
              onClick={() => {
                liveAudio.stop();
              }}
              startContent={<X size={14} />}
            >
              Stop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAudioBanner;
