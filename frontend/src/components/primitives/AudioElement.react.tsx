import React from "react";

export interface AudioElementProps {
  recordingId: string;
  recordingUrl: string;
  refsMap: React.MutableRefObject<Record<string, HTMLAudioElement | null>>;
  className?: string;
  preload?: "none" | "metadata" | "auto";
}

const AudioElement: React.FC<AudioElementProps> = ({
  recordingId,
  recordingUrl,
  refsMap,
  className = "hidden",
  preload = "none",
}) => {
  return (
    <audio
      id={recordingId}
      data-recording-url={recordingUrl}
      preload={preload}
      className={className}
      ref={(element) => {
        if (element) {
          refsMap.current[recordingId] = element;
        } else {
          delete refsMap.current[recordingId];
        }
      }}
    />
  );
};

export default AudioElement;

