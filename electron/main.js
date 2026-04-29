import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as os from 'os';
import { MatchDatabase } from './database.js';
import { DatabaseMigration } from './migration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let database = null;
let migration = null;

// Get settings file path
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

// Load settings synchronously
function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return null;
}

// Get matches directory for migration (legacy)
function getMatchesDir() {
  const settings = loadSettings();
  
  // Check for legacy autosaveDirectory setting
  if (settings && settings.autosaveDirectory) {
    // Expand ~ to home directory
    let dirPath = settings.autosaveDirectory;
    if (dirPath.startsWith('~/')) {
      dirPath = path.join(os.homedir(), dirPath.slice(2));
    } else if (dirPath === '~') {
      dirPath = os.homedir();
    }
    return dirPath;
  }
  
  // Default fallback
  const homeDir = os.homedir();
  return path.join(homeDir, 'Documents', 'Richmond Hockey Club', 'matches');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    transparent: true,
    vibrancy: 'under-window',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../build/icon.icns'),
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create native macOS menu
function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { label: `About ${app.name}`, role: 'about' },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => mainWindow?.webContents.send('navigate-to-settings') },
        { type: 'separator' },
        { label: 'Services', role: 'services' },
        { type: 'separator' },
        { label: `Hide ${app.name}`, role: 'hide' },
        { label: 'Hide Others', role: 'hideOthers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: `Quit ${app.name}`, role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Match',
          accelerator: 'Cmd+N',
          click: () => mainWindow?.webContents.send('new-match'),
        },
        {
          label: 'Save Match',
          accelerator: 'Cmd+S',
          click: () => mainWindow?.webContents.send('save-match'),
        },
        { type: 'separator' },
        {
          label: 'Export XML',
          accelerator: 'Cmd+E',
          click: () => mainWindow?.webContents.send('export-match'),
        },
        { type: 'separator' },
        { label: 'Close Window', role: 'close', accelerator: 'Cmd+W' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', role: 'undo' },
        { label: 'Redo', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Select All', role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', role: 'resetZoom' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimise', role: 'minimize' },
        { label: 'Zoom', role: 'zoom' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for file operations (DUAL-WRITE MODE)
ipcMain.handle('save-match', async (_event, matchId, matchData) => {
  try {
    const match = JSON.parse(matchData);
    
    // Validate required fields
    if (!match.id || !match.date || !match.homeTeam || !match.awayTeam) {
      throw new Error('Invalid match: missing required fields');
    }
    
    // Write to database only
    database.saveMatch(match);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving match:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-match', async (_event, matchId) => {
  try {
    // Load from database only
    const match = database.loadMatch(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    return { success: true, data: JSON.stringify(match) };
  } catch (error) {
    console.error('Error loading match:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('list-matches', async () => {
  try {
    // Load from database only
    const matches = database.listMatches();
    const data = matches.map(match => JSON.stringify(match));
    return { success: true, data };
  } catch (error) {
    console.error('Error listing matches:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('delete-match', async (_event, matchId) => {
  try {
    // Delete from database
    database.deleteMatch(matchId);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting match:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('autosave-match', async (_event, matchData) => {
  try {
    const match = JSON.parse(matchData);
    
    // Save to database only
    database.saveAutosave('autosave', match);
    
    return { success: true };
  } catch (error) {
    console.error('Error autosaving match:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-autosave', async () => {
  try {
    // Load from database only
    const match = database.loadAutosave('autosave');
    return { success: true, data: match ? JSON.stringify(match) : null };
  } catch (error) {
    console.error('Error loading autosave:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('save-settings', async (_event, settingsData) => {
  try {
    const settings = JSON.parse(settingsData);
    
    // Validate settings
    if (!settings.defaultHomeTeam || 
        settings.defaultLeadMs === undefined || settings.defaultLagMs === undefined) {
      throw new Error('Invalid settings: missing required fields');
    }
    
    // Save to database only
    database.saveSettings(settings);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    // Load from database only
    const settings = database.loadSettings();
    return { success: true, data: settings ? JSON.stringify(settings) : null };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('export-xml', async (_event, matchData, defaultFilename) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Match as XML',
      defaultPath: path.join(os.homedir(), 'Documents', defaultFilename || 'match.xml'),
      filters: [
        { name: 'XML Files', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, matchData, 'utf8');
      return { success: true, filePath: result.filePath };
    }
    
    return { success: false, canceled: true };
  } catch (error) {
    console.error('Error exporting XML:', error);
    return { success: false, error: String(error) };
  }
});

// Coding window configuration handlers
ipcMain.handle('load-coding-window-config', async () => {
  try {
    const defaultConfigPath = app.isPackaged
      ? path.join(process.resourcesPath, 'default_coding_window.json')
      : path.join(__dirname, '../public/default_coding_window.json');
    
    // Load from database (normalized schema is single source of truth)
    let config = database.loadButtonConfig();
    
    // If not in database, load default and save to database
    if (!config) {
      if (fs.existsSync(defaultConfigPath)) {
        const defaultData = fs.readFileSync(defaultConfigPath, 'utf8');
        const defaultConfig = JSON.parse(defaultData);
        
        // Save default to database
        const buttonArray = defaultConfig.phase_buttons || defaultConfig.context_buttons || defaultConfig.termination_buttons 
          ? [...(defaultConfig.phase_buttons || []), ...(defaultConfig.context_buttons || []), ...(defaultConfig.termination_buttons || [])]
          : defaultConfig.buttons || [];
        
        // Get or create active config
        let activeConfig = database.getActiveButtonConfig();
        if (!activeConfig) {
          const configId = database.createButtonConfig('Default', 'Default button configuration');
          database.setActiveButtonConfig(configId);
          activeConfig = database.getActiveButtonConfig();
        }
        
        // Save to normalized schema (single source of truth)
        database.saveButtonConfig(activeConfig.id, buttonArray);
        
        config = buttonArray;
        console.log('Loaded and saved default coding window config to database');
      } else {
        return { success: false, error: 'No configuration file found' };
      }
    }
    
    // Convert button array back to config format if needed
    if (Array.isArray(config)) {
      // Separate buttons by type
      const phase_buttons = config.filter(btn => btn.type === 'phase');
      const context_buttons = config.filter(btn => btn.type === 'context');
      const termination_buttons = config.filter(btn => btn.type === 'termination');
      
      config = {
        phase_buttons,
        context_buttons,
        termination_buttons
      };
    }
    
    return { success: true, data: JSON.stringify(config) };
  } catch (error) {
    console.error('Error loading coding window config:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('save-coding-window-config', async (_event, configData) => {
  try {
    const config = JSON.parse(configData);
    
    // Accept new format with separate arrays or old format with single buttons array
    const hasNewFormat = config.phase_buttons || config.context_buttons || config.termination_buttons;
    const hasOldFormat = config.buttons;
    
    if (!hasNewFormat && !hasOldFormat) {
      throw new Error('Invalid config: button configuration arrays required');
    }
    
    // Validate arrays are actually arrays if they exist
    if (config.phase_buttons && !Array.isArray(config.phase_buttons)) {
      throw new Error('Invalid config: phase_buttons must be an array');
    }
    if (config.context_buttons && !Array.isArray(config.context_buttons)) {
      throw new Error('Invalid config: context_buttons must be an array');
    }
    if (config.termination_buttons && !Array.isArray(config.termination_buttons)) {
      throw new Error('Invalid config: termination_buttons must be an array');
    }
    if (config.buttons && !Array.isArray(config.buttons)) {
      throw new Error('Invalid config: buttons must be an array');
    }
    
    // Extract button array for database storage
    const buttonArray = hasNewFormat
      ? [...(config.phase_buttons || []), ...(config.context_buttons || []), ...(config.termination_buttons || [])]
      : config.buttons;
    
    // Get or create active config
    let activeConfig = database.getActiveButtonConfig();
    if (!activeConfig) {
      const configId = database.createButtonConfig('Default', 'Default button configuration');
      database.setActiveButtonConfig(configId);
      activeConfig = database.getActiveButtonConfig();
    }
    
    // Save to normalized schema (single source of truth)
    database.saveButtonConfig(activeConfig.id, buttonArray);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving coding window config:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('reset-coding-window-config', async () => {
  try {
    const defaultConfigPath = app.isPackaged
      ? path.join(process.resourcesPath, 'default_coding_window.json')
      : path.join(__dirname, '../public/default_coding_window.json');
    
    // Read default config
    if (!fs.existsSync(defaultConfigPath)) {
      return { success: false, error: 'Default configuration file not found' };
    }
    
    const defaultData = fs.readFileSync(defaultConfigPath, 'utf8');
    const defaultConfig = JSON.parse(defaultData);
    
    // Extract button array for database
    const buttonArray = defaultConfig.phase_buttons || defaultConfig.context_buttons || defaultConfig.termination_buttons 
      ? [...(defaultConfig.phase_buttons || []), ...(defaultConfig.context_buttons || []), ...(defaultConfig.termination_buttons || [])]
      : defaultConfig.buttons || [];
    
    // Get or create active config
    let activeConfig = database.getActiveButtonConfig();
    if (!activeConfig) {
      const configId = database.createButtonConfig('Default', 'Default button configuration');
      database.setActiveButtonConfig(configId);
      activeConfig = database.getActiveButtonConfig();
    }
    
    // Save to normalized schema (single source of truth)
    database.saveButtonConfig(activeConfig.id, buttonArray);
    
    return { success: true, data: JSON.stringify(defaultConfig) };
  } catch (error) {
    console.error('Error resetting coding window config:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('get-coding-window-config-path', async () => {
  try {
    const userConfigPath = path.join(app.getPath('userData'), 'coding_window.json');
    return { success: true, path: userConfigPath };
  } catch (error) {
    console.error('Error getting config path:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('open-config-directory', async () => {
  try {
    const userDataPath = app.getPath('userData');
    await shell.openPath(userDataPath);
    return { success: true };
  } catch (error) {
    console.error('Error opening config directory:', error);
    return { success: false, error: String(error) };
  }
});

// Button configuration management IPC handlers
ipcMain.handle('list-button-configs', async () => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const configs = database.listButtonConfigs();
    return { success: true, configs };
  } catch (error) {
    console.error('Error listing button configs:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('get-active-button-config', async () => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const config = database.getActiveButtonConfig();
    if (config) {
      const buttons = database.getButtons(config.id);
      return { success: true, config, buttons };
    }
    
    return { success: true, config: null, buttons: [] };
  } catch (error) {
    console.error('Error getting active button config:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('create-button-config', async (_event, name, description) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const configId = database.createButtonConfig(name, description);
    return { success: true, configId };
  } catch (error) {
    console.error('Error creating button config:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('set-active-button-config', async (_event, configId) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    database.setActiveButtonConfig(configId);
    return { success: true };
  } catch (error) {
    console.error('Error setting active button config:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('delete-button-config', async (_event, configId) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    database.deleteButtonConfig(configId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting button config:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('duplicate-button-config', async (_event, sourceConfigId, newName) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const sourceConfig = database.getButtonConfig(sourceConfigId);
    if (!sourceConfig) {
      return { success: false, error: 'Source configuration not found' };
    }
    
    // Create new config
    const newConfigId = database.createButtonConfig(
      newName,
      `Duplicated from ${sourceConfig.name}`
    );
    
    // Copy buttons
    const sourceButtons = database.getButtons(sourceConfigId);
    database.saveButtonConfig(newConfigId, sourceButtons);
    
    return { success: true, configId: newConfigId };
  } catch (error) {
    console.error('Error duplicating button config:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('get-database-path', async () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'matches.db');
    return { success: true, path: dbPath };
  } catch (error) {
    console.error('Error getting database path:', error);
    return { success: false, error: String(error) };
  }
});

// Migration IPC Handlers
ipcMain.handle('migrate-json-to-database', async () => {
  try {
    if (!migration) {
      return { success: false, error: 'Migration not initialized' };
    }
    
    console.log('Starting migration from JSON to database...');
    const results = migration.migrateMatches();
    console.log('Migration results:', results);
    
    return { success: true, results };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('migrate-settings-to-database', async () => {
  try {
    if (!migration) {
      return { success: false, error: 'Migration not initialized' };
    }
    
    const settingsPath = getSettingsPath();
    const result = migration.migrateSettings(settingsPath);
    return result;
  } catch (error) {
    console.error('Settings migration failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('backup-json-files', async () => {
  try {
    if (!migration) {
      return { success: false, error: 'Migration not initialized' };
    }
    
    const backupDir = path.join(app.getPath('userData'), 'backups');
    const result = migration.createBackup(backupDir);
    return result;
  } catch (error) {
    console.error('Backup failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('verify-migration', async () => {
  try {
    if (!migration) {
      return { success: false, error: 'Migration not initialized' };
    }
    
    const results = migration.verifyMigration();
    return { success: true, results };
  } catch (error) {
    console.error('Verification failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('get-database-stats', async () => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const stats = database.getStats();
    return { success: true, stats };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('migrate-autosaves-to-database', async (_event, autosaveDir) => {
  try {
    if (!migration) {
      return { success: false, error: 'Migration not initialized' };
    }
    
    console.log('Starting autosave migration...');
    const results = migration.migrateAutosaves(autosaveDir);
    console.log('Autosave migration results:', results);
    
    return { success: true, results };
  } catch (error) {
    console.error('Autosave migration failed:', error);
    return { success: false, error: String(error) };
  }
});

// Data Browser IPC handlers
ipcMain.handle('db:list-tables', async () => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const tables = database.listTables();
    return { success: true, tables };
  } catch (error) {
    console.error('Failed to list tables:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:get-table-schema', async (_event, tableName) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const schema = database.getTableSchema(tableName);
    return { success: true, schema };
  } catch (error) {
    console.error(`Failed to get schema for ${tableName}:`, error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:get-table-data', async (_event, tableName, options) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const rows = database.getTableData(tableName, options);
    const totalCount = database.getRowCount(tableName, options.filters || {});
    return { success: true, rows, totalCount };
  } catch (error) {
    console.error(`Failed to get data for ${tableName}:`, error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:get-row-count', async (_event, tableName, filters) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const count = database.getRowCount(tableName, filters || {});
    return { success: true, count };
  } catch (error) {
    console.error(`Failed to get row count for ${tableName}:`, error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:get-related-data', async (_event, tableName, rowId) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const related = database.getRelatedData(tableName, rowId);
    return { success: true, related };
  } catch (error) {
    console.error(`Failed to get related data for ${tableName}:`, error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:update-row', async (_event, tableName, rowId, columnUpdates) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const updated = database.updateTableRow(tableName, rowId, columnUpdates);
    return { success: true, updated };
  } catch (error) {
    console.error(`Failed to update row in ${tableName}:`, error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:delete-row', async (_event, tableName, rowId) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const deleted = database.deleteTableRow(tableName, rowId);
    return { success: true, deleted };
  } catch (error) {
    console.error(`Failed to delete row from ${tableName}:`, error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:delete-rows', async (_event, tableName, rowIds) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const deletedCount = database.deleteTableRows(tableName, rowIds);
    return { success: true, deletedCount };
  } catch (error) {
    console.error(`Failed to delete rows from ${tableName}:`, error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:insert-row', async (_event, tableName, rowData) => {
  try {
    if (!database) {
      return { success: false, error: 'Database not initialised' };
    }
    
    const insertedId = database.insertTableRow(tableName, rowData);
    return { success: true, insertedId };
  } catch (error) {
    console.error(`Failed to insert row into ${tableName}:`, error);
    return { success: false, error: String(error) };
  }
});

// App lifecycle
app.whenReady().then(() => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'matches.db');
  console.log('Initialising database at:', dbPath);
  database = new MatchDatabase(dbPath);
  console.log('Database initialized successfully');
  
  // Initialize migration helper
  const matchesDir = getMatchesDir();
  migration = new DatabaseMigration(database, matchesDir);
  console.log('Migration helper initialized');
  
  // Auto-migrate autosave files on startup
  console.log('Checking for autosave files to migrate...');
  const autosaveDirs = [
    matchesDir,
    path.join(__dirname, '../.autosave'),
    path.join(process.cwd(), '.autosave'),
  ];
  
  let totalMigrated = 0;
  for (const dir of autosaveDirs) {
    if (fs.existsSync(dir)) {
      const results = migration.migrateAutosaves(dir);
      totalMigrated += results.success;
    }
  }
  
  if (totalMigrated > 0) {
    console.log(`Auto-migrated ${totalMigrated} autosave file(s)`);
  }
  
  // Auto-migrate coding window config if not in database or if missing metadata
  console.log('Checking button config migration status...');
  const migrationResult = database.migrateButtonConfig();
  
  if (migrationResult.migrated) {
    console.log('Button config migrated from legacy schema');
  } else if (migrationResult.reason === 'Already migrated') {
    console.log('Button config already up to date');
  } else if (migrationResult.reason === 'No legacy config') {
    // Try to load from database or JSON file
    const existingConfig = database.loadButtonConfig();
    if (!existingConfig) {
      const userConfigPath = path.join(app.getPath('userData'), 'coding_window.json');
      if (fs.existsSync(userConfigPath)) {
        try {
          const data = fs.readFileSync(userConfigPath, 'utf8');
          const config = JSON.parse(data);
          
          // Extract button array for database
          const buttonArray = config.phase_buttons || config.context_buttons || config.termination_buttons 
            ? [...(config.phase_buttons || []), ...(config.context_buttons || []), ...(config.termination_buttons || [])]
            : config.buttons || [];
          
          // Create default config and save buttons
          const configId = database.createButtonConfig('Default', 'Imported from JSON configuration');
          database.setActiveButtonConfig(configId);
          database.saveButtonConfig(configId, buttonArray);
          console.log('Migrated coding window config from JSON to database');
        } catch (error) {
          console.error('Error migrating coding window config:', error);
        }
      }
    }
  }
  
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('quit', () => {
  if (database) {
    console.log('Closing database connection');
    database.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
