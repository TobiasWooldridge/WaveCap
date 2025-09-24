import { FormEvent, useState } from "react";
import {
  Plus,
  Trash2,
  Play,
  Square,
  Radio,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Stream, type StreamCommandState } from "@types";
import Spinner from "./primitives/Spinner.react";
import Button from "./primitives/Button.react";
import Flex from "./primitives/Flex.react";
import "./StreamDirectoryPanel.scss";

interface StreamDirectoryPanelProps {
  streams: Stream[];
  onAddStream: (url: string, name?: string, language?: string) => void;
  onRemoveStream: (streamId: string) => void;
  onStartTranscription: (streamId: string) => void;
  onStopTranscription: (streamId: string) => void;
  loading: boolean;
  pendingCommands?: Record<string, StreamCommandState>;
}

type StreamStatusVariant = "transcribing" | "queued" | "error" | "idle";

const getStatusVariant = (status: Stream["status"]): StreamStatusVariant => {
  switch (status) {
    case "transcribing":
      return "transcribing";
    case "queued":
      return "queued";
    case "error":
      return "error";
    default:
      return "idle";
  }
};

const getStatusBadgeClass = (variant: StreamStatusVariant) => {
  switch (variant) {
    case "transcribing":
      return "text-bg-success";
    case "queued":
      return "text-bg-warning text-warning-emphasis";
    case "error":
      return "text-bg-danger";
    default:
      return "text-bg-secondary";
  }
};

export const StreamDirectoryPanel = ({
  streams,
  onAddStream,
  onRemoveStream,
  onStartTranscription,
  onStopTranscription,
  loading,
  pendingCommands = {},
}: StreamDirectoryPanelProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStreamUrl, setNewStreamUrl] = useState("");
  const [newStreamName, setNewStreamName] = useState("");
  const [newStreamLanguage, setNewStreamLanguage] = useState("en");

  const handleAddStream = async (event: FormEvent) => {
    event.preventDefault();
    if (!newStreamUrl.trim()) {
      return;
    }

    try {
      await onAddStream(
        newStreamUrl.trim(),
        newStreamName.trim() || undefined,
        newStreamLanguage,
      );
      setNewStreamUrl("");
      setNewStreamName("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add stream:", error);
    }
  };

  const renderStatusIcon = (variant: StreamStatusVariant) => {
    switch (variant) {
      case "transcribing":
        return <span className="status-dot status-dot--success" />;
      case "queued":
        return <Clock size={14} className="me-1" />;
      case "error":
        return <AlertCircle size={14} className="me-1" />;
      default:
        return <span className="status-dot status-dot--neutral" />;
    }
  };

  return (
    <section className="card shadow-sm mb-4 stream-directory">
      <Flex
        className="card-header bg-body-tertiary"
        align="center"
        justify="between"
        wrap="wrap"
        gap={3}
      >
        <h2 className="h5 mb-0">Stream management</h2>
        <Button
          type="button"
          size="sm"
          use="primary"
          onClick={() => setShowAddForm((current) => !current)}
          startContent={<Plus size={16} />}
        >
          {showAddForm ? "Hide form" : "Add stream"}
        </Button>
      </Flex>

      <div className="card-body">
        {showAddForm && (
          <form
            onSubmit={handleAddStream}
            className="bg-body-tertiary border rounded-3 p-3 p-md-4 mb-4"
          >
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label
                  htmlFor="new-stream-url"
                  className="form-label text-uppercase text-body-secondary fw-semibold small"
                >
                  Stream URL
                </label>
                <input
                  id="new-stream-url"
                  type="url"
                  value={newStreamUrl}
                  onChange={(event) => setNewStreamUrl(event.target.value)}
                  placeholder="https://example.com/stream.mp3"
                  className="form-control"
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label
                  htmlFor="new-stream-name"
                  className="form-label text-uppercase text-body-secondary fw-semibold small"
                >
                  Stream name (optional)
                </label>
                <input
                  id="new-stream-name"
                  type="text"
                  value={newStreamName}
                  onChange={(event) => setNewStreamName(event.target.value)}
                  placeholder="My stream"
                  className="form-control"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <label
                  htmlFor="new-stream-language"
                  className="form-label text-uppercase text-body-secondary fw-semibold small"
                >
                  Language
                </label>
                <select
                  id="new-stream-language"
                  value={newStreamLanguage}
                  onChange={(event) => setNewStreamLanguage(event.target.value)}
                  className="form-select"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ru">Russian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                  <option value="auto">Auto-detect</option>
                </select>
              </div>
            </div>
            <Flex wrap="wrap" gap={2} className="mt-3">
              <Button type="submit" size="sm" use="primary">
                Add stream
              </Button>
              <Button
                type="button"
                size="sm"
                use="secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </Flex>
          </form>
        )}

        {loading ? (
          <div className="text-center py-5 text-body-secondary">
            <Spinner label="Loading streams" />
            <div className="mt-3">Loading streams…</div>
          </div>
        ) : !streams || streams.length === 0 ? (
          <div className="text-center py-5 text-body-secondary">
            <Radio className="text-primary mb-3" size={48} />
            <p className="fs-5 mb-1">No streams configured</p>
            <p className="mb-0">
              Add a stream to get started with transcription.
            </p>
          </div>
        ) : (
          <div className="list-group list-group-flush stream-directory__list">
            {streams.map((stream) => {
              const variant = getStatusVariant(stream.status);
              const pendingAction = pendingCommands[stream.id];
              const isStopping = pendingAction === "stopping";
              const isStarting = pendingAction === "starting";
              const isRemoving = pendingAction === "removing";
              const isResetting = pendingAction === "resetting";
              const isUpdating = pendingAction === "updating";
              const disableAll =
                isStopping || isStarting || isRemoving || isResetting || isUpdating;
              return (
                <Flex
                  key={stream.id}
                  className="list-group-item stream-directory__item"
                  direction={{ base: "column", lg: "row" }}
                  align={{ lg: "center" }}
                  justify="between"
                  gap={2}
                >
                  <Flex align="start" gap={2} className="flex-grow-1 stream-directory__item-main">
                    <Radio size={20} className="text-body-tertiary" />
                    <div className="flex-grow-1">
                      <Flex align="center" gap={1} className="stream-directory__header">
                        <h3 className="stream-directory__title">{stream.name}</h3>
                        <span
                          className={`badge d-inline-flex align-items-center gap-2 stream-directory__status ${getStatusBadgeClass(variant)}`}
                        >
                          {renderStatusIcon(variant)}
                          <span className="stream-directory__status-label text-capitalize">
                            {stream.status}
                          </span>
                        </span>
                      </Flex>
                      <a
                        href={stream.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-inline-flex align-items-center gap-1 text-decoration-none link-primary stream-directory__link"
                        title={stream.url}
                      >
                        {stream.url}
                      </a>
                      <div className="text-body-secondary stream-directory__meta">
                        {stream.transcriptions?.length || 0} transcriptions
                      </div>
                    </div>
                  </Flex>

                  <Flex wrap="wrap" gap={2} justify={{ lg: "end" }}>
                    {(() => {
                      if (stream.enabled) {
                        if (stream.status === "queued") {
                          return (
                            <Button
                              type="button"
                              size="sm"
                              use="warning"
                              onClick={() => onStopTranscription(stream.id)}
                              disabled={disableAll}
                              startContent={
                                isStopping ? (
                                  <Spinner
                                    size="sm"
                                    variant="inherit"
                                    label="Cancelling start"
                                  />
                                ) : (
                                  <Square size={14} />
                                )
                              }
                            >
                              <span>{isStopping ? "Cancelling…" : "Cancel start"}</span>
                            </Button>
                          );
                        }

                        return (
                          <Button
                            type="button"
                            size="sm"
                            use="danger"
                            onClick={() => onStopTranscription(stream.id)}
                            disabled={disableAll}
                            startContent={
                              isStopping ? (
                                <Spinner
                                  size="sm"
                                  variant="light"
                                  label="Stopping transcription"
                                />
                              ) : (
                                <Square size={14} />
                              )
                            }
                          >
                            <span>{isStopping ? "Stopping…" : "Stop"}</span>
                          </Button>
                        );
                      }

                      return (
                        <Button
                          type="button"
                          size="sm"
                          use="success"
                          onClick={() => onStartTranscription(stream.id)}
                          disabled={disableAll}
                          startContent={
                            isStarting ? (
                              <Spinner
                                size="sm"
                                variant="light"
                                label="Starting transcription"
                              />
                            ) : (
                              <Play size={14} />
                            )
                          }
                        >
                          <span>{isStarting ? "Starting…" : "Start"}</span>
                        </Button>
                      );
                    })()}

                    <Button
                      type="button"
                      size="sm"
                      use="secondary"
                      onClick={() => onRemoveStream(stream.id)}
                      disabled={disableAll}
                      startContent={
                        isRemoving ? (
                          <Spinner
                            size="sm"
                            variant="light"
                            label="Removing stream"
                          />
                        ) : (
                          <Trash2 size={14} />
                        )
                      }
                    >
                      <span>{isRemoving ? "Removing…" : "Remove"}</span>
                    </Button>
                  </Flex>
                </Flex>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
