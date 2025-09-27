import React from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import Dialog from "../primitives/Dialog.react";
import Button from "../primitives/Button.react";

export interface StandaloneJumpDialogProps {
  open: boolean;
  onClose: () => void;
  sanitizedStreamId: string;
  timestampValue: string;
  windowMinutes: number;
  isLoading: boolean;
  error: string | null;
  onTimestampChange: (value: string) => void;
  onWindowMinutesChange: (value: number) => void;
  onSubmit: (value: string, windowMinutes: number) => void;
}

const StandaloneJumpDialog: React.FC<StandaloneJumpDialogProps> = ({
  open,
  onClose,
  sanitizedStreamId,
  timestampValue,
  windowMinutes,
  isLoading,
  error,
  onTimestampChange,
  onWindowMinutesChange,
  onSubmit,
}) => {
  const titleId = `standalone-jump-${sanitizedStreamId}-title`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Go to timestamp"
      id={`standalone-jump-${sanitizedStreamId}`}
      titleId={titleId}
      dialogClassName="standalone-tool-dialog"
      bodyClassName="standalone-tool-dialog__body"
      closeAriaLabel="Close go to timestamp dialog"
    >
      <form
        className="transcript-stream__jump-form standalone-tool-dialog__form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(timestampValue, windowMinutes);
        }}
      >
        <div className="transcript-stream__jump-inputs">
          <div className="transcript-stream__jump-input">
            <CalendarClock size={16} aria-hidden="true" />
            <input
              type="datetime-local"
              value={timestampValue}
              onChange={(event) => onTimestampChange(event.target.value)}
              className="form-control form-control-sm"
            />
          </div>
          <select
            value={String(windowMinutes)}
            onChange={(event) => onWindowMinutesChange(Number(event.target.value))}
            className="form-select form-select-sm"
          >
            <option value="5">±5 min</option>
            <option value="10">±10 min</option>
            <option value="30">±30 min</option>
          </select>
          <Button
            type="submit"
            size="sm"
            use="success"
            disabled={isLoading}
            isContentInline={isLoading ? false : undefined}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              "Go"
            )}
          </Button>
        </div>
      </form>
      {error ? (
        <div className="text-danger small" role="alert">
          {error}
        </div>
      ) : null}
    </Dialog>
  );
};

export default StandaloneJumpDialog;

