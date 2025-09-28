import React, { useId } from "react";
import { X } from "lucide-react";
import Button from "./Button.react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  id?: string;
  titleId?: string;
  fullscreen?: boolean;
  overlayClassName?: string;
  dialogClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  closeAriaLabel?: string;
  children?: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  id,
  titleId,
  fullscreen,
  overlayClassName,
  dialogClassName,
  headerClassName,
  bodyClassName,
  closeAriaLabel,
  children,
}) => {
  const autoId = useId();
  const resolvedTitleId = titleId ?? `${id ?? autoId}-title`;

  if (!open) return null;

  return (
    <div
      className={["app-modal", fullscreen ? "app-modal--fullscreen" : "", overlayClassName ?? ""]
        .filter(Boolean)
        .join(" ")}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={[
          "app-modal__dialog",
          fullscreen ? "app-modal__dialog--fullscreen" : "",
          dialogClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        id={id}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={[
            "app-modal__header d-flex align-items-start justify-content-between gap-3",
            headerClassName ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <h2 className="h5 mb-0" id={resolvedTitleId}>
            {title}
          </h2>
          <Button
            size="sm"
            use="secondary"
            onClick={onClose}
            aria-label={closeAriaLabel ?? "Close dialog"}
          >
            <X size={16} />
          </Button>
        </div>
        <div className={["app-modal__body", bodyClassName ?? ""].filter(Boolean).join(" ")}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Dialog;
