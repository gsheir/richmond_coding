import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

// Get matches directory
function getMatchesDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, 'Documents', 'Richmond Hockey Club', 'matches');
}

// Ensure matches directory exists
function ensureMatchesDir() {
  const matchesDir = getMatchesDir();
  if (!fs.existsSync(matchesDir)) {
    fs.mkdirSync(matchesDir, { recursive: true });
  }
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
      preload: path.join(__dirname, 'preload.js'),
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

// IPC Handlers for file operations
ipcMain.handle('save-match', async (_event, matchId, matchData) => {
  try {
    ensureMatchesDir();
    const filePath = path.join(getMatchesDir(), `${matchId}.json`);
    fs.writeFileSync(filePath, matchData, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving match:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-match', async (_event, matchId) => {
  try {
    const filePath = path.join(getMatchesDir(), `${matchId}.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    console.error('Error loading match:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('list-matches', async () => {
  try {
    ensureMatchesDir();
    const matchesDir = getMatchesDir();
    const files = fs.readdirSync(matchesDir);
    
    const matches = files
      .filter(file => file.endsWith('.json') && !file.startsWith('.'))
      .map(file => {
        try {
          const content = fs.readFileSync(path.join(matchesDir, file), 'utf8');
          return content;
        } catch {
          return null;
        }
      })
      .filter(content => content !== null);
    
    return { success: true, data: matches };
  } catch (error) {
    console.error('Error listing matches:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('delete-match', async (_event, matchId) => {
  try {
    const filePath = path.join(getMatchesDir(), `${matchId}.json`);
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting match:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('autosave-match', async (_event, matchData) => {
  try {
    ensureMatchesDir();
    const filePath = path.join(getMatchesDir(), '.autosave.json');
    fs.writeFileSync(filePath, matchData, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error autosaving match:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-autosave', async () => {
  try {
    const filePath = path.join(getMatchesDir(), '.autosave.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error loading autosave:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('export-xml', async (_event, matchData) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Match as XML',
      defaultPath: path.join(os.homedir(), 'Documents', 'match.xml'),
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

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
