// Phase transition analysis for visualizing phase progression patterns

import { Phase, ButtonConfig } from "./types";

export interface TransitionResult {
  destinationPhase: string;
  destinationLabel: string;
  count: number;
  percentage: number;
  colour: string;
}

export interface PhaseTransitionData {
  startingPhase: string;
  startingLabel: string;
  possessionState: "in-possession" | "out-of-possession";
  sampleSize: number;
  transitions10s: TransitionResult[];
  transitions20s: TransitionResult[];
}

/**
 * Get the phase with highest hierarchy level
 * For in-possession: this is the most attacking phase
 * For out-of-possession: this is the most defensive phase
 */
function getHighestHierarchyPhase(
  phases: Phase[],
  buttonConfig: ButtonConfig[]
): Phase | null {
  if (phases.length === 0) return null;

  const hierarchyMap = new Map<string, number>();
  buttonConfig.forEach((btn) => {
    if (btn.type === "phase" && btn.hierarchyLevel) {
      hierarchyMap.set(btn.code, btn.hierarchyLevel);
    }
  });

  let highestPhase = phases[0];
  let highestHierarchy = hierarchyMap.get(phases[0].phaseCode || "") || 0;

  for (const phase of phases) {
    const hierarchy = hierarchyMap.get(phase.phaseCode || "") || 0;
    if (hierarchy > highestHierarchy) {
      highestHierarchy = hierarchy;
      highestPhase = phase;
    }
  }

  return highestPhase;
}

/**
 * Get the phase with lowest hierarchy level
 * For in-possession: this is the most defensive phase
 * For out-of-possession: this is the most attacking phase
 */
function getLowestHierarchyPhase(
  phases: Phase[],
  buttonConfig: ButtonConfig[]
): Phase | null {
  if (phases.length === 0) return null;

  const hierarchyMap = new Map<string, number>();
  buttonConfig.forEach((btn) => {
    if (btn.type === "phase" && btn.hierarchyLevel) {
      hierarchyMap.set(btn.code, btn.hierarchyLevel);
    }
  });

  let lowestPhase = phases[0];
  let lowestHierarchy = hierarchyMap.get(phases[0].phaseCode || "") || Infinity;

  for (const phase of phases) {
    const hierarchy = hierarchyMap.get(phase.phaseCode || "") || Infinity;
    if (hierarchy < lowestHierarchy) {
      lowestHierarchy = hierarchy;
      lowestPhase = phase;
    }
  }

  return lowestPhase;
}

/**
 * Filter phases that occur within a time window from a starting time
 */
function filterPhasesByTimeWindow(
  allPhases: Phase[],
  startTimeMs: number,
  windowMs: number
): Phase[] {
  const endTimeMs = startTimeMs + windowMs;
  return allPhases.filter(
    (phase) =>
      phase.startTimeMs >= startTimeMs && phase.startTimeMs < endTimeMs
  );
}

/**
 * Filter phases by possession state
 */
function filterPhasesByPossessionState(
  phases: Phase[],
  buttonConfig: ButtonConfig[],
  possessionState: "in-possession" | "out-of-possession"
): Phase[] {
  return phases.filter((phase) => {
    const button = buttonConfig.find((btn) => btn.code === phase.phaseCode && btn.type === "phase");
    return button?.possessionState === possessionState;
  });
}

/**
 * Filter phases that represent progression from starting phase
 * For in-possession: only include phases with higher hierarchy (more attacking)
 * For out-of-possession: only include phases with lower hierarchy (more defensive)
 */
function filterPhasesByProgression(
  phases: Phase[],
  buttonConfig: ButtonConfig[],
  startingPhaseCode: string,
  possessionState: "in-possession" | "out-of-possession"
): Phase[] {
  const startingButton = buttonConfig.find(
    (btn) => btn.code === startingPhaseCode && btn.type === "phase"
  );
  const startingHierarchy = startingButton?.hierarchyLevel || 0;

  return phases.filter((phase) => {
    const button = buttonConfig.find((btn) => btn.code === phase.phaseCode && btn.type === "phase");
    const phaseHierarchy = button?.hierarchyLevel || 0;

    if (possessionState === "in-possession") {
      // In-possession: progression means higher hierarchy (more attacking)
      return phaseHierarchy > startingHierarchy;
    } else {
      // Out-of-possession: progression means lower hierarchy (more defensive)
      return phaseHierarchy < startingHierarchy;
    }
  });
}

/**
 * Calculate phase transitions for a specific starting phase
 */
export function calculatePhaseTransitions(
  phases: Phase[],
  buttonConfig: ButtonConfig[],
  startingPhaseCode: string,
  possessionState: "in-possession" | "out-of-possession"
): PhaseTransitionData {
  // Get button info for the starting phase
  const startingButton = buttonConfig.find(
    (btn) => btn.code === startingPhaseCode && btn.type === "phase"
  );
  const startingLabel = startingButton?.label || startingPhaseCode;
  const colour = startingButton?.style.colour || "#666666";

  // Find all instances of the starting phase with matching possession
  const startingPhaseInstances = phases.filter(
    (phase) => phase.phaseCode === startingPhaseCode
  );

  if (startingPhaseInstances.length === 0) {
    return {
      startingPhase: startingPhaseCode,
      startingLabel,
      possessionState,
      sampleSize: 0,
      transitions10s: [],
      transitions20s: [],
    };
  }

  // Sort all phases by start time for easier processing
  const sortedPhases = [...phases].sort((a, b) => a.startTimeMs - b.startTimeMs);

  // Track destination phases for 10s and 20s windows
  const destinations10s = new Map<string, number>();
  const destinations20s = new Map<string, number>();

  for (const startingInstance of startingPhaseInstances) {
    const startTime = startingInstance.startTimeMs;

    // Get phases in 10s window (excluding the starting phase itself)
    const phasesIn10s = filterPhasesByTimeWindow(sortedPhases, startTime, 10000).filter(
      (p) => p.id !== startingInstance.id && p.phaseCode
    );

    // Get phases in 20s window (excluding the starting phase itself)
    const phasesIn20s = filterPhasesByTimeWindow(sortedPhases, startTime, 20000).filter(
      (p) => p.id !== startingInstance.id && p.phaseCode
    );

    // Filter by possession state BEFORE selecting destination phase
    // 10s: same possession state + must represent progression
    // 20s: opposite possession state (no progression filter - just entry point)
    const oppositeState = possessionState === "in-possession" ? "out-of-possession" : "in-possession";
    const phasesIn10sSamePossession = filterPhasesByPossessionState(phasesIn10s, buttonConfig, possessionState);
    const phasesIn10sProgression = filterPhasesByProgression(
      phasesIn10sSamePossession,
      buttonConfig,
      startingPhaseCode,
      possessionState
    );
    const phasesIn20sOppositePossession = filterPhasesByPossessionState(phasesIn20s, buttonConfig, oppositeState);

    // Determine destination phase based on possession state
    let destination10s: Phase | null = null;
    let destination20s: Phase | null = null;

    if (possessionState === "in-possession") {
      // In-possession:
      // - Higher hierarchy = more attacking
      // - Lower hierarchy = more defensive
      
      // 10s: Most attacking in-possession phase (that's more attacking than starting phase)
      destination10s = getHighestHierarchyPhase(phasesIn10sProgression, buttonConfig);
      // 20s: Most defensive out-of-possession phase (counter-attack entry)
      destination20s = getLowestHierarchyPhase(phasesIn20sOppositePossession, buttonConfig);
    } else {
      // Out-of-possession:
      // - Higher hierarchy = less defensive (more attacking defensive phase)
      // - Lower hierarchy = more defensive
      
      // 10s: Most defensive out-of-possession phase (that's more defensive than starting phase)
      destination10s = getLowestHierarchyPhase(phasesIn10sProgression, buttonConfig);
      // 20s: Most attacking in-possession phase (counter-attack entry)
      destination20s = getHighestHierarchyPhase(phasesIn20sOppositePossession, buttonConfig);
    }

    // Track destinations
    if (destination10s?.phaseCode) {
      destinations10s.set(
        destination10s.phaseCode,
        (destinations10s.get(destination10s.phaseCode) || 0) + 1
      );
    } else {
      // 10s: No same-possession phase reached in window - count as "same phase"
      destinations10s.set(startingPhaseCode, (destinations10s.get(startingPhaseCode) || 0) + 1);
    }

    if (destination20s?.phaseCode) {
      destinations20s.set(
        destination20s.phaseCode,
        (destinations20s.get(destination20s.phaseCode) || 0) + 1
      );
    }
    // 20s: If no opposite-possession phase reached, don't count it (legitimate case)
    // Percentages won't add up to 100% and that's expected
  }

  const sampleSize = startingPhaseInstances.length;

  // Convert to TransitionResult arrays
  const convertToResults = (destMap: Map<string, number>): TransitionResult[] => {
    const results: TransitionResult[] = [];
    destMap.forEach((count, phaseCode) => {
      const button = buttonConfig.find((btn) => btn.code === phaseCode && btn.type === "phase");
      results.push({
        destinationPhase: phaseCode,
        destinationLabel: button?.label || phaseCode,
        count,
        percentage: (count / sampleSize) * 100,
        colour: button?.style.colour || "#666666",
      });
    });
    // Sort by percentage descending
    return results.sort((a, b) => b.percentage - a.percentage);
  };

  return {
    startingPhase: startingPhaseCode,
    startingLabel,
    possessionState,
    sampleSize,
    transitions10s: convertToResults(destinations10s),
    transitions20s: convertToResults(destinations20s),
  };
}

/**
 * Get all available starting phases (phase buttons with matching possession state)
 */
export function getAvailableStartingPhases(
  buttonConfig: ButtonConfig[],
  possessionState: "in-possession" | "out-of-possession"
): ButtonConfig[] {
  return buttonConfig.filter(
    (btn) => btn.type === "phase" && btn.possessionState === possessionState
  );
}
