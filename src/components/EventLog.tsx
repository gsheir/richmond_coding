// Event log table displaying coded phases
import { Phase, PhaseStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface EventLogProps {
  phases: Phase[];
}

export function EventLog({ phases }: EventLogProps) {
  // Show newest first
  const sortedPhases = [...phases].reverse();

  const getDotColor = (phase: Phase) => {
    // If terminated, colour based on category
    if (phase.status === PhaseStatus.TERMINATED) {
      if (phase.terminationCategory === "success") {
        return "bg-green-500";
      } else if (phase.terminationCategory === "failure") {
        return "bg-red-500";
      }
      return "bg-green-500"; // Default to green for terminated
    }
    
    // Otherwise colour based on status
    if (phase.status === PhaseStatus.UNDEFINED) {
      return "bg-yellow-500";
    } else if (phase.status === PhaseStatus.CLASSIFIED) {
      return "bg-blue-500";
    }
    
    return "bg-gray-500";
  };

  return (
    <div className="flex flex-col h-full bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/40">
        <h3 className="font-semibold text-xs text-muted-foreground">Event Log</h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {phases.length} phases recorded
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card/90 backdrop-blur-sm border-b border-border/30">
            <tr>
              <th className="w-6"></th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground text-xs">
                Time
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground text-xs">
                Code
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground text-xs">
                Context
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {sortedPhases.map((phase) => (
                <motion.tr
                  key={phase.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "border-b border-border/50 hover:bg-accent/50 transition-colors",
                    phase.status === PhaseStatus.UNDEFINED && "bg-yellow-500/10",
                    phase.status === PhaseStatus.CLASSIFIED && "bg-blue-500/10"
                  )}
                >
                  <td className="px-3 py-1.5">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        getDotColor(phase)
                      )}
                    />
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">
                    {formatTime(phase.startTimeMs)}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-xs">
                    {phase.phaseLabel || "Undefined"}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {phase.contextLabels.join(", ") || "–"}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {phases.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No phases recorded yet. Press Space to start coding.
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
