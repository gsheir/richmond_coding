// Sidebar navigation (Linear-inspired)
import { FolderOpen, Settings, FileText, X, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "./ui/Button";

interface SidebarProps {
  currentPage: "matches" | "settings" | null;
  onNavigate: (page: "matches" | "settings") => void;
  onSwitchToTab: (tabId: string) => void;
  isOpen: boolean;
  isOverlay?: boolean;
  onClose?: () => void;
}

export function Sidebar({ currentPage, onNavigate, onSwitchToTab, isOpen, isOverlay = false, onClose }: SidebarProps) {
  const { tabs, activeTabId, closeTab } = useAppStore();
  const [closingTabId, setClosingTabId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or system preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply theme class to document
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
    { id: "matches" as const, label: "Matches", icon: FolderOpen },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  // Close on escape key when overlay
  useEffect(() => {
    if (!isOverlay || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOverlay, isOpen, onClose]);

  if (!isOpen) return null;

  // Overlay mode: fixed position with backdrop
  if (isOverlay) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
        
        {/* Sidebar */}
        <div className="fixed top-0 left-0 bottom-0 w-60 bg-background flex flex-col shrink-0 z-50 border-r border-border/50 shadow-2xl pt-12">
          {renderContent()}
        </div>
      </>
    );
  }

  // Normal mode: inline sidebar
  return (
    <div className="w-60 bg-background flex flex-col shrink-0">
      {renderContent()}
    </div>
  );

  function renderContent() {
    return (
      <>
      <div className="p-4 flex items-center gap-3">
        <img 
          src="/rhc_logo.png" 
          alt="Richmond Hockey Club" 
          className="w-10 h-10 rounded-lg"
        />
        <div>
          <h1 className="text-base font-bold text-foreground">Richmond Hockey Club</h1>
          <p className="text-xs text-muted-foreground">Field Hockey Coding</p>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {/* Navigation items */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                )}
              >

                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Open matches section */}
        {tabs.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Open Matches
              </div>
            </div>
            
            <div className="space-y-1">
              {tabs.map((tabData) => {
                const isActive = activeTabId === tabData.tab.id && currentPage === null;

                return (
                  <div
                    key={tabData.tab.id}
                    className={cn(
                      "group relative w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                      isActive
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    )}
                  >
                    <button
                      onClick={() => onSwitchToTab(tabData.tab.id)}
                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate text-xs flex-1 min-w-0">{tabData.tab.label}</span>
                      {tabData.tab.isDirty && (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setClosingTabId(tabData.tab.id);
                      }}
                      className={cn(
                        "p-0.5 rounded hover:bg-muted transition-colors shrink-0",
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      aria-label="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Theme toggle */}
      <div className="p-2">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              isDarkMode ? "bg-primary" : "bg-input"
            )}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition-transform",
                isDarkMode ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
          <Moon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Close tab confirmation modal */}
      {closingTabId && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setClosingTabId(null)}
        >
          <div 
            className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Close tab?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to close this match tab?
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setClosingTabId(null)}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (closingTabId) {
                    closeTab(closingTabId);
                    setClosingTabId(null);
                  }
                }}
                variant="destructive"
                size="sm"
              >
                Close Tab
              </Button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }
}
