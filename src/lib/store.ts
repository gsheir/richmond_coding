// Zustand store for global state management
import { create } from "zustand";
import { GameClock } from "./clock";
import { EventEngine } from "./event-engine";
import {
  Match,
  Tab,
  ButtonConfig,
  ClockMode,
  ClockState,
  createMatch,
  generateMatchId,
  getMatchDisplayName,
} from "./types";
import {
  saveMatch as saveMatchBackend,
  loadMatch as loadMatchBackend,
  listMatches as listMatchesBackend,
  deleteMatch as deleteMatchBackend,
  autosaveMatch as autosaveMatchBackend,
  loadAutosave as loadAutosaveBackend,
  saveSettings as saveSettingsBackend,
  loadSettings as loadSettingsBackend,
} from "./electron-api";

interface TabData {
  tab: Tab;
  match: Match;
  clock: GameClock;
  eventEngine: EventEngine;
  clockState: ClockState;
  currentTime: string;
  activePhaseId: number | null;
}

interface AppState {
  // Tab state
  tabs: TabData[];
  activeTabId: string | null;
  
  // Match state
  matches: Match[];
  
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
  
  // Tab actions
  openTab: (matchId: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  getActiveTab: () => TabData | null;
  updateActiveMatch: (date: string, homeTeam: string, awayTeam: string) => void;
  
  // Clock actions (operate on active tab)
  startClock: () => void;
  pauseClock: () => void;
  stopClock: () => void;
  updateClockDisplays: () => void;
  
  // Match actions
  createNewMatch: (date: string, homeTeam: string, awayTeam: string) => Promise<void>;
  saveMatch: (tabId: string) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  refreshMatches: () => Promise<void>;
  
  // Settings actions
  setDefaultHomeTeam: (team: string) => void;
  setAutosaveDirectory: (dir: string) => void;
  setDefaultLeadMs: (ms: number) => void;
  setDefaultLagMs: (ms: number) => void;
  
  // Phase actions (operate on active tab)
  startPhase: () => void;
  handleButtonClick: (code: string, type: any) => void;
  undoLastPhase: () => void;
  clearAllPhases: () => void;
  
  // Export (operates on active tab)
  exportXML: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  const createTabData = (match: Match): TabData => {
    const clock = new GameClock(ClockMode.LIVE);
    const eventEngine = new EventEngine(clock);
    
    // Set button config if available
    const buttonConfig = get()?.buttonConfig || [];
    if (buttonConfig.length > 0) {
      eventEngine.setButtonConfig(buttonConfig);
    }
    
    // Load phases if match has them
    if (match.phases.length > 0) {
      eventEngine.loadPhases(match.phases);
    }
    
    // Set up clock listener for this tab
    clock.onStateChange((state) => {
      const tabs = get().tabs;
      const tabIndex = tabs.findIndex(t => t.match.id === match.id);
      if (tabIndex !== -1) {
        const updatedTabs = [...tabs];
        updatedTabs[tabIndex] = {
          ...updatedTabs[tabIndex],
          clockState: state,
        };
        set({ tabs: updatedTabs });
        
        // Save match when clock starts
        if (state === ClockState.RUNNING) {
          get().saveMatch(updatedTabs[tabIndex].tab.id);
        }
      }
    });
    
    const tab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      matchId: match.id,
      label: getMatchDisplayName(match),
      isDirty: false,
      lastAutosaveTime: null,
    };
    
    return {
      tab,
      match,
      clock,
      eventEngine,
      clockState: ClockState.STOPPED,
      currentTime: "00:00",
      activePhaseId: null,
    };
  };
  
  return {
    tabs: [],
    activeTabId: null,
    matches: [],
    buttonConfig: [],
    defaultHomeTeam: "Richmond",
    autosaveDirectory: "~/Documents/Richmond Hockey Club/matches",
    defaultLeadMs: 5000,
    defaultLagMs: 5000,
    
    initialize: () => {
      // Load settings from persistent storage
      if (typeof window !== 'undefined' && window.electronAPI) {
        loadSettingsBackend()
          .then((settings) => {
            if (settings) {
              set({
                defaultHomeTeam: settings.defaultHomeTeam,
                autosaveDirectory: settings.autosaveDirectory,
                defaultLeadMs: settings.defaultLeadMs,
                defaultLagMs: settings.defaultLagMs,
              });
            } else {
              // No settings file exists, save current defaults
              const { defaultHomeTeam, autosaveDirectory, defaultLeadMs, defaultLagMs } = get();
              saveSettingsBackend({
                defaultHomeTeam,
                autosaveDirectory,
                defaultLeadMs,
                defaultLagMs,
              }).catch(console.error);
            }
          })
          .catch((error) => {
            console.error('Error loading settings:', error);
          });
      }
      
      // Set up periodic clock updates for all tabs
      setInterval(() => {
        get().updateClockDisplays();
      }, 100);
      
      // Set up autosave every 10 seconds for all running tabs
      setInterval(() => {
        const tabs = get().tabs;
        tabs.forEach((tabData) => {
          if (tabData.clockState === ClockState.RUNNING) {
            const updatedMatch = {
              ...tabData.match,
              phases: tabData.eventEngine.getAllPhases(),
              modifiedAt: new Date().toISOString(),
              clockTimeMs: tabData.clock.currentTimeMs(),
            };
            autosaveMatchBackend(updatedMatch)
              .then(() => {
                // Update last autosave time for this tab
                const currentTabs = get().tabs;
                const tabIndex = currentTabs.findIndex(t => t.tab.id === tabData.tab.id);
                if (tabIndex !== -1) {
                  const updatedTabs = [...currentTabs];
                  updatedTabs[tabIndex] = {
                    ...updatedTabs[tabIndex],
                    tab: {
                      ...updatedTabs[tabIndex].tab,
                      lastAutosaveTime: new Date().toISOString(),
                    },
                  };
                  set({ tabs: updatedTabs });
                }
              })
              .catch(console.error);
          }
        });
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
      // Update all existing tabs with new button config
      const tabs = get().tabs;
      tabs.forEach(tabData => {
        tabData.eventEngine.setButtonConfig(config);
      });
    },
    
    getActiveTab: () => {
      const { tabs, activeTabId } = get();
      if (!activeTabId) return null;
      return tabs.find(t => t.tab.id === activeTabId) || null;
    },
    
    openTab: async (matchId: string) => {
      const { tabs } = get();
      
      // Check if tab already exists for this match
      const existingTab = tabs.find(t => t.tab.matchId === matchId);
      if (existingTab) {
        set({ activeTabId: existingTab.tab.id });
        return;
      }
      
      // Load match data
      try {
        const match = await loadMatchBackend(matchId);
        const tabData = createTabData(match);
        
        // Restore clock time if saved
        if (match.clockTimeMs !== undefined && match.clockTimeMs > 0) {
          tabData.clock.restoreTimeMs(match.clockTimeMs);
          // Update tab data to reflect new clock state and time
          tabData.clockState = tabData.clock.getState();
          tabData.currentTime = tabData.clock.getTimeString();
        }
        
        set({
          tabs: [...tabs, tabData],
          activeTabId: tabData.tab.id,
        });
      } catch (error) {
        console.error("Failed to load match:", error);
      }
    },
    
    closeTab: (tabId: string) => {
      const { tabs, activeTabId } = get();
      const tabIndex = tabs.findIndex(t => t.tab.id === tabId);
      
      if (tabIndex === -1) return;
      
      const tabToClose = tabs[tabIndex];
      
      // Save match before closing (fire and forget)
      const matchToSave = {
        ...tabToClose.match,
        phases: tabToClose.eventEngine.getAllPhases(),
        modifiedAt: new Date().toISOString(),
        clockTimeMs: tabToClose.clock.currentTimeMs(),
      };
      saveMatchBackend(matchToSave).catch(error => {
        console.error("Failed to save match on tab close:", error);
      });
      
      // Stop clock if running
      tabToClose.clock.stop();
      
      // Remove tab
      const newTabs = tabs.filter(t => t.tab.id !== tabId);
      
      // Update active tab if we're closing the active one
      let newActiveId = activeTabId;
      if (activeTabId === tabId) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].tab.id : null;
      }
      
      set({ tabs: newTabs, activeTabId: newActiveId });
    },
    
    switchTab: (tabId: string) => {
      set({ activeTabId: tabId });
    },
    
    updateActiveMatch: (date: string, homeTeam: string, awayTeam: string) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      const updatedMatch = {
        ...activeTab.match,
        date,
        homeTeam,
        awayTeam,
        modifiedAt: new Date().toISOString(),
      };
      
      const updatedTab = {
        ...activeTab,
        match: updatedMatch,
        tab: {
          ...activeTab.tab,
          label: getMatchDisplayName(updatedMatch),
          isDirty: true,
        },
      };
      
      const tabs = get().tabs;
      const tabIndex = tabs.findIndex(t => t.tab.id === activeTab.tab.id);
      if (tabIndex !== -1) {
        const newTabs = [...tabs];
        newTabs[tabIndex] = updatedTab;
        set({ tabs: newTabs });
      }
    },
    
    startClock: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.clock.start();
    },
    
    pauseClock: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.clock.pause();
    },
    
    stopClock: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.clock.stop();
    },
    
    updateClockDisplays: () => {
      const tabs = get().tabs;
      const updatedTabs = tabs.map(tabData => {
        const activePhase = tabData.eventEngine.getActivePhase();
        return {
          ...tabData,
          currentTime: tabData.clock.getTimeString(),
          activePhaseId: activePhase?.id ?? null,
        };
      });
      set({ tabs: updatedTabs });
    },
    
    createNewMatch: async (date, homeTeam, awayTeam) => {
      const id = generateMatchId(date, homeTeam, awayTeam);
      const match = createMatch(id, date, homeTeam, awayTeam);
      
      // Save the new match immediately
      try {
        await saveMatchBackend(match);
        await get().refreshMatches();
        
        // Open in a new tab
        await get().openTab(match.id);
      } catch (error) {
        console.error("Failed to create match:", error);
      }
    },
    
    saveMatch: async (tabId: string) => {
      const { tabs } = get();
      const tabData = tabs.find(t => t.tab.id === tabId);
      if (!tabData) return;
      
      const updatedMatch = {
        ...tabData.match,
        phases: tabData.eventEngine.getAllPhases(),
        modifiedAt: new Date().toISOString(),
        clockTimeMs: tabData.clock.currentTimeMs(),
      };
      
      try {
        await saveMatchBackend(updatedMatch);
        
        // Update tab with saved match and clear dirty flag
        const tabIndex = tabs.findIndex(t => t.tab.id === tabId);
        if (tabIndex !== -1) {
          const newTabs = [...tabs];
          newTabs[tabIndex] = {
            ...newTabs[tabIndex],
            match: updatedMatch,
            tab: {
              ...newTabs[tabIndex].tab,
              isDirty: false,
            },
          };
          set({ tabs: newTabs });
        }
      } catch (error) {
        console.error("Failed to save match:", error);
      }
    },
    
    deleteMatch: async (matchId) => {
      try {
        await deleteMatchBackend(matchId);
        
        // Close tab if match is open
        const { tabs } = get();
        const tabToClose = tabs.find(t => t.tab.matchId === matchId);
        if (tabToClose) {
          get().closeTab(tabToClose.tab.id);
        }
        
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
      set({ defaultHomeTeam: team });
      const { autosaveDirectory, defaultLeadMs, defaultLagMs } = get();
      const settings = {
        defaultHomeTeam: team,
        autosaveDirectory,
        defaultLeadMs,
        defaultLagMs,
      };
      saveSettingsBackend(settings).catch(console.error);
    },
    
    setAutosaveDirectory: (dir) => {
      set({ autosaveDirectory: dir });
      const { defaultHomeTeam, defaultLeadMs, defaultLagMs } = get();
      const settings = {
        defaultHomeTeam,
        autosaveDirectory: dir,
        defaultLeadMs,
        defaultLagMs,
      };
      saveSettingsBackend(settings).catch(console.error);
    },
    
    setDefaultLeadMs: (ms) => {
      set({ defaultLeadMs: ms });
      const { defaultHomeTeam, autosaveDirectory, defaultLagMs } = get();
      const settings = {
        defaultHomeTeam,
        autosaveDirectory,
        defaultLeadMs: ms,
        defaultLagMs,
      };
      saveSettingsBackend(settings).catch(console.error);
    },
    
    setDefaultLagMs: (ms) => {
      set({ defaultLagMs: ms });
      const { defaultHomeTeam, autosaveDirectory, defaultLeadMs } = get();
      const settings = {
        defaultHomeTeam,
        autosaveDirectory,
        defaultLeadMs,
        defaultLagMs: ms,
      };
      saveSettingsBackend(settings).catch(console.error);
    },
    
    startPhase: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      const { defaultLeadMs, defaultLagMs } = get();
      activeTab.eventEngine.startUndefinedPhase(defaultLeadMs, defaultLagMs);
    },
    
    handleButtonClick: (code, type) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      activeTab.eventEngine.handleButtonClick(code, type);
    },
    
    undoLastPhase: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      activeTab.eventEngine.undoLastAction();
    },
    
    clearAllPhases: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      if (confirm("Are you sure you want to clear all phases?")) {
        activeTab.eventEngine.clearAll();
        
        // Update tab state
        const tabs = get().tabs;
        const tabIndex = tabs.findIndex(t => t.tab.id === activeTab.tab.id);
        if (tabIndex !== -1) {
          const newTabs = [...tabs];
          newTabs[tabIndex] = {
            ...newTabs[tabIndex],
            activePhaseId: null,
          };
          set({ tabs: newTabs });
        }
      }
    },
    
    exportXML: async () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      const { exportToSportscodeXML } = await import("./xml-export");
      const updatedMatch = {
        ...activeTab.match,
        phases: activeTab.eventEngine.getAllPhases(),
      };
      
      const xmlContent = exportToSportscodeXML(updatedMatch);
      
      // Create default filename from match details
      const cleanName = (name: string) => name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
      const defaultFilename = `${updatedMatch.date}_${cleanName(updatedMatch.homeTeam)}_vs_${cleanName(updatedMatch.awayTeam)}.xml`;
      
      // Export using Electron API (dialog handled in main process)
      const { exportXML: exportXMLBackend } = await import("./electron-api");
      await exportXMLBackend(xmlContent, defaultFilename);
    },
  };
});
