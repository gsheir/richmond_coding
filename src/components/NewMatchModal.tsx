// Modal for creating a new match
import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { useAppStore } from "@/lib/store";
import { getDefaultWindowId, resolveWindowId } from "@/lib/coding-windows";

interface NewMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewMatchModal({ isOpen, onClose }: NewMatchModalProps) {
  const { defaultHomeTeam, createNewMatch, codingWindows } = useAppStore();
  
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [homeTeam, setHomeTeam] = useState(defaultHomeTeam);
  const [awayTeam, setAwayTeam] = useState("");
  const [codingWindowId, setCodingWindowId] = useState<number | null>(null);

  // Preselect the default code window (and recover if the chosen one disappears)
  useEffect(() => {
    if (!isOpen) return;
    setCodingWindowId((current) => resolveWindowId(codingWindows, current));
  }, [isOpen, codingWindows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !homeTeam.trim() || !awayTeam.trim()) {
      return;
    }

    await createNewMatch(date, homeTeam.trim(), awayTeam.trim(), codingWindowId ?? undefined);
    onClose();
    
    // Reset form
    setDate(new Date().toISOString().split("T")[0]);
    setHomeTeam(defaultHomeTeam);
    setAwayTeam("");
    setCodingWindowId(getDefaultWindowId(codingWindows));
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setDate(new Date().toISOString().split("T")[0]);
    setHomeTeam(defaultHomeTeam);
    setAwayTeam("");
    setCodingWindowId(getDefaultWindowId(codingWindows));
  };

  const isValid = date && homeTeam.trim() && awayTeam.trim();

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Create New Match">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
            <div>
              <label htmlFor="modal-date" className="block text-sm font-medium mb-1.5">
                Date
              </label>
              <input
                id="modal-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Home Team */}
            <div>
              <label htmlFor="modal-home-team" className="block text-sm font-medium mb-1.5">
                Home Team
              </label>
              <input
                id="modal-home-team"
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                required
                placeholder="Enter home team name"
                className="w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Away Team */}
            <div>
              <label htmlFor="modal-away-team" className="block text-sm font-medium mb-1.5">
                Away Team
              </label>
              <input
                id="modal-away-team"
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                required
                placeholder="Enter away team name"
                className="w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Code Window */}
            <div>
              <label htmlFor="modal-coding-window" className="block text-sm font-medium mb-1.5">
                Code Window
              </label>
              <select
                id="modal-coding-window"
                value={codingWindowId ?? ""}
                onChange={(e) => setCodingWindowId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {codingWindows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}{w.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Can be changed later from the code page.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="attack"
                size="sm"
                disabled={!isValid}
              >
                Create Match
              </Button>
            </div>
      </form>
    </Modal>
  );
}
