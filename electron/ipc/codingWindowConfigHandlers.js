// IPC handlers for a code window's button layout (load/save/reset/path).
import { app, shell } from 'electron';
import { getUserConfigPath } from '../paths.js';
import { ensureDefaultCodingWindow, readTemplateButtons } from '../codingWindowTemplate.js';

// Convert a flat button array to the phase/context/termination/point_event shape the UI expects
function toCategorisedConfig(buttons) {
  return {
    phase_buttons: buttons.filter((btn) => btn.type === 'phase'),
    context_buttons: buttons.filter((btn) => btn.type === 'context'),
    termination_buttons: buttons.filter((btn) => btn.type === 'termination'),
    point_event_buttons: buttons.filter((btn) => btn.type === 'point_event'),
  };
}

export function registerCodingWindowConfigHandlers({ registerHandler, getDatabase, dirname }) {
  // Loads the given window's buttons, or the default window's if no ID is given
  registerHandler('load-coding-window-config', async (_event, windowId) => {
    const database = getDatabase();
    const targetId = windowId ?? ensureDefaultCodingWindow(database, dirname).id;

    const buttons = database.loadButtonConfig(targetId);
    if (!buttons) {
      return { success: false, error: 'Code window not found' };
    }

    return { success: true, data: JSON.stringify(toCategorisedConfig(buttons)) };
  }, { requireDatabase: true });

  registerHandler('save-coding-window-config', async (_event, windowId, configData) => {
    const database = getDatabase();
    if (!database.getCodingWindow(windowId)) {
      throw new Error('Code window not found');
    }

    const config = JSON.parse(configData);

    const hasNewFormat = config.phase_buttons || config.context_buttons || config.termination_buttons || config.point_event_buttons;
    const hasOldFormat = config.buttons;
    if (!hasNewFormat && !hasOldFormat) {
      throw new Error('Invalid config: button configuration arrays required');
    }
    for (const key of ['phase_buttons', 'context_buttons', 'termination_buttons', 'point_event_buttons', 'buttons']) {
      if (config[key] && !Array.isArray(config[key])) {
        throw new Error(`Invalid config: ${key} must be an array`);
      }
    }

    database.saveButtonConfig(windowId, database.normalizeButtonArray(config));
    return { success: true };
  }, { requireDatabase: true });

  // Replaces the given window's buttons with the built-in template
  registerHandler('reset-coding-window-config', async (_event, windowId) => {
    const database = getDatabase();
    if (!database.getCodingWindow(windowId)) {
      throw new Error('Code window not found');
    }

    const buttons = readTemplateButtons(database, dirname);
    database.saveButtonConfig(windowId, buttons);

    return { success: true, data: JSON.stringify(toCategorisedConfig(database.loadButtonConfig(windowId))) };
  }, { requireDatabase: true });

  registerHandler('get-coding-window-config-path', async () => {
    return { success: true, path: getUserConfigPath() };
  });

  registerHandler('open-config-directory', async () => {
    await shell.openPath(app.getPath('userData'));
    return { success: true };
  });
}
