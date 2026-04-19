// Phase Transition visualization showing phase progression patterns

import { useState, useMemo } from "react";
import { Phase } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import {
  calculatePhaseTransitions,
  getAvailableStartingPhases,
  PhaseTransitionData,
  TransitionResult,
} from "@/lib/phase-transitions";

interface PhaseTransitionProps {
  phases: Phase[];
}

interface TransitionFlowProps {
  title: string;
  description: string;
  startingPhaseCode: string;
  startingPhaseLabel: string;
  startingPhaseColour: string;
  transitions: TransitionResult[];
  sampleSize: number;
}

function TransitionFlow({
  title,
  description,
  startingPhaseCode,
  startingPhaseLabel,
  startingPhaseColour,
  transitions,
  sampleSize,
}: TransitionFlowProps) {
  if (transitions.length === 0) {
    return (
      <div className="space-y-2">
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground">{title}</h5>
          <p className="text-xs text-muted-foreground/70">{description}</p>
        </div>
        <div className="text-xs text-muted-foreground py-4 text-center">
          No transitions recorded
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-center">
        <h5 className="text-xs font-semibold text-muted-foreground">{title}</h5>
        <p className="text-xs text-muted-foreground/70">{description}</p>
      </div>

      <div className="space-y-1.5 max-w-2xl mx-auto">
        {transitions.map((transition) => {
          // Use muted grey for same-phase transitions to highlight actual changes
          const isSamePhase = transition.destinationPhase === startingPhaseCode;
          const barColour = isSamePhase ? "#4a4a4a" : transition.colour;
          
          return (
            <div key={transition.destinationPhase} className="flex items-center gap-2">
              {/* Flow bar */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-6 rounded overflow-hidden bg-muted/30 relative">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${transition.percentage}%`,
                      backgroundColor: barColour,
                      opacity: 0.8,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-foreground">
                    {transition.destinationLabel}
                  </div>
                </div>

                {/* Percentage label */}
                <div className="shrink-0 w-12 text-right text-xs font-semibold text-muted-foreground">
                  {transition.percentage.toFixed(0)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground/60 mt-2 text-center">
        Based on {sampleSize} instance{sampleSize !== 1 ? "s" : ""} of {startingPhaseLabel}
      </div>
    </div>
  );
}

function PossessionSection({
  possessionState,
  phases,
  selectedPhaseCode,
  setSelectedPhaseCode,
}: {
  possessionState: "in-possession" | "out-of-possession";
  phases: Phase[];
  selectedPhaseCode: string | null;
  setSelectedPhaseCode: (code: string | null) => void;
}) {
  const { buttonConfig } = useAppStore();

  // Get available starting phases for this possession state
  const availablePhases = useMemo(
    () => getAvailableStartingPhases(buttonConfig, possessionState),
    [buttonConfig, possessionState]
  );

  // Sort by hierarchy level
  const sortedPhases = useMemo(() => {
    return [...availablePhases].sort((a, b) => {
      const aHierarchy = a.hierarchyLevel || 0;
      const bHierarchy = b.hierarchyLevel || 0;
      return possessionState === "in-possession"
        ? aHierarchy - bHierarchy // Low to high for in-possession
        : bHierarchy - aHierarchy; // High to low for out-of-possession
    });
  }, [availablePhases, possessionState]);

  // Auto-select first phase if none selected
  const effectiveSelectedPhase =
    selectedPhaseCode || (sortedPhases.length > 0 ? sortedPhases[0].code : null);

  // Calculate transition data for selected phase
  const transitionData: PhaseTransitionData | null = useMemo(() => {
    if (!effectiveSelectedPhase) return null;
    return calculatePhaseTransitions(phases, buttonConfig, effectiveSelectedPhase, possessionState);
  }, [phases, buttonConfig, effectiveSelectedPhase, possessionState]);

  if (sortedPhases.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No {possessionState} phases configured
      </div>
    );
  }

  const selectedButton = buttonConfig.find((btn) => btn.code === effectiveSelectedPhase);

  return (
    <div className="space-y-3">
      {/* Phase Sequence Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {sortedPhases.map((phase, index) => (
            <div key={phase.code} className="flex items-center gap-1">
              <div
                className={`px-2 py-1 rounded text-xs font-medium text-white cursor-pointer transition-all ${
                  phase.code === effectiveSelectedPhase
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "opacity-60 hover:opacity-100"
                }`}
                style={{ backgroundColor: phase.style.colour }}
                onClick={() => setSelectedPhaseCode(phase.code)}
                title={`Hierarchy: ${phase.hierarchyLevel}`}
              >
                {phase.label}
              </div>
              {index < sortedPhases.length - 1 && (
                <span className="text-muted-foreground text-xs">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transition Flows */}
      {transitionData && (
        <div className="space-y-4 border-t border-border/40 pt-3">
          <TransitionFlow
            title={
              possessionState === "in-possession"
                ? "10s - Most Attacking Phase Reached"
                : "10s - Most Defensive Phase Reached"
            }
            description={
              possessionState === "in-possession"
                ? "Progression within possession - which attacking phase is reached?"
                : "Progression within defense - which defensive phase is reached?"
            }
            startingPhaseCode={transitionData.startingPhase}
            startingPhaseLabel={transitionData.startingLabel}
            startingPhaseColour={selectedButton?.style.colour || "#666666"}
            transitions={transitionData.transitions10s}
            sampleSize={transitionData.sampleSize}
          />

          <TransitionFlow
            title={
              possessionState === "in-possession"
                ? "20s - Counter-Attack: Most Defensive Phase Reached"
                : "20s - Counter-Attack: Most Attacking Phase Reached"
            }
            description={
              possessionState === "in-possession"
                ? "After losing possession - which defensive phase is reached?"
                : "After winning possession - which attacking phase is reached?"
            }
            startingPhaseCode={transitionData.startingPhase}
            startingPhaseLabel={transitionData.startingLabel}
            startingPhaseColour={selectedButton?.style.colour || "#666666"}
            transitions={transitionData.transitions20s}
            sampleSize={transitionData.sampleSize}
          />
        </div>
      )}
    </div>
  );
}

export function PhaseTransition({ phases }: PhaseTransitionProps) {
  const [subTab, setSubTab] = useState<'in-possession' | 'out-of-possession'>('in-possession');
  
  // Maintain separate selections for each possession state
  const [selectedPhaseCodes, setSelectedPhaseCodes] = useState<{
    'in-possession': string | null;
    'out-of-possession': string | null;
  }>({
    'in-possession': null,
    'out-of-possession': null,
  });
  
  const setSelectedPhaseCode = (code: string | null) => {
    setSelectedPhaseCodes(prev => ({
      ...prev,
      [subTab]: code,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Secondary Tab Navigation */}
      <div className="flex gap-2 border-b border-border/40">
        <button
          onClick={() => setSubTab('in-possession')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
            subTab === 'in-possession'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          In Possession
          {subTab === 'in-possession' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setSubTab('out-of-possession')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
            subTab === 'out-of-possession'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Out of Possession
          {subTab === 'out-of-possession' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {subTab === 'in-possession' ? (
        <div className="space-y-3">
          <PossessionSection 
            possessionState="in-possession" 
            phases={phases}
            selectedPhaseCode={selectedPhaseCodes['in-possession']}
            setSelectedPhaseCode={setSelectedPhaseCode}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <PossessionSection 
            possessionState="out-of-possession" 
            phases={phases}
            selectedPhaseCode={selectedPhaseCodes['out-of-possession']}
            setSelectedPhaseCode={setSelectedPhaseCode}
          />
        </div>
      )}
    </div>
  );
}
