// Main coding page
import { useEffect, useState } from "react";
import { ClockWidget } from "./ClockWidget";
import { MatchDetailsCard } from "./MatchDetailsCard";
import { ButtonGrid } from "./ButtonGrid";
import { EventLog } from "./EventLog";
import { AutosaveIndicator } from "./AutosaveIndicator";
import { Button } from "./ui/Button";
import { Download, Trash2, Undo } from "lucide-react";
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
  } = useAppStore();

  const [isNarrow, setIsNarrow] = useState(false);

  const phases = eventEngine.getAllPhases();
  const isRunning = clockState === ClockState.RUNNING;

  // Set up space bar for starting phases
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && isRunning) {
        e.preventDefault();
        useAppStore.getState().startPhase();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isRunning]);

  // Detect narrow viewport
  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < 1280);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Top bar with clock and actions */}
      <div className="flex items-center justify-between gap-4">
        <ClockWidget
          clockState={clockState}
          currentTime={currentTime}
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
            onClick={exportXML}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={phases.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>

          <Button
            onClick={clearAllPhases}
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={phases.length === 0}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Match details card - full width */}
      <MatchDetailsCard
        tabId={tabId}
        match={match}
        clockState={clockState}
      />

      {/* Main content area - responsive layout */}
      <div className={`flex-1 ${isNarrow ? 'flex flex-col' : 'flex'} gap-4 min-h-0`}>
        {/* Code window - fixed 720px width on desktop */}
        <div className={isNarrow ? 'flex-1 min-h-0' : 'w-[720px] shrink-0'} >
          <div className="h-full bg-card/70 backdrop-blur-sm rounded-xl border border-border/50 p-3 flex flex-col overflow-hidden">
            <h3 className="font-semibold text-xs mb-3 text-muted-foreground">Code Window</h3>
            <div className="relative flex-1 min-h-0">
              <ButtonGrid buttons={buttonConfig} disabled={!isRunning} />
            </div>
          </div>
        </div>

        {/* Event log - takes remaining space on desktop, bottom on mobile */}
        <div className={isNarrow ? 'min-h-40 shrink-0' : 'flex-1 min-h-0'}>
          <EventLog phases={phases} />
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
