export const parseFilenameFromContentDisposition = (
  header: string | null,
): string | null => {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (error) {
      console.warn(
        "Failed to decode UTF-8 filename from Content-Disposition header:",
        error,
      );
    }
  }

  const fallbackMatch = header.match(/filename="?([^";]+)"?/i);
  return fallbackMatch && fallbackMatch[1] ? fallbackMatch[1] : null;
};
