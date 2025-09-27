import React from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import Button from "./primitives/Button.react";

export interface JumpFormProps {
  timestampValue: string;
  windowMinutes: number;
  isLoading: boolean;
  onTimestampChange: (value: string) => void;
  onWindowMinutesChange: (value: number) => void;
  onSubmit: (value: string, windowMinutes: number) => void;
  formClassName?: string;
}

const JumpForm: React.FC<JumpFormProps> = ({
  timestampValue,
  windowMinutes,
  isLoading,
  onTimestampChange,
  onWindowMinutesChange,
  onSubmit,
  formClassName,
}) => {
  return (
    <form
      className={formClassName ?? "transcript-stream__jump-form"}
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
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Go"}
        </Button>
      </div>
    </form>
  );
};

export default JumpForm;

