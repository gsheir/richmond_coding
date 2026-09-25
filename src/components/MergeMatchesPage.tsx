// Page for combining several coded segments (e.g. quarters) into one match
import { useEffect, useMemo, useState } from "react";
import { Combine, ListOrdered, RotateCcw } from "lucide-react";
import { Button } from "./ui/Button";
import { SegmentList, SegmentRow } from "./merge/SegmentList";
import { MergePreview } from "./merge/MergePreview";
import { useAppStore } from "@/lib/store";
import { getMatchDisplayName } from "@/lib/types";
import { resolveButtons, resolveWindowId } from "@/lib/coding-windows";
import {
  MAX_MERGE_SEGMENTS,
  ResolvedMergeSegment,
  autoSequenceOffsets,
  buildMergedEvents,
  detectMergeWarnings,
  getDefaultPeriod,
  getMergedDurationMs,
} from "@/lib/match-merge";

interface MergeMatchesPageProps {
  onOpenMatch: (matchId: string) => Promise<void>;
}

// period is null until edited, so it follows the segment's position (Q1, Q2, …)
interface SegmentDraft {
  matchId: string;
  offsetMs: number;
  period: string | null;
}

const inputClassName =
  "w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring";

export function MergeMatchesPage({ onOpenMatch }: MergeMatchesPageProps) {
  const { matches, tabs, codingWindows, buttonsByWindowId, refreshMatches, mergeMatches } = useAppStore();

  const [segments, setSegments] = useState<SegmentDraft[]>([]);
  const [date, setDate] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [codingWindowId, setCodingWindowId] = useState<number | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshMatches();
  }, [refreshMatches]);

  const matchesById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  // Drop segments whose match has since been deleted
  useEffect(() => {
    setSegments((prev) => {
      const next = prev.filter((s) => matchesById.has(s.matchId));
      return next.length === prev.length ? prev : next;
    });
  }, [matchesById]);

  const resolvedSegments = useMemo<ResolvedMergeSegment[]>(
    () =>
      segments.flatMap((s, index) => {
        const match = matchesById.get(s.matchId);
        return match ? [{ match, offsetMs: s.offsetMs, period: s.period ?? getDefaultPeriod(index) }] : [];
      }),
    [segments, matchesById]
  );

  const mergedEvents = useMemo(() => buildMergedEvents(resolvedSegments), [resolvedSegments]);
  const warnings = useMemo(
    () => detectMergeWarnings(resolvedSegments, codingWindowId ?? undefined),
    [resolvedSegments, codingWindowId]
  );
  const previewButtons = useMemo(
    () => resolveButtons(codingWindows, buttonsByWindowId, codingWindowId),
    [codingWindows, buttonsByWindowId, codingWindowId]
  );

  const unsavedMatchIds = new Set(tabs.filter((t) => t.tab.isDirty).map((t) => t.tab.matchId));
  const rows: SegmentRow[] = resolvedSegments.map((s) => ({
    ...s,
    hasUnsavedChanges: unsavedMatchIds.has(s.match.id),
  }));

  const selectedIds = new Set(segments.map((s) => s.matchId));
  const availableMatches = matches.filter((m) => !selectedIds.has(m.id));
  const isFull = segments.length >= MAX_MERGE_SEGMENTS;

  const canMerge =
    resolvedSegments.length >= 2 &&
    date !== "" &&
    homeTeam.trim() !== "" &&
    awayTeam.trim() !== "" &&
    resolvedSegments.every((s) => s.period.trim() !== "") &&
    !isMerging;

  const updateSegment = (index: number, updates: Partial<SegmentDraft>) => {
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleAddSegment = (matchId: string) => {
    const match = matchesById.get(matchId);
    if (!match || isFull) return;

    // Prefill the merged match's details from the first segment
    if (segments.length === 0) {
      setDate(match.date);
      setHomeTeam(match.homeTeam);
      setAwayTeam(match.awayTeam);
      setCodingWindowId(resolveWindowId(codingWindows, match.codingWindowId));
    }
    setSegments((prev) => [...prev, { matchId, offsetMs: 0, period: null }]);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    setSegments((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAutoSequence = () => {
    const offsets = autoSequenceOffsets(resolvedSegments.map((s) => s.match));
    setSegments((prev) => prev.map((s, i) => ({ ...s, offsetMs: offsets[i] ?? s.offsetMs })));
  };

  const handleResetOffsets = () => {
    setSegments((prev) => prev.map((s) => ({ ...s, offsetMs: 0 })));
  };

  const handleClear = () => {
    setSegments([]);
    setDate("");
    setHomeTeam("");
    setAwayTeam("");
    setCodingWindowId(null);
    setError(null);
  };

  const handleMerge = async () => {
    if (!canMerge) return;
    const summary =
      `Create a new match from ${resolvedSegments.length} segments ` +
      `(${mergedEvents.phases.length} phases, ${mergedEvents.pointEvents.length} point events)? ` +
      "The source matches will be kept.";
    if (!confirm(summary)) return;

    setIsMerging(true);
    setError(null);
    try {
      const newMatchId = await mergeMatches(
        resolvedSegments.map((s) => ({ matchId: s.match.id, offsetMs: s.offsetMs, period: s.period.trim() })),
        {
          date,
          homeTeam: homeTeam.trim(),
          awayTeam: awayTeam.trim(),
          codingWindowId: codingWindowId ?? undefined,
        }
      );
      await onOpenMatch(newMatchId);
    } catch (err) {
      console.error("Failed to merge matches:", err);
      setError(err instanceof Error ? err.message : "Failed to merge matches");
      setIsMerging(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-5 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Merge Matches</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Combine up to {MAX_MERGE_SEGMENTS} segments into a new match. Set each segment's start to the
            video time where its 00:00 falls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleClear} variant="outline" size="sm" disabled={segments.length === 0 || isMerging}>
            Clear
          </Button>
          <Button onClick={handleMerge} variant="attack" size="sm" className="gap-1.5" disabled={!canMerge}>
            <Combine className="w-3.5 h-3.5" />
            {isMerging ? "Merging…" : "Merge"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive rounded-lg border border-destructive/40 bg-destructive/10 p-2.5">
          {error}
        </p>
      )}

      {/* Segments */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Segments{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({segments.length}/{MAX_MERGE_SEGMENTS})
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAutoSequence}
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={segments.length === 0}
              title="Place each segment directly after the previous one"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Auto-sequence
            </Button>
            <Button
              onClick={handleResetOffsets}
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={segments.length === 0}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset offsets
            </Button>
            <select
              value=""
              onChange={(e) => handleAddSegment(e.target.value)}
              disabled={isFull || availableMatches.length === 0}
              className="px-2 py-1 text-xs bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring max-w-72"
            >
              <option value="" disabled>
                {isFull ? "Segment limit reached" : "Add segment…"}
              </option>
              {availableMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {getMatchDisplayName(m)} ({m.phases.length} phases)
                </option>
              ))}
            </select>
          </div>
        </div>

        {rows.length > 0 ? (
          <SegmentList
            rows={rows}
            onOffsetChange={(index, offsetMs) => updateSegment(index, { offsetMs })}
            onPeriodChange={(index, period) => updateSegment(index, { period })}
            onMove={handleMove}
            onRemove={handleRemove}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Add at least two matches to merge.
          </p>
        )}
      </section>

      {/* Merged match details */}
      {segments.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">New match details</h3>
          <div className="grid grid-cols-4 gap-3">
            <label className="text-xs font-medium flex flex-col gap-1">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClassName} />
            </label>
            <label className="text-xs font-medium flex flex-col gap-1">
              Home Team
              <input type="text" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className={inputClassName} />
            </label>
            <label className="text-xs font-medium flex flex-col gap-1">
              Away Team
              <input type="text" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className={inputClassName} />
            </label>
            <label className="text-xs font-medium flex flex-col gap-1">
              Code Window
              <select
                value={codingWindowId ?? ""}
                onChange={(e) => setCodingWindowId(Number(e.target.value))}
                className={inputClassName}
              >
                {codingWindows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {/* Preview */}
      {resolvedSegments.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Preview</h3>
          <MergePreview
            events={mergedEvents}
            warnings={warnings}
            buttons={previewButtons}
            durationMs={getMergedDurationMs(resolvedSegments)}
          />
        </section>
      )}
    </div>
  );
}
