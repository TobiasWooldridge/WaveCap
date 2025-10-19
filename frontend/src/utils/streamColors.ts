const STREAM_CHANNEL_COLORS = [
  "#2563EB", // blue-600
  "#7C3AED", // violet-600
  "#047857", // emerald-700
  "#DB2777", // pink-600
  "#B45309", // amber-700
  "#0EA5E9", // sky-500
  "#F97316", // orange-500
  "#059669", // emerald-600
  "#D946EF", // fuchsia-500
  "#1D4ED8", // blue-700
  "#DC2626", // red-600
  "#F59E0B", // amber-500
];

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export const getStreamAccentColor = (streamId: string): string => {
  if (!streamId) {
    return STREAM_CHANNEL_COLORS[0];
  }
  const hash = Math.abs(hashString(streamId));
  const paletteIndex = hash % STREAM_CHANNEL_COLORS.length;
  return STREAM_CHANNEL_COLORS[paletteIndex];
};
