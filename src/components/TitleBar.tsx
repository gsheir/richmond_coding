// Title bar that integrates with native macOS transparent chrome
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface TitleBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TitleBar({ sidebarOpen, onToggleSidebar }: TitleBarProps) {
  return (
    <div 
      className="h-12 bg-background flex items-center justify-between pl-4 pr-4 select-none relative z-[60]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <button
        onClick={onToggleSidebar}
        className="ml-16 p-1.5 rounded-md hover:bg-accent transition-colors relative z-[60]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </button>
      
      {/* Future: Add interactive buttons, search bars, etc. */}
      <div className="flex items-center gap-2">
        {/* Reserved for future UI elements */}
      </div>
    </div>
  );
}
