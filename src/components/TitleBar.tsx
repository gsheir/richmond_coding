// Title bar – macOS native chrome integration
import { useState } from "react";
import { Download, Edit2, MoreVertical, Save, Trash2, Undo } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "./ui/Button";
import { EditMatchDetailsModal } from "./EditMatchDetailsModal";

export function TitleBar() {
  const {
    getActiveTab,
    undoLastPhase,
    saveMatch,
    exportXML,
    clearAllPhases,
  } = useAppStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const activeTab = getActiveTab();
  const match = activeTab?.match;
  const phases = activeTab?.eventEngine.getAllPhases() ?? [];
  const isDirty = activeTab?.tab.isDirty ?? false;
  const clockState = activeTab?.clockState;

  const matchLabel = match
    ? `${match.homeTeam} vs ${match.awayTeam}`
    : null;

  return (
    <div
      className="h-9 bg-background border-b border-border/50 flex items-center pl-20 pr-3 select-none relative z-[60] shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Match name (read-only, centred in draggable region) */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {matchLabel && (
          <span className="text-xs font-medium text-muted-foreground">
            {matchLabel}
            {match?.date && (
              <span className="text-muted-foreground/50 ml-2">· {match.date}</span>
            )}
          </span>
        )}
      </div>

      {/* Action buttons – only when a match tab is open */}
      {activeTab && (
        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Button
            onClick={undoLastPhase}
            variant="outline"
            size="sm"
            className="gap-1 h-6 text-xs px-2"
            disabled={phases.length === 0}
          >
            <Undo className="w-3 h-3" />
            Undo
          </Button>

          <Button
            onClick={() => saveMatch(activeTab.tab.id)}
            variant="attack"
            size="sm"
            className="gap-1 h-6 text-xs px-2 relative"
            disabled={!isDirty}
          >
            {isDirty && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
            )}
            <Save className="w-3 h-3" />
            {isDirty ? "Save" : "Saved"}
          </Button>

          <Button
            onClick={exportXML}
            variant="outline"
            size="sm"
            className="gap-1 h-6 text-xs px-2"
            disabled={phases.length === 0}
          >
            <Download className="w-3 h-3" />
            Export
          </Button>

          <div className="relative">
            <Button
              onClick={() => setMenuOpen(!menuOpen)}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <MoreVertical className="w-3 h-3" />
            </Button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); setShowEditModal(true); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Match Details
                  </button>
                  <div className="h-px bg-border/50 mx-2" />
                  <button
                    onClick={() => { setMenuOpen(false); clearAllPhases(); }}
                    disabled={phases.length === 0}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Phases
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Match Details modal */}
      {showEditModal && activeTab && match && clockState !== undefined && (
        <EditMatchDetailsModal
          tabId={activeTab.tab.id}
          match={match}
          clockState={clockState}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
