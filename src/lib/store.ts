// Zustand store for global state management
import { create } from "zustand";
import { GameClock } from "./clock";
import { EventEngine } from "./event-engine";
import {
  Match,
  ButtonConfig,
  ClockMode,
  ClockState,
  createMatch,
  generateMatchId,
} from "./types";
import {
  saveMatch as saveMatchBackend,
  loadMatch as loadMatchBackend,
  listMatches as listMatchesBackend,
  deleteMatch as deleteMatchBackend,
  autosaveMatch as autosaveMatchBackend,
  loadAutosave as loadAutosaveBackend,
} from "./tauri-api";

interface AppState {
  // Core instances
  clock: GameClock;
  eventEngine: EventEngine;
  
  // Match state
  currentMatch: Match | null;
  matches: Match[];
  
  // Match details (for new matches)
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  
  // UI state
  clockState: ClockState;
  currentTime: string;
  activePhaseId: number | null;
  lastAutosaveTime: string | null;
  
  // Button config
  buttonConfig: ButtonConfig[];
  
  // Settings
  defaultHomeTeam: string;
  autosaveDirectory: string;
  defaultLeadMs: number;
  defaultLagMs: number;
  
  // Actions
  initialize: () => void;
  setButtonConfig: (config: ButtonConfig[]) => void;
  startClock: () => void;
  pauseClock: () => void;
  stopClock: () => void;
  updateClockDisplay: () => void;
  
  // Match details actions
  setMatchDate: (date: string) => void;
  setHomeTeam: (team: string) => void;
  setAwayTeam: (team: string) => void;
  canStartClock: () => boolean;
  
  // Match actions
  createNewMatch: (date: string, homeTeam: string, awayTeam: string) => void;
  loadMatch: (matchId: string) => Promise<void>;
  saveCurrentMatch: () => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  refreshMatches: () => Promise<void>;
  
  // Settings actions
  setDefaultHomeTeam: (team: string) => void;
  setAutosaveDirectory: (dir: string) => void;
  setDefaultLeadMs: (ms: number) => void;
  setDefaultLagMs: (ms: number) => void;
  
  // Phase actions
  startPhase: () => void;
  handleButtonClick: (code: string, type: any) => void;
  undoLastPhase: () => void;
  clearAllPhases: () => void;
  
  // Export
  exportXML: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  const clock = new GameClock(ClockMode.LIVE);
  const eventEngine = new EventEngine(clock);
  
  // Set up clock listener
  clock.onStateChange((state) => {
    set({ clockState: state });
    
    // Save match when clock starts
    if (state === ClockState.RUNNING) {
      const currentMatch = get().currentMatch;
      if (currentMatch) {
        get().saveCurrentMatch();
      }
    }
  });
  
  return {
    clock,
    eventEngine,
    currentMatch: null,
    matches: [],
    matchDate: new Date().toISOString().split("T")[0],
    homeTeam: "",
    awayTeam: "",
    clockState: ClockState.STOPPED,
    currentTime: "00:00",
    activePhaseId: null,
    lastAutosaveTime: null,
    buttonConfig: [],
    defaultHomeTeam: "Richmond",
    autosaveDirectory: "~/Documents/Richmond Hockey Club/matches",
    defaultLeadMs: 5000,
    defaultLagMs: 5000,
    
    initialize: () => {
      // Set default home team from settings
      const defaultHome = get().defaultHomeTeam;
      if (defaultHome && !get().homeTeam) {
        set({ homeTeam: defaultHome });
      }
      
      // Set up periodic updates
      setInterval(() => {
        get().updateClockDisplay();
      }, 100);
      
      // Set up autosave every 10 seconds
      setInterval(() => {
        const { currentMatch, eventEngine, clockState } = get();
        if (currentMatch && clockState === ClockState.RUNNING) {
          const updatedMatch = {
            ...currentMatch,
            phases: eventEngine.getAllPhases(),
            modifiedAt: new Date().toISOString(),
          };
          autosaveMatchBackend(updatedMatch)
            .then(() => {
              set({ lastAutosaveTime: new Date().toISOString() });
            })
            .catch(console.error);
        }
      }, 10000);
      
      // Load matches
      get().refreshMatches();
      
      // Check for autosave
      loadAutosaveBackend().then((match) => {
        if (match) {
          console.log("Found autosaved match");
          // Could show recovery dialog here
        }
      }).catch(console.error);
    },
    
    setButtonConfig: (config) => {
      set({ buttonConfig: config });
      get().eventEngine.setButtonConfig(config);
    },
    
    setMatchDate: (date) => set({ matchDate: date }),
    setHomeTeam: (team) => set({ homeTeam: team }),
    setAwayTeam: (team) => set({ awayTeam: team }),
    
    canStartClock: () => {
      const { matchDate, homeTeam, awayTeam } = get();
      return matchDate.length > 0 && homeTeam.trim().length > 0 && awayTeam.trim().length > 0;
    },
    
    startClock: () => {
      const { clock, currentMatch, matchDate, homeTeam, awayTeam } = get();
      
      // Validate match details before starting
      if (!get().canStartClock()) {
        console.error("Cannot start clock: match details incomplete");
        return;
      }
      
      // Create match if it doesn't exist
      if (!currentMatch) {
        get().createNewMatch(matchDate, homeTeam.trim(), awayTeam.trim());
      }
      
      clock.start();
    },
    
    pauseClock: () => {
      get().clock.pause();
    },
    
    stopClock: () => {
      get().clock.stop();
    },
    
    updateClockDisplay: () => {
      const { clock, eventEngine } = get();
      const activePhase = eventEngine.getActivePhase();
      
      set({
        currentTime: clock.getTimeString(),
        activePhaseId: activePhase?.id ?? null,
      });
    },
    
    createNewMatch: (date, homeTeam, awayTeam) => {
      const id = generateMatchId(date, homeTeam, awayTeam);
      const match = createMatch(id, date, homeTeam, awayTeam);
      
      set({ currentMatch: match });
      get().eventEngine.clearAll();
    },
    
    loadMatch: async (matchId) => {
      try {
        const match = await loadMatchBackend(matchId);
        set({ 
          currentMatch: match,
          matchDate: match.date,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
        });
        get().eventEngine.loadPhases(match.phases);
        get().clock.stop();
      } catch (error) {
        console.error("Failed to load match:", error);
      }
    },
    
    saveCurrentMatch: async () => {
      const { currentMatch, eventEngine } = get();
      if (!currentMatch) return;
      
      const updatedMatch = {
        ...currentMatch,
        phases: eventEngine.getAllPhases(),
        modifiedAt: new Date().toISOString(),
      };
      
      try {
        await saveMatchBackend(updatedMatch);
        set({ currentMatch: updatedMatch });
      } catch (error) {
        console.error("Failed to save match:", error);
      }
    },
    
    deleteMatch: async (matchId) => {
      try {
        await deleteMatchBackend(matchId);
        await get().refreshMatches();
      } catch (error) {
        console.error("Failed to delete match:", error);
      }
    },
    
    refreshMatches: async () => {
      try {
        const matches = await listMatchesBackend();
        set({ matches });
      } catch (error) {
        console.error("Failed to load matches:", error);
      }
    },
    
    setDefaultHomeTeam: (team) => {
      set({ defaultHomeTeam: team, homeTeam: team });
    },
    
    setAutosaveDirectory: (dir) => {
      set({ autosaveDirectory: dir });
    },
    
    setDefaultLeadMs: (ms) => {
      set({ defaultLeadMs: ms });
    },
    
    setDefaultLagMs: (ms) => {
      set({ defaultLagMs: ms });
    },
    
    startPhase: () => {
      const { defaultLeadMs, defaultLagMs } = get();
      get().eventEngine.startUndefinedPhase(defaultLeadMs, defaultLagMs);
    },
    
    handleButtonClick: (code, type) => {
      get().eventEngine.handleButtonClick(code, type);
    },
    
    undoLastPhase: () => {
      get().eventEngine.undoLastAction();
    },
    
    clearAllPhases: () => {
      if (confirm("Are you sure you want to clear all phases?")) {
        get().eventEngine.clearAll();
        set({ activePhaseId: null });
      }
    },
    
    exportXML: async () => {
      const { currentMatch, eventEngine } = get();
      if (!currentMatch) return;
      
      const { exportToSportscodeXML } = await import("./xml-export");
      const updatedMatch = {
        ...currentMatch,
        phases: eventEngine.getAllPhases(),
      };
      
      const xmlContent = exportToSportscodeXML(updatedMatch);
      
      // Export using Electron API (dialog handled in main process)
      const { exportXML: exportXMLBackend } = await import("./tauri-api");
      await exportXMLBackend(xmlContent);
    },
  };
});
