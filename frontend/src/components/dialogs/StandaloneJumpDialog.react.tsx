import React from "react";
import Dialog from "../primitives/Dialog.react";
import JumpForm from "../JumpForm.react";

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
      <JumpForm
        formClassName="transcript-stream__jump-form standalone-tool-dialog__form"
        timestampValue={timestampValue}
        windowMinutes={windowMinutes}
        isLoading={isLoading}
        onTimestampChange={onTimestampChange}
        onWindowMinutesChange={onWindowMinutesChange}
        onSubmit={onSubmit}
      />
      {error ? (
        <div className="text-danger small" role="alert">
          {error}
        </div>
      ) : null}
    </Dialog>
  );
};

export default StandaloneJumpDialog;
