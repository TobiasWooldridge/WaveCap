import React from "react";
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { type CondensedPagerMessage } from "../utils/pagerMessages";
import { getNotifiableAlerts } from "../utils/transcriptions";
import { Timestamp } from "./primitives/Timestamp.react";
import { TimeInterval } from "./primitives/TimeInterval.react";
import { AlertChips } from "./chips/AlertChips.react";

export interface PagerTranscriptTableProps {
  groupId: string;
  messages: CondensedPagerMessage[];
  elementMap: Map<string, React.ReactNode[]>;
  openMessageIds: Record<string, boolean>;
  onToggleMessage: (id: string) => void;
  incidentLocationUrls?: { embed: string; link?: string } | null;
  incidentLocationQuery?: string | null;
}

const getFieldValue = (message: CondensedPagerMessage, key: string): string | null => {
  const f = message.fields.find((x) => x.key === key);
  if (!f || f.values.length === 0) return null;
  return f.values[0];
};

export const PagerTranscriptTable: React.FC<PagerTranscriptTableProps> = ({
  groupId,
  messages,
  elementMap,
  openMessageIds,
  onToggleMessage,
  incidentLocationUrls,
}) => {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="transcript-thread__pager-group" key={`${groupId}-pager`}>      
      <table className="pager-table" aria-label="Pager messages">
        <thead>
          <tr>
            <th className="pager-table__col--toggle" aria-hidden></th>
            <th className="pager-table__col--time">Time</th>
            <th className="pager-table__col--summary">Summary</th>
            <th className="pager-table__col--address">Address</th>
            <th className="pager-table__col--alarm">Alarm</th>
            <th className="pager-table__col--priority">Priority</th>
            <th className="pager-table__col--tg">TG</th>
            <th className="pager-table__col--units">Units</th>
            <th className="pager-table__col--alerts">Alerts</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message, index) => {
            const isOpen = Boolean(openMessageIds[message.id]);
            const summaryText =
              message.summary ||
              (message.fragments[0]?.text
                ? message.fragments[0].text.split(/\r?\n/, 1)[0]
                : "Pager update");

            const address = getFieldValue(message, "address");
            const alarm = getFieldValue(message, "alarm_level");
            const tg = getFieldValue(message, "talkgroup");
            const units = getFieldValue(message, "units");
            const narrative = getFieldValue(message, "narrative");
            const priority = getFieldValue(message, "priority");

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

            const mapLink = index === 0 ? incidentLocationUrls?.link : undefined;

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
                  <td className="pager-table__cell pager-table__cell--time">
                    <Timestamp value={message.timestamp} />
                    <TimeInterval value={message.timestamp} condensed className="ms-1" />
                  </td>
                  <td className="pager-table__cell pager-table__cell--summary" title={summaryDisplay}>
                    {summaryDisplay}
                  </td>
                  <td className="pager-table__cell pager-table__cell--address" title={address ?? undefined}>
                    {address ?? "—"}
                    {mapLink ? (
                      <a
                        href={mapLink}
                        className="pager-table__map-link"
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in Google Maps"
                      >
                        <MapPin size={12} />
                      </a>
                    ) : null}
                  </td>
                  <td className="pager-table__cell pager-table__cell--alarm">{alarm ?? "—"}</td>
                  <td className="pager-table__cell pager-table__cell--priority">{priority ?? "—"}</td>
                  <td className="pager-table__cell pager-table__cell--tg">{tg ?? "—"}</td>
                  <td className="pager-table__cell pager-table__cell--units" title={units ?? undefined}>{units ?? "—"}</td>
                  <td className="pager-table__cell pager-table__cell--alerts">
                    <AlertChips
                      triggers={messageTriggers}
                      mode="collapsed"
                      idPrefix={`${message.id}-alert`}
                      iconSize={12}
                    />
                  </td>
                </tr>

                {isOpen ? (
                  <tr className="pager-table__row--details">
                    <td className="pager-table__details" colSpan={8}>
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
    </div>
  );
};

export default PagerTranscriptTable;
