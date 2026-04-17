// Electron backend API bindings
import { Match } from "./types";

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
  const result = await window.electronAPI.autosaveMatch(
    JSON.stringify(match)
  );
  
  if (!result.success) {
    throw new Error(result.error || "Failed to autosave match");
  }
}

export async function loadAutosave(): Promise<Match | null> {
  const result = await window.electronAPI.loadAutosave();
  
  if (!result.success) {
    throw new Error(result.error || "Failed to load autosave");
  }
  
  return result.data ? JSON.parse(result.data) : null;
}

export async function exportXML(matchData: string): Promise<void> {
  const result = await window.electronAPI.exportXML(matchData);
  
  if (!result.success && !result.canceled) {
    throw new Error(result.error || "Failed to export XML");
  }
}
