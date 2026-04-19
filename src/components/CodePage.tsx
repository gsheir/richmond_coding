// Main coding page
import { useEffect, useState } from "react";
import { ClockWidget } from "./ClockWidget";
import { MatchDetailsCard } from "./MatchDetailsCard";
import { ButtonGrid } from "./ButtonGrid";
import { PhaseEfficiency } from "./PhaseEfficiency";
import { PhaseTransition } from "./PhaseTransition";
import { AutosaveIndicator } from "./AutosaveIndicator";
import { Button } from "./ui/Button";
import { Download, Trash2, Undo, Save, MoreVertical, ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ClockState, Match } from "@/lib/types";
import { GameClock } from "@/lib/clock";
import { EventEngine } from "@/lib/event-engine";

interface CodePageProps {
  tabId: string;
  match: Match;
  clock: GameClock;
  eventEngine: EventEngine;
  clockState: ClockState;
  currentTime: string;
  activePhaseId: number | null;
}

export function CodePage({
  tabId,
  match,
  clock,
  eventEngine,
  clockState,
  currentTime,
  activePhaseId,
}: CodePageProps) {
  const {
    buttonConfig,
    exportXML,
    clearAllPhases,
    undoLastPhase,
    saveMatch,
  } = useAppStore();

  const [isNarrow, setIsNarrow] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eventLogCollapsed, setEventLogCollapsed] = useState(false);
  const [phaseEfficiencyCollapsed, setPhaseEfficiencyCollapsed] = useState(false);
  const [eventLogHeight, setEventLogHeight] = useState(240);
  const [isResizingEventLog, setIsResizingEventLog] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  const [analyticsTab, setAnalyticsTab] = useState<'efficiency' | 'transition'>('efficiency');

  const phases = eventEngine.getAllPhases();
  const isRunning = clockState === ClockState.RUNNING;

  // Get active phase possession state for button filtering
  const activePhase = eventEngine.getActivePhase();
  const activePhasePossession = activePhase?.phaseCode 
    ? buttonConfig.find(btn => btn.code === activePhase.phaseCode)?.possessionState
    : undefined;

  // Detect narrow viewport
  useEffect(() => {
    const handleResize = () => {
      const narrow = window.innerWidth < 1280;
      setIsNarrow(narrow);
      // Default to collapsed when narrow
      if (narrow) {
        setPhaseEfficiencyCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle event log resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingEventLog) return;
      
      // Calculate delta from initial mouse position (negative because dragging up = larger panel)
      const deltaY = resizeStartY - e.clientY;
      const newHeight = resizeStartHeight + deltaY;
      
      // Constrain height between 100px and 600px
      const constrainedHeight = Math.max(100, Math.min(600, newHeight));
      setEventLogHeight(constrainedHeight);
    };

    const handleMouseUp = () => {
      setIsResizingEventLog(false);
    };

    if (isResizingEventLog) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingEventLog, resizeStartY, resizeStartHeight]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeStartY(e.clientY);
    setResizeStartHeight(eventLogHeight);
    setIsResizingEventLog(true);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Top bar with clock and actions */}
      <div className="flex items-center justify-between gap-4">
        <ClockWidget
          clockState={clockState}
          currentTime={currentTime}
          clock={clock}
        />

        <div className="flex items-center gap-2">
          <Button
            onClick={undoLastPhase}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={phases.length === 0}
          >
            <Undo className="w-3.5 h-3.5" />
            Undo
          </Button>

          <Button
            onClick={() => saveMatch(tabId)}
            variant="attack"
            size="sm"
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>

          <Button
            onClick={exportXML}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={phases.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>

          <div className="relative">
            <Button
              onClick={() => setMenuOpen(!menuOpen)}
              variant="outline"
              size="sm"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>

            {menuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      clearAllPhases();
                    }}
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
      </div>

      {/* Match details card - full width */}
      <MatchDetailsCard
        tabId={tabId}
        match={match}
        clockState={clockState}
      />

      {/* Main content area - code window + placeholder card */}
      <div className={`flex-1 ${isNarrow ? 'flex flex-col' : 'flex'} gap-4 min-h-0`}>
        {/* Code window - fixed 720px width on desktop */}
        <div className={isNarrow ? 'flex-1 min-h-0' : 'w-[720px] shrink-0'} >
          <div className="h-full bg-card/70 backdrop-blur-sm rounded-xl border border-border/50 p-3 flex flex-col overflow-hidden">
            <h3 className="font-semibold text-xs mb-3 text-muted-foreground">Code Window</h3>
            <div className="relative flex-1 min-h-0">
              <ButtonGrid 
                buttons={buttonConfig} 
                disabled={!isRunning}
                activePhasePossession={activePhasePossession}
              />
            </div>
          </div>
        </div>

        {/* Analytics panel */}
        <div className={isNarrow ? 'shrink-0' : 'flex-1 min-h-0'}>
          <div className={`h-full bg-card/70 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden ${isNarrow ? '' : 'p-3'} flex flex-col`}>
            {/* Collapsible header when narrow */}
            {isNarrow ? (
              <>
                <div 
                  className="px-3 py-2 border-b border-border/40 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setPhaseEfficiencyCollapsed(!phaseEfficiencyCollapsed)}
                >
                  <h3 className="font-semibold text-xs text-muted-foreground">Analytics</h3>
                  <button className="p-1 hover:bg-accent rounded">
                    {phaseEfficiencyCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {!phaseEfficiencyCollapsed && (
                  <div className="flex-1 min-h-0 p-3 overflow-y-auto">
                    {/* Tab buttons */}
                    <div className="flex gap-2 mb-3 border-b border-border/40">
                      <button
                        onClick={() => setAnalyticsTab('efficiency')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
                          analyticsTab === 'efficiency'
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Phase Efficiency
                        {analyticsTab === 'efficiency' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                      </button>
                      <button
                        onClick={() => setAnalyticsTab('transition')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
                          analyticsTab === 'transition'
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Phase Transition
                        {analyticsTab === 'transition' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                      </button>
                    </div>
                    
                    {/* Tab content */}
                    {analyticsTab === 'efficiency' ? (
                      <div>
                        <PhaseEfficiency phases={phases} />
                      </div>
                    ) : (
                      <div>
                        <PhaseTransition phases={phases} />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="font-semibold text-xs mb-3 text-muted-foreground">Analytics</h3>
                
                {/* Tab buttons */}
                <div className="flex gap-2 mb-3 border-b border-border/40">
                  <button
                    onClick={() => setAnalyticsTab('efficiency')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
                      analyticsTab === 'efficiency'
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Phase Efficiency
                    {analyticsTab === 'efficiency' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setAnalyticsTab('transition')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
                      analyticsTab === 'transition'
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Phase Transition
                    {analyticsTab === 'transition' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                </div>
                
                {/* Tab content */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {analyticsTab === 'efficiency' ? (
                    <div>
                      <PhaseEfficiency phases={phases} />
                    </div>
                  ) : (
                    <div>
                      <PhaseTransition phases={phases} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Event Log Panel at bottom */}
      <div className="shrink-0">
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
          {/* Resize handle */}
          {!eventLogCollapsed && (
            <div
              className="h-1 bg-border/30 hover:bg-primary/50 cursor-ns-resize transition-colors relative group"
              onMouseDown={handleResizeStart}
            >
              {/* Visual indicator */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-primary/0 group-hover:bg-primary/30 transition-colors" />
            </div>
          )}
          
          {/* Header with collapse toggle */}
          <div 
            className="px-3 py-2 border-b border-border/40 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => setEventLogCollapsed(!eventLogCollapsed)}
          >
            <div>
              <h3 className="font-semibold text-xs text-muted-foreground">Event Log</h3>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {phases.length} phases recorded
              </p>
            </div>
            <button className="p-1 hover:bg-accent rounded">
              {eventLogCollapsed ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Event log content - resizable height */}
          {!eventLogCollapsed && (
            <div className="overflow-auto" style={{ maxHeight: `${eventLogHeight}px` }}>
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
                  </tr>
                </thead>
                <tbody>
                  {/* Event log rows will be rendered here */}
                  <EventLogRows phases={phases} />
                </tbody>
              </table>

              {phases.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  No phases recorded yet. Press Space to start coding.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between">
        <AutosaveIndicator tabId={tabId} />
        
        <div className="flex-1 text-center text-xs text-muted-foreground">
          {!isRunning && "Press Start to begin coding"}
          {isRunning && (
            <>
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd> to
              start a new phase, then use button hotkeys to classify and add context
            </>
          )}
        </div>
        
        <div className="w-32" /> {/* Spacer for alignment */}
      </div>
    </div>
  );
}

// Separate component for event log rows
function EventLogRows({ phases }: { phases: any[] }) {
  const { buttonConfig, updatePhase } = useAppStore();
  const [editingCell, setEditingCell] = useState<{ phaseId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Show newest first
  const sortedPhases = [...phases].reverse();

  const phaseButtons = buttonConfig.filter((b) => b.type === "phase");
  const terminationButtons = buttonConfig.filter((b) => b.type === "termination");

  const startEditing = (phaseId: number, field: string, currentValue: string) => {
    setEditingCell({ phaseId, field });
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (!editingCell) return;

    const { phaseId, field } = editingCell;

    if (field === "phaseLabel") {
      const button = phaseButtons.find((b) => b.label === editValue);
      if (button) {
        updatePhase(phaseId, {
          phaseLabel: button.label,
          phaseCode: button.code,
          status: "classified" as any,
        });
      }
    } else if (field === "contextLabels") {
      const labels = editValue
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      updatePhase(phaseId, { contextLabels: labels });
    } else if (field === "terminationEvent") {
      const button = terminationButtons.find((b) => b.label === editValue);
      if (button) {
        updatePhase(phaseId, {
          terminationEvent: button.label,
          terminationCategory: button.category || null,
          status: "terminated" as any,
        });
      } else if (editValue === "") {
        updatePhase(phaseId, {
          terminationEvent: null,
          terminationCategory: null,
          status: "classified" as any,
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

  const getDotColor = (phase: any) => {
    // If terminated with null termination (END_PHASE button), use yellow
    if (phase.status === "terminated" && !phase.terminationEvent) {
      return "bg-yellow-500";
    }
    
    if (phase.status === "terminated") {
      if (phase.terminationCategory === "success") {
        return "bg-green-500";
      } else if (phase.terminationCategory === "failure") {
        return "bg-red-500";
      }
      return "bg-green-500";
    }
    
    if (phase.status === "undefined") {
      return "bg-yellow-500";
    } else if (phase.status === "classified") {
      return "bg-blue-500";
    }
    
    return "bg-gray-500";
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const cn = (...classes: (string | boolean | undefined)[]) => {
    return classes.filter(Boolean).join(' ');
  };

  return (
    <>
      {sortedPhases.map((phase) => (
        <tr
          key={phase.id}
          className={cn(
            "border-b border-border/50 hover:bg-accent/50 transition-colors",
            phase.status === "undefined" && "bg-yellow-500/10",
            phase.status === "classified" && "bg-blue-500/10",
            phase.status === "terminated" && !phase.terminationEvent && "bg-yellow-500/20"
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
                {phase.status === "terminated" && !phase.terminationEvent ? "?" : (phase.terminationEvent || "–")}
              </>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
