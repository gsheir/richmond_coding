// Matches list page
import { useEffect } from "react";
import { Button } from "./ui/Button";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getMatchDisplayName } from "@/lib/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MatchesPageProps {
  onNavigateToCode: () => void;
}

export function MatchesPage({ onNavigateToCode }: MatchesPageProps) {
  const { matches, refreshMatches, loadMatch, deleteMatch, createNewMatch } =
    useAppStore();

  useEffect(() => {
    refreshMatches();
  }, [refreshMatches]);

  const handleLoadMatch = async (matchId: string) => {
    await loadMatch(matchId);
    onNavigateToCode();
  };

  const handleNewMatch = () => {
    createNewMatch(
      new Date().toISOString().split("T")[0],
      "Richmond",
      "Opposition"
    );
    onNavigateToCode();
  };

  const handleDeleteMatch = async (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this match?")) {
      await deleteMatch(matchId);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Matches</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {matches.length} saved matches
          </p>
        </div>

        <Button onClick={handleNewMatch} variant="attack" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          New Match
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid gap-2">
          {matches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleLoadMatch(match.id)}
              className={cn(
                "bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-3",
                "hover:bg-card/90 hover:border-border/70 transition-all cursor-pointer",
                "group"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{getMatchDisplayName(match)}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {match.phases.length} phases · Last modified{" "}
                    {new Date(match.modifiedAt).toLocaleDateString()}
                  </p>
                </div>

                <Button
                  onClick={(e) => handleDeleteMatch(match.id, e)}
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}

          {matches.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-sm text-muted-foreground mb-4">No matches yet</p>
              <Button onClick={handleNewMatch} variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Create Your First Match
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
