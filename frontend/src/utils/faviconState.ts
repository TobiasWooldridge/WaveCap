export interface FaviconState {
  set: (href: string) => void;
  reset: () => void;
}

const DEFAULT_FAVICON_HREF = "/favicon.svg";

const queryFaviconLink = (): HTMLLinkElement | null => {
  if (typeof document === "undefined") {
    return null;
  }

  return document.querySelector<HTMLLinkElement>("link[rel~='icon']");
};

export const createFaviconState = (): FaviconState => {
  let defaultHref: string | null = null;

  const set = (href: string) => {
    const link = queryFaviconLink();
    if (!link) {
      return;
    }

    if (defaultHref === null) {
      defaultHref = link.getAttribute("href");
    }

    if (link.getAttribute("href") !== href) {
      link.setAttribute("href", href);
    }
  };

  const reset = () => {
    const link = queryFaviconLink();
    if (!link) {
      return;
    }

    const fallbackHref = defaultHref ?? DEFAULT_FAVICON_HREF;
    if (link.getAttribute("href") !== fallbackHref) {
      link.setAttribute("href", fallbackHref);
    }
  };

  return { set, reset };
};
