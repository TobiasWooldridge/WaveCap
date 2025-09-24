import { ChangeEvent, FormEvent, ReactNode } from "react";
import { LogIn, Plus, Radio, X } from "lucide-react";
import { StreamSource } from "@types";
import Spinner from "./primitives/Spinner.react";
import Button from "./primitives/Button.react";
import Badge from "./primitives/Badge.react";
import Flex from "./primitives/Flex.react";
import "./StreamSidebar.scss";

export interface StreamSidebarItem {
  id: string;
  title: string;
  previewText: string;
  previewTime: ReactNode;
  unreadCount: number;
  statusClass: string;
  isPager: boolean;
  isActive: boolean;
}

interface StreamSidebarProps {
  isReadOnly: boolean;
  onRequestLogin: () => void;
  showAddStreamForm: boolean;
  onToggleAddStreamForm: () => void;
  onCloseAddStreamForm: () => void;
  onClearAddStreamError: () => void;
  addStreamError: string | null;
  addingStream: boolean;
  newStreamSource: StreamSource;
  onChangeStreamSource: (value: StreamSource) => void;
  newStreamUrl: string;
  onChangeStreamUrl: (value: string) => void;
  newStreamName: string;
  onChangeStreamName: (value: string) => void;
  newStreamLanguage: string;
  onChangeStreamLanguage: (value: string) => void;
  newStreamIgnoreSeconds: string;
  onChangeStreamIgnoreSeconds: (value: string) => void;
  onSubmitAddStream: (event: FormEvent<HTMLFormElement>) => void;
  items: StreamSidebarItem[];
  loading: boolean;
  onSelectStream: (streamId: string) => void;
  isMobileViewport: boolean;
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
}

const ADD_STREAM_FORM_ID = "stream-sidebar-add-form";

const StreamSidebar = ({
  isReadOnly,
  onRequestLogin,
  showAddStreamForm,
  onToggleAddStreamForm,
  onCloseAddStreamForm,
  onClearAddStreamError,
  addStreamError,
  addingStream,
  newStreamSource,
  onChangeStreamSource,
  newStreamUrl,
  onChangeStreamUrl,
  newStreamName,
  onChangeStreamName,
  newStreamLanguage,
  onChangeStreamLanguage,
  newStreamIgnoreSeconds,
  onChangeStreamIgnoreSeconds,
  onSubmitAddStream,
  items,
  loading,
  onSelectStream,
  isMobileViewport,
  isMobileSidebarOpen,
  onCloseMobileSidebar,
}: StreamSidebarProps) => {
  const handleToggleAddForm = () => {
    if (showAddStreamForm) {
      onClearAddStreamError();
    }
    onToggleAddStreamForm();
  };

  const handleCloseAddForm = () => {
    onClearAddStreamError();
    onCloseAddStreamForm();
  };

  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    if (items.length === 0) {
      return (
        <div className="stream-sidebar__empty text-center text-body-secondary">
          <Radio className="mb-3" size={32} />
          <p className="fw-semibold mb-1">No streams yet</p>
          <p className="mb-2 small">
            {isReadOnly
              ? "Sign in to add streams and control live transcription."
              : "Add a stream to start monitoring conversations."}
          </p>
          {isReadOnly ? (
            <Button
              size="sm"
              use="primary"
              onClick={onRequestLogin}
              startContent={<LogIn size={14} />}
            >
              <span>Sign in</span>
            </Button>
          ) : null}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={`stream-sidebar-drawer ${isMobileSidebarOpen ? "stream-sidebar-drawer--open" : ""}`}
      aria-hidden={isMobileViewport && !isMobileSidebarOpen}
    >
      <aside id="app-stream-sidebar" className="stream-sidebar">
        <Flex
          className="stream-sidebar__header"
          align="start"
          justify="between"
          gap={3}
        >
          <div>
            <p className="text-uppercase small fw-semibold text-body-secondary mb-1">
              Streams
            </p>
            <p className="mb-0 small text-body-secondary">
              Ordered by latest activity
            </p>
          </div>
          <Flex align="center" gap={2}>
            {!isReadOnly ? (
              <Button
                size="sm"
                use="primary"
                onClick={handleToggleAddForm}
                aria-expanded={showAddStreamForm}
                aria-controls={ADD_STREAM_FORM_ID}
                startContent={<Plus size={14} />}
              >
                {showAddStreamForm ? "Hide form" : "Add stream"}
              </Button>
            ) : null}
            <Button
              size="sm"
              use="secondary"
              appearance="outline"
              className="stream-sidebar__close d-inline-flex align-items-center justify-content-center d-lg-none"
              onClick={onCloseMobileSidebar}
              aria-label="Close stream menu"
            >
              <X size={16} />
            </Button>
          </Flex>
        </Flex>

        {!isReadOnly && showAddStreamForm ? (
          <form
            className="stream-sidebar__form"
            onSubmit={onSubmitAddStream}
            id={ADD_STREAM_FORM_ID}
          >
              <div className="mb-3">
                <label
                  htmlFor="sidebar-stream-source"
                  className="form-label text-uppercase small fw-semibold text-body-secondary"
                >
                  Stream type
                </label>
                <select
                  id="sidebar-stream-source"
                  className="form-select form-select-sm"
                  value={newStreamSource}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    onChangeStreamSource(event.target.value as StreamSource);
                  }}
                >
                  <option value="audio">Audio stream</option>
                  <option value="pager">Pager feed</option>
                </select>
                {newStreamSource === "pager" ? (
                  <p className="form-text small mb-0">
                    Pager feeds accept webhook posts and generate their own
                    authentication token.
                  </p>
                ) : null}
              </div>
              {newStreamSource === "audio" ? (
                <div className="mb-3">
                  <label
                    htmlFor="sidebar-stream-url"
                    className="form-label text-uppercase small fw-semibold text-body-secondary"
                  >
                    Stream URL
                  </label>
                  <input
                    id="sidebar-stream-url"
                    type="url"
                    required
                    className="form-control form-control-sm"
                    placeholder="https://example.com/stream.mp3"
                    value={newStreamUrl}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onChangeStreamUrl(event.target.value)
                    }
                  />
                </div>
              ) : null}
              <div className="mb-3">
                <label
                  htmlFor="sidebar-stream-name"
                  className="form-label text-uppercase small fw-semibold text-body-secondary"
                >
                  Display name (optional)
                </label>
                <input
                  id="sidebar-stream-name"
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Scanner feed"
                  value={newStreamName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onChangeStreamName(event.target.value)
                  }
                />
              </div>
              {newStreamSource === "audio" ? (
                <div className="mb-3">
                  <label
                    htmlFor="sidebar-stream-language"
                    className="form-label text-uppercase small fw-semibold text-body-secondary"
                  >
                    Language
                  </label>
                  <select
                    id="sidebar-stream-language"
                    className="form-select form-select-sm"
                    value={newStreamLanguage}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      onChangeStreamLanguage(event.target.value)
                    }
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
              ) : null}
              {newStreamSource === "audio" ? (
                <div className="mb-3">
                  <label
                    htmlFor="sidebar-stream-ignore"
                    className="form-label text-uppercase small fw-semibold text-body-secondary"
                  >
                    Skip first seconds
                  </label>
                  <input
                    id="sidebar-stream-ignore"
                    type="number"
                    min="0"
                    step="0.1"
                    className="form-control form-control-sm"
                    placeholder="0"
                    value={newStreamIgnoreSeconds}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onChangeStreamIgnoreSeconds(event.target.value)
                    }
                  />
                  <div className="form-text small mb-0">
                    Omit the ad or dial tone at the start of the stream before
                    recording.
                  </div>
                </div>
              ) : null}
              {addStreamError ? (
                <div
                  className="alert alert-warning py-2 px-3 small"
                  role="alert"
                >
                  {addStreamError}
                </div>
              ) : null}
              <Flex wrap="wrap" gap={2}>
                <Button
                  type="submit"
                  size="sm"
                  use="primary"
                  disabled={addingStream}
                  startContent={
                    addingStream ? (
                      <Spinner
                        size="sm"
                        variant="light"
                        label="Adding stream"
                      />
                    ) : undefined
                  }
                >
                  <span>{addingStream ? "Adding…" : "Add stream"}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  use="secondary"
                  onClick={handleCloseAddForm}
                  disabled={addingStream}
                >
                  Cancel
                </Button>
              </Flex>
          </form>
        ) : null}

        <div className="stream-sidebar__list">
          {loading ? (
            <Flex
              className="stream-sidebar__status text-body-secondary small"
              align="center"
              gap={2}
            >
              <Spinner size="sm" label="Updating streams" />
              <span>Updating streams…</span>
            </Flex>
          ) : null}

          {renderEmptyState()}

          {items.map((item) => (
            <Button
              key={item.id}
              use="unstyled"
              onClick={() => onSelectStream(item.id)}
              className={`stream-sidebar__item ${item.isActive ? "stream-sidebar__item--active" : ""}`}
              aria-current={item.isActive ? "page" : undefined}
            >
              <Flex align="start" gap={3} className="stream-sidebar__item-layout">
                <div
                  className={`stream-status-dot ${item.statusClass}`}
                  aria-hidden="true"
                />
                <Flex
                  className="stream-sidebar__item-main"
                  justify="between"
                  align="start"
                  gap={3}
                >
                  <Flex
                    direction="column"
                    gap={2}
                    className="stream-sidebar__item-content"
                  >
                    <Flex align="center" gap={2} className="stream-sidebar__item-heading">
                      <span className="stream-sidebar__item-title">
                        {item.title}
                      </span>
                      {item.isPager ? (
                        <span className="badge rounded-pill text-bg-info-subtle text-info-emphasis">
                          Pager
                        </span>
                      ) : null}
                    </Flex>
                    <div className="stream-sidebar__item-preview text-body-secondary">
                      {item.previewText}
                    </div>
                  </Flex>
                  <Flex
                    direction="column"
                    align="end"
                    gap={1}
                    className="stream-sidebar__item-meta"
                  >
                    <span className="stream-sidebar__item-time">
                      {item.previewTime}
                    </span>
                    {item.unreadCount > 0 ? (
                      <Badge
                        aria-label={`${item.unreadCount} new messages`}
                        value={item.unreadCount}
                        max={99}
                      />
                    ) : null}
                  </Flex>
                </Flex>
              </Flex>
            </Button>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default StreamSidebar;
