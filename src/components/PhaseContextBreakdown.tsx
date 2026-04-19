import { Phase, PhaseStatus } from "../lib/types";

interface PhaseContextBreakdownProps {
  phases: Phase[];
}

interface OutletStats {
  man: number;
  zone: number;
  notTagged: number;
  total: number;
}

interface PressStats {
  pressing1: number;
  pressing2: number;
  pressing3: number;
  notTagged: number;
  total: number;
}

export default function PhaseContextBreakdown({ phases }: PhaseContextBreakdownProps) {
  const calculateOutletStats = (): OutletStats => {
    const outletPhases = phases.filter(
      (p) => p.phaseCode === "OUTLET" && p.status !== PhaseStatus.UNDEFINED
    );

    const stats: OutletStats = {
      man: 0,
      zone: 0,
      notTagged: 0,
      total: outletPhases.length,
    };

    outletPhases.forEach((phase) => {
      if (phase.contextLabels.includes("VS_MAN")) {
        stats.man++;
      } else if (phase.contextLabels.includes("VS_ZONE")) {
        stats.zone++;
      } else {
        stats.notTagged++;
      }
    });

    return stats;
  };

  const calculatePressStats = (): PressStats => {
    const pressPhases = phases.filter(
      (p) => p.phaseCode === "PRESS" && p.status !== PhaseStatus.UNDEFINED
    );

    const stats: PressStats = {
      pressing1: 0,
      pressing2: 0,
      pressing3: 0,
      notTagged: 0,
      total: pressPhases.length,
    };

    pressPhases.forEach((phase) => {
      if (phase.contextLabels.includes("1_PRESSING")) {
        stats.pressing1++;
      } else if (phase.contextLabels.includes("2_PRESSING")) {
        stats.pressing2++;
      } else if (phase.contextLabels.includes("3_PRESSING")) {
        stats.pressing3++;
      } else {
        stats.notTagged++;
      }
    });

    return stats;
  };

  const outletStats = calculateOutletStats();
  const pressStats = calculatePressStats();

  const renderBar = (
    segments: { label: string; count: number; colour: string }[],
    total: number
  ) => {
    if (total === 0) {
      return (
        <div className="text-xs text-muted-foreground italic">No data</div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex h-8 rounded overflow-hidden border border-border/40">
          {segments.map((segment, idx) => {
            const percentage = (segment.count / total) * 100;
            if (percentage === 0) return null;

            return (
              <div
                key={idx}
                className="flex items-center justify-center text-xs font-medium text-white transition-all"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: segment.colour,
                }}
                title={`${segment.label}: ${segment.count} (${percentage.toFixed(1)}%)`}
              >
                {percentage > 10 && (
                  <span className="px-1">{segment.count}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {segments.map((segment, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: segment.colour }}
              />
              <span className="text-muted-foreground">
                {segment.label}: {segment.count} ({((segment.count / total) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 overflow-y-auto pr-2">
      {/* Outlet Breakdown */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-foreground">
          Outlet Context ({outletStats.total} phases)
        </h4>
        {renderBar(
          [
            { label: "vs Man", count: outletStats.man, colour: "#2563eb" },
            { label: "vs Zone", count: outletStats.zone, colour: "#7c3aed" },
            { label: "Not Tagged", count: outletStats.notTagged, colour: "#64748b" },
          ],
          outletStats.total
        )}
      </div>

      {/* Press Breakdown */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-foreground">
          Press Context ({pressStats.total} phases)
        </h4>
        {renderBar(
          [
            { label: "1 Pressing", count: pressStats.pressing1, colour: "#dc2626" },
            { label: "2 Pressing", count: pressStats.pressing2, colour: "#ea580c" },
            { label: "3 Pressing", count: pressStats.pressing3, colour: "#f59e0b" },
            { label: "Not Tagged", count: pressStats.notTagged, colour: "#64748b" },
          ],
          pressStats.total
        )}
      </div>
    </div>
  );
}
