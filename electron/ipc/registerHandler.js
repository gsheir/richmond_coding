import { ipcMain } from 'electron';

// Wraps ipcMain.handle with the try/catch/{success,error} shape and the
// "not ready yet" guards that were previously repeated in every handler.
export function createRegisterHandler({ getDatabase, getMigration } = {}) {
  return function registerHandler(channel, handler, { requireDatabase = false, requireMigration = false } = {}) {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        if (requireDatabase && !getDatabase()) {
          return { success: false, error: 'Database not initialised' };
        }
        if (requireMigration && !getMigration()) {
          return { success: false, error: 'Migration not initialised' };
        }
        return await handler(event, ...args);
      } catch (error) {
        console.error(`Error handling '${channel}':`, error);
        return { success: false, error: String(error) };
      }
    });
  };
}
