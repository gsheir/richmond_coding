// Load button configuration from JSON via Electron API
import { ButtonConfig, ButtonType } from "./types";
import { loadCodingWindowConfig } from "./electron-api";

export async function loadButtonConfig(): Promise<ButtonConfig[]> {
  try {
    const config = await loadCodingWindowConfig();
    
    return config.buttons.map((btn: any) => ({
      code: btn.code,
      label: btn.label,
      type: btn.type as ButtonType,
      category: btn.category,
      hotkey: btn.hotkey,
      position: btn.position,
      style: {
        colour: btn.style.colour,
        opacity: btn.style.opacity,
        fontSize: btn.style.font_size,
        fontWeight: btn.style.font_weight,
      },
      leadMs: btn.lead_ms,
      lagMs: btn.lag_ms,
    }));
  } catch (error) {
    console.error("Failed to load button config:", error);
    return [];
  }
}
