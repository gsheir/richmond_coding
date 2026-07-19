// Timer/orchestration setup for the app store: clock display ticks, autosave,
// and periodic database saves. Kept out of store.ts so the store itself only
// has to call startAppLifecycleTimers() once during initialize().
const CLOCK_TICK_INTERVAL_MS = 100;
const AUTOSAVE_INTERVAL_MS = 10_000;
const DATABASE_SAVE_INTERVAL_MS = 300_000; // 5 minutes

interface LifecycleDeps {
  updateClockDisplays: () => void;
  getRunningTabIds: () => string[];
  autosaveTab: (tabId: string) => void;
  saveTabToDatabase: (tabId: string) => void;
}

let intervalHandles: ReturnType<typeof setInterval>[] = [];

// Starts the app's background timers, clearing any previously running set
// first so a repeated call (e.g. under HMR) can't stack duplicate intervals.
export function startAppLifecycleTimers(deps: LifecycleDeps): void {
  stopAppLifecycleTimers();

  intervalHandles.push(
    setInterval(() => deps.updateClockDisplays(), CLOCK_TICK_INTERVAL_MS)
  );

  intervalHandles.push(
    setInterval(() => {
      deps.getRunningTabIds().forEach((tabId) => deps.autosaveTab(tabId));
    }, AUTOSAVE_INTERVAL_MS)
  );

  intervalHandles.push(
    setInterval(() => {
      deps.getRunningTabIds().forEach((tabId) => deps.saveTabToDatabase(tabId));
    }, DATABASE_SAVE_INTERVAL_MS)
  );
}

export function stopAppLifecycleTimers(): void {
  intervalHandles.forEach(clearInterval);
  intervalHandles = [];
}
