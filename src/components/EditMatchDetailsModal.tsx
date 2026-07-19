// Modal for editing match details (date, home team, away team)
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { ClockState } from "@/lib/types";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface EditMatchDetailsModalProps {
  tabId: string;
  match: { date: string; homeTeam: string; awayTeam: string };
  clockState: ClockState;
  onClose: () => void;
}

export function EditMatchDetailsModal({ tabId, match, clockState, onClose }: EditMatchDetailsModalProps) {
  const { updateActiveMatch, saveMatch } = useAppStore();
  const [date, setDate] = useState(match.date);
  const [homeTeam, setHomeTeam] = useState(match.homeTeam);
  const [awayTeam, setAwayTeam] = useState(match.awayTeam);

  const canEdit = clockState !== ClockState.RUNNING;
  const canSave = canEdit && !!date && !!homeTeam.trim() && !!awayTeam.trim();

  const handleSave = async () => {
    if (!canSave) return;
    updateActiveMatch(date, homeTeam.trim(), awayTeam.trim());
    await saveMatch(tabId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSave) handleSave();
    if (e.key === "Escape") onClose();
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <Modal
        isOpen
        onClose={onClose}
        title="Edit Match Details"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="attack" size="sm" onClick={handleSave} disabled={!canSave}>
              Save
            </Button>
          </>
        }
      >
        {!canEdit && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500">
            Cannot edit match details while the clock is running.
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={!canEdit}
              className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Home Team</label>
            <input
              type="text"
              value={homeTeam}
              onChange={e => setHomeTeam(e.target.value)}
              disabled={!canEdit}
              placeholder="Enter home team"
              className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Away Team</label>
            <input
              type="text"
              value={awayTeam}
              onChange={e => setAwayTeam(e.target.value)}
              disabled={!canEdit}
              placeholder="Enter away team"
              className="w-full px-2.5 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
