import { ChangeEvent, ReactNode } from "react";
import { LogIn, Radio, Star, X } from "lucide-react";
import { Stream } from "@types";
import Button from "./primitives/Button.react";
import Badge from "./primitives/Badge.react";
import Flex from "./primitives/Flex.react";
import Spinner from "./primitives/Spinner.react";
import StreamStatusIndicator from "./StreamStatusIndicator.react";
import "./StreamSidebar.scss";

export type StreamSortMode = "activity" | "name";

export interface StreamSidebarItem {
  id: string;
  type: "stream" | "combined";
  title: string;
  previewText: string;
  previewTime: ReactNode;
  unreadCount: number;
  stream: Stream;
  isPager: boolean;
  isActive: boolean;
  isPinned: boolean;
}

interface StreamSidebarProps {
  isReadOnly: boolean;
  onRequestLogin: () => void;
  items: StreamSidebarItem[];
  loading: boolean;
  onSelectStream: (streamId: string) => void;
  isMobileViewport: boolean;
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
  sortMode: StreamSortMode;
  onSortModeChange: (mode: StreamSortMode) => void;
}

const StreamSidebar = ({
  isReadOnly,
  onRequestLogin,
  items,
  loading,
  onSelectStream,
  isMobileViewport,
  isMobileSidebarOpen,
  onCloseMobileSidebar,
  sortMode,
  onSortModeChange,
}: StreamSidebarProps) => {
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
              ? "Sign in to control live transcription for configured streams."
              : "Update your configuration files to add new streams."}
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

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value as StreamSortMode;
    onSortModeChange(nextValue);
  };

  const sortLabel = sortMode === "name" ? "Name (A–Z)" : "Latest activity";

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
              Sorted by {sortLabel}
            </p>
          </div>
          <Flex align="center" gap={2} wrap="wrap">
            <div className="stream-sidebar__sort-control">
              <label
                htmlFor="stream-sidebar-sort"
                className="stream-sidebar__sort-label small text-body-secondary"
              >
                Sort
              </label>
              <select
                id="stream-sidebar-sort"
                className="form-select form-select-sm stream-sidebar__sort-select"
                value={sortMode}
                onChange={handleSortChange}
                aria-label="Sort streams"
              >
                <option value="activity">Latest activity</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
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
                <StreamStatusIndicator
                  stream={item.stream}
                  className="d-inline-flex align-items-start"
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
                      {item.isPinned ? (
                        <span
                          className="stream-sidebar__pin"
                          aria-label="Pinned stream"
                          role="img"
                        >
                          <Star size={14} fill="currentColor" aria-hidden="true" />
                        </span>
                      ) : null}
                      <span className="stream-sidebar__item-title">
                        {item.title}
                      </span>
                      {(() => {
                        if (item.type === "combined") {
                          return (
                            <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis">
                              Combined
                            </span>
                          );
                        }
                        if (item.isPager) {
                          return (
                            <span className="badge rounded-pill text-bg-info-subtle text-info-emphasis">
                              Pager
                            </span>
                          );
                        }
                        const url = String(item.stream?.url || "");
                        const isWeb = /^https?:\/\//i.test(url);
                        return (
                          <span className={`badge rounded-pill ${
                            isWeb
                              ? "text-bg-secondary-subtle text-secondary-emphasis"
                              : "text-bg-warning-subtle text-warning-emphasis"
                          }`}>
                            {isWeb ? "Web" : "SDR"}
                          </span>
                        );
                      })()}
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
