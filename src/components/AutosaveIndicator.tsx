// Autosave status indicator
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ClockState } from "@/lib/types";

export function AutosaveIndicator() {
  const { lastAutosaveTime, clockState } = useAppStore();
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastAutosaveTime) {
        setTimeAgo("");
        return;
      }

      const now = new Date();
      const saved = new Date(lastAutosaveTime);
      const diffSeconds = Math.floor((now.getTime() - saved.getTime()) / 1000);

      if (diffSeconds < 60) {
        setTimeAgo("Just now");
      } else if (diffSeconds < 3600) {
        const mins = Math.floor(diffSeconds / 60);
        setTimeAgo(`${mins} min${mins > 1 ? "s" : ""} ago`);
      } else {
        const hours = Math.floor(diffSeconds / 3600);
        setTimeAgo(`${hours} hour${hours > 1 ? "s" : ""} ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 5000);
    return () => clearInterval(interval);
  }, [lastAutosaveTime]);

  if (clockState !== ClockState.RUNNING && !lastAutosaveTime) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Save className="w-3 h-3" />
      <span>
        {lastAutosaveTime ? `Autosaved ${timeAgo}` : "Autosave enabled"}
      </span>
    </div>
  );
}
