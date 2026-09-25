// Combining several coded segments (e.g. quarters coded live) into one match
import { Match, Phase, PointEvent, generateMatchId } from "./types";

export const MAX_MERGE_SEGMENTS = 10;

// A segment as chosen on the merge page, referencing a saved match
export interface MergeSegment {
  matchId: string;
  offsetMs: number;
  period: string;
}

// A segment with its match data loaded
export interface ResolvedMergeSegment {
  match: Match;
  offsetMs: number;
  period: string;
}

export interface MergeOptions {
  date: string;
  homeTeam: string;
  awayTeam: string;
  codingWindowId?: number;
}

export interface MergedPhase extends Phase {
  segmentIndex: number;
}

export interface MergedPointEvent extends PointEvent {
  segmentIndex: number;
}

export interface MergedEvents {
  phases: MergedPhase[];
  pointEvents: MergedPointEvent[];
}

export interface MergeWarning {
  segmentIndex: number;
  message: string;
}

export const getDefaultPeriod = (segmentIndex: number): string => `Q${segmentIndex + 1}`;

// Length of a segment's own timeline: the clock position or the latest event, whichever is later
export function getSegmentDurationMs(match: Match): number {
  const phaseEnd = match.phases.reduce(
    (max, p) => Math.max(max, p.endTimeMs ?? p.startTimeMs),
    0
  );
  const pointEventEnd = (match.pointEvents ?? []).reduce((max, e) => Math.max(max, e.timeMs), 0);
  return Math.max(match.clockTimeMs ?? 0, phaseEnd, pointEventEnd);
}

// Offsets that place each segment directly after the previous one
export function autoSequenceOffsets(matches: Match[]): number[] {
  let nextOffsetMs = 0;
  return matches.map((match) => {
    const offsetMs = nextOffsetMs;
    nextOffsetMs += getSegmentDurationMs(match);
    return offsetMs;
  });
}

export function getMergedDurationMs(segments: ResolvedMergeSegment[]): number {
  return segments.reduce(
    (max, s) => Math.max(max, s.offsetMs + getSegmentDurationMs(s.match)),
    0
  );
}

const shiftTime = (timeMs: number, offsetMs: number): number => Math.max(0, timeMs + offsetMs);

// Shifts, relabels and renumbers every segment's events into one time-ordered timeline
export function buildMergedEvents(segments: ResolvedMergeSegment[]): MergedEvents {
  const phases: MergedPhase[] = [];
  const pointEvents: MergedPointEvent[] = [];

  segments.forEach(({ match, offsetMs, period }, segmentIndex) => {
    for (const phase of match.phases) {
      phases.push({
        ...phase,
        contextLabels: [...phase.contextLabels],
        startTimeMs: shiftTime(phase.startTimeMs, offsetMs),
        endTimeMs: phase.endTimeMs !== null ? shiftTime(phase.endTimeMs, offsetMs) : null,
        period,
        segmentIndex,
      });
    }
    for (const event of match.pointEvents ?? []) {
      pointEvents.push({
        ...event,
        timeMs: shiftTime(event.timeMs, offsetMs),
        period,
        segmentIndex,
      });
    }
  });

  phases.sort(
    (a, b) => a.startTimeMs - b.startTimeMs || a.segmentIndex - b.segmentIndex || a.id - b.id
  );
  pointEvents.sort(
    (a, b) => a.timeMs - b.timeMs || a.segmentIndex - b.segmentIndex || a.id - b.id
  );

  return {
    phases: phases.map((phase, index) => ({ ...phase, id: index })),
    pointEvents: pointEvents.map((event, index) => ({ ...event, id: index })),
  };
}

export function detectMergeWarnings(
  segments: ResolvedMergeSegment[],
  codingWindowId?: number
): MergeWarning[] {
  const warnings: MergeWarning[] = [];
  const ranges = segments.map((s) => ({
    startMs: s.offsetMs,
    endMs: s.offsetMs + getSegmentDurationMs(s.match),
  }));

  segments.forEach(({ match, offsetMs }, segmentIndex) => {
    const pointEvents = match.pointEvents ?? [];

    if (match.phases.length === 0 && pointEvents.length === 0) {
      warnings.push({ segmentIndex, message: "has no coded events" });
    }

    const unfinished = match.phases.filter((p) => p.endTimeMs === null).length;
    if (unfinished > 0) {
      warnings.push({
        segmentIndex,
        message: `has ${unfinished} unfinished phase${unfinished === 1 ? "" : "s"} with no end time`,
      });
    }

    const clamped =
      match.phases.filter((p) => p.startTimeMs + offsetMs < 0).length +
      pointEvents.filter((e) => e.timeMs + offsetMs < 0).length;
    if (clamped > 0) {
      warnings.push({
        segmentIndex,
        message: `has ${clamped} event${clamped === 1 ? "" : "s"} moved before 00:00 by the offset – ${clamped === 1 ? "it" : "they"} will be clamped to 00:00`,
      });
    }

    for (let other = 0; other < segmentIndex; other++) {
      const a = ranges[other];
      const b = ranges[segmentIndex];
      if (a.startMs < b.endMs && b.startMs < a.endMs) {
        warnings.push({ segmentIndex, message: `overlaps segment ${other + 1}` });
      }
    }

    if (
      codingWindowId !== undefined &&
      match.codingWindowId !== undefined &&
      match.codingWindowId !== codingWindowId
    ) {
      warnings.push({
        segmentIndex,
        message: "was coded with a different code window – its codes will still display and export",
      });
    }
  });

  return warnings;
}

export function createMergedMatch(segments: ResolvedMergeSegment[], options: MergeOptions): Match {
  const { phases, pointEvents } = buildMergedEvents(segments);
  const now = new Date().toISOString();

  return {
    id: generateMatchId(options.date, options.homeTeam, options.awayTeam),
    date: options.date,
    homeTeam: options.homeTeam,
    awayTeam: options.awayTeam,
    phases: phases.map(({ segmentIndex: _segmentIndex, ...phase }) => phase),
    pointEvents: pointEvents.map(({ segmentIndex: _segmentIndex, ...event }) => event),
    createdAt: now,
    modifiedAt: now,
    clockTimeMs: getMergedDurationMs(segments),
    codingWindowId: options.codingWindowId,
  };
}
