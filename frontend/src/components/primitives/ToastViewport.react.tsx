import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import Button from "./Button.react";
import "./ToastViewport.scss";

export type ToastVariant = "success" | "error" | "info";

export type ToastDescriptor = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
};

type ToastViewportProps = {
  toasts: ToastDescriptor[];
  onDismiss: (id: string) => void;
};

type VariantConfig = {
  title: string;
  role: "status" | "alert";
  ariaLive: "polite" | "assertive";
  Icon: typeof CheckCircle2;
};

const VARIANT_CONFIG: Record<ToastVariant, VariantConfig> = {
  success: {
    title: "Success",
    role: "status",
    ariaLive: "polite",
    Icon: CheckCircle2,
  },
  error: {
    title: "Action needed",
    role: "alert",
    ariaLive: "assertive",
    Icon: XCircle,
  },
  info: { title: "Notice", role: "status", ariaLive: "polite", Icon: Info },
};

export const ToastViewport = ({ toasts, onDismiss }: ToastViewportProps) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-viewport" role="presentation">
      {toasts.map((toast) => {
        const config = VARIANT_CONFIG[toast.variant];
        const TitleIcon = config.Icon;
        const title = toast.title ?? config.title;

        return (
          <div
            key={toast.id}
            className={`app-toast app-toast--${toast.variant}`}
            role={config.role}
            aria-live={config.ariaLive}
          >
            <div className="app-toast__icon" aria-hidden="true">
              <TitleIcon size={18} />
            </div>
            <div className="app-toast__content">
              <div className="app-toast__header">
                <span className="app-toast__title">{title}</span>
                <Button
                  use="unstyled"
                  className="app-toast__close"
                  onClick={() => onDismiss(toast.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={16} />
                </Button>
              </div>
              <div className="app-toast__message">{toast.message}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastViewport;
