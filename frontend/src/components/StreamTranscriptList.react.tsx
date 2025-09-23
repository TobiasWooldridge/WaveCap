import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowDownCircle, Loader2 } from "lucide-react";
import { TranscriptionResult } from "@types";
import { useAutoScroll } from "../hooks/useAutoScroll";
import Button from "./primitives/Button.react";

export interface StreamTranscriptListProps {
  orderedTranscriptions: TranscriptionResult[];
  isTranscribing: boolean;
  children: ReactNode;
  onLoadEarlier?: (() => void) | null;
  hasMoreHistory?: boolean;
  isLoadingHistory?: boolean;
  historyError?: string | null;
}

export const StreamTranscriptList = ({
  orderedTranscriptions,
  isTranscribing,
  children,
  onLoadEarlier,
  hasMoreHistory = false,
  isLoadingHistory = false,
  historyError = null,
}: StreamTranscriptListProps) => {
  const {
    attachRef,
    hasNewItems,
    isScrolledAway,
    notifyContentChanged,
    scrollToBottom,
  } = useAutoScroll();
  const latestEntryKeyRef = useRef<string | null>(null);
  const previousCountRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );
  const loadMoreRef = useRef<(() => void) | null>(null);
  const loadStateRef = useRef({ hasMoreHistory, isLoadingHistory });
  const previousFirstEntryRef = useRef<string | null>(null);
  const previousScrollHeightRef = useRef(0);

  useEffect(() => {
    loadMoreRef.current = onLoadEarlier ?? null;
  }, [onLoadEarlier]);

  useEffect(() => {
    loadStateRef.current = { hasMoreHistory, isLoadingHistory };
  }, [hasMoreHistory, isLoadingHistory]);

  const handleAttachRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollerRef.current = node;
      attachRef(node);
      setScrollContainer(node);
    },
    [attachRef],
  );

  const handleSentinelRef = useCallback((node: HTMLDivElement | null) => {
    topSentinelRef.current = node;
    setSentinelElement(node);
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      previousScrollHeightRef.current = 0;
      previousFirstEntryRef.current = null;
      return;
    }

    const prevFirstKey = previousFirstEntryRef.current;
    const prevScrollHeight = previousScrollHeightRef.current;
    const nextFirst = orderedTranscriptions[0];
    const nextFirstKey = nextFirst
      ? `${nextFirst.id}-${nextFirst.timestamp}`
      : null;
    const currentScrollHeight = scroller.scrollHeight;

    if (
      prevFirstKey &&
      nextFirstKey &&
      prevFirstKey !== nextFirstKey &&
      prevScrollHeight > 0
    ) {
      const scrollDelta = currentScrollHeight - prevScrollHeight;
      if (scrollDelta > 0) {
        scroller.scrollTop += scrollDelta;
      }
    }

    previousFirstEntryRef.current = nextFirstKey;
    previousScrollHeightRef.current = currentScrollHeight;
  }, [orderedTranscriptions]);

  useEffect(() => {
    const root = scrollContainer;
    const target = sentinelElement;

    if (!root || !target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const { hasMoreHistory: hasMore, isLoadingHistory: loading } =
            loadStateRef.current;
          if (!hasMore || loading) {
            continue;
          }

          const callback = loadMoreRef.current;
          if (callback) {
            callback();
          }
        }
      },
      {
        root,
        rootMargin: "200px 0px 0px 0px",
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [scrollContainer, sentinelElement]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    if (
      !loadMoreRef.current ||
      !hasMoreHistory ||
      isLoadingHistory ||
      !onLoadEarlier
    ) {
      return;
    }

    const isScrollable = scroller.scrollHeight > scroller.clientHeight + 4;
    if (isScrollable) {
      return;
    }

    loadMoreRef.current();
  }, [orderedTranscriptions, hasMoreHistory, isLoadingHistory, onLoadEarlier]);

  useEffect(() => {
    const nextCount = orderedTranscriptions.length;
    const latestEntry = orderedTranscriptions[nextCount - 1];
    const latestKey = latestEntry
      ? `${latestEntry.id}-${latestEntry.timestamp}`
      : null;
    const prevKey = latestEntryKeyRef.current;
    const prevCount = previousCountRef.current;

    if (nextCount === 0) {
      previousCountRef.current = 0;
      latestEntryKeyRef.current = null;
      return;
    }

    if (nextCount > prevCount || (latestKey && latestKey !== prevKey)) {
      if (prevCount === 0) {
        scrollToBottom("auto");
      } else {
        notifyContentChanged({ behavior: "smooth" });
      }
    }

    previousCountRef.current = nextCount;
    latestEntryKeyRef.current = latestKey;
  }, [orderedTranscriptions, notifyContentChanged, scrollToBottom]);

  return (
    <div className="transcript-scroll-area">
      <div className="transcript-scroll-area__scroller" ref={handleAttachRef}>
        <div
          ref={handleSentinelRef}
          className="transcript-scroll-area__sentinel"
          aria-hidden="true"
        />
        {isLoadingHistory ? (
          <div className="transcript-scroll-area__status transcript-scroll-area__status--history">
            <Loader2 className="transcript-scroll-area__status-icon" />
            <span>Loading earlier history…</span>
          </div>
        ) : null}
        {!isLoadingHistory && historyError ? (
          <div className="transcript-scroll-area__status transcript-scroll-area__status--error">
            {historyError}
          </div>
        ) : null}
        <div className="transcript-scroll-area__content">{children}</div>
        {isTranscribing ? (
          <div className="transcript-scroll-area__status">
            <Loader2 className="transcript-scroll-area__status-icon" />
            <span>Listening for more audio…</span>
          </div>
        ) : null}
      </div>
      {isScrolledAway ? (
        <Button
          use="unstyled"
          className={`transcript-view__pill${hasNewItems ? " transcript-view__pill--highlight" : ""}`}
          onClick={() => scrollToBottom("smooth")}
        >
          <ArrowDownCircle size={16} aria-hidden="true" />
          <span>
            {hasNewItems ? "New messages · Go to latest" : "Go to latest"}
          </span>
        </Button>
      ) : null}
    </div>
  );
};
