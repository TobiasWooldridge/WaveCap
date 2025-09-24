import { useCallback, useEffect, useRef, useState } from "react";

interface NotifyOptions {
  behavior?: ScrollBehavior;
}

const SCROLL_THRESHOLD_PX = 32;

export const useAutoScroll = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [observedNode, setObservedNode] = useState<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const [hasNewItems, setHasNewItems] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isScrolledAway, setIsScrolledAway] = useState(false);

  const updateIsAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setIsAtBottom(true);
      isAtBottomRef.current = true;
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= SCROLL_THRESHOLD_PX;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    setIsScrolledAway(!atBottom);

    setHasNewItems((previous) => (atBottom ? false : previous));
  }, []);

  const attachRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("scroll", updateIsAtBottom);
      }

      containerRef.current = node;
      setObservedNode(node);

      if (node) {
        node.addEventListener("scroll", updateIsAtBottom, { passive: true });
        if (
          typeof window !== "undefined" &&
          typeof window.requestAnimationFrame === "function"
        ) {
          window.requestAnimationFrame(updateIsAtBottom);
        } else {
          updateIsAtBottom();
        }
      }
    },
    [updateIsAtBottom],
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });

    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setHasNewItems(false);
    setIsScrolledAway(false);
  }, []);

  const notifyContentChanged = useCallback(
    ({ behavior = "auto" }: NotifyOptions = {}) => {
      if (isAtBottomRef.current) {
        scrollToBottom(behavior);
        return;
      }

      setHasNewItems(true);
    },
    [scrollToBottom],
  );

  useEffect(() => {
    const container = observedNode;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        scrollToBottom("auto");
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [observedNode, scrollToBottom]);

  useEffect(() => {
    const container = observedNode;
    if (!container || typeof MutationObserver === "undefined") {
      return;
    }

    let frameId: number | null = null;
    let lastKnownScrollHeight = container.scrollHeight;

    // React re-renders (for example while audio playback updates progress)
    // can mutate lots of text nodes without actually adding new entries. When
    // we eagerly schedule a scroll for every mutation, the browser keeps
    // restarting smooth-scroll animations which shows up as flicker. Track the
    // last measured scroll height so we only react when the content actually
    // grows.

    const scheduleScroll = () => {
      const nextScrollHeight = container.scrollHeight;

      if (!isAtBottomRef.current) {
        lastKnownScrollHeight = nextScrollHeight;
        return;
      }

      if (nextScrollHeight === lastKnownScrollHeight) {
        return;
      }

      lastKnownScrollHeight = nextScrollHeight;

      if (
        typeof window === "undefined" ||
        typeof window.requestAnimationFrame !== "function"
      ) {
        scrollToBottom("auto");
        return;
      }

      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        scrollToBottom("auto");
      });
    };

    const observer = new MutationObserver(() => {
      scheduleScroll();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (
        frameId !== null &&
        typeof window !== "undefined" &&
        typeof window.cancelAnimationFrame === "function"
      ) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [observedNode, scrollToBottom]);

  return {
    attachRef,
    hasNewItems,
    isAtBottom,
    isScrolledAway,
    notifyContentChanged,
    scrollToBottom,
  } as const;
};
