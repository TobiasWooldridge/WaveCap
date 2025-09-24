import { ChangeEvent, MutableRefObject } from "react";
import { Activity, LogIn, LogOut, Menu, Settings } from "lucide-react";
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
}: AppHeaderProps) => {
  return (
    <header className="app-header">
      <div className="app-header__background">
        <div className="app-header__scrim" />
      </div>
      <div className="app-header__content">
        <div className="app-header__container app-container">
          <div className="app-header__layout">
            <div className="app-header__branding">
              {isMobileViewport ? (
                <Button
                  size="sm"
                  use="light"
                  appearance="outline"
                  onClick={onOpenMobileSidebar}
                  aria-controls="app-stream-sidebar"
                  aria-expanded={isMobileSidebarOpen}
                  aria-label="Open stream menu"
                  startContent={<Menu size={18} />}
                >
                  <span>Streams</span>
                </Button>
              ) : null}
              <Activity className="text-warning" size={32} />
              <h1 className="h5 mb-0 text-white">WaveCap</h1>
            </div>

            <Flex
              className="app-header__controls"
              align="center"
              justify="end"
              wrap="wrap"
              gap={{ base: 2, sm: 3 }}
            >
              {!isReadOnly ? (
                <Flex
                  className="form-check form-check-inline m-0 ps-0 text-white"
                  align="center"
                  gap={2}
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
                    Transcript correction mode
                  </Flex>
                </Flex>
              ) : null}

              <Button
                type="button"
                ref={settingsTriggerRef}
                onClick={onOpenSettings}
                size="sm"
                use="light"
                className="fw-semibold text-primary"
                aria-haspopup="dialog"
                aria-expanded={showSettings}
                aria-controls="app-settings-dialog"
                startContent={<Settings size={16} />}
              >
                <span>Settings</span>
              </Button>

              <Flex align="center" gap={2}>
                {streamsLoading ? (
                  <Spinner
                    size="sm"
                    variant="light"
                    label="Loading streams"
                  />
                ) : isReadOnly ? (
                  <Button
                    type="button"
                    size="sm"
                    use="light"
                    appearance="outline"
                    onClick={onRequestLogin}
                    startContent={<LogIn size={16} />}
                  >
                    <span>Sign in</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    use="light"
                    appearance="outline"
                    onClick={() => {
                      void onLogout();
                    }}
                    startContent={<LogOut size={16} />}
                  >
                    <span>Sign out</span>
                  </Button>
                )}
              </Flex>
            </Flex>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
