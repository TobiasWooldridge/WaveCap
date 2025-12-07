import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellOff, LogIn, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { AlertsConfig } from "@types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import { useAlertSubscriptions } from "../hooks/useAlertSubscriptions";
import Button from "./primitives/Button.react";
import "./SettingsModal.scss";

type KeywordAlertsSettingsSectionProps = Record<string, never>;

type EditableRule = {
  uid: string;
  id: string;
  label: string;
  phrasesText: string;
  enabled: boolean;
  playSound: boolean;
  notify: boolean;
  caseSensitive: boolean;
};

type RuleFieldErrors = Partial<Record<"id" | "phrases", string>>;

type RuleErrorsMap = Record<string, RuleFieldErrors>;

const RULE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const generateUid = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `rule-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

const toEditableRule = (
  rule: AlertsConfig["rules"][number],
  index: number,
): EditableRule => {
  const fallbackId = `keyword-rule-${index + 1}`;
  const normalizedId =
    typeof rule.id === "string" && rule.id.trim().length > 0
      ? rule.id.trim()
      : fallbackId;
  return {
    uid: generateUid(),
    id: normalizedId,
    label: typeof rule.label === "string" ? rule.label : "",
    phrasesText: Array.isArray(rule.phrases) ? rule.phrases.join("\n") : "",
    enabled: rule.enabled === false ? false : true,
    playSound: rule.playSound === false ? false : true,
    notify: rule.notify === false ? false : true,
    caseSensitive: rule.caseSensitive === true,
  };
};

const buildEditableRules = (
  config: AlertsConfig | null | undefined,
): EditableRule[] => {
  if (!config || !Array.isArray(config.rules)) {
    return [];
  }

  return config.rules.map((rule, index) => toEditableRule(rule, index));
};

const sanitizeRuleId = (value: string): string => value.trim();

const parsePhrases = (value: string): string[] => {
  const segments = value
    .split(/[\n,]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const seen = new Set<string>();
  const deduped: string[] = [];
  segments.forEach((segment) => {
    if (!seen.has(segment)) {
      seen.add(segment);
      deduped.push(segment);
    }
  });
  return deduped;
};

const KeywordAlertsSettingsSection = (
  _props: KeywordAlertsSettingsSectionProps,
) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverConfig, setServerConfig] = useState<AlertsConfig | null>(null);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [rules, setRules] = useState<EditableRule[]>([]);
  const [initialEnabled, setInitialEnabled] = useState<boolean>(true);
  const [initialRules, setInitialRules] = useState<EditableRule[]>([]);
  const [ruleErrors, setRuleErrors] = useState<RuleErrorsMap>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { authFetch, role, requestLogin } = useAuth();

  // Local subscription preferences (stored in localStorage)
  const subscriptions = useAlertSubscriptions(serverConfig);

  const isEditor = role === "editor";
  const canEdit = isEditor && !saving;

  const applyConfig = useCallback((config: AlertsConfig | null | undefined) => {
    setServerConfig(config ?? null);
    const sanitizedEnabled = config?.enabled === false ? false : true;
    const editableRules = buildEditableRules(config);
    setEnabled(sanitizedEnabled);
    setRules(editableRules);
    setInitialEnabled(sanitizedEnabled);
    setInitialRules(editableRules.map((rule) => ({ ...rule })));
    setDirty(false);
    setRuleErrors({});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAlerts = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await authFetch("/api/alerts");
        if (!response.ok) {
          throw new Error("Failed to load alerts configuration");
        }
        const data = (await response.json()) as AlertsConfig;
        if (!cancelled) {
          applyConfig(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load alerts configuration", error);
          setLoadError("Unable to load keyword alerts.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [applyConfig, authFetch]);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaveError(null);
  }, []);

  const handleUpdateRule = useCallback(
    (uid: string, updater: (rule: EditableRule) => EditableRule) => {
      setRules((prevRules) =>
        prevRules.map((rule) => (rule.uid === uid ? updater(rule) : rule)),
      );
      setRuleErrors((prev) => {
        if (!prev[uid]) {
          return prev;
        }
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      markDirty();
    },
    [markDirty],
  );

  const handleToggleEnabled = useCallback(() => {
    if (!isEditor) {
      requestLogin();
      return;
    }
    setEnabled((value) => !value);
    markDirty();
  }, [isEditor, markDirty, requestLogin]);

  const handleRuleFieldChange = useCallback(
    (uid: string, field: keyof EditableRule, value: string | boolean) => {
      handleUpdateRule(uid, (rule) => ({
        ...rule,
        [field]: value as never,
      }));
    },
    [handleUpdateRule],
  );

  const handleAddRule = useCallback(() => {
    if (!isEditor) {
      requestLogin();
      return;
    }

    const existingIds = new Set(rules.map((rule) => rule.id));
    let suffix = rules.length + 1;
    let newId = `keyword-rule-${suffix}`;
    while (existingIds.has(newId)) {
      suffix += 1;
      newId = `keyword-rule-${suffix}`;
    }

    const newRule: EditableRule = {
      uid: generateUid(),
      id: newId,
      label: "",
      phrasesText: "",
      enabled: true,
      playSound: true,
      notify: true,
      caseSensitive: false,
    };

    setRules((prev) => [newRule, ...prev]);
    setRuleErrors((prev) => ({ ...prev, [newRule.uid]: {} }));
    markDirty();
  }, [isEditor, markDirty, requestLogin, rules]);

  const handleRemoveRule = useCallback(
    (uid: string) => {
      if (!isEditor) {
        requestLogin();
        return;
      }
      setRules((prev) => prev.filter((rule) => rule.uid !== uid));
      setRuleErrors((prev) => {
        if (!prev[uid]) {
          return prev;
        }
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      markDirty();
    },
    [isEditor, markDirty, requestLogin],
  );

  const resetChanges = useCallback(() => {
    setEnabled(initialEnabled);
    setRules(initialRules.map((rule) => ({ ...rule })));
    setRuleErrors({});
    setDirty(false);
    setSaveError(null);
  }, [initialEnabled, initialRules]);

  const validateRules = useCallback(() => {
    const errors: RuleErrorsMap = {};
    const sanitizedRules: AlertsConfig["rules"] = [];
    const seenIds = new Set<string>();

    rules.forEach((rule) => {
      const ruleErrors: RuleFieldErrors = {};
      const normalizedId = sanitizeRuleId(rule.id);
      if (normalizedId.length === 0) {
        ruleErrors.id = "ID is required.";
      } else if (!RULE_ID_PATTERN.test(normalizedId)) {
        ruleErrors.id = "Use letters, numbers, hyphens, or underscores.";
      } else if (seenIds.has(normalizedId)) {
        ruleErrors.id = "ID must be unique.";
      }

      const phrases = parsePhrases(rule.phrasesText);
      if (phrases.length === 0) {
        ruleErrors.phrases = "Add at least one phrase.";
      }

      if (Object.keys(ruleErrors).length > 0) {
        errors[rule.uid] = ruleErrors;
        return;
      }

      seenIds.add(normalizedId);
      sanitizedRules.push({
        id: normalizedId,
        label: rule.label.trim().length > 0 ? rule.label.trim() : undefined,
        phrases,
        enabled: rule.enabled,
        playSound: rule.playSound,
        notify: rule.notify,
        caseSensitive: rule.caseSensitive,
      });
    });

    return { errors, sanitizedRules };
  }, [rules]);

  const hasRules = rules.length > 0;

  const disableSave = useMemo(() => {
    if (!canEdit) {
      return true;
    }
    if (!dirty) {
      return true;
    }
    if (saving) {
      return true;
    }
    return false;
  }, [canEdit, dirty, saving]);

  const handleSave = useCallback(async () => {
    setSaveError(null);

    if (!canEdit) {
      requestLogin();
      setSaveError("Sign in to modify keyword alerts.");
      return;
    }

    const { errors, sanitizedRules } = validateRules();
    if (Object.keys(errors).length > 0) {
      setRuleErrors(errors);
      setSaveError("Fix the highlighted fields before saving.");
      return;
    }

    setRuleErrors({});

    if (enabled && sanitizedRules.length === 0) {
      setSaveError("Add at least one rule or disable keyword alerts.");
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch("/api/alerts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled, rules: sanitizedRules }),
      });

      if (!response.ok) {
        let message = "Unable to save keyword alerts.";
        try {
          const payload = (await response.json()) as { error?: string } | null;
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // ignore non-JSON errors
        }
        setSaveError(message);
        return;
      }

      const savedConfig = (await response.json()) as AlertsConfig;
      applyConfig(savedConfig);
      showToast({ variant: "success", message: "Keyword alerts updated." });
    } catch (error) {
      console.error("Failed to save keyword alerts", error);
      setSaveError("Unable to save keyword alerts.");
    } finally {
      setSaving(false);
    }
  }, [
    applyConfig,
    authFetch,
    canEdit,
    enabled,
    requestLogin,
    showToast,
    validateRules,
  ]);

  // Get enabled rules for displaying local subscription preferences
  const enabledRules = useMemo(() => {
    return rules.filter((rule) => rule.enabled);
  }, [rules]);

  return (
    <section className="settings-section keyword-alerts-settings">
      <div className="settings-section__header">
        <h3 className="settings-section__title">Keyword Alerts</h3>
      </div>

      {loading ? (
        <div className="text-body-secondary small">Loading keyword alerts…</div>
      ) : loadError ? (
        <div className="alert alert-warning mb-0" role="alert">
          {loadError}
        </div>
      ) : (
        <div className="keyword-alerts-settings__content">
          {saveError && (
            <div className="alert alert-danger mb-0" role="alert">
              {saveError}
            </div>
          )}

          {/* Local subscription preferences (available to all users) */}
          {enabledRules.length > 0 && (
            <div className="keyword-alerts-settings__subscriptions">
              <div className="keyword-alerts-settings__subscriptions-header">
                <span className="keyword-alerts-settings__subscriptions-title">
                  Your notification preferences
                </span>
                <p className="keyword-alerts-settings__subscriptions-description">
                  Customize how you receive alerts. These settings are stored locally in your browser.
                </p>
              </div>

              <div className="keyword-alerts-settings__switch">
                <div className="form-check form-switch m-0 d-flex align-items-center gap-2">
                  <input
                    id="keyword-alerts-local-enabled"
                    type="checkbox"
                    className="form-check-input"
                    role="switch"
                    checked={subscriptions.enabled}
                    onChange={(e) => subscriptions.setEnabled(e.target.checked)}
                  />
                  <label
                    htmlFor="keyword-alerts-local-enabled"
                    className="form-check-label fw-semibold"
                  >
                    Enable alerts on this device
                  </label>
                </div>
                {subscriptions.hasLocalOverrides && (
                  <Button
                    size="sm"
                    use="secondary"
                    appearance="outline"
                    onClick={subscriptions.resetAll}
                    startContent={<RotateCcw size={14} />}
                  >
                    Reset to defaults
                  </Button>
                )}
              </div>

              {subscriptions.enabled && (
                <div className="keyword-alerts-settings__subscription-list">
                  {enabledRules.map((rule) => {
                    const sub = subscriptions.getSubscription(rule.id);
                    if (!sub) return null;

                    return (
                      <div
                        key={rule.uid}
                        className="keyword-alerts-settings__subscription-item"
                      >
                        <div className="keyword-alerts-settings__subscription-label">
                          <span className="keyword-alerts-settings__subscription-name">
                            {rule.label || rule.id}
                          </span>
                          <span className="keyword-alerts-settings__subscription-phrases">
                            {parsePhrases(rule.phrasesText).slice(0, 3).join(", ")}
                            {parsePhrases(rule.phrasesText).length > 3 && "…"}
                          </span>
                        </div>
                        <div className="keyword-alerts-settings__subscription-toggles">
                          <button
                            type="button"
                            className={`keyword-alerts-settings__toggle-btn ${sub.playSound ? "keyword-alerts-settings__toggle-btn--active" : ""}`}
                            onClick={() =>
                              subscriptions.updateSubscription(rule.id, {
                                playSound: !sub.playSound,
                              })
                            }
                            title={sub.playSound ? "Sound enabled" : "Sound disabled"}
                          >
                            {sub.playSound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                          </button>
                          <button
                            type="button"
                            className={`keyword-alerts-settings__toggle-btn ${sub.showBanner ? "keyword-alerts-settings__toggle-btn--active" : ""}`}
                            onClick={() =>
                              subscriptions.updateSubscription(rule.id, {
                                showBanner: !sub.showBanner,
                              })
                            }
                            title={sub.showBanner ? "Banner enabled" : "Banner disabled"}
                          >
                            {sub.showBanner ? <Bell size={16} /> : <BellOff size={16} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Server-side rule management (editor only) */}
          <div className="keyword-alerts-settings__server-rules">
            <div className="keyword-alerts-settings__header">
              <span className="keyword-alerts-settings__subscriptions-title">
                Alert rules {!isEditor && "(view only)"}
              </span>
              <p className="text-body-secondary small mb-0">
                {isEditor
                  ? "Configure watch phrases that trigger alerts for all users."
                  : "These rules are configured by administrators. Contact an editor to add or modify rules."}
              </p>
            </div>

            <div className="keyword-alerts-settings__switch">
              <div className="form-check form-switch m-0 d-flex align-items-center gap-2">
                <input
                  id="keyword-alerts-enabled"
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  checked={enabled}
                  onChange={handleToggleEnabled}
                  disabled={!canEdit}
                />
                <label
                  htmlFor="keyword-alerts-enabled"
                  className="form-check-label fw-semibold"
                >
                  Enable keyword alerts globally
                </label>
              </div>
            </div>

            <div className="keyword-alerts-settings__rules">
              {hasRules ? (
                rules.map((rule) => {
                  const errorsForRule = ruleErrors[rule.uid] ?? {};
                  const idInputId = `keyword-alert-id-${rule.uid}`;
                  const labelInputId = `keyword-alert-label-${rule.uid}`;
                  const phrasesInputId = `keyword-alert-phrases-${rule.uid}`;
                  return (
                    <article
                      key={rule.uid}
                      className="keyword-alerts-settings__rule"
                    >
                      <div className="keyword-alerts-settings__rule-header">
                        <div className="keyword-alerts-settings__field keyword-alerts-settings__field--grow">
                          <label
                            htmlFor={labelInputId}
                            className="keyword-alerts-settings__label"
                          >
                            Display label
                          </label>
                          <input
                            id={labelInputId}
                            type="text"
                            className="form-control form-control-sm"
                            value={rule.label}
                            onChange={(event) =>
                              handleRuleFieldChange(
                                rule.uid,
                                "label",
                                event.target.value,
                              )
                            }
                            disabled={!canEdit}
                            placeholder="e.g. Distress: MAYDAY"
                          />
                        </div>
                        <div className="keyword-alerts-settings__rule-toggle">
                          <div className="form-check form-switch">
                            <input
                              id={`keyword-alert-enabled-${rule.uid}`}
                              type="checkbox"
                              className="form-check-input"
                              role="switch"
                              checked={rule.enabled}
                              onChange={(event) =>
                                handleRuleFieldChange(
                                  rule.uid,
                                  "enabled",
                                  event.target.checked,
                                )
                              }
                              disabled={!canEdit}
                            />
                            <label
                              htmlFor={`keyword-alert-enabled-${rule.uid}`}
                              className="form-check-label small fw-semibold"
                            >
                              Enabled
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="keyword-alerts-settings__grid">
                        <div className="keyword-alerts-settings__field">
                          <label
                            htmlFor={idInputId}
                            className="keyword-alerts-settings__label"
                          >
                            Rule ID
                          </label>
                          <input
                            id={idInputId}
                            type="text"
                            className={`form-control form-control-sm${errorsForRule.id ? " is-invalid" : ""}`}
                            value={rule.id}
                            onChange={(event) =>
                              handleRuleFieldChange(
                                rule.uid,
                                "id",
                                event.target.value,
                              )
                            }
                            disabled={!canEdit}
                            placeholder="e.g. distress-mayday"
                          />
                          {errorsForRule.id && (
                            <div className="invalid-feedback">
                              {errorsForRule.id}
                            </div>
                          )}
                        </div>

                        <div className="keyword-alerts-settings__field keyword-alerts-settings__field--wide">
                          <label
                            htmlFor={phrasesInputId}
                            className="keyword-alerts-settings__label"
                          >
                            Watch phrases
                          </label>
                          <textarea
                            id={phrasesInputId}
                            className={`form-control form-control-sm${errorsForRule.phrases ? " is-invalid" : ""}`}
                            rows={2}
                            value={rule.phrasesText}
                            onChange={(event) =>
                              handleRuleFieldChange(
                                rule.uid,
                                "phrasesText",
                                event.target.value,
                              )
                            }
                            disabled={!canEdit}
                            placeholder="Enter one phrase per line"
                          />
                          {errorsForRule.phrases && (
                            <div className="invalid-feedback">
                              {errorsForRule.phrases}
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditor && (
                        <div className="keyword-alerts-settings__rule-actions">
                          <div className="keyword-alerts-settings__switches">
                            <div className="form-check form-switch">
                              <input
                                id={`keyword-alert-sound-${rule.uid}`}
                                type="checkbox"
                                className="form-check-input"
                                role="switch"
                                checked={rule.playSound}
                                onChange={(event) =>
                                  handleRuleFieldChange(
                                    rule.uid,
                                    "playSound",
                                    event.target.checked,
                                  )
                                }
                                disabled={!canEdit}
                              />
                              <label
                                htmlFor={`keyword-alert-sound-${rule.uid}`}
                                className="form-check-label small"
                              >
                                Play chime (default)
                              </label>
                            </div>
                            <div className="form-check form-switch">
                              <input
                                id={`keyword-alert-notify-${rule.uid}`}
                                type="checkbox"
                                className="form-check-input"
                                role="switch"
                                checked={rule.notify}
                                onChange={(event) =>
                                  handleRuleFieldChange(
                                    rule.uid,
                                    "notify",
                                    event.target.checked,
                                  )
                                }
                                disabled={!canEdit}
                              />
                              <label
                                htmlFor={`keyword-alert-notify-${rule.uid}`}
                                className="form-check-label small"
                              >
                                Show banner (default)
                              </label>
                            </div>
                            <div className="form-check form-switch">
                              <input
                                id={`keyword-alert-case-${rule.uid}`}
                                type="checkbox"
                                className="form-check-input"
                                role="switch"
                                checked={rule.caseSensitive}
                                onChange={(event) =>
                                  handleRuleFieldChange(
                                    rule.uid,
                                    "caseSensitive",
                                    event.target.checked,
                                  )
                                }
                                disabled={!canEdit}
                              />
                              <label
                                htmlFor={`keyword-alert-case-${rule.uid}`}
                                className="form-check-label small"
                              >
                                Match case
                              </label>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            use="destroy"
                            onClick={() => handleRemoveRule(rule.uid)}
                            disabled={!canEdit}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="text-body-secondary small">
                  {isEditor
                    ? "No keyword alerts configured. Add a rule to monitor specific phrases."
                    : "No keyword alerts configured."}
                </div>
              )}
            </div>

            <div className="keyword-alerts-settings__footer">
              {isEditor ? (
                <>
                  <Button
                    size="sm"
                    use="primary"
                    onClick={handleAddRule}
                    disabled={saving}
                  >
                    Add rule
                  </Button>
                  <div className="keyword-alerts-settings__footer-actions">
                    <Button
                      size="sm"
                      use="secondary"
                      onClick={resetChanges}
                      disabled={!dirty || saving}
                    >
                      Reset changes
                    </Button>
                    <Button
                      size="sm"
                      use="primary"
                      onClick={handleSave}
                      disabled={disableSave}
                    >
                      {saving ? "Saving…" : "Save rules"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-body-secondary small d-flex flex-column gap-2">
                  <span>Sign in with editor access to manage alert rules.</span>
                  <Button
                    size="sm"
                    use="primary"
                    className="align-self-start"
                    onClick={requestLogin}
                    startContent={<LogIn size={16} />}
                  >
                    Sign in
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default KeywordAlertsSettingsSection;
