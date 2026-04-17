// Dynamic button grid from configuration
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ButtonConfig } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";

interface ButtonGridProps {
  buttons: ButtonConfig[];
  disabled?: boolean;
}

export function ButtonGrid({ buttons, disabled = false }: ButtonGridProps) {
  const { handleButtonClick } = useAppStore();

  // Set up hotkeys
  useEffect(() => {
    if (disabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const button = buttons.find(
        (btn) => btn.hotkey.toLowerCase() === e.key.toLowerCase()
      );

      if (button) {
        e.preventDefault();
        handleButtonClick(button.code, button.type);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [buttons, disabled, handleButtonClick]);

  const handleClick = (button: ButtonConfig) => {
    if (!disabled) {
      handleButtonClick(button.code, button.type);
    }
  };

  return (
    <div className="relative w-full h-full">
      {buttons.map((button) => {
        return (
          <motion.button
            key={button.code}
            onClick={() => handleClick(button)}
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            style={{
              position: "absolute",
              left: button.position.x,
              top: button.position.y,
              width: button.position.width,
              height: button.position.height,
              backgroundColor: button.style.colour,
              opacity: disabled ? 0.5 : button.style.opacity,
            }}
            className={cn(
              "rounded-xl font-semibold text-white shadow-lg transition-all",
              "hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50",
              disabled && "cursor-not-allowed"
            )}
          >
            <div className="flex flex-col items-center justify-center h-full gap-1">
              <span style={{ fontSize: button.style.fontSize }}>
                {button.label}
              </span>
              <span className="text-xs opacity-70">{button.hotkey}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
