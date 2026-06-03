// Timeline view for coded phases
import { Phase, ButtonConfig, ButtonType } from "@/lib/types";

import { ZoomIn, ZoomOut } from "lucide-react";

interface TimelineViewProps {
  phases: Phase[];
  buttonConfig: ButtonConfig[];
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  currentTimeMs: number;
}

const ROW_HEIGHT = 28;
const LABEL_WIDTH = 120;
const RULER_HEIGHT = 24;
const BAR_HEIGHT = 20;
const BAR_TOP = (ROW_HEIGHT - BAR_HEIGHT) / 2;

function formatTimeLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getNiceTickIntervalMs(totalDurationMs: number, canvasWidth: number): number {
  const pxPerMs = canvasWidth / totalDurationMs;
  const targetPx = 80;
  const rawIntervalMs = targetPx / pxPerMs;
  const niceIntervals = [
    1000, 2000, 5000, 10000, 15000, 30000,
    60000, 120000, 300000, 600000, 1800000, 3600000,
  ];
  for (const interval of niceIntervals) {
    if (interval >= rawIntervalMs) return interval;
  }
  return 3600000;
}

export function TimelineView({
  phases,
  buttonConfig,
  zoomLevel,
  onZoomChange,
  currentTimeMs,
}: TimelineViewProps) {

  // Build ordered track list from button config (phase buttons only, ordered left-to-right then top-to-bottom)
  const phaseButtons = buttonConfig
    .filter(b => b.type === ButtonType.PHASE)
    .sort((a, b) =>
      a.position.x !== b.position.x
        ? a.position.x - b.position.x
        : a.position.y - b.position.y
    );

  // Only show rows for phase codes that have at least one instance
  const usedCodes = new Set(
    phases.map(p => p.phaseCode).filter(Boolean) as string[]
  );
  const tracks = phaseButtons.filter(b => usedCodes.has(b.code));

  // Total duration: furthest point reached across all phases or clock
  const maxEndMs = phases.reduce((max, p) => {
    const end = p.endTimeMs ?? currentTimeMs;
    return Math.max(max, end, p.startTimeMs + 1000);
  }, 0);
  const totalDurationMs = Math.max(maxEndMs, currentTimeMs, 1000);

  // Canvas width grows with zoom level
  const canvasWidth = Math.round(800 * zoomLevel);

  // Time ruler ticks
  const tickIntervalMs = getNiceTickIntervalMs(totalDurationMs, canvasWidth);
  const ticks: number[] = [];
  for (let t = 0; t <= totalDurationMs; t += tickIntervalMs) {
    ticks.push(t);
  }

  // Playhead position
  const playheadX = Math.round((currentTimeMs / totalDurationMs) * canvasWidth);

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">
        No phases recorded yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Single scroll container – one scroll area for both axes */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* Inner content sized to full canvas width */}
        <div style={{ width: canvasWidth + LABEL_WIDTH, minHeight: "100%" }}>

          {/* Sticky ruler row */}
          <div
            className="flex sticky top-0 z-10 border-b border-border/40 bg-card"
            style={{ height: RULER_HEIGHT }}
          >
            {/* Corner cell – sticky on both axes */}
            <div
              className="shrink-0 sticky left-0 z-20 bg-card border-r border-border/40"
              style={{ width: LABEL_WIDTH }}
            />
            {/* Ruler ticks */}
            <div className="relative flex-1">
              {ticks.map(t => {
                const x = (t / totalDurationMs) * canvasWidth;
                return (
                  <div
                    key={t}
                    className="absolute top-0 flex flex-col items-start"
                    style={{ left: x }}
                  >
                    <div className="w-px h-2.5 bg-border/60 mt-1" />
                    <span className="text-[9px] text-muted-foreground/70 pl-0.5 leading-none whitespace-nowrap">
                      {formatTimeLabel(t)}
                    </span>
                  </div>
                );
              })}
              {/* Playhead triangle */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: playheadX - 5,
                  top: 2,
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "8px solid rgba(255,215,0,0.95)",
                }}
              />
              {/* Playhead line in ruler */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: playheadX, width: 1, backgroundColor: "rgba(255,215,0,0.85)" }}
              />
            </div>
          </div>

          {/* Track rows */}
          {tracks.map((track, rowIndex) => {
            const trackPhases = phases.filter(p => p.phaseCode === track.code);
            return (
              <div
                key={track.code}
                className="flex border-b border-border/20"
                style={{
                  height: ROW_HEIGHT,
                  backgroundColor:
                    rowIndex % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                }}
              >
                {/* Sticky label cell */}
                <div
                  className="shrink-0 sticky left-0 z-10 flex items-center px-2 text-xs font-medium overflow-hidden border-r border-border/20"
                  style={{
                    width: LABEL_WIDTH,
                    backgroundColor: `${track.style.colour}28`,
                    borderLeft: `3px solid ${track.style.colour}`,
                  }}
                >
                  <span className="truncate text-foreground/90">{track.label}</span>
                </div>

                {/* Phase bars */}
                <div className="relative flex-1">
                  {trackPhases.map(phase => {
                    const endMs = phase.endTimeMs ?? currentTimeMs;
                    const left = (phase.startTimeMs / totalDurationMs) * canvasWidth;
                    const rawWidth =
                      ((endMs - phase.startTimeMs) / totalDurationMs) * canvasWidth;
                    const width = Math.max(rawWidth, 4);
                    const isActive = !phase.endTimeMs;

                    return (
                      <div
                        key={phase.id}
                        className="absolute rounded-sm overflow-hidden"
                        style={{
                          left,
                          width,
                          top: BAR_TOP,
                          height: BAR_HEIGHT,
                          backgroundColor: track.style.colour,
                          opacity: phase.terminationCategory === "failure" ? 0.65 : 1,
                          boxShadow: isActive
                            ? `0 0 6px 1px ${track.style.colour}88`
                            : undefined,
                        }}
                        title={`${phase.phaseLabel || "Undefined"} – ${formatTimeLabel(phase.startTimeMs)}${phase.endTimeMs ? ` → ${formatTimeLabel(phase.endTimeMs)}` : " (active)"}`}
                      >
                        {phase.terminationCategory && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1"
                            style={{
                              backgroundColor:
                                phase.terminationCategory === "success"
                                  ? "#22c55e"
                                  : phase.terminationCategory === "failure"
                                  ? "#ef4444"
                                  : "#f59e0b",
                            }}
                          />
                        )}
                        {width > 40 && (
                          <span className="absolute inset-0 flex items-center px-1.5 text-[9px] font-bold text-white/90 truncate leading-none pointer-events-none select-none">
                            {phase.phaseLabel || phase.phaseCode}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Playhead line through this row */}
                  <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{ left: playheadX, width: 1, backgroundColor: "rgba(255,215,0,0.85)" }}
                  />
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Zoom slider footer */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-t border-border/40 bg-card/30">
        <button
          onClick={() =>
            onZoomChange(Math.max(1, parseFloat((zoomLevel - 0.5).toFixed(1))))
          }
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min={1}
          max={10}
          step={0.1}
          value={zoomLevel}
          onChange={e => onZoomChange(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-primary cursor-pointer"
        />
        <button
          onClick={() =>
            onZoomChange(Math.min(10, parseFloat((zoomLevel + 0.5).toFixed(1))))
          }
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
          {zoomLevel.toFixed(1)}×
        </span>
      </div>
    </div>
  );
}
