// Helpers for resolving buttons across multiple code windows
import { ButtonConfig, CodingWindow, Phase, PointEvent } from "./types";

export function getDefaultWindowId(windows: CodingWindow[]): number | null {
  return windows.find((w) => w.isDefault)?.id ?? windows[0]?.id ?? null;
}

// Returns the given window ID if it still exists, otherwise the default window's ID
export function resolveWindowId(windows: CodingWindow[], windowId: number | null | undefined): number | null {
  if (windowId != null && windows.some((w) => w.id === windowId)) return windowId;
  return getDefaultWindowId(windows);
}

// Every known button, one per code: the given window's buttons first, then
// codes that only exist in other windows (default window first). Used to
// render and export events coded before the match switched window.
export function resolveButtons(
  windows: CodingWindow[],
  buttonsByWindowId: Record<number, ButtonConfig[]>,
  windowId: number | null
): ButtonConfig[] {
  const orderedIds = [
    ...(windowId != null ? [windowId] : []),
    ...windows.filter((w) => w.isDefault && w.id !== windowId).map((w) => w.id),
    ...windows.filter((w) => !w.isDefault && w.id !== windowId).map((w) => w.id),
  ];

  const seen = new Set<string>();
  const resolved: ButtonConfig[] = [];
  for (const id of orderedIds) {
    for (const button of buttonsByWindowId[id] ?? []) {
      if (seen.has(button.code)) continue;
      seen.add(button.code);
      resolved.push(button);
    }
  }
  return resolved;
}

// Every code referenced by a match's phases (phase, termination and context) and point events
export function getCodesUsedInMatch(phases: Phase[], pointEvents: PointEvent[]): Set<string> {
  const codes = new Set<string>();
  for (const phase of phases) {
    if (phase.phaseCode) codes.add(phase.phaseCode);
    if (phase.terminationEvent) codes.add(phase.terminationEvent);
    phase.contextLabels.forEach((label) => codes.add(label));
  }
  pointEvents.forEach((event) => codes.add(event.code));
  return codes;
}

// Buttons relevant to a match: those in its current window plus any other
// window's buttons whose codes appear in the match
export function getMatchRelevantButtons(
  resolvedButtons: ButtonConfig[],
  activeButtons: ButtonConfig[],
  usedCodes: Set<string>
): ButtonConfig[] {
  const activeCodes = new Set(activeButtons.map((b) => b.code));
  return resolvedButtons.filter((b) => activeCodes.has(b.code) || usedCodes.has(b.code));
}
