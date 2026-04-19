// Phase efficiency visualization with horizontal stacked bars
import { Phase, PhaseStatus } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface PhaseEfficiencyProps {
  phases: Phase[];
}

interface PhaseStats {
  code: string;
  label: string;
  successCount: number;
  holdCount: number;
  failureCount: number;
  total: number;
  successRate: number;
}

export function PhaseEfficiency({ phases }: PhaseEfficiencyProps) {
  const { buttonConfig } = useAppStore();

  // Filter to only terminated phases
  const terminatedPhases = phases.filter(p => p.status === PhaseStatus.TERMINATED);

  // Get phase buttons with possession states
  const phaseButtons = buttonConfig.filter(b => b.type === 'phase');
  const inPossessionPhases = phaseButtons.filter(b => b.possessionState === 'in-possession');
  const outOfPossessionPhases = phaseButtons.filter(b => b.possessionState === 'out-of-possession');

  // Calculate stats for each phase
  const calculateStats = (phaseCode: string, phaseLabel: string): PhaseStats | null => {
    const phaseCodes = terminatedPhases.filter(p => p.phaseCode === phaseCode);
    
    if (phaseCodes.length === 0) return null;

    const successCount = phaseCodes.filter(p => p.terminationCategory === 'success').length;
    const holdCount = phaseCodes.filter(p => p.terminationCategory === 'hold').length;
    const failureCount = phaseCodes.filter(p => p.terminationCategory === 'failure').length;
    const total = successCount + holdCount + failureCount;

    if (total === 0) return null;

    return {
      code: phaseCode,
      label: phaseLabel,
      successCount,
      holdCount,
      failureCount,
      total,
      successRate: (successCount / total) * 100,
    };
  };

  // Get stats for each possession category
  const inPossessionStats = inPossessionPhases
    .map(btn => calculateStats(btn.code, btn.label))
    .filter((stat): stat is PhaseStats => stat !== null)
    .sort((a, b) => b.total - a.total); // Sort by total count

  const outOfPossessionStats = outOfPossessionPhases
    .map(btn => calculateStats(btn.code, btn.label))
    .filter((stat): stat is PhaseStats => stat !== null)
    .sort((a, b) => b.total - a.total);

  const renderPhaseBar = (stat: PhaseStats) => {
    const successPercent = (stat.successCount / stat.total) * 100;
    const holdPercent = (stat.holdCount / stat.total) * 100;
    const failurePercent = (stat.failureCount / stat.total) * 100;

    return (
      <div key={stat.code} className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">{stat.label}</span>
          <span className="text-xs text-muted-foreground">
            {stat.total} {stat.total === 1 ? 'phase' : 'phases'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Stacked bar */}
          <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden flex">
            {/* Success section */}
            {stat.successCount > 0 && (
              <div
                className="bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                style={{ width: `${successPercent}%` }}
                title={`${stat.successCount} successful (${successPercent.toFixed(1)}%)`}
              >
                {successPercent > 15 && (
                  <span className="text-xs font-semibold text-white">
                    {stat.successCount}
                  </span>
                )}
              </div>
            )}
            {/* Hold section */}
            {stat.holdCount > 0 && (
              <div
                className="bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center"
                style={{ width: `${holdPercent}%` }}
                title={`${stat.holdCount} hold (${holdPercent.toFixed(1)}%)`}
              >
                {holdPercent > 15 && (
                  <span className="text-xs font-semibold text-white">
                    {stat.holdCount}
                  </span>
                )}
              </div>
            )}
            {/* Failure section */}
            {stat.failureCount > 0 && (
              <div
                className="bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                style={{ width: `${failurePercent}%` }}
                title={`${stat.failureCount} unsuccessful (${failurePercent.toFixed(1)}%)`}
              >
                {failurePercent > 15 && (
                  <span className="text-xs font-semibold text-white">
                    {stat.failureCount}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Success rate */}
          <span className="text-xs font-semibold text-foreground w-12 text-right">
            {stat.successRate.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, stats: PhaseStats[], emptyMessage: string) => (
    <div className="flex-1 min-w-0">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3">{title}</h4>
      {stats.length > 0 ? (
        <div className="space-y-3">
          {stats.map(renderPhaseBar)}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground/60 italic">
          {emptyMessage}
        </div>
      )}
    </div>
  );

  if (terminatedPhases.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No terminated phases yet. Phase efficiency will appear here.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 pb-3 border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Success</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Hold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Failure</span>
        </div>
      </div>

      {/* Responsive layout: side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSection(
          "In Possession",
          inPossessionStats,
          "No in-possession phases terminated yet"
        )}
        {renderSection(
          "Out of Possession",
          outOfPossessionStats,
          "No out-of-possession phases terminated yet"
        )}
      </div>
    </div>
  );
}
