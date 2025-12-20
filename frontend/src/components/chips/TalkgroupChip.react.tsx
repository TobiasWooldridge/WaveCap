import React, { useMemo } from "react";
import { Radio, Lock, MapPin } from "lucide-react";
import type { TrunkedRadioMetadata } from "@types";
import { getTalkgroupColor, hexToRgb } from "../../utils/talkgroupColors";

export interface TalkgroupChipProps {
  metadata: TrunkedRadioMetadata;
  /** Show extended info in tooltip */
  showExtendedTooltip?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  className?: string;
  iconSize?: number;
}

export const TalkgroupChip: React.FC<TalkgroupChipProps> = ({
  metadata,
  showExtendedTooltip = true,
  compact = false,
  className,
  iconSize = 14,
}) => {
  const {
    talkgroupId,
    talkgroupName,
    encrypted,
    sourceUnitId,
    frequencyMhz,
    gpsLatitude,
    gpsLongitude,
  } = metadata;

  const displayLabel = useMemo(() => {
    if (talkgroupName) return talkgroupName;
    if (talkgroupId) return `TG ${talkgroupId}`;
    return null;
  }, [talkgroupId, talkgroupName]);

  const color = useMemo(() => {
    return talkgroupId ? getTalkgroupColor(talkgroupId) : null;
  }, [talkgroupId]);

  const tooltipParts = useMemo(() => {
    if (!showExtendedTooltip) return [];
    const parts: string[] = [];
    if (talkgroupId) parts.push(`ID: ${talkgroupId}`);
    if (talkgroupName && talkgroupId) parts.push(`Name: ${talkgroupName}`);
    if (sourceUnitId) parts.push(`Unit: ${sourceUnitId}`);
    if (frequencyMhz) parts.push(`Freq: ${frequencyMhz.toFixed(4)} MHz`);
    if (encrypted) parts.push("Encrypted");
    if (gpsLatitude != null && gpsLongitude != null) {
      parts.push(`GPS: ${gpsLatitude.toFixed(5)}, ${gpsLongitude.toFixed(5)}`);
    }
    return parts;
  }, [
    showExtendedTooltip,
    talkgroupId,
    talkgroupName,
    sourceUnitId,
    frequencyMhz,
    encrypted,
    gpsLatitude,
    gpsLongitude,
  ]);

  const hasGps = gpsLatitude != null && gpsLongitude != null;

  if (!displayLabel) return null;

  const baseClass = "chip-button chip-button--talkgroup";
  const classes = className ? `${baseClass} ${className}` : baseClass;
  const style = color
    ? ({
        "--tg-color": color,
        "--tg-color-rgb": hexToRgb(color),
      } as React.CSSProperties)
    : undefined;

  return (
    <span
      className={`${classes}${compact ? " chip-button--compact" : ""}${encrypted ? " chip-button--encrypted" : ""}`}
      style={style}
      title={tooltipParts.length > 0 ? tooltipParts.join(" | ") : undefined}
    >
      {encrypted ? <Lock size={iconSize} /> : <Radio size={iconSize} />}
      {displayLabel}
      {hasGps && !compact && (
        <MapPin size={iconSize - 2} className="talkgroup-chip__gps" />
      )}
    </span>
  );
};

export default TalkgroupChip;
