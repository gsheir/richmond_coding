// IPC handlers for named button-configuration-set management (list/create/switch/delete/duplicate).
import { getDatabasePath } from '../paths.js';

export function registerButtonConfigHandlers({ registerHandler, getDatabase }) {
  registerHandler('list-button-configs', async () => {
    const configs = getDatabase().listButtonConfigs();
    return { success: true, configs };
  }, { requireDatabase: true });

  registerHandler('get-active-button-config', async () => {
    const database = getDatabase();
    const config = database.getActiveButtonConfig();
    if (config) {
      const buttons = database.getButtons(config.id);
      return { success: true, config, buttons };
    }
    return { success: true, config: null, buttons: [] };
  }, { requireDatabase: true });

  registerHandler('create-button-config', async (_event, name, description) => {
    const configId = getDatabase().createButtonConfig(name, description);
    return { success: true, configId };
  }, { requireDatabase: true });

  registerHandler('set-active-button-config', async (_event, configId) => {
    getDatabase().setActiveButtonConfig(configId);
    return { success: true };
  }, { requireDatabase: true });

  registerHandler('delete-button-config', async (_event, configId) => {
    getDatabase().deleteButtonConfig(configId);
    return { success: true };
  }, { requireDatabase: true });

  registerHandler('duplicate-button-config', async (_event, sourceConfigId, newName) => {
    const database = getDatabase();
    const sourceConfig = database.getButtonConfig(sourceConfigId);
    if (!sourceConfig) {
      return { success: false, error: 'Source configuration not found' };
    }

    const newConfigId = database.createButtonConfig(newName, `Duplicated from ${sourceConfig.name}`);
    const sourceButtons = database.getButtons(sourceConfigId);
    database.saveButtonConfig(newConfigId, sourceButtons);

    return { success: true, configId: newConfigId };
  }, { requireDatabase: true });

  registerHandler('get-database-path', async () => {
    return { success: true, path: getDatabasePath() };
  });
}
