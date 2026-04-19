// Load button configuration from JSON via Electron API
import { ButtonConfig, ButtonType } from "./types";
import { loadCodingWindowConfig } from "./electron-api";

export async function loadButtonConfig(): Promise<ButtonConfig[]> {
  try {
    const config = await loadCodingWindowConfig();
    
    // Combine phase, context, and termination buttons
    const allButtons = [
      ...(config.phase_buttons || []),
      ...(config.context_buttons || []),
      ...(config.termination_buttons || []),
    ];
    
    return allButtons.map((btn: any) => ({
      code: btn.code,
      label: btn.label,
      type: btn.type as ButtonType,
      category: btn.category,
      hotkey: btn.hotkey,
      position: btn.position,
      style: {
        colour: btn.style.colour,
        opacity: btn.style.opacity,
        fontSize: btn.style.font_size ?? 12,
        fontWeight: btn.style.font_weight ?? "bold",
      },
      leadMs: btn.lead_ms ?? 3000,
      lagMs: btn.lag_ms ?? 5000,
      possessionState: btn.possession_state,
      hierarchyLevel: btn.hierarchy_level,
      transitionType: btn.transition_type,
      forPossessionState: btn.for_possession_state,
    }));
  } catch (error) {
    console.error("Failed to load button config:", error);
    return [];
  }
}
