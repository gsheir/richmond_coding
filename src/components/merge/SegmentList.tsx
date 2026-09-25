// Ordered list of segments to merge, each with its offset and period
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Match, getMatchDisplayName } from "@/lib/types";
import { getSegmentDurationMs } from "@/lib/match-merge";
import { cn, formatOffsetMs, formatTimeMs, parseOffsetInput } from "@/lib/utils";
import { getSegmentColour } from "./segment-colours";

export interface SegmentRow {
  match: Match;
  offsetMs: number;
  period: string;
  hasUnsavedChanges: boolean;
}

interface SegmentListProps {
  rows: SegmentRow[];
  onOffsetChange: (index: number, offsetMs: number) => void;
  onPeriodChange: (index: number, period: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}

const inputClassName =
  "px-2 py-1 text-xs bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring";

// Text input for a signed time offset; invalid input reverts to the last valid value on blur
function OffsetInput({ valueMs, onChange }: { valueMs: number; onChange: (ms: number) => void }) {
  const [draft, setDraft] = useState(formatOffsetMs(valueMs));

  useEffect(() => {
    setDraft(formatOffsetMs(valueMs));
  }, [valueMs]);

  const commit = () => {
    const parsed = parseOffsetInput(draft);
    if (parsed === null) {
      setDraft(formatOffsetMs(valueMs));
      return;
    }
    setDraft(formatOffsetMs(parsed));
    if (parsed !== valueMs) onChange(parsed);
  };

  const isValid = parseOffsetInput(draft) !== null;

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(formatOffsetMs(valueMs));
      }}
      title="Video time where this segment's 00:00 falls – h:mm:ss, mm:ss or seconds"
      className={cn(inputClassName, "w-24 font-mono", !isValid && "border-destructive focus:ring-destructive")}
    />
  );
}

export function SegmentList({ rows, onOffsetChange, onPeriodChange, onMove, onRemove }: SegmentListProps) {
  return (
    <div className="grid gap-2">
      {rows.map((row, index) => {
        const durationMs = getSegmentDurationMs(row.match);
        return (
          <div
            key={row.match.id}
            className="flex items-center gap-3 bg-card/80 rounded-xl border border-border/50 p-3"
            style={{ borderLeft: `4px solid ${getSegmentColour(index)}` }}
          >
            <span className="text-xs font-semibold text-muted-foreground w-4 text-center">{index + 1}</span>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{getMatchDisplayName(row.match)}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {row.match.phases.length} phases · {(row.match.pointEvents ?? []).length} point events ·{" "}
                {formatTimeMs(durationMs)} long · ends at {formatOffsetMs(row.offsetMs + durationMs)}
              </p>
              {row.hasUnsavedChanges && (
                <p className="text-[11px] text-amber-500 mt-0.5">
                  Open with unsaved changes – they'll be saved before merging but aren't in this preview.
                </p>
              )}
            </div>

            <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              Starts at
              <OffsetInput valueMs={row.offsetMs} onChange={(ms) => onOffsetChange(index, ms)} />
            </label>

            <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              Period
              <input
                type="text"
                value={row.period}
                onChange={(e) => onPeriodChange(index, e.target.value)}
                className={cn(inputClassName, "w-16", !row.period.trim() && "border-destructive")}
              />
            </label>

            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                title="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMove(index, 1)}
                disabled={index === rows.length - 1}
                title="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onRemove(index)} title="Remove segment">
                <X className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
