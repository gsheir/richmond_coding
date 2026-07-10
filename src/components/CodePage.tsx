// Main coding page
import { useEffect, useState } from "react";
import { ClockWidget } from "./ClockWidget";
import { ButtonGrid } from "./ButtonGrid";
import { PhaseEfficiency } from "./PhaseEfficiency";
import { PhaseTransition } from "./PhaseTransition";
import { SaveIndicator } from "./SaveIndicator";
import { TimelineShiftModal } from "./TimelineShiftModal";
import { ChevronDown, ChevronUp, Flag, AlertCircle, Trash2, Clock as ClockIcon, Undo2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ClockState, Match, Phase, PhaseStatus } from "@/lib/types";
import { GameClock } from "@/lib/clock";
import { EventEngine } from "@/lib/event-engine";
import { TimelineView } from "./TimelineView";

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
    tabs,
    startClock,
    stopClock,
    updatePhase,
    deletePhase,
    shiftTimeline,
    undoTimelineShift,
  } = useAppStore();

  const [eventLogCollapsed, setEventLogCollapsed] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [eventLogHeight, setEventLogHeight] = useState(180);
  const [isResizingEventLog, setIsResizingEventLog] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  const [analyticsTab, setAnalyticsTab] = useState<'efficiency' | 'transition'>('efficiency');
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [rightPanelTab, setRightPanelTab] = useState<'events' | 'analytics'>('events');
  const [rightColWidth, setRightColWidth] = useState(300);
  const [isResizingRightCol, setIsResizingRightCol] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  const phases = eventEngine.getAllPhases();
  const isRunning = clockState === ClockState.RUNNING;
  
  // Get isDirty state
  const tabData = tabs.find(t => t.tab.id === tabId);
  const isDirty = tabData?.tab.isDirty || false;

  // Get active phase possession state for button filtering
  const activePhase = eventEngine.getActivePhase();
  const activePhasePossession = activePhase?.phaseCode 
    ? buttonConfig.find(btn => btn.code === activePhase.phaseCode)?.possessionState
    : undefined;

  // Find last terminated phase
  const terminatedPhases = phases.filter(p => p.status === PhaseStatus.TERMINATED);
  const lastTerminatedPhase = terminatedPhases.length > 0 
    ? terminatedPhases[terminatedPhases.length - 1] 
    : null;

  // Get button config for active phase color
  const activePhaseButton = activePhase?.phaseCode 
    ? buttonConfig.find(b => b.code === activePhase.phaseCode)
    : null;

  // Shift+Space to toggle clock start/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Shift+Space (and only Shift, no other modifiers)
      if (e.key === ' ' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        
        // Don't trigger if typing in an input or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        // Toggle between start and stop based on current state
        if (clockState === ClockState.RUNNING) {
          stopClock();
        } else {
          startClock();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clockState, startClock, stopClock]);

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

  // Handle right column resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRightCol) return;
      const deltaX = resizeStartX - e.clientX;
      const newWidth = resizeStartWidth + deltaX;
      setRightColWidth(Math.max(220, Math.min(500, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizingRightCol(false);
    };

    if (isResizingRightCol) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingRightCol, resizeStartX, resizeStartWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeStartY(e.clientY);
    setResizeStartHeight(eventLogHeight);
    setIsResizingEventLog(true);
  };

  const handleRightColResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeStartX(e.clientX);
    setResizeStartWidth(rightColWidth);
    setIsResizingRightCol(true);
  };

  // Sorted phases for the compact right-panel event list (newest first)
  const sortedPhases = [...phases].reverse();

  const getPhaseStatusDot = (phase: Phase): string => {
    if (phase.status === PhaseStatus.ENDED_UNDEFINED) return 'bg-amber-500';
    if (phase.status === PhaseStatus.TERMINATED && !phase.terminationEvent) return 'bg-yellow-500';
    if (phase.status === PhaseStatus.TERMINATED) {
      if (phase.terminationCategory === 'success') return 'bg-green-500';
      if (phase.terminationCategory === 'failure') return 'bg-red-500';
      return 'bg-green-500';
    }
    if (phase.status === PhaseStatus.UNDEFINED) return 'bg-yellow-500';
    if (phase.status === PhaseStatus.CLASSIFIED) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const formatMs = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Main area: code window (left) | right column ──────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Code window \u2013 fills all available horizontal space */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="px-3 py-1.5 border-b border-border/40 flex items-center bg-card/30 shrink-0">
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Code Window</h3>
            <span className="ml-auto text-[10px] text-muted-foreground/50">Shift+Space to start / stop</span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <ButtonGrid
              buttons={buttonConfig}
              disabled={!isRunning}
              activePhasePossession={activePhasePossession}
            />
          </div>
        </div>

        {/* Vertical resize handle */}
        <div
          className="w-1 shrink-0 bg-border/30 hover:bg-primary/40 cursor-ew-resize transition-colors"
          onMouseDown={handleRightColResizeStart}
        />

        {/* Right column: Match Status + tabbed Events / Analytics */}
        <div
          className="flex flex-col shrink-0 min-h-0 border-l border-border/50"
          style={{ width: rightColWidth }}
        >
          {/* Match Status panel */}
          <div className="shrink-0 border-b border-border/50">
            <div className="px-3 py-1.5 border-b border-border/40 bg-card/30">
              <h3 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Match Status</h3>
            </div>
            <div className="p-3 flex flex-col gap-3">
              {/* Clock and transport controls */}
              <ClockWidget
                clockState={clockState}
                currentTime={currentTime}
                clock={clock}
              />

              <div className="border-t border-border/40" />

              {/* Active phase */}
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Active Phase</div>
                {activePhase ? (
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-full px-4 py-2.5 rounded-lg text-base font-bold text-center relative"
                      style={{
                        backgroundColor: activePhaseButton?.style.colour || '#666',
                        color: 'white',
                      }}
                    >
                      {activePhase.phaseLabel || 'Undefined'}
                      {activePhase.status === PhaseStatus.ENDED_UNDEFINED && (
                        <div className="absolute -top-2 -right-2">
                          <AlertCircle className="w-5 h-5 text-amber-500 bg-card rounded-full animate-pulse" />
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
                  <div className="w-full px-4 py-2.5 rounded-lg text-xs text-muted-foreground/50 italic text-center border border-dashed border-border/40">
                    No active phase
                  </div>
                )}
              </div>

              {/* Last terminated phase */}
              {lastTerminatedPhase && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-card/50 border border-border/40">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Last</span>
                  <div className="text-xs">
                    <span className="font-medium text-foreground/80">{lastTerminatedPhase.phaseLabel}</span>
                    {lastTerminatedPhase.terminationEvent && (
                      <span className="text-muted-foreground"> → {lastTerminatedPhase.terminationEvent}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/40 bg-card/30 shrink-0">
            <div className="flex gap-0.5 border border-border/50 rounded-md p-0.5 bg-card/50">
              <button
                onClick={() => setRightPanelTab('events')}
                className={`px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  rightPanelTab === 'events'
                    ? 'bg-primary/80 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setRightPanelTab('analytics')}
                className={`px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  rightPanelTab === 'analytics'
                    ? 'bg-primary/80 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Analytics
              </button>
            </div>
            <span className="ml-auto text-[10px] text-muted-foreground/60">{phases.length} phases</span>
          </div>

          {/* Right panel content */}
          <div className="flex-1 min-h-0 overflow-auto">
            {rightPanelTab === 'events' ? (
              <>
                {phases.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-muted-foreground text-xs italic">
                    No phases recorded yet.
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/30">
                      <tr>
                        <th className="w-5 pl-2"></th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground text-[10px]">Time</th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground text-[10px]">Code</th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground text-[10px]">End</th>
                        <th className="px-2 py-1.5 text-center font-medium text-muted-foreground text-[10px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPhases.map((phase) => {
                        const phaseBtn = buttonConfig.find(b => b.code === phase.phaseCode);
                        const termColour =
                          phase.terminationCategory === 'success' ? 'text-green-400' :
                          phase.terminationCategory === 'failure' ? 'text-red-400' :
                          'text-muted-foreground';
                        return (
                          <tr key={phase.id} className="border-b border-border/40 hover:bg-accent/30 transition-colors">
                            <td className="pl-2 py-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${getPhaseStatusDot(phase)}`} />
                            </td>
                            <td className="px-2 py-1.5 font-mono">{formatMs(phase.startTimeMs)}</td>
                            <td className="px-2 py-1.5">
                              {phase.phaseLabel ? (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                  style={{ backgroundColor: phaseBtn?.style.colour || '#666', color: 'white' }}
                                >
                                  {phase.phaseLabel}
                                </span>
                              ) : (
                                '\u2014'
                              )}
                            </td>
                            <td className={`px-2 py-1.5 ${termColour}`}>
                              {phase.terminationEvent || '\u2014'}
                            </td>
                            <td className="px-1 py-1.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => updatePhase(phase.id, { needsReview: !phase.needsReview })}
                                  className={`p-1 rounded hover:bg-accent/50 transition-colors ${phase.needsReview ? 'text-amber-500' : 'text-muted-foreground'}`}
                                  title={phase.needsReview ? 'Remove review flag' : 'Flag for review'}
                                >
                                  <Flag className="w-3 h-3" fill={phase.needsReview ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Delete phase "${phase.phaseLabel || 'Undefined'}"?`)) deletePhase(phase.id); }}
                                  className="p-1 rounded hover:bg-destructive/50 transition-colors text-muted-foreground hover:text-destructive"
                                  title="Delete phase"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <div className="p-3">
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
                {analyticsTab === 'efficiency' ? (
                  <PhaseEfficiency phases={phases} />
                ) : (
                  <PhaseTransition phases={phases} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom panel resize handle ─────────────────────────────── */}
      {!eventLogCollapsed && (
        <div
          className="h-1 bg-border/30 hover:bg-primary/50 cursor-ns-resize transition-colors shrink-0"
          onMouseDown={handleResizeStart}
        />
      )}

      {/* ── Bottom panel: Timeline ─────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/50">
        {/* Header */}
        <div
          className="px-3 py-1.5 flex items-center gap-3 cursor-pointer hover:bg-accent/20 transition-colors bg-card/30"
          onClick={() => setEventLogCollapsed(!eventLogCollapsed)}
        >
          <span className="text-[11px] font-medium text-muted-foreground">Timeline</span>
          {tabData?.match.timelineOffsetMs ? (
            <span className="text-[10px] text-muted-foreground/60">
              (shifted {tabData.match.timelineOffsetMs > 0 ? "+" : ""}{(tabData.match.timelineOffsetMs / 1000).toFixed(1)}s)
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            {tabData?.lastTimelineShiftMs !== null && tabData?.lastTimelineShiftMs !== undefined && (
              <button
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title="Undo timeline shift"
                onClick={e => { e.stopPropagation(); undoTimelineShift(); }}
              >
                <Undo2 className="w-3 h-3" />
                Undo shift
              </button>
            )}
            <button
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              title="Shift timeline to sync with video"
              onClick={e => { e.stopPropagation(); setShiftModalOpen(true); }}
            >
              <ClockIcon className="w-3 h-3" />
              Shift timeline
            </button>
            <SaveIndicator tabId={tabId} />
            <button
              className="p-0.5 hover:bg-accent rounded"
              onClick={e => { e.stopPropagation(); setEventLogCollapsed(!eventLogCollapsed); }}
            >
              {eventLogCollapsed
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Timeline content */}
        {!eventLogCollapsed && (
          <div style={{ height: `${eventLogHeight}px` }} className="overflow-hidden">
            <TimelineView
              phases={phases}
              buttonConfig={buttonConfig}
              zoomLevel={timelineZoom}
              onZoomChange={setTimelineZoom}
              currentTimeMs={clock.currentTimeMs()}
            />
          </div>
        )}
      </div>

      <TimelineShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        currentOffsetMs={tabData?.match.timelineOffsetMs || 0}
        onApply={(deltaSeconds) => shiftTimeline(deltaSeconds * 1000)}
      />

    </div>
  );
}

