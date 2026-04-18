import { useEffect, useState } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { CodePage } from "./components/CodePage";
import { MatchesPage } from "./components/MatchesPage";
import { SettingsPage } from "./components/SettingsPage";
import { useAppStore } from "./lib/store";
import { loadButtonConfig } from "./lib/config-loader";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState<"matches" | "settings" | null>(
    "matches"
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);
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

  // Auto-collapse/expand sidebar based on viewport width
  useEffect(() => {
    const handleResize = () => {
      const narrow = window.innerWidth < 1000;
      setIsNarrow(narrow);
      
      // Auto-close sidebar when going narrow, auto-open when going wide
      if (narrow) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (page: "matches" | "settings") => {
    setCurrentPage(page);
  };

  const handleSwitchToTab = (tabId: string) => {
    useAppStore.getState().switchTab(tabId);
    setCurrentPage(null);
  };

  const handleOpenMatch = async (matchId: string) => {
    await useAppStore.getState().openTab(matchId);
    setCurrentPage(null);
  };

  const hasOpenTabs = tabs.length > 0;
  const activeTab = getActiveTab();
  const showCodePage = currentPage === null && activeTab;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TitleBar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1 min-h-0">
        <Sidebar 
          currentPage={currentPage} 
          onNavigate={handleNavigate}
          onSwitchToTab={handleSwitchToTab}
          isOpen={sidebarOpen} 
          isOverlay={isNarrow && sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-auto p-4 bg-background">
          <div className="h-full bg-card/50 rounded-xl border border-border/40 backdrop-blur-sm">
            {/* Show code page if a match tab is active, otherwise show navigation pages */}
            {showCodePage ? (
              <CodePage
                tabId={activeTab.tab.id}
                match={activeTab.match}
                clock={activeTab.clock}
                eventEngine={activeTab.eventEngine}
                clockState={activeTab.clockState}
                currentTime={activeTab.currentTime}
                activePhaseId={activeTab.activePhaseId}
              />
            ) : (
              <>
                {currentPage === "matches" && <MatchesPage onOpenMatch={handleOpenMatch} />}
                {currentPage === "settings" && <SettingsPage />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
