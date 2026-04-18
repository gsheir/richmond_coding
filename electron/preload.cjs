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
