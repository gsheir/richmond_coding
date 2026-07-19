// Clock display and controls
import { Play, Square, SkipBack, SkipForward, FastForward, Rewind } from "lucide-react";
import { Button } from "./ui/Button";
import { useAppStore } from "@/lib/store";
import { ClockState } from "@/lib/types";
import { GameClock } from "@/lib/clock";
import { formatTimeMs } from "@/lib/utils";
import { useState } from "react";

interface ClockWidgetProps {
  clockState: ClockState;
  currentTime: string;
  clock: GameClock;
}

export function ClockWidget({ clockState, currentTime, clock }: ClockWidgetProps) {
  const {
    startClock,
    stopClock,
    skipToStart,
    skipBack,
    skipForward,
    skipToEnd,
    jumpToTime,
  } = useAppStore();
  
  const [jumpTimeInput, setJumpTimeInput] = useState("");
  
  const isRunning = clockState === ClockState.RUNNING;
  
  // Get max time for display
  const latestTimeMs = clock.getLatestTimeMs();
  const maxTimeString = formatTimeMs(latestTimeMs);

  const handleJumpToTime = () => {
    // Parse MM:SS format
    const parts = jumpTimeInput.split(":");
    if (parts.length !== 2) return;
    
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    
    if (isNaN(minutes) || isNaN(seconds)) return;
    
    const timeMs = (minutes * 60 + seconds) * 1000;
    jumpToTime(timeMs);
    setJumpTimeInput("");
  };

  const handleJumpInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJumpToTime();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* First row: timestamp + start/stop + skip controls */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-2xl font-mono font-bold tabular-nums leading-none">
            {currentTime}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isRunning ? (
            <Button
              onClick={startClock}
              variant="attack"
              size="sm"
              className="gap-1 px-2"
            >
              <Play className="w-3.5 h-3.5" />
              Start
            </Button>
          ) : (
            <Button
              onClick={stopClock}
              variant="destructive"
              size="sm"
              className="gap-1 px-2"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 border-l border-border pl-2 min-w-0">
          <Button
            onClick={skipToStart}
            variant="outline"
            size="sm"
            title="Skip to start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={() => skipBack(5)}
            variant="outline"
            size="sm"
            title="Skip back 5s"
          >
            <Rewind className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={() => skipForward(5)}
            variant="outline"
            size="sm"
            title="Skip forward 5s"
          >
            <FastForward className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={skipToEnd}
            variant="outline"
            size="sm"
            title="Skip to latest time"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Second row: jump controls */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={jumpTimeInput}
          onChange={(e) => setJumpTimeInput(e.target.value)}
          onKeyDown={handleJumpInputKeyDown}
          placeholder="MM:SS"
          className="w-20 px-2 py-1 text-sm font-mono bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          onClick={handleJumpToTime}
          variant="outline"
          size="sm"
        >
          Jump to
        </Button>
        <span className="text-xs text-muted-foreground">
          (max {maxTimeString})
        </span>
      </div>
    </div>
  );
}
