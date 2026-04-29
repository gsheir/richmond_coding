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
  
  exportXML: (matchData, defaultFilename) =>
    ipcRenderer.invoke('export-xml', matchData, defaultFilename),

  // Settings operations
  saveSettings: (settingsData) =>
    ipcRenderer.invoke('save-settings', settingsData),
  
  loadSettings: () =>
    ipcRenderer.invoke('load-settings'),

  // Coding window configuration operations
  loadCodingWindowConfig: () =>
    ipcRenderer.invoke('load-coding-window-config'),
  
  saveCodingWindowConfig: (configData) =>
    ipcRenderer.invoke('save-coding-window-config', configData),
  
  resetCodingWindowConfig: () =>
    ipcRenderer.invoke('reset-coding-window-config'),
  
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
    ipcRenderer.invoke('db:list-tables'),
  
  dbGetTableSchema: (tableName) =>
    ipcRenderer.invoke('db:get-table-schema', tableName),
  
  dbGetTableData: (tableName, options) =>
    ipcRenderer.invoke('db:get-table-data', tableName, options),
  
  dbGetRowCount: (tableName, filters) =>
    ipcRenderer.invoke('db:get-row-count', tableName, filters),
  
  dbGetRelatedData: (tableName, rowId) =>
    ipcRenderer.invoke('db:get-related-data', tableName, rowId),
  
  dbUpdateRow: (tableName, rowId, columnUpdates) =>
    ipcRenderer.invoke('db:update-row', tableName, rowId, columnUpdates),
  
  dbDeleteRow: (tableName, rowId) =>
    ipcRenderer.invoke('db:delete-row', tableName, rowId),
  
  dbDeleteRows: (tableName, rowIds) =>
    ipcRenderer.invoke('db:delete-rows', tableName, rowIds),
  
  dbInsertRow: (tableName, rowData) =>
    ipcRenderer.invoke('db:insert-row', tableName, rowData),

  // Button configuration management
  listButtonConfigs: () =>
    ipcRenderer.invoke('list-button-configs'),
  
  getActiveButtonConfig: () =>
    ipcRenderer.invoke('get-active-button-config'),
  
  createButtonConfig: (name, description) =>
    ipcRenderer.invoke('create-button-config', name, description),
  
  setActiveButtonConfig: (configId) =>
    ipcRenderer.invoke('set-active-button-config', configId),
  
  deleteButtonConfig: (configId) =>
    ipcRenderer.invoke('delete-button-config', configId),
  
  duplicateButtonConfig: (sourceConfigId, newName) =>
    ipcRenderer.invoke('duplicate-button-config', sourceConfigId, newName),

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
