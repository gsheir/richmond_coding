// Clock display and controls
import { Play, Pause } from "lucide-react";
import { Button } from "./ui/Button";
import { useAppStore } from "@/lib/store";
import { ClockState } from "@/lib/types";

export function ClockWidget() {
  const { clockState, currentTime, startClock, pauseClock, canStartClock } =
    useAppStore();
  
  const isRunning = clockState === ClockState.RUNNING;
  const canStart = canStartClock();

  return (
    <div className="flex items-center gap-3">
      {/* Clock display */}
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-mono font-bold tabular-nums">
          {currentTime}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button
            onClick={startClock}
            variant="attack"
            size="sm"
            className="gap-1.5"
            disabled={!canStart}
            title={!canStart ? "Please fill in all match details" : ""}
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
    </div>
  );
}
