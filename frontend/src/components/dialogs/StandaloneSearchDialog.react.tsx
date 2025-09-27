import React from "react";
import Dialog from "../primitives/Dialog.react";

export interface StandaloneSearchDialogProps {
  open: boolean;
  onClose: () => void;
  streamId: string;
  sanitizedStreamId: string;
  children: React.ReactNode; // Body content provided by parent (search UI)
}

const StandaloneSearchDialog: React.FC<StandaloneSearchDialogProps> = ({
  open,
  onClose,
  sanitizedStreamId,
  children,
}) => {
  const titleId = `standalone-search-${sanitizedStreamId}-title`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Search transcripts"
      id={`standalone-search-${sanitizedStreamId}`}
      titleId={titleId}
      dialogClassName="standalone-tool-dialog"
      bodyClassName="standalone-tool-dialog__body"
      closeAriaLabel="Close search dialog"
    >
      {children}
    </Dialog>
  );
};

export default StandaloneSearchDialog;

