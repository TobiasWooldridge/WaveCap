import assert from "node:assert/strict";
import test from "node:test";
import type { Stream } from "@types";
import type { StreamSidebarItem } from "../components/StreamSidebar.react";
import { buildSidebarComparator } from "./sidebarSort";

const makeStream = (id: string, name: string, source: Stream["source"], lastActivityAt?: string): Stream => ({
  id,
  name,
  url: `test:${id}`,
  status: "transcribing",
  enabled: true,
  createdAt: new Date(0).toISOString(),
  transcriptions: [],
  source,
  ignoreFirstSeconds: 0,
  lastActivityAt: lastActivityAt ?? new Date(0).toISOString(),
});

const item = (id: string, title: string, source: Stream["source"] | "combined"): StreamSidebarItem => {
  const isCombined = source === "combined";
  const stream: Stream = isCombined
    ? makeStream(id, title, "audio")
    : makeStream(id, title, source as Stream["source"]);
  return {
    id,
    type: isCombined ? "combined" : "stream",
    title,
    previewText: "",
    previewTime: null,
    unreadCount: 0,
    stream,
    isPager: source === "pager",
    isActive: false,
    isPinned: false,
  };
};

test("sidebar name sort groups base prefix and prioritises type within group", () => {
  const items: StreamSidebarItem[] = [
    item("marine", "Marine VHF Ch 16 (SDR)", "sdr"),
    item("sa-pager", "SA SES Pager Gateway", "pager"),
    item("sa-radio", "SA SES Radio", "audio"),
    item("sa-combined", "SA SES Radio+pager", "combined"),
  ];

  const comparator = buildSidebarComparator("name");
  const sorted = [...items].sort(comparator);

  const titles = sorted.map((i) => i.title);
  assert.deepStrictEqual(titles, [
    "Marine VHF Ch 16 (SDR)",
    "SA SES Radio+pager",
    "SA SES Radio",
    "SA SES Pager Gateway",
  ]);
});

