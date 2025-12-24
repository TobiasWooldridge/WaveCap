import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.scss";
import { setupConsoleLogging } from "./utils/setupConsoleLogging";
import { UISettingsProvider } from "./contexts/UISettingsContext.tsx";
import { ToastProvider } from "./contexts/ToastProvider.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { LiveAudioProvider } from "./contexts/LiveAudioContext.tsx";
import { ClockProvider } from "./contexts/ClockContext.tsx";

setupConsoleLogging();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ClockProvider>
        <AuthProvider>
          <UISettingsProvider>
            <ToastProvider>
              <BrowserRouter>
                <LiveAudioProvider>
                  <App />
                </LiveAudioProvider>
              </BrowserRouter>
            </ToastProvider>
          </UISettingsProvider>
        </AuthProvider>
      </ClockProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
