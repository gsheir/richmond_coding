// Core type definitions for the Richmond Hockey coding app

export enum ButtonType {
  PHASE = "phase",
  TERMINATION = "termination",
  CONTEXT = "context",
}

export enum PhaseStatus {
  UNDEFINED = "undefined",
  CLASSIFIED = "classified",
  TERMINATED = "terminated",
}

export enum ClockMode {
  LIVE = "live",
  RETROSPECTIVE = "retrospective",
}

export enum ClockState {
  STOPPED = "stopped",
  RUNNING = "running",
  PAUSED = "paused",
}

export interface Phase {
  id: number;
  startTimeMs: number;
  endTimeMs: number | null;
  phaseCode: string | null;
  phaseLabel: string | null;
  status: PhaseStatus;
  period: string;
  contextLabels: string[];
  terminationEvent: string | null;
  terminationCategory: string | null; // "success" or "failure"
  leadMs: number;
  lagMs: number;
}

export interface Match {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  phases: Phase[];
  createdAt: string;
  modifiedAt: string;
  clockTimeMs?: number;
}

export interface Tab {
  id: string;
  matchId: string;
  label: string;
  isDirty: boolean;
  lastAutosaveTime: string | null;
}

export interface ButtonConfig {
  code: string;
  label: string;
  type: ButtonType;
  category?: string; // For termination buttons: "success" or "failure"
  hotkey: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: {
    colour: string;
    opacity: number;
    fontSize: number;
    fontWeight: string;
  };
  leadMs: number;
  lagMs: number;
}

export interface ButtonsConfig {
  buttons: ButtonConfig[];
}

// Helper functions for Phase
export const createPhase = (
  id: number,
  startTimeMs: number,
  period: string,
  leadMs: number = 5000,
  lagMs: number = 5000
): Phase => ({
  id,
  startTimeMs,
  endTimeMs: null,
  phaseCode: null,
  phaseLabel: null,
  status: PhaseStatus.UNDEFINED,
  period,
  contextLabels: [],
  terminationEvent: null,
  terminationCategory: null,
  leadMs,
  lagMs,
});

export const isPhaseActive = (phase: Phase): boolean => {
  return phase.status !== PhaseStatus.TERMINATED && phase.endTimeMs === null;
};

export const classifyPhase = (
  phase: Phase,
  code: string,
  label: string
): Phase => ({
  ...phase,
  phaseCode: code,
  phaseLabel: label,
  status: PhaseStatus.CLASSIFIED,
});

export const addContextToPhase = (phase: Phase, context: string): Phase => ({
  ...phase,
  contextLabels: phase.contextLabels.includes(context)
    ? phase.contextLabels
    : [...phase.contextLabels, context],
});

export const terminatePhase = (
  phase: Phase,
  timeMs: number,
  terminationEvent: string | null = null,
  terminationCategory: string | null = null
): Phase => ({
  ...phase,
  endTimeMs: timeMs,
  terminationEvent,
  terminationCategory,
  status: PhaseStatus.TERMINATED,
});

export const getPhaseExportCode = (phase: Phase): string => {
  if (!phase.phaseCode) return "UNDEFINED";
  
  let code = phase.phaseCode;
  if (phase.contextLabels.length > 0) {
    code += ` (${phase.contextLabels.join(", ")})`;
  }
  return code;
};

export const getPhaseStartTimeSeconds = (phase: Phase): number => {
  return Math.max(0, phase.startTimeMs - phase.leadMs) / 1000.0;
};

export const getPhaseEndTimeSeconds = (phase: Phase): number => {
  if (phase.endTimeMs === null) {
    return (phase.startTimeMs + phase.lagMs) / 1000.0;
  }
  return (phase.endTimeMs + phase.lagMs) / 1000.0;
};

// Match helpers
export const createMatch = (
  id: string,
  date: string,
  homeTeam: string,
  awayTeam: string
): Match => ({
  id,
  date,
  homeTeam,
  awayTeam,
  phases: [],
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
});

export const getMatchDisplayName = (match: Match): string => {
  return `${match.date} – ${match.homeTeam} vs ${match.awayTeam}`;
};

export const generateMatchId = (
  date: string,
  homeTeam: string,
  awayTeam: string
): string => {
  const cleanTeam = (team: string) =>
    team.replace(/\s+/g, "_").replace(/\//g, "-").replace(/[^a-zA-Z0-9_-]/g, "");
  
  const homeClean = cleanTeam(homeTeam);
  const awayClean = cleanTeam(awayTeam);
  
  // Add timestamp for uniqueness (in case of multiple matches on same day)
  const now = new Date();
  const timeStamp = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  
  return `${date}_${homeClean}_vs_${awayClean}_${timeStamp}`;
};
