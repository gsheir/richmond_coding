// IPC handlers for persisted app settings (default team/lead/lag).
export function registerSettingsHandlers({ registerHandler, getDatabase }) {
  registerHandler('save-settings', async (_event, settingsData) => {
    const settings = JSON.parse(settingsData);

    if (!settings.defaultHomeTeam ||
        settings.defaultLeadMs === undefined || settings.defaultLagMs === undefined) {
      throw new Error('Invalid settings: missing required fields');
    }

    getDatabase().saveSettings(settings);
    return { success: true };
  }, { requireDatabase: true });

  registerHandler('load-settings', async () => {
    const settings = getDatabase().loadSettings();
    return { success: true, data: settings ? JSON.stringify(settings) : null };
  }, { requireDatabase: true });
}
