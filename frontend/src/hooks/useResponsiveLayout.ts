import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";

interface ResponsiveLayoutState {
  isMobileViewport: boolean;
  isMobileSidebarOpen: boolean;
  isMobileActionsOpen: boolean;
  setIsMobileActionsOpen: Dispatch<SetStateAction<boolean>>;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const MOBILE_MEDIA_QUERY = "(max-width: 767.98px)";

export const useResponsiveLayout = (): ResponsiveLayoutState => {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
      if (!event.matches) {
        setIsMobileSidebarOpen(false);
        setIsMobileActionsOpen(false);
      }
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    if (typeof document === "undefined") {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  const openMobileSidebar = useCallback(() => {
    if (!isMobileViewport) {
      return;
    }

    setIsMobileSidebarOpen(true);
  }, [isMobileViewport]);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (isMobileViewport) {
      return;
    }

    setIsMobileSidebarOpen(false);
    setIsMobileActionsOpen(false);
  }, [isMobileViewport]);

  return {
    isMobileViewport,
    isMobileSidebarOpen,
    isMobileActionsOpen,
    setIsMobileActionsOpen,
    openMobileSidebar,
    closeMobileSidebar,
  };
};
