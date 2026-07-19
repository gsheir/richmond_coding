// IPC handlers for the coding-window button configuration (load/save/reset/path).
import { app, shell } from 'electron';
import * as fs from 'fs';
import { getDefaultConfigPath, getUserConfigPath } from '../paths.js';

export function registerCodingWindowConfigHandlers({ registerHandler, getDatabase, dirname }) {
  registerHandler('load-coding-window-config', async () => {
    const database = getDatabase();
    let config = database.loadButtonConfig();

    if (!config) {
      const defaultConfigPath = getDefaultConfigPath(dirname);
      if (!fs.existsSync(defaultConfigPath)) {
        return { success: false, error: 'No configuration file found' };
      }

      const defaultData = fs.readFileSync(defaultConfigPath, 'utf8');
      const defaultConfig = JSON.parse(defaultData);
      const buttonArray = database.normalizeButtonArray(defaultConfig);

      const activeConfig = database.getOrCreateActiveConfig();
      database.saveButtonConfig(activeConfig.id, buttonArray);

      config = buttonArray;
      console.log('Loaded and saved default coding window config to database');
    }

    // Convert flat button array back to the phase/context/termination shape the UI expects
    if (Array.isArray(config)) {
      config = {
        phase_buttons: config.filter((btn) => btn.type === 'phase'),
        context_buttons: config.filter((btn) => btn.type === 'context'),
        termination_buttons: config.filter((btn) => btn.type === 'termination'),
      };
    }

    return { success: true, data: JSON.stringify(config) };
  }, { requireDatabase: true });

  registerHandler('save-coding-window-config', async (_event, configData) => {
    const database = getDatabase();
    const config = JSON.parse(configData);

    const hasNewFormat = config.phase_buttons || config.context_buttons || config.termination_buttons;
    const hasOldFormat = config.buttons;
    if (!hasNewFormat && !hasOldFormat) {
      throw new Error('Invalid config: button configuration arrays required');
    }
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

    const buttonArray = database.normalizeButtonArray(config);
    const activeConfig = database.getOrCreateActiveConfig();
    database.saveButtonConfig(activeConfig.id, buttonArray);

    return { success: true };
  }, { requireDatabase: true });

  registerHandler('reset-coding-window-config', async () => {
    const database = getDatabase();
    const defaultConfigPath = getDefaultConfigPath(dirname);

    if (!fs.existsSync(defaultConfigPath)) {
      return { success: false, error: 'Default configuration file not found' };
    }

    const defaultData = fs.readFileSync(defaultConfigPath, 'utf8');
    const defaultConfig = JSON.parse(defaultData);
    const buttonArray = database.normalizeButtonArray(defaultConfig);

    const activeConfig = database.getOrCreateActiveConfig();
    database.saveButtonConfig(activeConfig.id, buttonArray);

    return { success: true, data: JSON.stringify(defaultConfig) };
  }, { requireDatabase: true });

  registerHandler('get-coding-window-config-path', async () => {
    return { success: true, path: getUserConfigPath() };
  });

  registerHandler('open-config-directory', async () => {
    await shell.openPath(app.getPath('userData'));
    return { success: true };
  });
}
