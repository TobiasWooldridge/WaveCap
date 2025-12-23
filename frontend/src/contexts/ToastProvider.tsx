import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ToastViewport,
  type ToastDescriptor,
} from "../components/primitives/ToastViewport.react";
import {
  ToastContext,
  type ShowToastOptions,
  type ToastContextValue,
} from "./ToastContext";

const DEFAULT_TOAST_DURATION = 5000;

const createToastId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastDescriptor[]>([]);
  const removalTimersRef = useRef<Record<string, number>>({});

  const clearRemovalTimer = useCallback((id: string) => {
    const timeoutId = removalTimersRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete removalTimersRef.current[id];
    }
  }, []);

  const dismissToast = useCallback(
    (id: string) => {
      clearRemovalTimer(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearRemovalTimer],
  );

  const showToast = useCallback(
    ({
      message,
      title,
      variant = "info",
      duration = DEFAULT_TOAST_DURATION,
      id,
      action,
    }: ShowToastOptions) => {
      const toastId = id ?? createToastId();

      setToasts((current) => {
        const withoutExisting = current.filter((toast) => toast.id !== toastId);
        return [...withoutExisting, { id: toastId, message, title, variant, action }];
      });

      if (duration > 0) {
        const timeoutId = window.setTimeout(() => {
          clearRemovalTimer(toastId);
          setToasts((current) =>
            current.filter((toast) => toast.id !== toastId),
          );
        }, duration);
        removalTimersRef.current[toastId] = timeoutId;
      }

      return toastId;
    },
    [clearRemovalTimer],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const isDevelopment =
      typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
    if (!isDevelopment) {
      return undefined;
    }

    const globalWithToast = window as typeof window & {
      __smartSpeakerShowToast?: ToastContextValue["showToast"];
    };
    globalWithToast.__smartSpeakerShowToast = showToast;

    return () => {
      if (globalWithToast.__smartSpeakerShowToast === showToast) {
        delete globalWithToast.__smartSpeakerShowToast;
      }
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};
