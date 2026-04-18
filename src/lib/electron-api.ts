// Electron backend API bindings
import { Match } from "./types";

// Settings interface
export interface Settings {
  defaultHomeTeam: string;
  autosaveDirectory: string;
  defaultLeadMs: number;
  defaultLagMs: number;
}

// Match operations
export async function saveMatch(match: Match): Promise<void> {
  const result = await window.electronAPI.saveMatch(
    match.id,
    JSON.stringify(match)
  );
  
  if (!result.success) {
    throw new Error(result.error || "Failed to save match");
  }
}

export async function loadMatch(matchId: string): Promise<Match> {
  const result = await window.electronAPI.loadMatch(matchId);
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to load match");
  }
  
  return JSON.parse(result.data);
}

export async function listMatches(): Promise<Match[]> {
  if (!window.electronAPI) {
    console.warn('electronAPI not available, returning empty matches list');
    return [];
  }
  
  const result = await window.electronAPI.listMatches();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to list matches");
  }
  
  return result.data.map((data) => JSON.parse(data));
}

export async function deleteMatch(matchId: string): Promise<void> {
  const result = await window.electronAPI.deleteMatch(matchId);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to delete match");
  }
}

export async function autosaveMatch(match: Match): Promise<void> {
  if (!window.electronAPI) {
    console.warn('electronAPI not available, skipping autosave');
    return;
  }
  
  const result = await window.electronAPI.autosaveMatch(
    JSON.stringify(match)
  );
  
  if (!result.success) {
    throw new Error(result.error || "Failed to autosave match");
  }
}

export async function loadAutosave(): Promise<Match | null> {
  if (!window.electronAPI) {
    console.warn('electronAPI not available, skipping autosave load');
    return null;
  }
  
  const result = await window.electronAPI.loadAutosave();
  
  if (!result.success) {
    throw new Error(result.error || "Failed to load autosave");
  }
  
  return result.data ? JSON.parse(result.data) : null;
}

export async function exportXML(
  matchData: string,
  defaultFilename: string
): Promise<void> {
  const result = await window.electronAPI.exportXML(matchData, defaultFilename);
  
  if (!result.success && !result.canceled) {
    throw new Error(result.error || "Failed to export XML");
  }
}

// Settings operations
export async function saveSettings(settings: Settings): Promise<void> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.saveSettings(
    JSON.stringify(settings)
  );
  
  if (!result.success) {
    console.error('Settings save failed:', result.error);
    throw new Error(result.error || "Failed to save settings");
  }
}

export async function loadSettings(): Promise<Settings | null> {
  if (!window.electronAPI) {
    console.warn('electronAPI not available, using default settings');
    return null;
  }
  
  const result = await window.electronAPI.loadSettings();
  
  if (!result.success) {
    console.error('Settings load failed:', result.error);
    throw new Error(result.error || "Failed to load settings");
  }
  
  return result.data ? JSON.parse(result.data) : null;
}
