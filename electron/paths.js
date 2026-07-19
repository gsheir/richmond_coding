// Shared userData-relative path helpers, kept in one place to avoid drift
// between the handlers that read/write each file.
import { app } from 'electron';
import * as path from 'path';

export function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function getDatabasePath() {
  return path.join(app.getPath('userData'), 'matches.db');
}

export function getUserConfigPath() {
  return path.join(app.getPath('userData'), 'coding_window.json');
}

export function getBackupsDir() {
  return path.join(app.getPath('userData'), 'backups');
}

export function getDefaultConfigPath(dirname) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'default_coding_window.json')
    : path.join(dirname, '../public/default_coding_window.json');
}
