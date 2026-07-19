// IPC handlers for native dialogs (close-tab / unsaved-config confirmation, XML export).
import { dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export function registerDialogHandlers({ registerHandler, getMainWindow }) {
  registerHandler('show-close-tab-dialog', async () => {
    const result = await dialog.showMessageBox(getMainWindow(), {
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'There are unsaved changes in this match.',
      detail: 'Do you want to save before closing?',
      buttons: ['Save and Close', 'Discard Changes', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
    });

    // Which button was clicked: 0 = Save and Close, 1 = Discard, 2 = Cancel
    return { success: true, response: result.response };
  });

  registerHandler('show-unsaved-config-dialog', async () => {
    const result = await dialog.showMessageBox(getMainWindow(), {
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes in the code window configuration.',
      detail: 'If you leave this page, your changes will be lost.',
      buttons: ['Discard Changes', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
    });

    // Which button was clicked: 0 = Discard Changes, 1 = Cancel
    return { success: true, response: result.response };
  });

  registerHandler('export-xml', async (_event, matchData, defaultFilename) => {
    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: 'Export Match as XML',
      defaultPath: path.join(os.homedir(), 'Documents', defaultFilename || 'match.xml'),
      filters: [
        { name: 'XML Files', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    // Electron's own dialog result uses the American "canceled" spelling;
    // our own return field below is ours to name and uses "cancelled".
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, matchData, 'utf8');
      return { success: true, filePath: result.filePath };
    }

    return { success: false, cancelled: true };
  });
}
