// IPC handlers for managing named code windows (list/create/duplicate/rename/set default/delete).
import { getDatabasePath } from '../paths.js';
import { ensureDefaultCodingWindow, readTemplateButtons } from '../codingWindowTemplate.js';

export function registerButtonConfigHandlers({ registerHandler, getDatabase, dirname }) {
  registerHandler('list-coding-windows', async () => {
    const database = getDatabase();
    ensureDefaultCodingWindow(database, dirname);
    return { success: true, windows: database.listCodingWindows() };
  }, { requireDatabase: true });

  // source: 'blank', 'template', or the ID of a window to copy
  registerHandler('create-coding-window', async (_event, name, description, source) => {
    const database = getDatabase();

    let buttons = [];
    if (source === 'template') {
      buttons = readTemplateButtons(database, dirname);
    } else if (typeof source === 'number') {
      if (!database.getCodingWindow(source)) {
        throw new Error('Source code window not found');
      }
      buttons = database.getButtonsForWindow(source);
    }

    const create = database.db.transaction(() => {
      const windowId = database.createCodingWindow(name, description);
      database.saveButtonConfig(windowId, buttons);
      return windowId;
    });

    return { success: true, windowId: create() };
  }, { requireDatabase: true });

  registerHandler('duplicate-coding-window', async (_event, sourceWindowId) => {
    const database = getDatabase();
    const source = database.getCodingWindow(sourceWindowId);
    if (!source) {
      return { success: false, error: 'Source code window not found' };
    }

    const duplicate = database.db.transaction(() => {
      const windowId = database.createCodingWindow(
        database.getUniqueWindowName(source.name),
        source.description
      );
      database.saveButtonConfig(windowId, database.getButtonsForWindow(sourceWindowId));
      return windowId;
    });

    return { success: true, windowId: duplicate() };
  }, { requireDatabase: true });

  registerHandler('rename-coding-window', async (_event, windowId, name, description) => {
    getDatabase().renameCodingWindow(windowId, name, description);
    return { success: true };
  }, { requireDatabase: true });

  registerHandler('set-default-coding-window', async (_event, windowId) => {
    const database = getDatabase();
    if (!database.getCodingWindow(windowId)) {
      throw new Error('Code window not found');
    }
    database.setDefaultCodingWindow(windowId);
    return { success: true };
  }, { requireDatabase: true });

  registerHandler('delete-coding-window', async (_event, windowId) => {
    const reassignedCount = getDatabase().deleteCodingWindow(windowId);
    return { success: true, reassignedCount };
  }, { requireDatabase: true });

  registerHandler('get-database-path', async () => {
    return { success: true, path: getDatabasePath() };
  });
}
