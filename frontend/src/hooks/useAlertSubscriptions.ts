/**
 * Hook for managing local keyword alert subscription preferences.
 *
 * Alert rules are defined server-side (in config.yaml), but users can customize
 * their local notification preferences (sound, banner) without needing editor access.
 *
 * The server provides default preferences, and this hook stores user overrides
 * in localStorage. Preferences are merged: user settings take precedence over defaults.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { AlertRule, AlertsConfig } from "@types";

const STORAGE_KEY = "wavecap:alert-subscriptions";

export interface AlertSubscription {
  ruleId: string;
  playSound: boolean;
  showBanner: boolean;
}

export interface AlertSubscriptionPreferences {
  /** Global enable/disable for all alerts on this client */
  enabled: boolean;
  /** Per-rule subscription preferences keyed by rule ID */
  subscriptions: Record<string, AlertSubscription>;
}

const DEFAULT_PREFERENCES: AlertSubscriptionPreferences = {
  enabled: true,
  subscriptions: {},
};

/**
 * Load preferences from localStorage
 */
function loadPreferences(): AlertSubscriptionPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(stored) as Partial<AlertSubscriptionPreferences>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
      subscriptions: parsed.subscriptions ?? {},
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save preferences to localStorage
 */
function savePreferences(prefs: AlertSubscriptionPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error("Failed to save alert preferences:", error);
  }
}

/**
 * Create a subscription entry from a server rule (used as default)
 */
function subscriptionFromRule(rule: AlertRule): AlertSubscription {
  return {
    ruleId: rule.id,
    playSound: rule.playSound !== false,
    showBanner: rule.notify !== false,
  };
}

export interface UseAlertSubscriptionsResult {
  /** Whether local alerts are globally enabled */
  enabled: boolean;
  /** Toggle global alerts enabled state */
  setEnabled: (enabled: boolean) => void;

  /** Get effective subscription for a rule (merges server default with local override) */
  getSubscription: (ruleId: string) => AlertSubscription | null;

  /** All effective subscriptions (merged with server rules) */
  subscriptions: AlertSubscription[];

  /** Update a rule's local subscription preferences */
  updateSubscription: (
    ruleId: string,
    updates: Partial<Omit<AlertSubscription, "ruleId">>
  ) => void;

  /** Reset a rule to server defaults */
  resetSubscription: (ruleId: string) => void;

  /** Reset all local preferences to server defaults */
  resetAll: () => void;

  /** Whether we have any local overrides */
  hasLocalOverrides: boolean;
}

/**
 * Hook to manage local alert subscription preferences
 *
 * @param serverConfig - The AlertsConfig from the server (rules and defaults)
 */
export function useAlertSubscriptions(
  serverConfig: AlertsConfig | null | undefined
): UseAlertSubscriptionsResult {
  const [preferences, setPreferences] = useState<AlertSubscriptionPreferences>(
    loadPreferences
  );

  // Persist preferences to localStorage when they change
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // Build a map of server rules for quick lookup
  const serverRulesMap = useMemo(() => {
    const map = new Map<string, AlertRule>();
    if (serverConfig?.rules) {
      for (const rule of serverConfig.rules) {
        if (rule.enabled !== false) {
          map.set(rule.id, rule);
        }
      }
    }
    return map;
  }, [serverConfig]);

  // Get effective subscription for a rule (local override or server default)
  const getSubscription = useCallback(
    (ruleId: string): AlertSubscription | null => {
      const serverRule = serverRulesMap.get(ruleId);
      if (!serverRule) {
        return null;
      }

      const localOverride = preferences.subscriptions[ruleId];
      if (localOverride) {
        return localOverride;
      }

      return subscriptionFromRule(serverRule);
    },
    [serverRulesMap, preferences.subscriptions]
  );

  // Build list of all effective subscriptions
  const subscriptions = useMemo(() => {
    const result: AlertSubscription[] = [];
    for (const rule of serverRulesMap.values()) {
      const sub = getSubscription(rule.id);
      if (sub) {
        result.push(sub);
      }
    }
    return result;
  }, [serverRulesMap, getSubscription]);

  // Toggle global enabled state
  const setEnabled = useCallback((enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, enabled }));
  }, []);

  // Update a specific subscription
  const updateSubscription = useCallback(
    (
      ruleId: string,
      updates: Partial<Omit<AlertSubscription, "ruleId">>
    ) => {
      const serverRule = serverRulesMap.get(ruleId);
      if (!serverRule) {
        return;
      }

      setPreferences((prev) => {
        const existing = prev.subscriptions[ruleId] ?? subscriptionFromRule(serverRule);
        return {
          ...prev,
          subscriptions: {
            ...prev.subscriptions,
            [ruleId]: {
              ...existing,
              ...updates,
              ruleId,
            },
          },
        };
      });
    },
    [serverRulesMap]
  );

  // Reset a subscription to server defaults
  const resetSubscription = useCallback((ruleId: string) => {
    setPreferences((prev) => {
      const { [ruleId]: _, ...rest } = prev.subscriptions;
      return {
        ...prev,
        subscriptions: rest,
      };
    });
  }, []);

  // Reset all local preferences
  const resetAll = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  // Check if we have any local overrides
  const hasLocalOverrides = useMemo(() => {
    return (
      !preferences.enabled ||
      Object.keys(preferences.subscriptions).length > 0
    );
  }, [preferences]);

  return {
    enabled: preferences.enabled,
    setEnabled,
    getSubscription,
    subscriptions,
    updateSubscription,
    resetSubscription,
    resetAll,
    hasLocalOverrides,
  };
}
