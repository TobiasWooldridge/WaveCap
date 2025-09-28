import { Stream } from "@types";
import type { StreamSidebarItem } from "../components/StreamSidebar.react";

export type SidebarSortMode = "activity" | "name";

const titleCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const tokenize = (title: string): string[] => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
};

const basePrefix = (title: string, tokenCount = 2): string => {
  const tokens = tokenize(title);
  return tokens.slice(0, tokenCount).join(" ");
};

const typeWeight = (item: StreamSidebarItem): number => {
  if (item.type === "combined") return 0; // show combined views first within a base group
  const source: Stream["source"] = item.stream.source ?? "audio";
  if (source === "audio") return 1; // normal web/audio streams
  if (source === "pager") return 2; // pager feeds after combined/audio
  if (source === "sdr") return 3; // SDR after others
  return 9;
};

const latestActivityTs = (stream: Stream): number => {
  const ts = stream.lastActivityAt ? new Date(stream.lastActivityAt).getTime() : 0;
  const created = stream.createdAt ? new Date(stream.createdAt).getTime() : 0;
  return Math.max(isFinite(ts) ? ts : 0, isFinite(created) ? created : 0);
};

export const buildSidebarComparator = (mode: SidebarSortMode) => {
  return (a: StreamSidebarItem, b: StreamSidebarItem): number => {
    const aPinned = a.isPinned;
    const bPinned = b.isPinned;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    if (mode === "name") {
      // Group by base prefix so related titles stay together, then prioritise type
      const aBase = basePrefix(a.title);
      const bBase = basePrefix(b.title);
      const byBase = titleCollator.compare(aBase, bBase);
      if (byBase !== 0) return byBase;

      const byType = typeWeight(a) - typeWeight(b);
      if (byType !== 0) return byType;

      const byTitle = titleCollator.compare(a.title, b.title);
      if (byTitle !== 0) return byTitle;
      return a.id.localeCompare(b.id);
    }

    // activity
    const aAct = latestActivityTs(a.stream);
    const bAct = latestActivityTs(b.stream);
    if (aAct !== bAct) return bAct - aAct;
    const byTitle = titleCollator.compare(a.title, b.title);
    if (byTitle !== 0) return byTitle;
    return a.id.localeCompare(b.id);
  };
};

