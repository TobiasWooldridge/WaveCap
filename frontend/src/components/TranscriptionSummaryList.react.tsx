import React from "react";
import { TranscriptionResult } from "@types";
import { TranscriptionSummaryCard } from "./TranscriptionSummaryCard.react";
import Flex from "./primitives/Flex.react";

interface TranscriptionSummaryListProps {
  transcriptions: TranscriptionResult[];
}

export const TranscriptionSummaryList: React.FC<
  TranscriptionSummaryListProps
> = ({ transcriptions }) => {
  if (transcriptions.length === 0) {
    return (
      <div className="text-center py-5 text-body-secondary">
        <p className="fs-5 mb-1">No transcriptions yet</p>
        <p className="mb-0">Start a transcription to see results here.</p>
      </div>
    );
  }

  return (
    <Flex direction="column" gap={3}>
      {transcriptions.map((transcription) => (
        <TranscriptionSummaryCard
          key={transcription.id}
          transcription={transcription}
        />
      ))}
    </Flex>
  );
};
