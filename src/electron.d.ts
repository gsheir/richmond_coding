// Type definitions for Electron API exposed via preload script

interface ElectronAPI {
  saveMatch: (matchId: string, matchData: string) => Promise<{ success: boolean; error?: string }>;
  loadMatch: (matchId: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  listMatches: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
  deleteMatch: (matchId: string) => Promise<{ success: boolean; error?: string }>;
  autosaveMatch: (matchData: string) => Promise<{ success: boolean; error?: string }>;
  loadAutosave: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  exportXML: (matchData: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  onNavigateToSettings: (callback: () => void) => void;
  onNewMatch: (callback: () => void) => void;
  onSaveMatch: (callback: () => void) => void;
  onExportMatch: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
