// Zustand store for global state management
import { create } from "zustand";
import { GameClock } from "./clock";
import { EventEngine } from "./event-engine";
import {
  Match,
  Phase,
  Tab,
  ButtonConfig,
  ButtonType,
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
import { startAppLifecycleTimers } from "./app-lifecycle";

interface TabData {
  tab: Tab;
  match: Match;
  clock: GameClock;
  eventEngine: EventEngine;
  clockState: ClockState;
  currentTime: string;
  activePhaseId: number | null;
  lastTimelineShiftMs: number | null;
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
  markActiveTabDirty: () => void;
  
  // Clock actions (operate on active tab)
  startClock: () => void;
  stopClock: () => void;
  skipToStart: () => void;
  skipBack: (seconds?: number) => void;
  skipForward: (seconds?: number) => void;
  skipToEnd: () => void;
  jumpToTime: (timeMs: number) => void;
  updateClockDisplays: () => void;
  shiftTimeline: (deltaMs: number) => void;
  undoTimelineShift: () => void;
  
  // Match actions
  createNewMatch: (date: string, homeTeam: string, awayTeam: string) => Promise<void>;
  saveMatch: (tabId: string) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  refreshMatches: () => Promise<void>;
  
  // Settings actions
  updateSettings: (settings: Partial<{ defaultHomeTeam: string; defaultLeadMs: number; defaultLagMs: number }>) => void;

  // Phase actions (operate on active tab)
  startPhase: () => void;
  handleButtonClick: (code: string, type: ButtonType) => void;
  undoLastPhase: () => void;
  deletePhase: (phaseId: number) => void;
  clearAllPhases: () => void;
  updatePhase: (phaseId: number, updates: Partial<Phase>) => void;
  
  // Export (operates on active tab)
  exportXML: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  const createTabData = (match: Match): TabData => {
    const clock = new GameClock();
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
        
        // Save match when clock starts or stops
        get().saveMatch(updatedTabs[tabIndex].tab.id);
      }
    });
    
    const tab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      matchId: match.id,
      label: getMatchDisplayName(match),
      isDirty: false,
      lastSaveTime: null,
    };
    
    return {
      tab,
      match,
      clock,
      eventEngine,
      clockState: ClockState.STOPPED,
      currentTime: "00:00",
      activePhaseId: null,
      lastTimelineShiftMs: null,
    };
  };
  
  return {
    tabs: [],
    activeTabId: null,
    matches: [],
    buttonConfig: [],
    defaultHomeTeam: "Richmond",
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
                defaultLeadMs: settings.defaultLeadMs,
                defaultLagMs: settings.defaultLagMs,
              });
            } else {
              // No settings file exists, save current defaults
              const { defaultHomeTeam, defaultLeadMs, defaultLagMs } = get();
              saveSettingsBackend({
                defaultHomeTeam,
                defaultLeadMs,
                defaultLagMs,
              }).catch(console.error);
            }
          })
          .catch((error) => {
            console.error('Error loading settings:', error);
          });
      }
      
      // Clock display ticks, autosave, and periodic database saves
      startAppLifecycleTimers({
        updateClockDisplays: () => get().updateClockDisplays(),
        getRunningTabIds: () =>
          get().tabs.filter((t) => t.clockState === ClockState.RUNNING).map((t) => t.tab.id),
        autosaveTab: (tabId) => {
          const tabData = get().tabs.find((t) => t.tab.id === tabId);
          if (!tabData) return;
          const updatedMatch = {
            ...tabData.match,
            phases: tabData.eventEngine.getAllPhases(),
            modifiedAt: new Date().toISOString(),
            clockTimeMs: tabData.clock.currentTimeMs(),
          };
          autosaveMatchBackend(updatedMatch).catch(console.error);
        },
        saveTabToDatabase: (tabId) => get().saveMatch(tabId),
      });

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
        get().updateClockDisplays();
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
      // Refresh immediately so the newly active tab's clock/phase display
      // isn't stale until the next 100ms tick.
      get().updateClockDisplays();
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
    
    stopClock: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.clock.stop();
    },
    
    skipToStart: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.clock.skipToStart();
    },
    
    skipBack: (seconds = 5) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.clock.skipBack(seconds);
    },
    
    skipForward: (seconds = 5) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.clock.skipForward(seconds);
    },
    
    skipToEnd: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.clock.skipToEnd();
    },
    
    jumpToTime: (timeMs: number) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      // Clamp to minimum of 0, but allow jumping beyond latest time
      const clampedTime = Math.max(0, timeMs);
      activeTab.clock.setTimeMs(clampedTime);
    },
    
    // Only the active tab's clock/phase display is ever read (see App.tsx), so
    // only it needs to be kept live – updating every tab on every 100ms tick
    // would re-render tabs that aren't visible.
    updateClockDisplays: () => {
      const { tabs, activeTabId } = get();
      if (!activeTabId) return;

      const tabIndex = tabs.findIndex(t => t.tab.id === activeTabId);
      if (tabIndex === -1) return;

      const tabData = tabs[tabIndex];
      const activePhase = tabData.eventEngine.getActivePhase();
      const currentTime = tabData.clock.getTimeString();
      const activePhaseId = activePhase?.id ?? null;

      if (tabData.currentTime === currentTime && tabData.activePhaseId === activePhaseId) {
        return;
      }

      const newTabs = [...tabs];
      newTabs[tabIndex] = { ...tabData, currentTime, activePhaseId };
      set({ tabs: newTabs });
    },

    shiftTimeline: (deltaMs: number) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;

      activeTab.eventEngine.shiftAllPhaseTimestamps(deltaMs);

      const updatedMatch = {
        ...activeTab.match,
        timelineOffsetMs: (activeTab.match.timelineOffsetMs || 0) + deltaMs,
      };

      const tabs = get().tabs;
      const tabIndex = tabs.findIndex(t => t.tab.id === activeTab.tab.id);
      if (tabIndex !== -1) {
        const newTabs = [...tabs];
        newTabs[tabIndex] = {
          ...newTabs[tabIndex],
          match: updatedMatch,
          lastTimelineShiftMs: deltaMs,
        };
        set({ tabs: newTabs });
      }

      get().markActiveTabDirty();
    },

    undoTimelineShift: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab || activeTab.lastTimelineShiftMs === null) return;

      if (!activeTab.eventEngine.undoTimelineShift()) return;

      const updatedMatch = {
        ...activeTab.match,
        timelineOffsetMs: (activeTab.match.timelineOffsetMs || 0) - activeTab.lastTimelineShiftMs,
      };

      const tabs = get().tabs;
      const tabIndex = tabs.findIndex(t => t.tab.id === activeTab.tab.id);
      if (tabIndex !== -1) {
        const newTabs = [...tabs];
        newTabs[tabIndex] = {
          ...newTabs[tabIndex],
          match: updatedMatch,
          lastTimelineShiftMs: null,
        };
        set({ tabs: newTabs });
      }

      get().markActiveTabDirty();
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
              lastSaveTime: new Date().toISOString(),
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
    
    updateSettings: (partial) => {
      set(partial);
      const { defaultHomeTeam, defaultLeadMs, defaultLagMs } = get();
      saveSettingsBackend({ defaultHomeTeam, defaultLeadMs, defaultLagMs }).catch(console.error);
    },
    
    // Helper function to mark active tab as dirty
    markActiveTabDirty: () => {
      const { tabs, activeTabId } = get();
      if (!activeTabId) return;
      
      const tabIndex = tabs.findIndex(t => t.tab.id === activeTabId);
      if (tabIndex !== -1) {
        const newTabs = [...tabs];
        newTabs[tabIndex] = {
          ...newTabs[tabIndex],
          tab: {
            ...newTabs[tabIndex].tab,
            isDirty: true,
          },
        };
        set({ tabs: newTabs });
      }
    },
    
    startPhase: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      const { defaultLeadMs, defaultLagMs } = get();
      activeTab.eventEngine.startUndefinedPhase(defaultLeadMs, defaultLagMs);
      get().markActiveTabDirty();
    },
    
    handleButtonClick: (code, type) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      activeTab.eventEngine.handleButtonClick(code, type);
      get().markActiveTabDirty();
    },
    
    undoLastPhase: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      activeTab.eventEngine.undoLastAction();
      get().markActiveTabDirty();
    },
    
    deletePhase: (phaseId: number) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      activeTab.eventEngine.deletePhase(phaseId);
      get().markActiveTabDirty();
    },
    
    clearAllPhases: () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;

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

      get().markActiveTabDirty();
    },
    
    updatePhase: (phaseId: number, updates: Partial<Phase>) => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      activeTab.eventEngine.updatePhase(phaseId, updates);
      get().markActiveTabDirty();
    },
    
    exportXML: async () => {
      const activeTab = get().getActiveTab();
      if (!activeTab) return;
      
      const { exportToSportscodeXML } = await import("./xml-export");
      const updatedMatch = {
        ...activeTab.match,
        phases: activeTab.eventEngine.getAllPhases(),
      };
      
      const buttonConfig = get().buttonConfig;
      const xmlContent = exportToSportscodeXML(updatedMatch, buttonConfig);
      
      // Create default filename from match details
      const cleanName = (name: string) => name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
      const defaultFilename = `${updatedMatch.date}_${cleanName(updatedMatch.homeTeam)}_vs_${cleanName(updatedMatch.awayTeam)}.xml`;
      
      // Export using Electron API (dialog handled in main process)
      const { exportXML: exportXMLBackend } = await import("./electron-api");
      await exportXMLBackend(xmlContent, defaultFilename);
    },
  };
});
