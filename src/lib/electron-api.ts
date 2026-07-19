// Electron backend API bindings
import { Match } from "./types";
import { TableSchema, TableDataOptions, ColumnInfo, ForeignKeyInfo, ButtonConfigSet, Button, Row, RowId } from "../electron";

// Re-export types
export type { TableSchema, TableDataOptions, ColumnInfo, ForeignKeyInfo, ButtonConfigSet, Button, Row, RowId };

// Settings interface
export interface Settings {
  defaultHomeTeam: string;
  defaultLeadMs: number;
  defaultLagMs: number;
}

type ElectronAPIType = typeof window.electronAPI;
type IpcResult = { success: boolean; error?: string };

function requireElectronAPI(): ElectronAPIType {
  if (!window.electronAPI) {
    console.error("electronAPI not available");
    throw new Error("Electron API not ready");
  }
  return window.electronAPI;
}

// Invokes an IPC call, throwing if the preload bridge isn't ready or the
// main-process handler reported failure. Use for calls with no sensible
// offline fallback.
async function callIpc<R extends IpcResult>(
  invoke: (api: ElectronAPIType) => Promise<R>,
  errorMessage: string
): Promise<R> {
  const api = requireElectronAPI();
  const result = await invoke(api);
  if (!result.success) {
    throw new Error(result.error || errorMessage);
  }
  return result;
}

// Same as callIpc, but returns null instead of throwing when the preload
// bridge isn't ready (e.g. running outside Electron). Use for calls with a
// safe "nothing to load yet" fallback.
async function callIpcOptional<R extends IpcResult>(
  invoke: (api: ElectronAPIType) => Promise<R>,
  errorMessage: string,
  notReadyWarning: string
): Promise<R | null> {
  if (!window.electronAPI) {
    console.warn(notReadyWarning);
    return null;
  }
  const result = await invoke(window.electronAPI);
  if (!result.success) {
    throw new Error(result.error || errorMessage);
  }
  return result;
}

// Match operations
export async function saveMatch(match: Match): Promise<void> {
  await callIpc(
    (api) => api.saveMatch(match.id, JSON.stringify(match)),
    "Failed to save match"
  );
}

export async function loadMatch(matchId: string): Promise<Match> {
  const result = await callIpc((api) => api.loadMatch(matchId), "Failed to load match");
  if (!result.data) {
    throw new Error("Failed to load match");
  }
  return JSON.parse(result.data);
}

export async function listMatches(): Promise<Match[]> {
  const result = await callIpcOptional(
    (api) => api.listMatches(),
    "Failed to list matches",
    "electronAPI not available, returning empty matches list"
  );
  return result?.data?.map((data) => JSON.parse(data)) ?? [];
}

export async function deleteMatch(matchId: string): Promise<void> {
  await callIpc((api) => api.deleteMatch(matchId), "Failed to delete match");
}

export async function autosaveMatch(match: Match): Promise<void> {
  await callIpcOptional(
    (api) => api.autosaveMatch(JSON.stringify(match)),
    "Failed to autosave match",
    "electronAPI not available, skipping autosave"
  );
}

export async function loadAutosave(): Promise<Match | null> {
  const result = await callIpcOptional(
    (api) => api.loadAutosave(),
    "Failed to load autosave",
    "electronAPI not available, skipping autosave load"
  );
  return result?.data ? JSON.parse(result.data) : null;
}

export async function showCloseTabDialog(): Promise<number> {
  const result = await callIpcOptional(
    (api) => api.showCloseTabDialog(),
    "Failed to show close tab dialog",
    "electronAPI not available, returning cancel"
  );
  return result?.response ?? 2; // Default to cancel if unavailable/no response
}

export async function showUnsavedConfigDialog(): Promise<number> {
  const result = await callIpcOptional(
    (api) => api.showUnsavedConfigDialog(),
    "Failed to show unsaved config dialog",
    "electronAPI not available, returning cancel"
  );
  return result?.response ?? 1; // Default to cancel if unavailable/no response
}

export async function exportXML(
  matchData: string,
  defaultFilename: string
): Promise<void> {
  const api = requireElectronAPI();
  const result = await api.exportXML(matchData, defaultFilename);

  if (!result.success && !result.cancelled) {
    throw new Error(result.error || "Failed to export XML");
  }
}

// Settings operations
export async function saveSettings(settings: Settings): Promise<void> {
  await callIpc(
    (api) => api.saveSettings(JSON.stringify(settings)),
    "Failed to save settings"
  );
}

export async function loadSettings(): Promise<Settings | null> {
  const result = await callIpcOptional(
    (api) => api.loadSettings(),
    "Failed to load settings",
    "electronAPI not available, using default settings"
  );
  return result?.data ? JSON.parse(result.data) : null;
}

// Coding window configuration operations
export async function loadCodingWindowConfig(): Promise<any> {
  const result = await callIpc(
    (api) => api.loadCodingWindowConfig(),
    "Failed to load coding window config"
  );
  if (!result.data) {
    throw new Error("Failed to load coding window config");
  }
  return JSON.parse(result.data);
}

export async function saveCodingWindowConfig(config: any): Promise<void> {
  await callIpc(
    (api) => api.saveCodingWindowConfig(JSON.stringify(config)),
    "Failed to save coding window config"
  );
}

export async function resetCodingWindowConfig(): Promise<any> {
  const result = await callIpc(
    (api) => api.resetCodingWindowConfig(),
    "Failed to reset coding window config"
  );
  if (!result.data) {
    throw new Error("Failed to reset coding window config");
  }
  return JSON.parse(result.data);
}

export async function getCodingWindowConfigPath(): Promise<string> {
  const result = await callIpc(
    (api) => api.getCodingWindowConfigPath(),
    "Failed to get config path"
  );
  if (!result.path) {
    throw new Error("Failed to get config path");
  }
  return result.path;
}

export async function getDatabasePath(): Promise<string> {
  const result = await callIpc(
    (api) => api.getDatabasePath(),
    "Failed to get database path"
  );
  if (!result.path) {
    throw new Error("Failed to get database path");
  }
  return result.path;
}

export async function openConfigDirectory(): Promise<void> {
  await callIpc(
    (api) => api.openConfigDirectory(),
    "Failed to open config directory"
  );
}

// Data browser operations
export async function dbListTables(): Promise<string[]> {
  const result = await callIpc((api) => api.dbListTables(), "Failed to list tables");
  if (!result.tables) {
    throw new Error("Failed to list tables");
  }
  return result.tables;
}

export async function dbGetTableSchema(tableName: string): Promise<TableSchema> {
  const result = await callIpc(
    (api) => api.dbGetTableSchema(tableName),
    "Failed to get table schema"
  );
  if (!result.schema) {
    throw new Error("Failed to get table schema");
  }
  return result.schema;
}

export async function dbGetTableData(
  tableName: string,
  options?: TableDataOptions
): Promise<{ rows: Row[]; totalCount: number }> {
  const result = await callIpc(
    (api) => api.dbGetTableData(tableName, options),
    "Failed to get table data"
  );
  return {
    rows: result.rows || [],
    totalCount: result.totalCount || 0,
  };
}

export async function dbGetRowCount(
  tableName: string,
  filters?: Record<string, any>
): Promise<number> {
  const result = await callIpc(
    (api) => api.dbGetRowCount(tableName, filters),
    "Failed to get row count"
  );
  return result.count || 0;
}

export async function dbGetRelatedData(
  tableName: string,
  rowId: RowId
): Promise<Record<string, Row[]>> {
  const result = await callIpc(
    (api) => api.dbGetRelatedData(tableName, rowId),
    "Failed to get related data"
  );
  return result.related || {};
}

export async function dbUpdateRow(
  tableName: string,
  rowId: RowId,
  columnUpdates: Row
): Promise<boolean> {
  const result = await callIpc(
    (api) => api.dbUpdateRow(tableName, rowId, columnUpdates),
    "Failed to update row"
  );
  return result.updated || false;
}

export async function dbDeleteRow(tableName: string, rowId: RowId): Promise<boolean> {
  const result = await callIpc(
    (api) => api.dbDeleteRow(tableName, rowId),
    "Failed to delete row"
  );
  return result.deleted || false;
}

export async function dbDeleteRows(tableName: string, rowIds: RowId[]): Promise<number> {
  const result = await callIpc(
    (api) => api.dbDeleteRows(tableName, rowIds),
    "Failed to delete rows"
  );
  return result.deletedCount || 0;
}

export async function dbInsertRow(
  tableName: string,
  rowData: Row
): Promise<number> {
  const result = await callIpc(
    (api) => api.dbInsertRow(tableName, rowData),
    "Failed to insert row"
  );
  return result.insertedId || 0;
}

// Button configuration management
export async function listButtonConfigs(): Promise<ButtonConfigSet[]> {
  const result = await callIpc(
    (api) => api.listButtonConfigs(),
    "Failed to list button configs"
  );
  return result.configs || [];
}

export async function getActiveButtonConfig(): Promise<{ config: ButtonConfigSet | null; buttons: Button[] }> {
  const result = await callIpc(
    (api) => api.getActiveButtonConfig(),
    "Failed to get active button config"
  );
  return {
    config: result.config || null,
    buttons: result.buttons || [],
  };
}

export async function createButtonConfig(name: string, description?: string): Promise<number> {
  const result = await callIpc(
    (api) => api.createButtonConfig(name, description),
    "Failed to create button config"
  );
  return result.configId || 0;
}

export async function setActiveButtonConfig(configId: number): Promise<void> {
  await callIpc(
    (api) => api.setActiveButtonConfig(configId),
    "Failed to set active button config"
  );
}

export async function deleteButtonConfig(configId: number): Promise<void> {
  await callIpc(
    (api) => api.deleteButtonConfig(configId),
    "Failed to delete button config"
  );
}

export async function duplicateButtonConfig(sourceConfigId: number, newName: string): Promise<number> {
  const result = await callIpc(
    (api) => api.duplicateButtonConfig(sourceConfigId, newName),
    "Failed to duplicate button config"
  );
  return result.configId || 0;
}
