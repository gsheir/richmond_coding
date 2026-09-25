// Helpers for the built-in code window template and guaranteeing a default window exists.
import * as fs from 'fs';
import { getDefaultConfigPath } from './paths.js';

// Reads default_coding_window.json and returns it as a flat button array
export function readTemplateButtons(database, dirname) {
  const templatePath = getDefaultConfigPath(dirname);
  if (!fs.existsSync(templatePath)) {
    throw new Error('Built-in code window template not found');
  }
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  return database.normalizeButtonArray(template);
}

// Ensures a default code window exists, creating one from the template if
// there are no windows at all. Returns the default window row.
export function ensureDefaultCodingWindow(database, dirname) {
  const existingDefault = database.getDefaultCodingWindow();
  if (existingDefault) return existingDefault;

  const windows = database.listCodingWindows();
  if (windows.length > 0) {
    database.setDefaultCodingWindow(windows[0].id);
    return database.getDefaultCodingWindow();
  }

  const windowId = database.createCodingWindow('Default', 'Created from the built-in template');
  database.setDefaultCodingWindow(windowId);
  try {
    database.saveButtonConfig(windowId, readTemplateButtons(database, dirname));
    console.log('Created default code window from built-in template');
  } catch (error) {
    console.error('Could not seed default code window:', error);
  }
  return database.getDefaultCodingWindow();
}
