// Match details input card
import { useState } from "react";
import { Edit2, Check, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ClockState } from "@/lib/types";

interface MatchDetailsCardProps {
  tabId: string;
  match: { date: string; homeTeam: string; awayTeam: string };
  clockState: ClockState;
}

export function MatchDetailsCard({ tabId, match, clockState }: MatchDetailsCardProps) {
  const { updateActiveMatch, saveMatch } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  
  // Local edit state
  const [editDate, setEditDate] = useState(match.date);
  const [editHomeTeam, setEditHomeTeam] = useState(match.homeTeam);
  const [editAwayTeam, setEditAwayTeam] = useState(match.awayTeam);
  
  const canEdit = clockState === ClockState.STOPPED;

  const handleStartEdit = () => {
    if (!canEdit) return;
    setEditDate(match.date);
    setEditHomeTeam(match.homeTeam);
    setEditAwayTeam(match.awayTeam);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editDate || !editHomeTeam.trim() || !editAwayTeam.trim()) {
      return;
    }
    
    updateActiveMatch(editDate, editHomeTeam.trim(), editAwayTeam.trim());
    await saveMatch(tabId);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDate(match.date);
    setEditHomeTeam(match.homeTeam);
    setEditAwayTeam(match.awayTeam);
    setIsEditing(false);
  };

  return (
    <div className="relative bg-card/80 backdrop-blur-xl rounded-xl px-4 py-3 border border-border/50 shadow-sm">
      <h3 className="text-xs font-semibold text-muted-foreground mb-2.5">Match Details</h3>
      
      {/* Edit button */}
      {!isEditing && (
        <button
          onClick={handleStartEdit}
          disabled={!canEdit}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={canEdit ? "Edit match details" : "Cannot edit while clock is running"}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
      
      <div className="flex gap-3">
        {/* Date */}
        <div className="flex-1">
          <label htmlFor="match-date" className="block text-xs font-medium mb-1">
            Date
          </label>
          {isEditing ? (
            <input
              id="match-date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="w-full px-2.5 py-1.5 text-sm bg-background/20 rounded-md text-foreground">
              {match.date}
            </div>
          )}
        </div>

        {/* Home team */}
        <div className="flex-1">
          <label htmlFor="home-team" className="block text-xs font-medium mb-1">
            Home Team
          </label>
          {isEditing ? (
            <input
              id="home-team"
              type="text"
              value={editHomeTeam}
              onChange={(e) => setEditHomeTeam(e.target.value)}
              placeholder="Enter home team"
              className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="w-full px-2.5 py-1.5 text-sm bg-background/20 rounded-md text-foreground">
              {match.homeTeam}
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1">
          <label htmlFor="away-team" className="block text-xs font-medium mb-1">
            Away Team
          </label>
          {isEditing ? (
            <input
              id="away-team"
              type="text"
              value={editAwayTeam}
              onChange={(e) => setEditAwayTeam(e.target.value)}
              placeholder="Enter away team"
              className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="w-full px-2.5 py-1.5 text-sm bg-background/20 rounded-md text-foreground">
              {match.awayTeam}
            </div>
          )}
        </div>
      </div>

      {/* Edit actions */}
      {isEditing && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="p-1.5 rounded-full hover:bg-muted transition-colors text-green-600"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
