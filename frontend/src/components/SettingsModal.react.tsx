import type { ChangeEventHandler } from "react";
import { Download, LogIn, Wifi, WifiOff, X } from "lucide-react";
import type { Stream, ThemeMode, TranscriptionReviewStatus } from "@types";

import KeywordAlertsSettingsSection from "./KeywordAlertsSettingsSection.react";
import Button from "./primitives/Button.react";
import Flex from "./primitives/Flex.react";
import "./SettingsModal.scss";
type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement>;
  streams: Stream[] | undefined;
  activeStreams: number;
  totalTranscriptions: number;
  wsConnected: boolean;
  themeMode: ThemeMode;
  onThemeModeChange: ChangeEventHandler<HTMLSelectElement>;
  colorCodingEnabled: boolean;
  onColorCodingToggle: ChangeEventHandler<HTMLInputElement>;
  transcriptCorrectionEnabled: boolean;
  reviewStatusOptions: Array<{
    value: TranscriptionReviewStatus;
    label: string;
  }>;
  exportStatuses: TranscriptionReviewStatus[];
  onExportStatusToggle: (status: TranscriptionReviewStatus) => void;
  exporting: boolean;
  onExportTranscriptions: () => void;
  pagerStreams: Stream[];
  selectedPagerStreamId: string | null;
  onSelectPagerStream: (streamId: string) => void;
  pagerExporting: boolean;
  pagerExportError: string | null;
  onExportPagerFeed: () => void;
  isReadOnly: boolean;
  onRequestLogin: () => void;
};

const SettingsModal = ({
  open,
  onClose,
  closeButtonRef,
  streams,
  activeStreams,
  totalTranscriptions,
  wsConnected,
  themeMode,
  onThemeModeChange,
  colorCodingEnabled,
  onColorCodingToggle,
  transcriptCorrectionEnabled,
  reviewStatusOptions,
  exportStatuses,
  onExportStatusToggle,
  exporting,
  onExportTranscriptions,
  pagerStreams,
  selectedPagerStreamId,
  onSelectPagerStream,
  pagerExporting,
  pagerExportError,
  onExportPagerFeed,
  isReadOnly,
  onRequestLogin,
}: SettingsModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="app-modal" role="presentation" onClick={onClose}>
      <div
        className="app-modal__dialog settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
        id="app-settings-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-modal__header">
          <div className="settings-modal__header-text">
            <h2 className="settings-modal__title" id="app-settings-title">
              Settings
            </h2>
            <p className="settings-modal__subtitle text-body-secondary small mb-0">
              Manage workspace status, appearance, and keyword alerts.
            </p>
          </div>
          <Button
            size="sm"
            use="secondary"
            appearance="outline"
            className="settings-modal__close"
            onClick={onClose}
            ref={closeButtonRef}
            aria-label="Close settings"
          >
            <X size={16} />
          </Button>
        </header>

        <div className="settings-modal__body">
          <section className="app-header-info__section">
            <h3 className="app-header-info__section-title text-uppercase small fw-semibold text-body-secondary">
              Status summary
            </h3>
            <dl className="app-header-info__metrics">
              <div className="app-header-info__metric">
                <dt>Streams</dt>
                <dd>{streams?.length || 0}</dd>
              </div>
              <div className="app-header-info__metric">
                <dt>Active</dt>
                <dd>{activeStreams}</dd>
              </div>
              <div className="app-header-info__metric">
                <dt>Transcriptions</dt>
                <dd>{totalTranscriptions}</dd>
              </div>
            </dl>

            <Flex
              className="app-header-info__connection"
              align="center"
              gap={2}
            >
              {wsConnected ? (
                <>
                  <Wifi className="text-success" size={18} />
                  <span className="fw-semibold text-success">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="text-danger" size={18} />
                  <span className="fw-semibold text-danger">Disconnected</span>
                </>
              )}
            </Flex>
          </section>

          <section className="app-header-info__section">
            <h3 className="app-header-info__section-title text-uppercase small fw-semibold text-body-secondary">
              Appearance
            </h3>
            <Flex
              direction={{ base: "column", sm: "row" }}
              gap={3}
              align={{ base: "stretch", sm: "center" }}
            >
              <Flex align="center" gap={3}>
                <label htmlFor="theme-mode" className="fw-semibold mb-0">
                  Theme
                </label>
                <select
                  id="theme-mode"
                  value={themeMode}
                  onChange={onThemeModeChange}
                  className="form-select form-select-sm bg-body-secondary text-body app-header__select"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </Flex>

              <Flex
                className="form-check form-switch m-0 ps-0 small"
                align="center"
                gap={2}
              >
                <input
                  id="color-coding"
                  type="checkbox"
                  className="form-check-input m-0"
                  role="switch"
                  checked={colorCodingEnabled}
                  onChange={onColorCodingToggle}
                />
                <label
                  htmlFor="color-coding"
                  className="form-check-label fw-semibold"
                >
                  Color-code transcripts
                </label>
              </Flex>
            </Flex>
          </section>

          <KeywordAlertsSettingsSection />

          {transcriptCorrectionEnabled && (
            <section className="app-header-info__section">
              <h3 className="app-header-info__section-title text-uppercase small fw-semibold text-body-secondary">
                Reviewed transcript export
              </h3>
              {isReadOnly ? (
                <Flex
                  className="alert alert-info"
                  direction="column"
                  gap={2}
                  role="note"
                >
                  <div className="small mb-0">
                    Sign in with editor access to export reviewed transcripts.
                  </div>
                  <Button
                    size="sm"
                    use="primary"
                    className="align-self-start"
                    onClick={onRequestLogin}
                    startContent={<LogIn size={16} />}
                  >
                    <span>Sign in</span>
                  </Button>
                </Flex>
              ) : (
                <div className="app-header-info__export">
                  <Flex direction="column" gap={2}>
                    <Flex wrap="wrap" gap={2}>
                      {reviewStatusOptions.map((option) => {
                        const isChecked = exportStatuses.includes(option.value);
                        const disableUncheck =
                          isChecked && exportStatuses.length === 1;
                        const inputId = `export-status-${option.value}`;

                        return (
                          <div
                            key={option.value}
                            className="form-check form-check-inline m-0"
                          >
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={inputId}
                              checked={isChecked}
                              onChange={() =>
                                onExportStatusToggle(option.value)
                              }
                              disabled={disableUncheck || exporting}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={inputId}
                            >
                              {option.label}
                            </label>
                          </div>
                        );
                      })}
                    </Flex>
                    <span className="text-body-secondary small">
                      Downloads a ZIP archive with JSONL transcripts and audio
                      clips.
                    </span>
                  </Flex>

                  <Button
                    onClick={onExportTranscriptions}
                    disabled={exporting}
                    className="fw-semibold align-self-start"
                    size="sm"
                    use="primary"
                    startContent={!exporting ? <Download size={16} /> : undefined}
                  >
                    {exporting ? "Exporting…" : "Export reviewed transcripts"}
                  </Button>
                </div>
              )}
            </section>
          )}

          <section className="app-header-info__section">
            <h3 className="app-header-info__section-title text-uppercase small fw-semibold text-body-secondary">
              Pager feed export
            </h3>
            {isReadOnly ? (
              <Flex
                className="alert alert-info"
                direction="column"
                gap={2}
                role="note"
              >
                <div className="small mb-0">
                  Sign in with editor access to export pager feeds.
                </div>
                <Button
                  size="sm"
                  use="primary"
                  className="align-self-start"
                  onClick={onRequestLogin}
                  startContent={<LogIn size={16} />}
                >
                  <span>Sign in</span>
                </Button>
              </Flex>
            ) : pagerStreams.length === 0 ? (
              <div className="small text-body-secondary">
                No pager feeds available to export.
              </div>
            ) : (
              <div className="app-header-info__export">
                <Flex direction="column" gap={2} className="w-100">
                  <div>
                    <label
                      htmlFor="pager-export-stream"
                      className="form-label small fw-semibold text-body-secondary text-uppercase"
                    >
                      Pager feed
                    </label>
                    <select
                      id="pager-export-stream"
                      className="form-select form-select-sm"
                      value={selectedPagerStreamId ?? ""}
                      onChange={(event) =>
                        onSelectPagerStream(event.target.value)
                      }
                      disabled={pagerExporting}
                    >
                      {pagerStreams.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-body-secondary small">
                    Downloads a ZIP archive with JSONL pager messages and
                    incident details.
                  </span>
                </Flex>

                <div className="d-flex flex-column gap-2 align-items-start">
                  <Button
                    onClick={onExportPagerFeed}
                    disabled={pagerExporting || !selectedPagerStreamId}
                    className="fw-semibold"
                    size="sm"
                    use="primary"
                    startContent={
                      !pagerExporting ? <Download size={16} /> : undefined
                    }
                  >
                    {pagerExporting ? "Exporting…" : "Export pager messages"}
                  </Button>
                  {pagerExportError ? (
                    <div className="text-danger small" role="alert">
                      {pagerExportError}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
