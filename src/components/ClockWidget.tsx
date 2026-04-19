// Clock display and controls
import { Play, Pause, SkipBack, SkipForward, FastForward, Rewind } from "lucide-react";
import { Button } from "./ui/Button";
import { useAppStore } from "@/lib/store";
import { ClockState } from "@/lib/types";
import { GameClock } from "@/lib/clock";
import { useState } from "react";

interface ClockWidgetProps {
  clockState: ClockState;
  currentTime: string;
  clock: GameClock;
}

export function ClockWidget({ clockState, currentTime, clock }: ClockWidgetProps) {
  const { 
    startClock, 
    pauseClock, 
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
  const maxMinutes = Math.floor(latestTimeMs / 60000);
  const maxSeconds = Math.floor((latestTimeMs % 60000) / 1000);
  const maxTimeString = `${maxMinutes.toString().padStart(2, "0")}:${maxSeconds.toString().padStart(2, "0")}`;

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
    <div className="flex items-center gap-4">
      {/* Clock display */}
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-mono font-bold tabular-nums">
          {currentTime}
        </span>
      </div>

      {/* Primary controls */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button
            onClick={startClock}
            variant="attack"
            size="sm"
            className="gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            Start
          </Button>
        ) : (
          <Button
            onClick={pauseClock}
            variant="destructive"
            size="sm"
            className="gap-1.5"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause
          </Button>
        )}
      </div>

      {/* Skip controls */}
      <div className="flex items-center gap-1 border-l border-border pl-4">
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

      {/* Jump to time */}
      <div className="flex items-center gap-2 border-l border-border pl-4">
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
