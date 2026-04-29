// Type definitions for Electron API exposed via preload script

// Data browser types
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

// Button configuration types
export interface ButtonConfig {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Button {
  id: number;
  config_id: number;
  key: string;
  label: string;
  code: string;
  category: string | null;
  colour: string;
  hotkey: string | null;
  sort_order: number;
  created_at: string;
}

interface ElectronAPI {
  saveMatch: (matchId: string, matchData: string) => Promise<{ success: boolean; error?: string }>;
  loadMatch: (matchId: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  listMatches: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
  deleteMatch: (matchId: string) => Promise<{ success: boolean; error?: string }>;
  autosaveMatch: (matchData: string) => Promise<{ success: boolean; error?: string }>;
  loadAutosave: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  exportXML: (matchData: string, defaultFilename: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  saveSettings: (settingsData: string) => Promise<{ success: boolean; error?: string }>;
  loadSettings: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  loadCodingWindowConfig: () => Promise<{ success: boolean; data?: string; error?: string }>;
  saveCodingWindowConfig: (configData: string) => Promise<{ success: boolean; error?: string }>;
  resetCodingWindowConfig: () => Promise<{ success: boolean; data?: string; error?: string }>;
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
  // Button configuration management
  listButtonConfigs: () => Promise<{ success: boolean; configs?: ButtonConfig[]; error?: string }>;
  getActiveButtonConfig: () => Promise<{ success: boolean; config?: ButtonConfig | null; buttons?: Button[]; error?: string }>;
  createButtonConfig: (name: string, description?: string) => Promise<{ success: boolean; configId?: number; error?: string }>;
  setActiveButtonConfig: (configId: number) => Promise<{ success: boolean; error?: string }>;
  deleteButtonConfig: (configId: number) => Promise<{ success: boolean; error?: string }>;
  duplicateButtonConfig: (sourceConfigId: number, newName: string) => Promise<{ success: boolean; configId?: number; error?: string }>;
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
