import React from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { type CondensedPagerMessage } from "../utils/pagerMessages";
import { getNotifiableAlerts } from "../utils/transcriptions";
import Button from "./primitives/Button.react";
import { AlertChips } from "./chips/AlertChips.react";

export interface PagerTranscriptGroupProps {
  groupId: string;
  messages: CondensedPagerMessage[];
  elementMap: Map<string, React.ReactNode[]>;
  openMessageIds: Record<string, boolean>;
  onToggleMessage: (id: string) => void;
  incidentLocationUrls?: { embed: string; link?: string } | null;
  incidentLocationQuery?: string | null;
}

export const PagerTranscriptGroup: React.FC<PagerTranscriptGroupProps> = ({
  groupId,
  messages,
  elementMap,
  openMessageIds,
  onToggleMessage,
  incidentLocationUrls,
  incidentLocationQuery,
}) => {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="transcript-thread__pager-group" key={`${groupId}-pager`}>
      {messages.map((message, index) => {
        const shouldShowIncidentMap = Boolean(incidentLocationUrls && index === 0);
        const fragmentElements = message.fragments.flatMap(
          (fragment) => elementMap.get(fragment.id) ?? [],
        );
        const messageTriggers = message.fragments.flatMap((fragment) =>
          getNotifiableAlerts(fragment.alerts),
        );
        const alertChips = (
          <AlertChips
            key={`${message.id}-alerts`}
            triggers={messageTriggers}
            mode="separate"
            className="pager-transcript__chip"
            idPrefix={`${message.id}-alert`}
          />
        );
        const fragmentChip =
          message.fragments.length > 1 ? (
            <span
              key={`${message.id}-fragments`}
              className="chip-button chip-button--surface pager-transcript__chip"
            >
              {message.fragments.length} fragments combined
            </span>
          ) : null;

        const summaryText =
          message.summary ||
          (message.fragments[0]?.text
            ? message.fragments[0].text.split(/\r?\n/, 1)[0]
            : "Pager update");
        const isFragmentsOpen = Boolean(openMessageIds[message.id]);
        const fragmentCountLabel = `${message.fragments.length} ${
          message.fragments.length === 1 ? "fragment" : "fragments"
        }`;

        const detailFields = message.fields.filter((field) => field.key !== "raw_message");

        const mapSection = shouldShowIncidentMap && incidentLocationUrls ? (
          <div className="pager-transcript__map" key="map">
            <iframe
              title={`Incident map for ${incidentLocationQuery}`}
              src={incidentLocationUrls.embed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="pager-transcript__map-frame"
            />
            {incidentLocationUrls.link ? (
              <a
                href={incidentLocationUrls.link}
                target="_blank"
                rel="noreferrer noopener"
                className="pager-transcript__map-link"
              >
                <MapPin size={14} />
                Open in Google Maps
              </a>
            ) : null}
          </div>
        ) : null;

        const notesSection = message.notes.length > 0 ? (
          <div className="pager-transcript__notes-card" key="notes">
            <div className="pager-transcript__notes-title">Notes</div>
            <ul className="pager-transcript__notes">
              {message.notes.map((note, i) => (
                <li key={`${message.id}-note-${i}`}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null;

        const sidebarSections = [
          ...(mapSection ? [mapSection] : []),
          ...(notesSection ? [notesSection] : []),
        ];

        const chipElements = [
          ...(fragmentChip ? [fragmentChip] : []),
          alertChips,
        ];

        return (
          <div
            key={message.id}
            className={`pager-transcript${
              sidebarSections.length > 0 ? " pager-transcript--with-sidebar" : ""
            }`}
          >
            {(summaryText || chipElements.length > 0) && (
              <div className="pager-transcript__header">
                {summaryText ? (
                  <div className="pager-transcript__summary">{summaryText}</div>
                ) : null}
                {chipElements.length > 0 ? (
                  <div className="pager-transcript__chips">{chipElements}</div>
                ) : null}
              </div>
            )}
            {detailFields.length > 0 || sidebarSections.length > 0 ? (
              <div className="pager-transcript__body">
                {detailFields.length > 0 ? (
                  <div className="pager-transcript__main">
                    <dl className="pager-transcript__details">
                      {detailFields.map((field) => (
                        <div
                          key={`${message.id}-${field.key}`}
                          className="pager-transcript__detail"
                        >
                          <dt>{field.label}</dt>
                          <dd>
                            {field.values.map((value, index) =>
                              field.format === "code" ? (
                                <code key={`${message.id}-${field.key}-${index}`}>
                                  {value}
                                </code>
                              ) : (
                                <span key={`${message.id}-${field.key}-${index}`}>
                                  {value}
                                </span>
                              ),
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
                {sidebarSections.length > 0 ? (
                  <aside className="pager-transcript__sidebar">{sidebarSections}</aside>
                ) : null}
              </div>
            ) : null}
            {fragmentElements.length > 0 ? (
              <div
                className={`pager-transcript__fragments${
                  isFragmentsOpen ? " pager-transcript__fragments--open" : ""
                }`}
              >
                <Button
                  use="secondary"
                  appearance="outline"
                  size="sm"
                  className={`pager-transcript__fragments-toggle${
                    isFragmentsOpen ? " pager-transcript__fragments-toggle--open" : ""
                  }`}
                  startContent={isFragmentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  onClick={() => onToggleMessage(message.id)}
                >
                  {isFragmentsOpen ? "Hide raw message" : "View raw message"}
                  <span className="pager-transcript__fragment-count">
                    {fragmentCountLabel}
                  </span>
                </Button>
                {isFragmentsOpen ? (
                  <div className="pager-transcript__fragment-panel">
                    <div className="pager-transcript__fragment-list">
                      {fragmentElements}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default PagerTranscriptGroup;

