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
  const [currentPage, setCurrentPage] = useState<"code" | "matches" | "settings">(
    "code"
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);
  const { initialize, setButtonConfig } = useAppStore();

  useEffect(() => {
    // Initialize app
    initialize();

    // Load button configuration
    loadButtonConfig().then((config) => {
      setButtonConfig(config);
    });
  }, [initialize, setButtonConfig]);

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

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TitleBar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1 min-h-0">
        <Sidebar 
          currentPage={currentPage} 
          onNavigate={setCurrentPage} 
          isOpen={sidebarOpen} 
          isOverlay={isNarrow && sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-auto p-4 bg-background">
          <div className="h-full bg-card/20 rounded-xl border border-border/40 backdrop-blur-sm">
            {currentPage === "code" && <CodePage />}
            {currentPage === "matches" && (
              <MatchesPage onNavigateToCode={() => setCurrentPage("code")} />
            )}
            {currentPage === "settings" && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
