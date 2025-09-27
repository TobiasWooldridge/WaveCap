import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { TranscriptionAlertTrigger } from "@types";

export interface AlertChipsProps {
  triggers: TranscriptionAlertTrigger[];
  mode?: "collapsed" | "separate";
  className?: string;
  idPrefix?: string;
  iconSize?: number;
}

export const AlertChips: React.FC<AlertChipsProps> = ({
  triggers,
  mode = "collapsed",
  className,
  idPrefix = "alert",
  iconSize = 14,
}) => {
  const chips = useMemo(() => {
    const safeTriggers = Array.isArray(triggers) ? triggers : [];
    if (safeTriggers.length === 0) return [] as React.ReactNode[];

    const baseClass = "chip-button chip-button--danger";
    const classes = className ? `${baseClass} ${className}` : baseClass;

    if (mode === "collapsed") {
      const text = safeTriggers
        .map((t) => t.label || t.ruleId)
        .filter(Boolean)
        .join(", ");
      return [
        <span key={`${idPrefix}`} className={classes}>
          <AlertTriangle size={iconSize} />
          {text}
        </span>,
      ];
    }

    // separate: dedupe by ruleId
    const byRule = new Map<string, TranscriptionAlertTrigger>();
    safeTriggers.forEach((t) => {
      if (!byRule.has(t.ruleId)) byRule.set(t.ruleId, t);
    });

    return Array.from(byRule.values()).map((t) => (
      <span key={`${idPrefix}-${t.ruleId}`} className={classes}>
        <AlertTriangle size={iconSize} />
        {t.label ?? t.ruleId}
      </span>
    ));
  }, [className, iconSize, idPrefix, mode, triggers]);

  if (chips.length === 0) return null;
  return <>{chips}</>;
};

export default AlertChips;
