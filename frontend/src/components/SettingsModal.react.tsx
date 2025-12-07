import type { ChangeEventHandler } from "react";
import { Download, LogIn, Terminal, Wifi, WifiOff } from "lucide-react";
import type { Stream, ThemeMode, TranscriptionReviewStatus } from "@types";

import KeywordAlertsSettingsSection from "./KeywordAlertsSettingsSection.react";
import Modal from "./primitives/Modal.react";
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
  onOpenBackendLogs: () => void;
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
  onOpenBackendLogs,
}: SettingsModalProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      subtitle="Manage workspace status, appearance, and keyword alerts."
      size="xl"
      backdropOpacity={0.65}
      closeButtonRef={closeButtonRef}
      closeAriaLabel="Close settings"
      id="app-settings-dialog"
      dialogClassName="settings-modal"
      bodyClassName="settings-modal__body"
    >
      <section className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">Status</h3>
        </div>
        <div className="settings-section__content">
          <div className="settings-stats">
            <div className="settings-stat">
              <span className="settings-stat__value">{streams?.length || 0}</span>
              <span className="settings-stat__label">Streams</span>
            </div>
            <div className="settings-stat">
              <span className="settings-stat__value">{activeStreams}</span>
              <span className="settings-stat__label">Active</span>
            </div>
            <div className="settings-stat">
              <span className="settings-stat__value">{totalTranscriptions}</span>
              <span className="settings-stat__label">Transcriptions</span>
            </div>
            <div className={`settings-stat settings-stat--connection ${wsConnected ? "settings-stat--connected" : "settings-stat--disconnected"}`}>
              {wsConnected ? (
                <>
                  <Wifi size={20} />
                  <span className="settings-stat__label">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff size={20} />
                  <span className="settings-stat__label">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">Appearance</h3>
        </div>
        <div className="settings-section__content">
          <Flex
            direction={{ base: "column", sm: "row" }}
            gap={3}
            align={{ base: "stretch", sm: "center" }}
            className="settings-controls"
          >
            <div className="settings-control">
              <label htmlFor="theme-mode" className="settings-control__label">
                Theme
              </label>
              <select
                id="theme-mode"
                value={themeMode}
                onChange={onThemeModeChange}
                className="form-select form-select-sm settings-select"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="settings-control settings-control--switch">
              <div className="form-check form-switch m-0">
                <input
                  id="color-coding"
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  checked={colorCodingEnabled}
                  onChange={onColorCodingToggle}
                />
                <label
                  htmlFor="color-coding"
                  className="form-check-label settings-control__label"
                >
                  Color-code transcripts
                </label>
              </div>
            </div>
          </Flex>
        </div>
      </section>

      <KeywordAlertsSettingsSection />

      {transcriptCorrectionEnabled && (
        <section className="settings-section">
          <div className="settings-section__header">
            <h3 className="settings-section__title">Reviewed Transcript Export</h3>
          </div>
          <div className="settings-section__content">
            {isReadOnly ? (
              <div className="settings-auth-prompt">
                <p>Sign in with editor access to export reviewed transcripts.</p>
                <Button
                  size="sm"
                  use="primary"
                  onClick={onRequestLogin}
                  startContent={<LogIn size={16} />}
                >
                  Sign in
                </Button>
              </div>
            ) : (
              <div className="settings-export">
                <div className="settings-export__options">
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
                            onChange={() => onExportStatusToggle(option.value)}
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
                  <p className="settings-export__description">
                    Downloads a ZIP archive with JSONL transcripts and audio clips.
                  </p>
                </div>
                <Button
                  onClick={onExportTranscriptions}
                  disabled={exporting}
                  size="sm"
                  use="primary"
                  startContent={!exporting ? <Download size={16} /> : undefined}
                >
                  {exporting ? "Exporting…" : "Export"}
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">Pager Feed Export</h3>
        </div>
        <div className="settings-section__content">
          {isReadOnly ? (
            <div className="settings-auth-prompt">
              <p>Sign in with editor access to export pager feeds.</p>
              <Button
                size="sm"
                use="primary"
                onClick={onRequestLogin}
                startContent={<LogIn size={16} />}
              >
                Sign in
              </Button>
            </div>
          ) : pagerStreams.length === 0 ? (
            <p className="text-body-secondary small m-0">
              No pager feeds available to export.
            </p>
          ) : (
            <div className="settings-export">
              <div className="settings-export__options">
                <div className="settings-control">
                  <label
                    htmlFor="pager-export-stream"
                    className="settings-control__label"
                  >
                    Pager feed
                  </label>
                  <select
                    id="pager-export-stream"
                    className="form-select form-select-sm settings-select"
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
                <p className="settings-export__description">
                  Downloads a ZIP archive with JSONL pager messages and incident details.
                </p>
              </div>
              <div className="settings-export__action">
                <Button
                  onClick={onExportPagerFeed}
                  disabled={pagerExporting || !selectedPagerStreamId}
                  size="sm"
                  use="primary"
                  startContent={!pagerExporting ? <Download size={16} /> : undefined}
                >
                  {pagerExporting ? "Exporting…" : "Export"}
                </Button>
                {pagerExportError && (
                  <span className="text-danger small">{pagerExportError}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">System</h3>
        </div>
        <div className="settings-section__content">
          {isReadOnly ? (
            <div className="settings-auth-prompt">
              <p>Sign in with editor access to view backend logs.</p>
              <Button
                size="sm"
                use="primary"
                onClick={onRequestLogin}
                startContent={<LogIn size={16} />}
              >
                Sign in
              </Button>
            </div>
          ) : (
            <div className="settings-system">
              <p className="settings-system__description">
                View server errors and application logs for troubleshooting.
              </p>
              <Button
                onClick={onOpenBackendLogs}
                size="sm"
                use="secondary"
                appearance="outline"
                startContent={<Terminal size={16} />}
              >
                View backend logs
              </Button>
            </div>
          )}
        </div>
      </section>
    </Modal>
  );
};

export default SettingsModal;
