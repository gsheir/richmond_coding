// Preview of the merged match: summary, warnings, timeline and event table
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { TimelineView } from "../TimelineView";
import { ButtonConfig } from "@/lib/types";
import { MergedEvents, MergeWarning } from "@/lib/match-merge";
import { formatTimeMs } from "@/lib/utils";
import { getSegmentColour } from "./segment-colours";

interface MergePreviewProps {
  events: MergedEvents;
  warnings: MergeWarning[];
  buttons: ButtonConfig[];
  durationMs: number;
}

interface PreviewRow {
  key: string;
  timeMs: number;
  endTimeMs: number | null;
  period: string;
  kind: "Phase" | "Point";
  label: string;
  detail: string;
  segmentIndex: number;
  isUnfinished: boolean;
}

function buildPreviewRows(events: MergedEvents): PreviewRow[] {
  const rows: PreviewRow[] = [
    ...events.phases.map((phase) => ({
      key: `phase-${phase.id}`,
      timeMs: phase.startTimeMs,
      endTimeMs: phase.endTimeMs,
      period: phase.period,
      kind: "Phase" as const,
      label: phase.phaseLabel ?? phase.phaseCode ?? "Undefined",
      detail: [phase.terminationEvent, ...phase.contextLabels].filter(Boolean).join(" · "),
      segmentIndex: phase.segmentIndex,
      isUnfinished: phase.endTimeMs === null,
    })),
    ...events.pointEvents.map((event) => ({
      key: `point-${event.id}`,
      timeMs: event.timeMs,
      endTimeMs: null,
      period: event.period,
      kind: "Point" as const,
      label: event.label,
      detail: "",
      segmentIndex: event.segmentIndex,
      isUnfinished: false,
    })),
  ];
  return rows.sort((a, b) => a.timeMs - b.timeMs || a.segmentIndex - b.segmentIndex);
}

export function MergePreview({ events, warnings, buttons, durationMs }: MergePreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const rows = useMemo(() => buildPreviewRows(events), [events]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {events.phases.length} phases · {events.pointEvents.length} point events · {formatTimeMs(durationMs)} total
      </p>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 space-y-1">
          {warnings.map((warning, index) => (
            <p key={index} className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getSegmentColour(warning.segmentIndex) }}
              />
              Segment {warning.segmentIndex + 1} {warning.message}
            </p>
          ))}
        </div>
      )}

      <div className="h-64 rounded-lg border border-border/40 overflow-hidden bg-card">
        <TimelineView
          phases={events.phases}
          pointEvents={events.pointEvents}
          buttonConfig={buttons}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          currentTimeMs={0}
        />
      </div>

      <div className="max-h-96 overflow-auto rounded-lg border border-border/40">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card text-muted-foreground">
            <tr className="text-left border-b border-border/40">
              <th className="px-2 py-1.5 font-medium">Seg.</th>
              <th className="px-2 py-1.5 font-medium">Start</th>
              <th className="px-2 py-1.5 font-medium">End</th>
              <th className="px-2 py-1.5 font-medium">Period</th>
              <th className="px-2 py-1.5 font-medium">Type</th>
              <th className="px-2 py-1.5 font-medium">Event</th>
              <th className="px-2 py-1.5 font-medium">Termination / context</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/20">
                <td className="px-2 py-1" style={{ borderLeft: `3px solid ${getSegmentColour(row.segmentIndex)}` }}>
                  {row.segmentIndex + 1}
                </td>
                <td className="px-2 py-1 font-mono">{formatTimeMs(row.timeMs)}</td>
                <td className="px-2 py-1 font-mono">
                  {row.endTimeMs !== null ? formatTimeMs(row.endTimeMs) : row.isUnfinished ? (
                    <span className="text-amber-500">unfinished</span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="px-2 py-1">{row.period}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.kind}</td>
                <td className="px-2 py-1 font-medium">{row.label}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
