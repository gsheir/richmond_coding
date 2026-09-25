// Distinct colours identifying each merge segment in the list and preview
export const SEGMENT_COLOURS = [
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

export const getSegmentColour = (segmentIndex: number): string =>
  SEGMENT_COLOURS[segmentIndex % SEGMENT_COLOURS.length];
