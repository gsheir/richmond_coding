// Settings page
import { useAppStore } from "@/lib/store";

export function SettingsPage() {
  const { 
    defaultHomeTeam, 
    autosaveDirectory, 
    defaultLeadMs,
    defaultLagMs,
    setDefaultHomeTeam, 
    setAutosaveDirectory,
    setDefaultLeadMs,
    setDefaultLagMs,
  } = useAppStore();

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure your coding preferences
        </p>
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-4 space-y-6">
        {/* Default home team */}
        <div>
          <label htmlFor="default-home-team" className="block text-sm font-semibold mb-1.5">
            Default Home Team
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            This team name will automatically populate the home team field when creating a new match.
          </p>
          <input
            id="default-home-team"
            type="text"
            value={defaultHomeTeam}
            onChange={(e) => setDefaultHomeTeam(e.target.value)}
            placeholder="e.g., Richmond"
            className="w-full max-w-md px-3 py-2 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Autosave directory */}
        <div>
          <label htmlFor="autosave-directory" className="block text-sm font-semibold mb-1.5">
            Autosave Directory
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Directory where match files will be automatically saved.
          </p>
          <input
            id="autosave-directory"
            type="text"
            value={autosaveDirectory}
            onChange={(e) => setAutosaveDirectory(e.target.value)}
            placeholder="~/Documents/Richmond Hockey Club/matches"
            className="w-full max-w-2xl px-3 py-2 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Use ~ for your home directory. Changes take effect on next save.
          </p>
        </div>

        {/* Video timing section */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Video Timing</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Configure lead and lag times for video clip generation. These values define how much time before and after each coded phase should be included in the video export.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lead time */}
            <div>
              <label htmlFor="default-lead-ms" className="block text-sm font-medium mb-1.5">
                Default Lead Time (ms)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Time before phase start
              </p>
              <input
                id="default-lead-ms"
                type="number"
                value={defaultLeadMs}
                onChange={(e) => setDefaultLeadMs(parseInt(e.target.value) || 5000)}
                min="0"
                step="1000"
                className="w-full px-3 py-2 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </div>

            {/* Lag time */}
            <div>
              <label htmlFor="default-lag-ms" className="block text-sm font-medium mb-1.5">
                Default Lag Time (ms)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Time after phase end
              </p>
              <input
                id="default-lag-ms"
                type="number"
                value={defaultLagMs}
                onChange={(e) => setDefaultLagMs(parseInt(e.target.value) || 5000)}
                min="0"
                step="1000"
                className="w-full px-3 py-2 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

