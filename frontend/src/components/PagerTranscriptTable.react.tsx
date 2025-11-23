import React, { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { type CondensedPagerMessage, getCondensedFieldValue } from "../utils/pagerMessages";
import { getNotifiableAlerts, getTranscriptionDisplayText } from "../utils/transcriptions";
import { Timestamp } from "./primitives/Timestamp.react";
import { TimeInterval } from "./primitives/TimeInterval.react";
import { AlertChips } from "./chips/AlertChips.react";
import Dialog from "./primitives/Dialog.react";
import { useUISettings } from "../contexts/UISettingsContext";

export interface PagerTranscriptTableProps {
  groupId: string;
  messages: CondensedPagerMessage[];
  elementMap: Map<string, React.ReactNode[]>;
  openMessageIds: Record<string, boolean>;
  onToggleMessage: (id: string) => void;
  incidentLocationUrls?: { embed: string; link?: string } | null;
  incidentLocationQuery?: string | null;
  hideTimeColumn?: boolean;
}

export const PagerTranscriptTable: React.FC<PagerTranscriptTableProps> = ({
  groupId,
  messages,
  elementMap,
  openMessageIds,
  onToggleMessage,
  incidentLocationUrls,
  incidentLocationQuery,
  hideTimeColumn = false,
}) => {
  if (!messages || messages.length === 0) return null;

  const { googleMapsApiKey } = useUISettings();
  const [mapOpen, setMapOpen] = useState<boolean>(false);

  const searchQuery = incidentLocationQuery ?? null;
  const mapEmbedUrl = useMemo(() => {
    if (!searchQuery) return null;
    const encoded = encodeURIComponent(searchQuery);
    if (googleMapsApiKey) {
      return `https://www.google.com/maps/embed/v1/search?key=${googleMapsApiKey}&q=${encoded}&zoom=15`;
    }
    return `https://maps.google.com/maps?hl=en&q=${encoded}&ie=UTF8&output=embed`;
  }, [searchQuery, googleMapsApiKey]);

  const mapLinkUrl = useMemo(() => {
    if (incidentLocationUrls?.link) return incidentLocationUrls.link;
    if (!searchQuery) return null;
    const encoded = encodeURIComponent(searchQuery);
    return `https://maps.google.com/maps?hl=en&q=${encoded}&ie=UTF8&z=15`;
  }, [incidentLocationUrls, searchQuery]);

  return (
    <div className="transcript-thread__pager-group" key={`${groupId}-pager`}>      
      <table className="pager-table" aria-label="Pager messages">
        <thead>
          <tr>
            <th className="pager-table__col--toggle" aria-hidden></th>
            {hideTimeColumn ? null : (
              <th className="pager-table__col--time">Time</th>
            )}
            <th className="pager-table__col--summary">Summary</th>
            <th className="pager-table__col--address">Address</th>
            <th className="pager-table__col--tg">TG</th>
            <th className="pager-table__col--units">Units</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message, index) => {
            const isOpen = Boolean(openMessageIds[message.id]);
            const firstFragment = message.fragments[0];
            const fragmentDisplayText = firstFragment ? getTranscriptionDisplayText(firstFragment) : null;
            const summaryText =
              message.summary ||
              (fragmentDisplayText
                ? fragmentDisplayText.split(/\r?\n/, 1)[0]
                : "Pager update");

            const address = getCondensedFieldValue(message, "address");
            const alarm = getCondensedFieldValue(message, "alarm_level");
            const tg = getCondensedFieldValue(message, "talkgroup");
            const units = getCondensedFieldValue(message, "units");
            const narrative = getCondensedFieldValue(message, "narrative");
            const priority = getCondensedFieldValue(message, "priority");

            // Derive a compact category (call type) for the Summary column.
            // Remove incident id, address, and alarm level parts if present.
            const summaryParts = summaryText.split(/\s+–\s+/).map((s) => s.trim());
            const filtered = summaryParts.filter((part) => {
              if (!part) return false;
              if (/^INC\d+/i.test(part)) return false;
              if (address && part.toLowerCase() === address.toLowerCase()) return false;
              if (/^alarm\s*level\b/i.test(part)) return false;
              return true;
            });
            const category = filtered.length > 0 ? filtered[0] : summaryText;
            const summaryDisplay = [category, narrative].filter(Boolean).join(" – ");

            const messageTriggers = message.fragments.flatMap((fragment) =>
              getNotifiableAlerts(fragment.alerts),
            );
            const fragmentElements = message.fragments.flatMap(
              (fragment) => elementMap.get(fragment.id) ?? [],
            );

            const canOpenMap = Boolean(searchQuery);
            const showMapIcon = index === 0 && canOpenMap;

            return (
              <React.Fragment key={message.id}>
                <tr
                  className={`pager-table__row${isOpen ? " pager-table__row--open" : ""}`}
                  onClick={() => onToggleMessage(message.id)}
                >
                  <td className="pager-table__cell pager-table__cell--toggle" title={isOpen ? "Hide details" : "Show details"}>
                    {isOpen ? (
                      <ChevronDown size={14} aria-hidden />
                    ) : (
                      <ChevronRight size={14} aria-hidden />
                    )}
                  </td>
                  {hideTimeColumn ? null : (
                    <td className="pager-table__cell pager-table__cell--time">
                      <Timestamp value={message.timestamp} />
                      <TimeInterval value={message.timestamp} condensed className="ms-1" />
                    </td>
                  )}
                  <td className="pager-table__cell pager-table__cell--summary" title={summaryDisplay}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {alarm && alarm.trim() !== "" && alarm.trim() === "1" ? (
                        <span
                          title="This pager event was sent with Alarm=1"
                          aria-label="Alarm 1"
                          className="text-warning d-inline-flex align-items-center"
                        >
                          <AlertTriangle size={14} />
                        </span>
                      ) : null}
                      <span>{summaryDisplay}</span>
                      {priority ? (
                        <span className="chip-button chip-button--surface">Priority {priority}</span>
                      ) : null}
                      {messageTriggers.length > 0 ? (
                        <AlertChips
                          triggers={messageTriggers}
                          mode="collapsed"
                          idPrefix={`${message.id}-alert`}
                          iconSize={12}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td
                    className="pager-table__cell pager-table__cell--address"
                    title={address ?? undefined}
                    onClick={(e) => {
                      if (!canOpenMap) return;
                      e.stopPropagation();
                      setMapOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (!canOpenMap) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setMapOpen(true);
                      }
                    }}
                    role={canOpenMap ? "button" : undefined}
                    tabIndex={canOpenMap ? 0 : -1}
                    aria-haspopup={canOpenMap ? "dialog" : undefined}
                    aria-expanded={canOpenMap ? (mapOpen ? true : false) : undefined}
                  >
                    {showMapIcon ? (
                      <a
                        href={mapLinkUrl ?? '#'}
                        className="pager-table__map-link pager-table__map-link--leading"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMapOpen(true);
                        }}
                        title={mapLinkUrl ? "View location map" : undefined}
                        aria-hidden
                        tabIndex={-1}
                      >
                        <MapPin size={12} />
                      </a>
                    ) : null}
                    {address ? (
                      canOpenMap ? (
                        <a
                          href={mapLinkUrl ?? '#'}
                          className="pager-table__map-link"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMapOpen(true);
                          }}
                          title={mapLinkUrl ? "View location map" : undefined}
                        >
                          {address}
                        </a>
                      ) : (
                        address
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="pager-table__cell pager-table__cell--tg">{tg ?? "—"}</td>
                  <td className="pager-table__cell pager-table__cell--units" title={units ?? undefined}>{units ?? "—"}</td>
                </tr>

                {isOpen ? (
                  <tr className="pager-table__row--details">
                    <td className="pager-table__details" colSpan={hideTimeColumn ? 4 : 5}>
                      {/* Details list */}
                      <div className="pager-table__details-grid">
                        {message.fields
                          .filter((f) => f.key !== "raw_message")
                          .map((field) => (
                            <div
                              key={`${message.id}-${field.key}`}
                              className="pager-table__detail"
                            >
                              <div className="pager-table__detail-label">{field.label}</div>
                              <div className="pager-table__detail-value">
                                {field.values.join(", ")}
                              </div>
                            </div>
                          ))}
                      </div>

                      {message.notes.length > 0 ? (
                        <div className="pager-table__notes">
                          <div className="pager-table__notes-title">Notes</div>
                          <ul>
                            {message.notes.map((note, i) => (
                              <li key={`${message.id}-note-${i}`}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {fragmentElements.length > 0 ? (
                        <div className="pager-table__raw">
                          <div className="pager-table__raw-title">Raw message</div>
                          <div className="pager-table__fragment-list">{fragmentElements}</div>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title=""
        id={`${groupId}-map-dialog`}
        fullscreen
        overlayClassName="app-modal--map-fullscreen"
        headerClassName="app-modal__header--hidden"
        bodyClassName="map-dialog__body"
      >
        {mapEmbedUrl ? (
          <div className="transcript-thread__incident-map" style={{ width: "100%" }}>
            <iframe
              className="transcript-thread__incident-map-frame"
              src={mapEmbedUrl}
              title="Incident location"
              aria-label="Incident map"
            />
          </div>
        ) : (
          <div className="text-body-secondary">Location not available.</div>
        )}
      </Dialog>
    </div>
  );
};

export default PagerTranscriptTable;
