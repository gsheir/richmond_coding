// IPC handlers for one-off JSON-to-database migration and backup utilities.
import { getSettingsPath, getBackupsDir } from '../paths.js';

export function registerMigrationHandlers({ registerHandler, getDatabase, getMigration }) {
  registerHandler('migrate-json-to-database', async () => {
    console.log('Starting migration from JSON to database...');
    const results = getMigration().migrateMatches();
    console.log('Migration results:', results);
    return { success: true, results };
  }, { requireMigration: true });

  registerHandler('migrate-settings-to-database', async () => {
    return getMigration().migrateSettings(getSettingsPath());
  }, { requireMigration: true });

  registerHandler('backup-json-files', async () => {
    return getMigration().createBackup(getBackupsDir());
  }, { requireMigration: true });

  registerHandler('verify-migration', async () => {
    const results = getMigration().verifyMigration();
    return { success: true, results };
  }, { requireMigration: true });

  registerHandler('get-database-stats', async () => {
    const stats = getDatabase().getStats();
    return { success: true, stats };
  }, { requireDatabase: true });

  registerHandler('migrate-autosaves-to-database', async (_event, autosaveDir) => {
    console.log('Starting autosave migration...');
    const results = getMigration().migrateAutosaves(autosaveDir);
    console.log('Autosave migration results:', results);
    return { success: true, results };
  }, { requireMigration: true });
}
