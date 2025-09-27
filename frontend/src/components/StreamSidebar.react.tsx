import { ReactNode } from "react";
import { LogIn, Radio, X } from "lucide-react";
import { Stream } from "@types";
import Button from "./primitives/Button.react";
import Badge from "./primitives/Badge.react";
import Flex from "./primitives/Flex.react";
import Spinner from "./primitives/Spinner.react";
import StreamStatusIndicator from "./StreamStatusIndicator.react";
import "./StreamSidebar.scss";

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
                      <span className="stream-sidebar__item-title">
                        {item.title}
                      </span>
                      {item.type === "combined" ? (
                        <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis">
                          Combined
                        </span>
                      ) : item.isPager ? (
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
