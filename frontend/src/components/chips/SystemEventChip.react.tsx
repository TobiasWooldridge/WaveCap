import React from "react";
import {
  Activity,
  MicOff,
  Pause,
  Play,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { TranscriptionEventType } from "@types";

export interface SystemEventChipProps {
  label: string;
  eventType?: TranscriptionEventType;
  className?: string;
  iconSize?: number;
}

const iconForEvent = (eventType?: TranscriptionEventType) => {
  switch (eventType) {
    case "recording_started":
      return Radio;
    case "recording_stopped":
      return MicOff;
    case "transcription_started":
      return Play;
    case "transcription_stopped":
      return Pause;
    case "upstream_disconnected":
      return WifiOff;
    case "upstream_reconnected":
      return Wifi;
    default:
      return Activity;
  }
};

export const SystemEventChip: React.FC<SystemEventChipProps> = ({
  label,
  eventType,
  className,
  iconSize = 14,
}) => {
  const Icon = iconForEvent(eventType);
  const classes =
    className ?? "chip-button chip-button--surface transcript-system-event";

  return (
    <span className={classes} title={eventType || undefined}>
      <Icon size={iconSize} />
      {label}
    </span>
  );
};

export default SystemEventChip;

