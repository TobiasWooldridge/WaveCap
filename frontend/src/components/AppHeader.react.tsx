import { ChangeEvent, MutableRefObject } from "react";
import { Activity, LogIn, LogOut, Menu, Settings, Wifi, WifiOff } from "lucide-react";
import Button from "./primitives/Button.react";
import Flex from "./primitives/Flex.react";
import Spinner from "./primitives/Spinner.react";
import "./AppHeader.scss";

interface AppHeaderProps {
  isMobileViewport: boolean;
  isMobileSidebarOpen: boolean;
  onOpenMobileSidebar: () => void;
  transcriptCorrectionEnabled: boolean;
  onTranscriptCorrectionToggle: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenSettings: () => void;
  settingsTriggerRef: MutableRefObject<HTMLButtonElement | null>;
  showSettings: boolean;
  isReadOnly: boolean;
  streamsLoading: boolean;
  onRequestLogin: () => void;
  onLogout: () => Promise<void> | void;
  wsConnected?: boolean;
  wsError?: string | null;
}

const AppHeader = ({
  isMobileViewport,
  isMobileSidebarOpen,
  onOpenMobileSidebar,
  transcriptCorrectionEnabled,
  onTranscriptCorrectionToggle,
  onOpenSettings,
  settingsTriggerRef,
  showSettings,
  isReadOnly,
  streamsLoading,
  onRequestLogin,
  onLogout,
  wsConnected = true,
  wsError = null,
}: AppHeaderProps) => {
  const connectionStatus = wsConnected ? "connected" : wsError ? "error" : "disconnected";
  const connectionLabel = wsConnected
    ? "Connected to server"
    : wsError
      ? `Connection error: ${wsError}`
      : "Disconnected from server";

  return (
    <div className="app-header app-header--floating">
      <Flex
        className="app-header__controls"
        align="center"
        justify="end"
        wrap="nowrap"
        gap={2}
      >
        <div className="app-header__branding">
          <Activity className="text-warning" size={16} />
          <span className="app-header__title">WaveCap</span>
        </div>

        <div
          className={`app-header__connection app-header__connection--${connectionStatus}`}
          title={connectionLabel}
          aria-label={connectionLabel}
          role="status"
        >
          {wsConnected ? (
            <Wifi size={14} aria-hidden="true" />
          ) : (
            <WifiOff size={14} aria-hidden="true" />
          )}
        </div>

        {!isReadOnly && !isMobileViewport ? (
          <Flex
            className="form-check form-check-inline m-0 ps-0"
            align="center"
            gap={2}
            wrap="nowrap"
          >
            <input
              id="transcript-correction-mode"
              type="checkbox"
              className="form-check-input m-0"
              checked={transcriptCorrectionEnabled}
              onChange={onTranscriptCorrectionToggle}
            />
            <Flex
              as="label"
              htmlFor="transcript-correction-mode"
              className="form-check-label fw-semibold small mb-0"
              align="center"
              gap={2}
            >
              Correction
            </Flex>
          </Flex>
        ) : null}

        {isMobileViewport ? (
          <Button
            size="sm"
            use="secondary"
            appearance="outline"
            onClick={onOpenMobileSidebar}
            aria-controls="app-stream-sidebar"
            aria-expanded={isMobileSidebarOpen}
            aria-label="Open stream menu"
            startContent={<Menu size={16} />}
          />
        ) : null}

        <Button
          type="button"
          ref={settingsTriggerRef}
          onClick={onOpenSettings}
          size="sm"
          use="secondary"
          appearance="outline"
          aria-haspopup="dialog"
          aria-expanded={showSettings}
          aria-controls="app-settings-dialog"
          startContent={<Settings size={16} />}
        />

        {streamsLoading ? (
          <Spinner
            size="sm"
            variant="secondary"
            label="Loading streams"
          />
        ) : isReadOnly ? (
          <Button
            type="button"
            size="sm"
            use="secondary"
            appearance="outline"
            onClick={onRequestLogin}
            startContent={<LogIn size={16} />}
          />
        ) : (
          <Button
            type="button"
            size="sm"
            use="secondary"
            appearance="outline"
            onClick={() => {
              void onLogout();
            }}
            startContent={<LogOut size={16} />}
          />
        )}
      </Flex>
    </div>
  );
};

export default AppHeader;
