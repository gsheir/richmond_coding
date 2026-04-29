// Electron backend API bindings
import { Match } from "./types";
import { TableSchema, TableDataOptions, ColumnInfo, ForeignKeyInfo, ButtonConfig, Button } from "../electron";

// Re-export types
export type { TableSchema, TableDataOptions, ColumnInfo, ForeignKeyInfo, ButtonConfig, Button };

// Settings interface
export interface Settings {
  defaultHomeTeam: string;
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

// Coding window configuration operations
export async function loadCodingWindowConfig(): Promise<any> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.loadCodingWindowConfig();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to load coding window config");
  }
  
  return JSON.parse(result.data);
}

export async function saveCodingWindowConfig(config: any): Promise<void> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.saveCodingWindowConfig(
    JSON.stringify(config)
  );
  
  if (!result.success) {
    console.error('Config save failed:', result.error);
    throw new Error(result.error || "Failed to save coding window config");
  }
}

export async function resetCodingWindowConfig(): Promise<any> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.resetCodingWindowConfig();
  
  if (!result.success || !result.data) {
    console.error('Config reset failed:', result.error);
    throw new Error(result.error || "Failed to reset coding window config");
  }
  
  return JSON.parse(result.data);
}

export async function getCodingWindowConfigPath(): Promise<string> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.getCodingWindowConfigPath();
  
  if (!result.success || !result.path) {
    throw new Error(result.error || "Failed to get config path");
  }
  
  return result.path;
}

export async function getDatabasePath(): Promise<string> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.getDatabasePath();
  
  if (!result.success || !result.path) {
    throw new Error(result.error || "Failed to get database path");
  }
  
  return result.path;
}

export async function openConfigDirectory(): Promise<void> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.openConfigDirectory();
  
  if (!result.success) {
    console.error('Failed to open config directory:', result.error);
    throw new Error(result.error || "Failed to open config directory");
  }
}

// Data browser operations
export async function dbListTables(): Promise<string[]> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbListTables();
  
  if (!result.success || !result.tables) {
    throw new Error(result.error || "Failed to list tables");
  }
  
  return result.tables;
}

export async function dbGetTableSchema(tableName: string): Promise<TableSchema> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbGetTableSchema(tableName);
  
  if (!result.success || !result.schema) {
    throw new Error(result.error || "Failed to get table schema");
  }
  
  return result.schema;
}

export async function dbGetTableData(
  tableName: string,
  options?: TableDataOptions
): Promise<{ rows: any[]; totalCount: number }> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbGetTableData(tableName, options);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to get table data");
  }
  
  return {
    rows: result.rows || [],
    totalCount: result.totalCount || 0,
  };
}

export async function dbGetRowCount(
  tableName: string,
  filters?: Record<string, any>
): Promise<number> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbGetRowCount(tableName, filters);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to get row count");
  }
  
  return result.count || 0;
}

export async function dbGetRelatedData(
  tableName: string,
  rowId: any
): Promise<Record<string, any[]>> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbGetRelatedData(tableName, rowId);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to get related data");
  }
  
  return result.related || {};
}

export async function dbUpdateRow(
  tableName: string,
  rowId: any,
  columnUpdates: Record<string, any>
): Promise<boolean> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbUpdateRow(tableName, rowId, columnUpdates);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to update row");
  }
  
  return result.updated || false;
}

export async function dbDeleteRow(tableName: string, rowId: any): Promise<boolean> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbDeleteRow(tableName, rowId);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to delete row");
  }
  
  return result.deleted || false;
}

export async function dbDeleteRows(tableName: string, rowIds: any[]): Promise<number> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbDeleteRows(tableName, rowIds);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to delete rows");
  }
  
  return result.deletedCount || 0;
}

export async function dbInsertRow(
  tableName: string,
  rowData: Record<string, any>
): Promise<number> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.dbInsertRow(tableName, rowData);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to insert row");
  }
  
  return result.insertedId || 0;
}

// Button configuration management
export async function listButtonConfigs(): Promise<ButtonConfig[]> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.listButtonConfigs();
  
  if (!result.success) {
    throw new Error(result.error || "Failed to list button configs");
  }
  
  return result.configs || [];
}

export async function getActiveButtonConfig(): Promise<{ config: ButtonConfig | null; buttons: Button[] }> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.getActiveButtonConfig();
  
  if (!result.success) {
    throw new Error(result.error || "Failed to get active button config");
  }
  
  return {
    config: result.config || null,
    buttons: result.buttons || [],
  };
}

export async function createButtonConfig(name: string, description?: string): Promise<number> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.createButtonConfig(name, description);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to create button config");
  }
  
  return result.configId || 0;
}

export async function setActiveButtonConfig(configId: number): Promise<void> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.setActiveButtonConfig(configId);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to set active button config");
  }
}

export async function deleteButtonConfig(configId: number): Promise<void> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.deleteButtonConfig(configId);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to delete button config");
  }
}

export async function duplicateButtonConfig(sourceConfigId: number, newName: string): Promise<number> {
  if (!window.electronAPI) {
    console.error('electronAPI not available');
    throw new Error('Electron API not ready');
  }
  
  const result = await window.electronAPI.duplicateButtonConfig(sourceConfigId, newName);
  
  if (!result.success) {
    throw new Error(result.error || "Failed to duplicate button config");
  }
  
  return result.configId || 0;
}

