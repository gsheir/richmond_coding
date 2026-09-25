// Converts between the app's ButtonConfig shape and the snake_case wire
// format persisted by the coding-window-config IPC handlers.
import { ButtonConfig } from "./types";

export interface SerializedButton {
  code: string;
  label: string;
  type: string;
  category?: string;
  hotkey?: string;
  position: ButtonConfig["position"];
  style: {
    colour: string;
    opacity: number;
    font_size: number;
    font_weight: string;
  };
  lead_ms: number;
  lag_ms: number;
  possession_state?: string;
  hierarchy_level?: number;
  transition_type?: string;
  for_possession_state?: string;
}

export interface SerializedButtonConfig {
  phase_buttons: SerializedButton[];
  context_buttons: SerializedButton[];
  termination_buttons: SerializedButton[];
  point_event_buttons: SerializedButton[];
}

function serializeButton(btn: ButtonConfig): SerializedButton {
  const serialized: SerializedButton = {
    code: btn.code,
    label: btn.label,
    type: btn.type,
    category: btn.category,
    hotkey: btn.hotkey,
    position: btn.position,
    style: {
      colour: btn.style.colour,
      opacity: btn.style.opacity,
      font_size: btn.style.fontSize,
      font_weight: btn.style.fontWeight,
    },
    lead_ms: btn.leadMs,
    lag_ms: btn.lagMs,
  };

  if (btn.possessionState) serialized.possession_state = btn.possessionState;
  if (btn.hierarchyLevel !== undefined) serialized.hierarchy_level = btn.hierarchyLevel;
  if (btn.transitionType) serialized.transition_type = btn.transitionType;
  if (btn.forPossessionState) serialized.for_possession_state = btn.forPossessionState;

  return serialized;
}

export function serializeButtonConfig(buttons: ButtonConfig[]): SerializedButtonConfig {
  return {
    phase_buttons: buttons.filter((b) => b.type === "phase").map(serializeButton),
    context_buttons: buttons.filter((b) => b.type === "context").map(serializeButton),
    termination_buttons: buttons.filter((b) => b.type === "termination").map(serializeButton),
    point_event_buttons: buttons.filter((b) => b.type === "point_event").map(serializeButton),
  };
}

// Accepts the loosely-typed shape returned over IPC (categorised arrays,
// snake_case fields) and produces the app's ButtonConfig array.
export function deserializeButtonConfig(raw: {
  phase_buttons?: SerializedButton[];
  context_buttons?: SerializedButton[];
  termination_buttons?: SerializedButton[];
  point_event_buttons?: SerializedButton[];
}): ButtonConfig[] {
  const allButtons = [
    ...(raw.phase_buttons || []),
    ...(raw.context_buttons || []),
    ...(raw.termination_buttons || []),
    ...(raw.point_event_buttons || []),
  ];

  // Database rows can carry nulls for unset fields, so fall back to defaults
  return allButtons.map((btn): ButtonConfig => ({
    code: btn.code,
    label: btn.label,
    type: btn.type as ButtonConfig["type"],
    category: btn.category || undefined,
    hotkey: btn.hotkey || undefined,
    position: {
      ...btn.position,
      x: btn.position.x ?? 0,
      y: btn.position.y ?? 0,
    },
    style: {
      colour: btn.style.colour,
      opacity: btn.style.opacity ?? 1,
      fontSize: btn.style.font_size ?? 12,
      fontWeight: btn.style.font_weight ?? "bold",
    },
    leadMs: btn.lead_ms ?? 3000,
    lagMs: btn.lag_ms ?? 5000,
    possessionState: (btn.possession_state || undefined) as ButtonConfig["possessionState"],
    hierarchyLevel: btn.hierarchy_level ?? undefined,
    transitionType: (btn.transition_type || undefined) as ButtonConfig["transitionType"],
    forPossessionState: (btn.for_possession_state || undefined) as ButtonConfig["forPossessionState"],
  }));
}
