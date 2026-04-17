// Match details input card
import { useAppStore } from "@/lib/store";
import { ClockState } from "@/lib/types";

export function MatchDetailsCard() {
  const { matchDate, homeTeam, awayTeam, setMatchDate, setHomeTeam, setAwayTeam, clockState } =
    useAppStore();
  
  const isDisabled = clockState !== ClockState.STOPPED;

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-xl px-4 py-3 border border-border/50 shadow-sm">
      <h3 className="text-xs font-semibold text-muted-foreground mb-2.5">Match Details</h3>
      
      <div className="flex gap-3">
        {/* Date picker */}
        <div className="flex-1">
          <label htmlFor="match-date" className="block text-xs font-medium mb-1">
            Date
          </label>
          <input
            id="match-date"
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            disabled={isDisabled}
            className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Home team */}
        <div className="flex-1">
          <label htmlFor="home-team" className="block text-xs font-medium mb-1">
            Home Team
          </label>
          <input
            id="home-team"
            type="text"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            disabled={isDisabled}
            placeholder="Enter home team"
            className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Away team */}
        <div className="flex-1">
          <label htmlFor="away-team" className="block text-xs font-medium mb-1">
            Away Team
          </label>
          <input
            id="away-team"
            type="text"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            disabled={isDisabled}
            placeholder="Enter away team"
            className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
