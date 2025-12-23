import { createContext } from "react";
import type { ToastVariant, ToastAction } from "../components/primitives/ToastViewport.react";

export type ShowToastOptions = {
  message: string;
  title?: string;
  variant?: ToastVariant;
  duration?: number;
  id?: string;
  action?: ToastAction;
};

export type ToastContextValue = {
  showToast: (options: ShowToastOptions) => string;
  dismissToast: (id: string) => void;
};

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined,
);
