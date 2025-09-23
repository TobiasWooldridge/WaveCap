import { useState } from "react";
import { Mic, Radio, Play, Square } from "lucide-react";
import Spinner from "./primitives/Spinner.react";
import Button from "./primitives/Button.react";

interface ControlPanelProps {
  onStartTranscription: (device: string, streamUrl?: string) => void;
  onStopTranscription: () => void;
  isTranscribing: boolean;
  isStartPending?: boolean;
  isStopPending?: boolean;
}

export const ControlPanel = ({
  onStartTranscription,
  onStopTranscription,
  isTranscribing,
  isStartPending = false,
  isStopPending = false,
}: ControlPanelProps) => {
  const [device, setDevice] = useState("0");
  const [streamUrl, setStreamUrl] = useState("");
  const [inputMode, setInputMode] = useState<"device" | "stream">("device");

  const handleStart = () => {
    if (inputMode === "device") {
      onStartTranscription(device);
      return;
    }

    if (streamUrl.trim()) {
      onStartTranscription(device, streamUrl);
      return;
    }

    alert("Please enter a stream URL");
  };

  return (
    <section className="card shadow-sm mb-4">
      <div className="card-header bg-body-tertiary">
        <h2 className="h5 mb-0">Transcription controls</h2>
      </div>

      <div className="card-body d-flex flex-column gap-4">
        <div className="d-flex flex-column gap-2">
          <span className="text-uppercase text-body-secondary fw-semibold small">
            Input source
          </span>
          <div className="d-flex flex-wrap gap-3">
            <div className="form-check d-flex align-items-center gap-2 m-0">
              <input
                className="form-check-input"
                type="radio"
                name="input-source"
                id="input-device"
                value="device"
                checked={inputMode === "device"}
                onChange={(event) =>
                  setInputMode(event.target.value as "device" | "stream")
                }
              />
              <label
                className="form-check-label d-flex align-items-center gap-2 mb-0"
                htmlFor="input-device"
              >
                <Mic size={16} className="text-primary" />
                Microphone
              </label>
            </div>

            <div className="form-check d-flex align-items-center gap-2 m-0">
              <input
                className="form-check-input"
                type="radio"
                name="input-source"
                id="input-stream"
                value="stream"
                checked={inputMode === "stream"}
                onChange={(event) =>
                  setInputMode(event.target.value as "device" | "stream")
                }
              />
              <label
                className="form-check-label d-flex align-items-center gap-2 mb-0"
                htmlFor="input-stream"
              >
                <Radio size={16} className="text-primary" />
                Web stream
              </label>
            </div>
          </div>
        </div>

        {inputMode === "device" && (
          <div className="d-flex flex-column gap-2">
            <label
              htmlFor="device-id"
              className="form-label text-uppercase text-body-secondary fw-semibold small mb-0"
            >
              Audio device
            </label>
            <input
              id="device-id"
              type="text"
              value={device}
              onChange={(event) => setDevice(event.target.value)}
              placeholder="Device ID (e.g. 0, 1, 2)"
              className="form-control"
            />
          </div>
        )}

        {inputMode === "stream" && (
          <div className="d-flex flex-column gap-2">
            <label
              htmlFor="stream-url"
              className="form-label text-uppercase text-body-secondary fw-semibold small mb-0"
            >
              Stream URL
            </label>
            <input
              id="stream-url"
              type="url"
              value={streamUrl}
              onChange={(event) => setStreamUrl(event.target.value)}
              placeholder="https://example.com/stream.mp3"
              className="form-control"
            />
          </div>
        )}

        <div className="d-flex flex-wrap gap-3">
          {!isTranscribing ? (
            <Button
              type="button"
              use="primary"
              onClick={handleStart}
              disabled={isStartPending}
              startContent={
                isStartPending ? (
                  <Spinner size="sm" variant="light" label="Starting transcription" />
                ) : (
                  <Play size={16} />
                )
              }
            >
              <span>{isStartPending ? "Starting…" : "Start transcription"}</span>
            </Button>
          ) : (
            <Button
              type="button"
              use="danger"
              onClick={onStopTranscription}
              disabled={isStopPending}
              startContent={
                isStopPending ? (
                  <Spinner size="sm" variant="light" label="Stopping transcription" />
                ) : (
                  <Square size={16} />
                )
              }
            >
              <span>{isStopPending ? "Stopping…" : "Stop transcription"}</span>
            </Button>
          )}
        </div>

        <div className="d-flex align-items-center gap-2 small text-body-secondary">
          <span
            className={`status-dot ${
              isTranscribing ? "status-dot--success" : "status-dot--neutral"
            }`}
          />
          <span>{isTranscribing ? "Transcribing…" : "Stopped"}</span>
        </div>
      </div>
    </section>
  );
};
