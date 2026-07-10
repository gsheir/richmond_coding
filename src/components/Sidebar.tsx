// Sidebar navigation – collapsible icon rail
import { FolderOpen, Settings, Moon, Sun, Database, Activity, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

interface SidebarProps {
  currentPage: "matches" | "settings" | "data-browser" | null;
  onNavigate: (page: "matches" | "settings" | "data-browser") => void;
  onSwitchToCoding: () => void;
}

export function Sidebar({ currentPage, onNavigate, onSwitchToCoding }: SidebarProps) {
  const { tabs, activeTabId } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const navItems = [
    { id: "matches" as const, icon: FolderOpen, label: "Matches" },
    { id: "data-browser" as const, icon: Database, label: "Data Browser" },
    { id: "settings" as const, icon: Settings, label: "Settings" },
  ];

  const isCoding = currentPage === null && activeTabId !== null;

  return (
    <div
      className={cn(
        "bg-background border-r border-border/50 flex flex-col py-2 gap-1 shrink-0 transition-all duration-200 overflow-hidden",
        isExpanded ? "w-40 items-start px-2" : "w-10 items-center"
      )}
    >
      {/* Coding session icon – visible when a match is open */}
      {tabs.length > 0 && (
        <button
          onClick={onSwitchToCoding}
          className={cn(
            "h-7 rounded-md flex items-center gap-2 transition-colors shrink-0",
            isExpanded ? "w-full px-2" : "w-7 justify-center",
            isCoding
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          )}
          title={isExpanded ? undefined : "Coding session"}
        >
          <Activity className="w-4 h-4 shrink-0" />
          {isExpanded && <span className="text-xs font-medium truncate">Coding</span>}
        </button>
      )}

      <div className={cn("h-px bg-border/50 my-0.5 shrink-0", isExpanded ? "w-full" : "w-5")} />

      {/* Navigation icons */}
      <div className={cn("flex flex-col gap-1 w-full", isExpanded ? "items-start" : "items-center")}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "h-7 rounded-md flex items-center gap-2 transition-colors shrink-0",
                isExpanded ? "w-full px-2" : "w-7 justify-center",
                isActive
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              )}
              title={isExpanded ? undefined : item.label}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs font-medium truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom: theme toggle + expand/collapse */}
      <div className={cn("mt-auto flex flex-col gap-1 w-full", isExpanded ? "items-start" : "items-center")}>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={cn(
            "h-7 rounded-md flex items-center gap-2 text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors shrink-0",
            isExpanded ? "w-full px-2" : "w-7 justify-center"
          )}
          title={isExpanded ? undefined : (isDarkMode ? "Switch to light mode" : "Switch to dark mode")}
        >
          {isDarkMode
            ? <Sun className="w-4 h-4 shrink-0" />
            : <Moon className="w-4 h-4 shrink-0" />}
          {isExpanded && (
            <span className="text-xs font-medium truncate">
              {isDarkMode ? "Light mode" : "Dark mode"}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "h-7 rounded-md flex items-center gap-2 text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors shrink-0",
            isExpanded ? "w-full px-2" : "w-7 justify-center"
          )}
          title={isExpanded ? undefined : "Expand sidebar"}
        >
          {isExpanded
            ? <ChevronLeft className="w-4 h-4 shrink-0" />
            : <ChevronRight className="w-4 h-4 shrink-0" />}
          {isExpanded && <span className="text-xs font-medium truncate">Collapse</span>}
        </button>
      </div>
    </div>
  );
}

