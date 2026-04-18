// Tab bar component for managing multiple open matches
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export function TabBar() {
  const { tabs, activeTabId, switchTab, closeTab } = useAppStore();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-background border-b border-border/50 overflow-x-auto">
      {tabs.map((tabData) => {
        const isActive = tabData.tab.id === activeTabId;

        return (
          <div
            key={tabData.tab.id}
            onClick={() => switchTab(tabData.tab.id)}
            className={cn(
              "group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer shrink-0",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {/* Dirty indicator */}
            {tabData.tab.isDirty && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
            )}

            {/* Tab label */}
            <span className="max-w-xs truncate">{tabData.tab.label}</span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tabData.tab.id);
              }}
              className={cn(
                "p-0.5 rounded hover:bg-muted transition-colors",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
