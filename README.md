# Richmond Hockey Coding App

This is a bespoke sports coding app for live or retrospective event data collection. 

## Running the App

### Development
```bash
npm run dev:electron
```

This starts the Vite dev server and Electron in development mode with hot reload.

### Build Native App
```bash
npm run build:mac
```

This creates a `.dmg` installer in the `release/` directory.



## Configuring the Code Window

The app provides a visual configuration editor in the Settings page where you can:
- Add, edit, and delete coding buttons
- Drag buttons to reposition them
- Customise colours, styling, and hotkeys
- Configure lead/lag times for video clips

Configuration is stored in JSON format at:
`~/Library/Application Support/Richmond Hockey Club/coding_window.json`

You can also edit this file manually if preferred. Click "Open Directory" in the Settings page to access it.

