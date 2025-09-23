export const setAudioElementSource = (
  audio: HTMLAudioElement,
  recordingUrl: string,
): boolean => {
  const normalizedUrl = recordingUrl.trim();
  if (!normalizedUrl) {
    return false;
  }

  const currentUrl = audio.dataset.loadedRecordingUrl;
  if (currentUrl === normalizedUrl) {
    return false;
  }

  audio.dataset.recordingUrl = normalizedUrl;
  audio.dataset.loadedRecordingUrl = normalizedUrl;
  audio.src = normalizedUrl;
  return true;
};
