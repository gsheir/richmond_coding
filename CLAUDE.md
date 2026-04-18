# **General instructions**

Where available, use thinking mode or verbalise your thought process before returning your response.

Make full use of markdown formatting in your reponse, including suitable headers. Do not create any additional markdown files to report progress or as a summary, display these in the chat window instead.

Always use British English, including in your responses, any code created (including file names, module names, function names etc.) and any documentation created. Use the Oxford style for any technical writing, including the use of the Oxford comma and using the en-dash with spaces around it: " – ".

## If asked to propose a solution

Respond to the following question types as indicated:

- "Describe the steps ...": Do not make any code changes. Do not return code snippets. Just describe the steps in detail so that they can be implemented by an AI agent or a human. Do not include estimates. Structure this preferably in stages that can be implemented separately.

If you are unclear on the requirements, clarify those before proposing solutions.

## If code changes are required

Read the full codebase before making any proposals or changes.

Always ask for user confirmation before making changes unless explicitly told to make changes.

If using logging, be concise rather than verbose. Do not use excessive formatting with dividers; newlines are sufficient.

Add only neccesary comments. Do not use excessive formatting with dividers; newlines are sufficient.

Provide a summary in the chat window after making the changes. If the changes are more than a few lines, comprehensively describe all changes in your summary.

# **Repo-specific instructions**

## Development Environment

### Running the application

**Do not run the app automatically after making changes.** Only run the development server if explicitly asked.

If you need to run the app:
- **Never use background/hidden terminals** (`isBackground: true`) – the app window popping up is disruptive
- Run in a visible VSCode terminal with `isBackground: false`
- Command: `npm run dev:electron`

The user will start/restart the app themselves when ready.

## TypeScript / React

This is an Electron + React + TypeScript project.

### Code structure

Always add imports to the top of the file, not halfway through.

Use functional components with hooks (not class components).

### Type safety

Use strict TypeScript. Avoid `any` types where possible.

Define proper interfaces for all data structures.

### State management

This project uses Zustand for global state. Check `src/lib/store.ts` before adding new state.

## Electron Architecture

### Main Process

The Electron main process lives in `electron/main.js` and handles:
- Window creation and management
- Native macOS menu bar
- File system operations (save, load, list, delete matches)
- Native dialogs (file save/open)
- IPC communication with renderer process

### Preload Script

The preload script (`electron/preload.cjs`) creates a secure bridge between the main and renderer processes using `contextBridge`. It exposes the `electronAPI` to the React frontend.

### Renderer Process

The React application runs in the renderer process and communicates with the main process via IPC calls through the `electronAPI` (see `src/lib/electron-api.ts`).

### Backend API

The `src/lib/electron-api.ts` file contains the Electron IPC bindings for match operations, settings persistence, and file exports.

## Native macOS Features

This app uses native macOS features:
- Hidden title bar with traffic light controls
- Native menu bar with keyboard shortcuts
- Native file dialogs
- Vibrancy effects
- Draggable title bar region

## Formatting

After making changes, let the user run formatters if needed. Do not run formatting commands automatically.
