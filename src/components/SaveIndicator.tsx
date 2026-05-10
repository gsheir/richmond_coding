// Save status indicator
import { useEffect, useState } from "react";
import { Save, AlertCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface SaveIndicatorProps {
  tabId: string;
}

export function SaveIndicator({ tabId }: SaveIndicatorProps) {
  const tabs = useAppStore((state) => state.tabs);
  const [timeAgo, setTimeAgo] = useState<string>("");
  
  const tabData = tabs.find(t => t.tab.id === tabId);
  const lastSaveTime = tabData?.tab.lastSaveTime || null;
  const isDirty = tabData?.tab.isDirty || false;

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastSaveTime) {
        setTimeAgo("");
        return;
      }

      const now = new Date();
      const saved = new Date(lastSaveTime);
      const diffSeconds = Math.floor((now.getTime() - saved.getTime()) / 1000);

      if (diffSeconds < 60) {
        setTimeAgo("just now");
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
  }, [lastSaveTime]);

  if (!tabData) {
    return null;
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-500">
        <AlertCircle className="w-3 h-3" />
        <span>Changes need saving</span>
      </div>
    );
  }

  if (lastSaveTime) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Save className="w-3 h-3" />
        <span>Saved {timeAgo}</span>
      </div>
    );
  }

  return null;
}
