// Modal for shifting the whole coded timeline by a fixed offset (syncing to video)
import { useState } from "react";
import { Button } from "./ui/Button";
import { X } from "lucide-react";

interface TimelineShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOffsetMs: number;
  onApply: (deltaSeconds: number) => void;
}

export function TimelineShiftModal({ isOpen, onClose, currentOffsetMs, onApply }: TimelineShiftModalProps) {
  const [seconds, setSeconds] = useState("");

  if (!isOpen) return null;

  const parsed = parseFloat(seconds);
  const isValid = seconds.trim() !== "" && !isNaN(parsed) && parsed !== 0;

  const handleClose = () => {
    setSeconds("");
    onClose();
  };

  const handleApply = () => {
    if (!isValid) return;
    const direction = parsed > 0 ? "later" : "earlier";
    if (!confirm(`Shift every coded event ${Math.abs(parsed)}s ${direction}? This affects all events in the timeline.`)) {
      return;
    }
    onApply(parsed);
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div
        className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h2 className="text-lg font-semibold">Shift Timeline</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Shift every coded event by a fixed offset – use this to align the timeline with a video after coding a match live.
          </p>

          {currentOffsetMs !== 0 && (
            <p className="text-xs text-muted-foreground">
              Total offset applied so far: {currentOffsetMs > 0 ? "+" : ""}{(currentOffsetMs / 1000).toFixed(1)}s
            </p>
          )}

          <div>
            <label htmlFor="shift-seconds" className="block text-sm font-medium mb-1.5">
              Offset (seconds)
            </label>
            <input
              id="shift-seconds"
              type="number"
              step="0.1"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              placeholder="e.g. 12.5 or -8"
              autoFocus
              className="w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Positive values move events later; negative values move them earlier.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" onClick={handleClose} variant="outline" size="sm">
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} variant="attack" size="sm" disabled={!isValid}>
              Apply Shift
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
