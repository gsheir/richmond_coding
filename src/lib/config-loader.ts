// Load button configuration from YAML
import yaml from "js-yaml";
import { ButtonConfig, ButtonsConfig, ButtonType } from "./types";

export async function loadButtonConfig(): Promise<ButtonConfig[]> {
  try {
    const response = await fetch("/coding_window.yaml");
    const yamlText = await response.text();
    const config = yaml.load(yamlText) as ButtonsConfig;
    
    return config.buttons.map((btn) => ({
      ...btn,
      type: btn.type as ButtonType,
    }));
  } catch (error) {
    console.error("Failed to load button config:", error);
    return [];
  }
}
