/**
 * Color palette optimized for talk group distinction.
 * Uses a broader palette than streams to support many concurrent talk groups.
 */
const TALKGROUP_COLORS = [
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
  "#6366F1", // indigo-500
  "#10B981", // emerald-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
];

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

/**
 * Get a consistent accent color for a talk group ID.
 * The same TG ID will always map to the same color.
 */
export const getTalkgroupColor = (talkgroupId: string): string => {
  if (!talkgroupId) {
    return TALKGROUP_COLORS[0];
  }
  const hash = Math.abs(hashString(talkgroupId));
  const paletteIndex = hash % TALKGROUP_COLORS.length;
  return TALKGROUP_COLORS[paletteIndex];
};

/**
 * Convert a hex color to RGB values for use with rgba().
 */
export const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return "37, 99, 235"; // fallback blue
  }
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `${r}, ${g}, ${b}`;
};
