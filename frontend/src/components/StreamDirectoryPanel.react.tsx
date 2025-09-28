import { Play, Square, Radio, AlertCircle, Clock, Star } from "lucide-react";
import { Stream, type StreamCommandState } from "@types";
import Spinner from "./primitives/Spinner.react";
import Button from "./primitives/Button.react";
import InlineText from "./primitives/InlineText.react";
import Flex from "./primitives/Flex.react";
import "./StreamDirectoryPanel.scss";

interface StreamDirectoryPanelProps {
  streams: Stream[];
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
  onStartTranscription,
  onStopTranscription,
  loading,
  pendingCommands = {},
}: StreamDirectoryPanelProps) => {

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
      </Flex>

      <div className="card-body">
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
              Define streams in your configuration files to enable transcription.
            </p>
          </div>
        ) : (
          <div className="list-group list-group-flush stream-directory__list">
            {streams.map((stream) => {
              const variant = getStatusVariant(stream.status);
              const pendingAction = pendingCommands[stream.id];
              const isStopping = pendingAction === "stopping";
              const isStarting = pendingAction === "starting";
              const isResetting = pendingAction === "resetting";
              const isUpdating = pendingAction === "updating";
              const disableAll =
                isStopping || isStarting || isResetting || isUpdating;
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
                        {stream.pinned ? (
                          <span
                            className="stream-directory__pin"
                            aria-label="Pinned stream"
                            role="img"
                          >
                            <Star size={14} fill="currentColor" aria-hidden="true" />
                          </span>
                        ) : null}
                        <h3 className="stream-directory__title">{stream.name}</h3>
                        <InlineText
                          gap={2}
                          className={`badge stream-directory__status ${getStatusBadgeClass(variant)}`}
                        >
                          {renderStatusIcon(variant)}
                          <span className="stream-directory__status-label text-capitalize">
                            {stream.status}
                          </span>
                        </InlineText>
                      </Flex>
                      <InlineText
                        as="a"
                        href={stream.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        gap={1}
                        className="text-decoration-none link-primary stream-directory__link"
                        title={stream.url}
                      >
                        {stream.url}
                      </InlineText>
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
