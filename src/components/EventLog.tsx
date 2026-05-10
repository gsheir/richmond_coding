// Event log table displaying coded phases
import { Phase, PhaseStatus, ButtonType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { Pencil, Flag, Trash2, AlertCircle } from "lucide-react";

interface EventLogProps {
  phases: Phase[];
}

export function EventLog({ phases }: EventLogProps) {
  const { buttonConfig, updatePhase, deletePhase } = useAppStore();
  const [editingCell, setEditingCell] = useState<{ phaseId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleReview = (phaseId: number, currentValue: boolean | undefined) => {
    updatePhase(phaseId, { needsReview: !currentValue });
  };

  const handleDelete = (phaseId: number, phaseLabel: string | null) => {
    if (confirm(`Delete phase "${phaseLabel || 'Undefined'}"?`)) {
      deletePhase(phaseId);
    }
  };

  // Show newest first
  const sortedPhases = [...phases].reverse();

  const phaseButtons = buttonConfig.filter((b) => b.type === ButtonType.PHASE);
  const terminationButtons = buttonConfig.filter((b) => b.type === ButtonType.TERMINATION);

  // Find currently active phase (not fully terminated)
  const activePhase = phases.find(p => 
    p.status === PhaseStatus.CLASSIFIED || 
    p.status === PhaseStatus.ENDED_UNDEFINED ||
    p.status === PhaseStatus.UNDEFINED
  );
  
  // Find last terminated phase
  const terminatedPhases = phases.filter(p => p.status === PhaseStatus.TERMINATED);
  const lastTerminatedPhase = terminatedPhases.length > 0 
    ? terminatedPhases[terminatedPhases.length - 1] 
    : null;

  // Get button config for active phase color
  const activePhaseButton = activePhase?.phaseCode 
    ? buttonConfig.find(b => b.code === activePhase.phaseCode)
    : null;

  const startEditing = (phaseId: number, field: string, currentValue: string) => {
    setEditingCell({ phaseId, field });
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (!editingCell) return;

    const { phaseId, field } = editingCell;

    if (field === "phaseLabel") {
      // Find the button with this label to get the code
      const button = phaseButtons.find((b) => b.label === editValue);
      if (button) {
        updatePhase(phaseId, {
          phaseLabel: button.label,
          phaseCode: button.code,
          status: PhaseStatus.CLASSIFIED,
        });
      }
    } else if (field === "contextLabels") {
      // Parse comma-separated context labels
      const labels = editValue
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      updatePhase(phaseId, { contextLabels: labels });
    } else if (field === "terminationEvent") {
      // Find the button to get category
      const button = terminationButtons.find((b) => b.label === editValue);
      if (button) {
        updatePhase(phaseId, {
          terminationEvent: button.label,
          terminationCategory: button.category || null,
          status: PhaseStatus.TERMINATED,
        });
      } else if (editValue === "") {
        // Allow clearing termination
        updatePhase(phaseId, {
          terminationEvent: null,
          terminationCategory: null,
          status: PhaseStatus.CLASSIFIED,
        });
      }
    }

    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const getDotColor = (phase: Phase) => {
    // ENDED_UNDEFINED - phase ended with Space but no termination selected
    if (phase.status === PhaseStatus.ENDED_UNDEFINED) {
      return "bg-amber-500";
    }
    
    // If terminated with null termination (shouldn't happen with new system, but keep for compatibility)
    if (phase.status === PhaseStatus.TERMINATED && !phase.terminationEvent) {
      return "bg-yellow-500";
    }
    
    // If terminated, colour based on category
    if (phase.status === PhaseStatus.TERMINATED) {
      if (phase.terminationCategory === "success") {
        return "bg-green-500";
      } else if (phase.terminationCategory === "failure") {
        return "bg-red-500";
      }
      return "bg-green-500"; // Default to green for terminated
    }
    
    // Otherwise colour based on status
    if (phase.status === PhaseStatus.UNDEFINED) {
      return "bg-yellow-500";
    } else if (phase.status === PhaseStatus.CLASSIFIED) {
      return "bg-blue-500";
    }
    
    return "bg-gray-500";
  };

  return (
    <div className="flex flex-col h-full bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
      <div className="px-3 py-3 border-b border-border/40 flex items-center justify-between gap-4">
        {/* Left: Event log title and info */}
        <div className="flex flex-col gap-1 shrink-0">
          <h3 className="font-semibold text-xs text-muted-foreground">Event Log</h3>
          <p className="text-[10px] text-muted-foreground/70">
            {phases.length} phases
          </p>
        </div>
        
        {/* Center: Currently active phase (prominent) */}
        <div className="flex-1 flex items-center justify-center">
          {activePhase ? (
            <div className="flex flex-col items-center gap-1">
              <div 
                className="px-6 py-3 rounded-lg text-lg font-bold shadow-md min-w-[120px] text-center relative"
                style={{ 
                  backgroundColor: activePhaseButton?.style.colour || '#666',
                  color: 'white'
                }}
              >
                {activePhase.phaseLabel || 'Undefined'}
                {activePhase.status === PhaseStatus.ENDED_UNDEFINED && (
                  <div className="absolute -top-2 -right-2">
                    <div className="relative">
                      <AlertCircle className="w-5 h-5 text-amber-500 bg-card rounded-full animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
              {activePhase.status === PhaseStatus.ENDED_UNDEFINED && (
                <span className="text-[10px] text-amber-500 font-medium">
                  Select termination event
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/40 italic">No active phase</div>
          )}
        </div>
        
        {/* Right: Last terminated phase */}
        <div className="flex flex-col gap-1 items-end shrink-0">
          {lastTerminatedPhase ? (
            <>
              <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wide">Last:</span>
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {lastTerminatedPhase.phaseLabel || 'Undefined'}
                </span>
                {lastTerminatedPhase.terminationEvent && (
                  <span className="text-[9px] text-muted-foreground/60">
                    → {lastTerminatedPhase.terminationEvent}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="h-full"></div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card/90 backdrop-blur-sm border-b border-border/30">
            <tr>
              <th className="w-6"></th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground text-xs">
                Time
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground text-xs">
                Code
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground text-xs">
                Context
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground text-xs">
                Termination
              </th>
              <th className="px-3 py-1.5 text-center font-medium text-muted-foreground text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {sortedPhases.map((phase) => (
                <motion.tr
                  key={phase.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "border-b border-border/50 hover:bg-accent/50 transition-colors",
                    phase.status === PhaseStatus.UNDEFINED && "bg-yellow-500/10",
                    phase.status === PhaseStatus.CLASSIFIED && "bg-blue-500/10",
                    phase.status === PhaseStatus.TERMINATED && !phase.terminationEvent && "bg-yellow-500/20"
                  )}
                >
                  <td className="px-3 py-1.5">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        getDotColor(phase)
                      )}
                    />
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">
                    {formatTime(phase.startTimeMs)}
                  </td>
                  <td 
                    className="px-3 py-1.5 font-medium text-xs cursor-pointer hover:bg-accent/30 group relative"
                    onClick={() => startEditing(phase.id, "phaseLabel", phase.phaseLabel || "")}
                  >
                    {editingCell?.phaseId === phase.id && editingCell?.field === "phaseLabel" ? (
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-full px-1 py-0.5 text-xs bg-background border border-border rounded"
                      >
                        <option value="">Undefined</option>
                        {phaseButtons.map((btn) => (
                          <option key={btn.code} value={btn.label}>
                            {btn.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        {phase.phaseLabel || "Undefined"}
                        <Pencil className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50" />
                      </>
                    )}
                  </td>
                  <td 
                    className="px-3 py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-accent/30 group relative"
                    onClick={() => startEditing(phase.id, "contextLabels", phase.contextLabels.join(", "))}
                  >
                    {editingCell?.phaseId === phase.id && editingCell?.field === "contextLabels" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        placeholder="Comma-separated labels"
                        className="w-full px-1 py-0.5 text-xs bg-background border border-border rounded"
                      />
                    ) : (
                      <>
                        {phase.contextLabels.join(", ") || "–"}
                        <Pencil className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50" />
                      </>
                    )}
                  </td>
                  <td 
                    className="px-3 py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-accent/30 group relative"
                    onClick={() => startEditing(phase.id, "terminationEvent", phase.terminationEvent || "")}
                  >
                    {editingCell?.phaseId === phase.id && editingCell?.field === "terminationEvent" ? (
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-full px-1 py-0.5 text-xs bg-background border border-border rounded"
                      >
                        <option value="">–</option>
                        {terminationButtons.map((btn) => (
                          <option key={btn.code} value={btn.label}>
                            {btn.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        {phase.status === PhaseStatus.TERMINATED && !phase.terminationEvent ? "?" : (phase.terminationEvent || "–")}
                        <Pencil className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50" />
                      </>
                    )}
                  </td>                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleReview(phase.id, phase.needsReview)}
                        className={cn(
                          "p-1 rounded hover:bg-accent/50 transition-colors",
                          phase.needsReview && "text-amber-500"
                        )}
                        title={phase.needsReview ? "Remove review flag" : "Mark for review"}
                      >
                        <Flag className="w-3.5 h-3.5" fill={phase.needsReview ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() => handleDelete(phase.id, phase.phaseLabel)}
                        className="p-1 rounded hover:bg-destructive/50 transition-colors text-destructive"
                        title="Delete phase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {phases.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No phases recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
