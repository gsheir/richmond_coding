// Dynamic button grid from configuration
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ButtonConfig } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { formatHotkeyDisplay } from "@/lib/utils";

interface ButtonGridProps {
  buttons: ButtonConfig[];
  disabled?: boolean;
  activePhasePossession?: "in-possession" | "out-of-possession";
}

export function ButtonGrid({ buttons, disabled = false, activePhasePossession }: ButtonGridProps) {
  const { handleButtonClick } = useAppStore();

  // Check if a termination button should be disabled based on possession context
  const isTerminationButtonDisabled = (button: ButtonConfig): boolean => {
    if (button.type !== "termination") return false;
    if (!button.forPossessionState) return false; // Generic terminations are always enabled
    if (!activePhasePossession) return true; // No active phase = disable possession-specific terminations
    return button.forPossessionState !== activePhasePossession;
  };

  // Set up hotkeys
  useEffect(() => {
    if (disabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Find first button matching hotkey that is not disabled
      const button = buttons.find((btn) => {
        if (!btn.hotkey) return false;
        
        // Check if hotkey matches
        let hotkeyMatches = false;
        if (btn.hotkey.startsWith('Arrow')) {
          hotkeyMatches = btn.hotkey === e.key;
        } else {
          hotkeyMatches = btn.hotkey.toLowerCase() === e.key.toLowerCase();
        }
        
        // Return true only if hotkey matches AND button is not disabled
        return hotkeyMatches && !isTerminationButtonDisabled(btn);
      });

      if (button) {
        e.preventDefault();
        handleButtonClick(button.code, button.type);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [buttons, disabled, handleButtonClick, activePhasePossession]);

  const handleClick = (button: ButtonConfig) => {
    if (!disabled && !isTerminationButtonDisabled(button)) {
      handleButtonClick(button.code, button.type);
    }
  };

  return (
    <div className="relative w-full h-full">
      {buttons.map((button) => {
        const isButtonDisabled = disabled || isTerminationButtonDisabled(button);
        return (
          <motion.button
            key={button.code}
            onClick={() => handleClick(button)}
            disabled={isButtonDisabled}
            whileHover={{ scale: isButtonDisabled ? 1 : 1.02 }}
            whileTap={{ scale: isButtonDisabled ? 1 : 0.98 }}
            style={{
              position: "absolute",
              left: button.position.x,
              top: button.position.y,
              width: button.position.width,
              height: button.position.height,
              backgroundColor: button.style.colour,
              opacity: isButtonDisabled ? 0.5 : button.style.opacity,
            }}
            className={cn(
              "rounded-xl text-white shadow-lg transition-all",
              "hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50",
              isButtonDisabled && "cursor-not-allowed"
            )}
          >
            <div className="flex flex-col items-center justify-center h-full gap-1">
              <span className="text-center" style={{ fontSize: `${button.style.fontSize}px`, fontWeight: button.style.fontWeight }}>
                {button.label}
              </span>
              {button.hotkey && (
                <span className="text-[10px] opacity-70 border border-white/30 rounded px-1.5 py-0.5">
                  {formatHotkeyDisplay(button.hotkey)}
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
