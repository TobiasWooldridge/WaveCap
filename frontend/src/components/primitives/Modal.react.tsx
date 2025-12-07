import React, { useId, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import Button from "./Button.react";
import "./Modal.scss";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  id?: string;
  titleId?: string;
  /** Modal width: sm (480px), md (640px), lg (860px), xl (1024px), full (95vw) */
  size?: ModalSize;
  /** Backdrop opacity from 0 to 1. Default is 0.6 */
  backdropOpacity?: number;
  /** Additional class for the overlay */
  overlayClassName?: string;
  /** Additional class for the dialog container */
  dialogClassName?: string;
  /** Additional class for the header */
  headerClassName?: string;
  /** Additional class for the body */
  bodyClassName?: string;
  /** Aria label for close button */
  closeAriaLabel?: string;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean;
  /** Ref for the close button */
  closeButtonRef?: React.RefObject<HTMLButtonElement>;
  children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  id,
  titleId,
  size = "md",
  backdropOpacity = 0.6,
  overlayClassName,
  dialogClassName,
  headerClassName,
  bodyClassName,
  closeAriaLabel = "Close",
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  closeButtonRef,
  children,
}) => {
  const autoId = useId();
  const resolvedTitleId = titleId ?? `${id ?? autoId}-title`;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!open) return;

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const backdropStyle = {
    "--modal-backdrop-opacity": backdropOpacity,
  } as React.CSSProperties;

  return (
    <div
      className={[
        "modal-overlay",
        `modal-overlay--${size}`,
        overlayClassName ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="presentation"
      onClick={handleBackdropClick}
      style={backdropStyle}
    >
      <div
        className={[
          "modal-dialog",
          `modal-dialog--${size}`,
          dialogClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? resolvedTitleId : undefined}
        id={id}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <header
            className={["modal-header", headerClassName ?? ""]
              .filter(Boolean)
              .join(" ")}
          >
            {title && (
              <div className="modal-header__text">
                <h2 className="modal-title" id={resolvedTitleId}>
                  {title}
                </h2>
                {subtitle && (
                  <p className="modal-subtitle">{subtitle}</p>
                )}
              </div>
            )}
            {showCloseButton && (
              <Button
                size="sm"
                use="secondary"
                appearance="outline"
                className="modal-close"
                onClick={onClose}
                ref={closeButtonRef}
                aria-label={closeAriaLabel}
              >
                <X size={18} />
              </Button>
            )}
          </header>
        )}
        <div
          className={["modal-body", bodyClassName ?? ""]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
