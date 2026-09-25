const { contextBridge, ipcRenderer } = require('electron');

// Define the API surface
const electronAPI = {
  // Match operations
  saveMatch: (matchId, matchData) =>
    ipcRenderer.invoke('save-match', matchId, matchData),
  
  loadMatch: (matchId) =>
    ipcRenderer.invoke('load-match', matchId),
  
  listMatches: () =>
    ipcRenderer.invoke('list-matches'),
  
  deleteMatch: (matchId) =>
    ipcRenderer.invoke('delete-match', matchId),
  
  autosaveMatch: (matchData) =>
    ipcRenderer.invoke('autosave-match', matchData),
  
  loadAutosave: () =>
    ipcRenderer.invoke('load-autosave'),
  
  showCloseTabDialog: () =>
    ipcRenderer.invoke('show-close-tab-dialog'),

  showUnsavedConfigDialog: () =>
    ipcRenderer.invoke('show-unsaved-config-dialog'),
  
  exportXML: (matchData, defaultFilename) =>
    ipcRenderer.invoke('export-xml', matchData, defaultFilename),

  // Settings operations
  saveSettings: (settingsData) =>
    ipcRenderer.invoke('save-settings', settingsData),
  
  loadSettings: () =>
    ipcRenderer.invoke('load-settings'),

  // Coding window configuration operations
  loadCodingWindowConfig: (windowId) =>
    ipcRenderer.invoke('load-coding-window-config', windowId),
  
  saveCodingWindowConfig: (windowId, configData) =>
    ipcRenderer.invoke('save-coding-window-config', windowId, configData),
  
  resetCodingWindowConfig: (windowId) =>
    ipcRenderer.invoke('reset-coding-window-config', windowId),
  
  getCodingWindowConfigPath: () =>
    ipcRenderer.invoke('get-coding-window-config-path'),
  
  openConfigDirectory: () =>
    ipcRenderer.invoke('open-config-directory'),
  
  getDatabasePath: () =>
    ipcRenderer.invoke('get-database-path'),

  // Migration and database operations
  migrateJsonToDatabase: () =>
    ipcRenderer.invoke('migrate-json-to-database'),
  
  migrateSettingsToDatabase: () =>
    ipcRenderer.invoke('migrate-settings-to-database'),
  
  backupJsonFiles: () =>
    ipcRenderer.invoke('backup-json-files'),
  
  verifyMigration: () =>
    ipcRenderer.invoke('verify-migration'),
  
  getDatabaseStats: () =>
    ipcRenderer.invoke('get-database-stats'),
  
  migrateAutosavesToDatabase: (autosaveDir) =>
    ipcRenderer.invoke('migrate-autosaves-to-database', autosaveDir),

  // Data browser operations
  dbListTables: () =>
    ipcRenderer.invoke('list-tables'),

  dbGetTableSchema: (tableName) =>
    ipcRenderer.invoke('get-table-schema', tableName),

  dbGetTableData: (tableName, options) =>
    ipcRenderer.invoke('get-table-data', tableName, options),

  dbGetRowCount: (tableName, filters) =>
    ipcRenderer.invoke('get-row-count', tableName, filters),

  dbGetRelatedData: (tableName, rowId) =>
    ipcRenderer.invoke('get-related-data', tableName, rowId),

  dbUpdateRow: (tableName, rowId, columnUpdates) =>
    ipcRenderer.invoke('update-table-row', tableName, rowId, columnUpdates),

  dbDeleteRow: (tableName, rowId) =>
    ipcRenderer.invoke('delete-table-row', tableName, rowId),

  dbDeleteRows: (tableName, rowIds) =>
    ipcRenderer.invoke('delete-table-rows', tableName, rowIds),

  dbInsertRow: (tableName, rowData) =>
    ipcRenderer.invoke('insert-table-row', tableName, rowData),

  // Code window management
  listCodingWindows: () =>
    ipcRenderer.invoke('list-coding-windows'),

  createCodingWindow: (name, description, source) =>
    ipcRenderer.invoke('create-coding-window', name, description, source),

  duplicateCodingWindow: (sourceWindowId) =>
    ipcRenderer.invoke('duplicate-coding-window', sourceWindowId),

  renameCodingWindow: (windowId, name, description) =>
    ipcRenderer.invoke('rename-coding-window', windowId, name, description),

  setDefaultCodingWindow: (windowId) =>
    ipcRenderer.invoke('set-default-coding-window', windowId),

  deleteCodingWindow: (windowId) =>
    ipcRenderer.invoke('delete-coding-window', windowId),

  // Menu event listeners
  onNavigateToSettings: (callback) => {
    ipcRenderer.on('navigate-to-settings', callback);
  },
  
  onNewMatch: (callback) => {
    ipcRenderer.on('new-match', callback);
  },
  
  onSaveMatch: (callback) => {
    ipcRenderer.on('save-match', callback);
  },
  
  onExportMatch: (callback) => {
    ipcRenderer.on('export-match', callback);
  },
};

// Expose protected methods in the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
