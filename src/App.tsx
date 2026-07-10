import { useEffect, useState } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { CodePage } from "./components/CodePage";
import { MatchesPage } from "./components/MatchesPage";
import { SettingsPage } from "./components/SettingsPage";
import { DataBrowserPage } from "./components/DataBrowserPage";
import { useAppStore } from "./lib/store";
import { loadButtonConfig } from "./lib/config-loader";
import { showUnsavedConfigDialog } from "./lib/electron-api";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState<"matches" | "settings" | "data-browser" | null>(
    "matches"
  );
  const [isConfigDirty, setIsConfigDirty] = useState(false);
  const { initialize, setButtonConfig, tabs, activeTabId, getActiveTab } = useAppStore();

  useEffect(() => {
    // Initialize app
    initialize();

    // Load button configuration
    loadButtonConfig().then((config) => {
      setButtonConfig(config);
    });
  }, [initialize, setButtonConfig]);

  // When all tabs are closed and we're not on a page, auto-navigate to matches
  useEffect(() => {
    if (tabs.length === 0 && currentPage === null) {
      setCurrentPage("matches");
    }
  }, [tabs.length, currentPage]);

  const confirmLeaveSettings = async () => {
    if (currentPage !== "settings" || !isConfigDirty) return true;
    const response = await showUnsavedConfigDialog();
    return response === 0; // 0 = Discard Changes
  };

  const handleNavigate = async (page: "matches" | "settings" | "data-browser") => {
    if (!(await confirmLeaveSettings())) return;
    setIsConfigDirty(false);
    setCurrentPage(page);
  };

  const handleSwitchToCoding = async () => {
    if (!(await confirmLeaveSettings())) return;
    setIsConfigDirty(false);
    setCurrentPage(null);
  };

  const handleOpenMatch = async (matchId: string) => {
    await useAppStore.getState().openTab(matchId);
    setCurrentPage(null);
  };

  const activeTab = getActiveTab();
  const showCodePage = currentPage === null && activeTab;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TitleBar />
      
      <div className="flex flex-1 min-h-0">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onSwitchToCoding={handleSwitchToCoding}
        />

        {/* Main content – no padding/card for coding view so panels can tile edge-to-edge */}
        {showCodePage ? (
          <main className="flex-1 min-h-0 overflow-hidden bg-background">
            <CodePage
              tabId={activeTab.tab.id}
              match={activeTab.match}
              clock={activeTab.clock}
              eventEngine={activeTab.eventEngine}
              clockState={activeTab.clockState}
              currentTime={activeTab.currentTime}
              activePhaseId={activeTab.activePhaseId}
            />
          </main>
        ) : (
          <main className="flex-1 overflow-auto p-4 bg-background">
            <div className="h-full bg-card/50 rounded-xl border border-border/40 backdrop-blur-sm">
              {currentPage === "matches" && <MatchesPage onOpenMatch={handleOpenMatch} />}
              {currentPage === "settings" && <SettingsPage onDirtyChange={setIsConfigDirty} />}
              {currentPage === "data-browser" && <DataBrowserPage />}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
