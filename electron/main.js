import { app, BrowserWindow, Menu, shell } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as os from 'os';
import { MatchDatabase } from './database.js';
import { DatabaseMigration } from './migration.js';
import { getSettingsPath, getDatabasePath, getUserConfigPath } from './paths.js';
import { createRegisterHandler } from './ipc/registerHandler.js';
import { registerMatchHandlers } from './ipc/matchHandlers.js';
import { registerDialogHandlers } from './ipc/dialogHandlers.js';
import { registerSettingsHandlers } from './ipc/settingsHandlers.js';
import { registerCodingWindowConfigHandlers } from './ipc/codingWindowConfigHandlers.js';
import { registerButtonConfigHandlers } from './ipc/buttonConfigHandlers.js';
import { registerMigrationHandlers } from './ipc/migrationHandlers.js';
import { registerDataBrowserHandlers } from './ipc/dataBrowserHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let database = null;
let migration = null;

const getDatabase = () => database;
const getMigration = () => migration;
const getMainWindow = () => mainWindow;

// Load settings synchronously (used before the database exists, for legacy migration lookup)
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

// Register all IPC handlers, grouped by domain
const registerHandler = createRegisterHandler({ getDatabase, getMigration });
registerMatchHandlers({ registerHandler, getDatabase });
registerDialogHandlers({ registerHandler, getMainWindow });
registerSettingsHandlers({ registerHandler, getDatabase });
registerCodingWindowConfigHandlers({ registerHandler, getDatabase, dirname: __dirname });
registerButtonConfigHandlers({ registerHandler, getDatabase });
registerMigrationHandlers({ registerHandler, getDatabase, getMigration });
registerDataBrowserHandlers({ registerHandler, getDatabase });

// App lifecycle
app.whenReady().then(() => {
  // Initialise database
  const dbPath = getDatabasePath();
  console.log('Initialising database at:', dbPath);
  database = new MatchDatabase(dbPath);
  console.log('Database initialised successfully');

  // Initialise migration helper
  const matchesDir = getMatchesDir();
  migration = new DatabaseMigration(database, matchesDir);
  console.log('Migration helper initialised');

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
      const userConfigPath = getUserConfigPath();
      if (fs.existsSync(userConfigPath)) {
        try {
          const data = fs.readFileSync(userConfigPath, 'utf8');
          const config = JSON.parse(data);
          const buttonArray = database.normalizeButtonArray(config);

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
