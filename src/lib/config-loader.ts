// Load a code window's button configuration via the Electron API
import { ButtonConfig } from "./types";
import { loadCodingWindowConfig } from "./electron-api";
import { deserializeButtonConfig } from "./button-config-serialization";

// Loads the given code window's buttons, or the default window's if no ID is given
export async function loadButtonConfig(windowId?: number): Promise<ButtonConfig[]> {
  try {
    return deserializeButtonConfig(await loadCodingWindowConfig(windowId));
  } catch (error) {
    console.error("Failed to load button config:", error);
    return [];
  }
}
