// Sidebar navigation (Linear-inspired)
import { Code, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface SidebarProps {
  currentPage: "code" | "matches" | "settings";
  onNavigate: (page: "code" | "matches" | "settings") => void;
  isOpen: boolean;
  isOverlay?: boolean;
  onClose?: () => void;
}

export function Sidebar({ currentPage, onNavigate, isOpen, isOverlay = false, onClose }: SidebarProps) {
  const navItems = [
    { id: "code" as const, label: "Code", icon: Code },
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

      <nav className="flex-1 px-2 space-y-1">
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
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      </>
    );
  }
}
