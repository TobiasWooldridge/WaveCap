import type { ReactNode } from "react";

export interface StandaloneStreamControls {
  streamId: string;
  statusLabel: string;
  statusModifier: "transcribing" | "queued" | "error" | "stopped";
  isLiveListening: boolean;
  canListenLive: boolean;
  canReset: boolean;
  liveAudioError: string | null;
  onToggleLiveListening: () => void;
  onReset: () => void;
  toolButtons: ReactNode | null;
  dialogs: ReactNode[];
}

