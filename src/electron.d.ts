// Type definitions for Electron API exposed via preload script

// Data browser types
export type Row = Record<string, unknown>;
export type RowId = string | number;

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: any;
  isPrimaryKey: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface TableSchema {
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
}

export interface TableDataOptions {
  limit?: number;
  offset?: number;
  orderBy?: string | null;
  orderDir?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

// Code window types

// A saved, named code window (the `button_configs` table row plus usage count)
export interface CodingWindowRow {
  id: number;
  name: string;
  description: string | null;
  is_default: number;
  match_count: number;
  created_at: string;
  updated_at: string;
}

// Where a new code window's buttons come from: nothing, the built-in template, or another window's ID
export type CodingWindowSource = "blank" | "template" | number;

interface ElectronAPI {
  saveMatch: (matchId: string, matchData: string) => Promise<{ success: boolean; error?: string }>;
  loadMatch: (matchId: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  listMatches: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
  deleteMatch: (matchId: string) => Promise<{ success: boolean; error?: string }>;
  autosaveMatch: (matchData: string) => Promise<{ success: boolean; error?: string }>;
  loadAutosave: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  showCloseTabDialog: () => Promise<{ success: boolean; response?: number; error?: string }>;
  showUnsavedConfigDialog: () => Promise<{ success: boolean; response?: number; error?: string }>;
  exportXML: (matchData: string, defaultFilename: string) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
  saveSettings: (settingsData: string) => Promise<{ success: boolean; error?: string }>;
  loadSettings: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  loadCodingWindowConfig: (windowId?: number) => Promise<{ success: boolean; data?: string; error?: string }>;
  saveCodingWindowConfig: (windowId: number, configData: string) => Promise<{ success: boolean; error?: string }>;
  resetCodingWindowConfig: (windowId: number) => Promise<{ success: boolean; data?: string; error?: string }>;
  getCodingWindowConfigPath: () => Promise<{ success: boolean; path?: string; error?: string }>;
  openConfigDirectory: () => Promise<{ success: boolean; error?: string }>;
  getDatabasePath: () => Promise<{ success: boolean; path?: string; error?: string }>;
  // Migration and database operations
  migrateJsonToDatabase: () => Promise<{ success: boolean; results?: any; error?: string }>;
  migrateSettingsToDatabase: () => Promise<{ success: boolean; message?: string; error?: string }>;
  backupJsonFiles: () => Promise<{ success: boolean; backupPath?: string; fileCount?: number; message?: string; error?: string }>;
  verifyMigration: () => Promise<{ success: boolean; results?: any; error?: string }>;
  getDatabaseStats: () => Promise<{ success: boolean; stats?: any; error?: string }>;
  migrateAutosavesToDatabase: (autosaveDir?: string) => Promise<{ success: boolean; results?: any; error?: string }>;
  // Data browser operations
  dbListTables: () => Promise<{ success: boolean; tables?: string[]; error?: string }>;
  dbGetTableSchema: (tableName: string) => Promise<{ success: boolean; schema?: TableSchema; error?: string }>;
  dbGetTableData: (tableName: string, options?: TableDataOptions) => Promise<{ success: boolean; rows?: any[]; totalCount?: number; error?: string }>;
  dbGetRowCount: (tableName: string, filters?: Record<string, any>) => Promise<{ success: boolean; count?: number; error?: string }>;
  dbGetRelatedData: (tableName: string, rowId: any) => Promise<{ success: boolean; related?: Record<string, any[]>; error?: string }>;
  dbUpdateRow: (tableName: string, rowId: any, columnUpdates: Record<string, any>) => Promise<{ success: boolean; updated?: boolean; error?: string }>;
  dbDeleteRow: (tableName: string, rowId: any) => Promise<{ success: boolean; deleted?: boolean; error?: string }>;
  dbDeleteRows: (tableName: string, rowIds: any[]) => Promise<{ success: boolean; deletedCount?: number; error?: string }>;
  dbInsertRow: (tableName: string, rowData: Record<string, any>) => Promise<{ success: boolean; insertedId?: number; error?: string }>;
  // Code window management
  listCodingWindows: () => Promise<{ success: boolean; windows?: CodingWindowRow[]; error?: string }>;
  createCodingWindow: (name: string, description: string | null, source: CodingWindowSource) => Promise<{ success: boolean; windowId?: number; error?: string }>;
  duplicateCodingWindow: (sourceWindowId: number) => Promise<{ success: boolean; windowId?: number; error?: string }>;
  renameCodingWindow: (windowId: number, name: string, description: string | null) => Promise<{ success: boolean; error?: string }>;
  setDefaultCodingWindow: (windowId: number) => Promise<{ success: boolean; error?: string }>;
  deleteCodingWindow: (windowId: number) => Promise<{ success: boolean; reassignedCount?: number; error?: string }>;
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
