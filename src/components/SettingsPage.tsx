// Settings page
import { useAppStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { ButtonConfig } from "@/lib/types";
import { VisualLayoutEditor } from "./VisualLayoutEditor";
import { 
  getDatabasePath,
  openConfigDirectory,
} from "@/lib/electron-api";
import { loadButtonConfig } from "@/lib/config-loader";
import { ExternalLink, FolderOpen } from "lucide-react";
import { Button } from "./ui/Button";

export function SettingsPage() {
  const { 
    defaultHomeTeam, 
    defaultLeadMs,
    defaultLagMs,
    setDefaultHomeTeam, 
    setDefaultLeadMs,
    setDefaultLagMs,
    setButtonConfig,
  } = useAppStore();

  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [databasePath, setDatabasePath] = useState<string>("");
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Load button configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoadingConfig(true);
        const buttons = await loadButtonConfig();
        setButtons(buttons);
        // Also update global store on initial load
        if (buttons.length > 0) {
          setButtonConfig(buttons);
        }
        const path = await getDatabasePath();
        setDatabasePath(path);
      } catch (error) {
        console.error("Failed to load button configuration:", error);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    loadConfig();
  }, [setButtonConfig]);

  const handleOpenConfigDirectory = async () => {
    try {
      await openConfigDirectory();
    } catch (error) {
      console.error("Failed to open config directory:", error);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure your coding preferences
        </p>
      </div>

      {/* Database Location */}
      <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-3 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Database Location</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All match data, settings, and configuration are stored in an SQLite database.
          </p>
          {databasePath && (
            <p className="text-xs text-muted-foreground/70 font-mono mt-1">
              {databasePath}
            </p>
          )}
        </div>
        <Button onClick={handleOpenConfigDirectory} size="sm" variant="secondary">
          <ExternalLink className="w-4 h-4" />
          Open Directory
        </Button>
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

      {/* Code Window Configuration */}
      <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-4">
        <h3 className="text-sm font-semibold mb-4">Code Window Configuration</h3>

        {isLoadingConfig ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Loading configuration...
          </div>
        ) : (
          <VisualLayoutEditor 
            buttons={buttons} 
            onButtonsChange={setButtons}
            onConfigSaved={(savedButtons) => setButtonConfig(savedButtons)}
          />
        )}
      </div>
    </div>
  );
}

