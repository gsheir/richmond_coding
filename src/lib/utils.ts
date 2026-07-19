// Utility for merging class names (shadcn/ui pattern)
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a millisecond duration as mm:ss, the canonical time display format
 * used throughout the app (clock, timeline, event log).
 */
export function formatTimeMs(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Formats a hotkey for display, converting arrow keys to symbols
 */
export function formatHotkeyDisplay(hotkey: string | undefined): string {
  if (!hotkey) return '';
  
  const arrowMap: Record<string, string> = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
  };
  
  // Display "Space" for the space character
  if (hotkey === ' ') {
    return 'Space';
  }
  
  return arrowMap[hotkey] || hotkey;
}

/**
 * Normalises a key event key to a standard hotkey format
 */
export function normaliseHotkey(key: string): string {
  // For arrow keys, return the full key name
  if (key.startsWith('Arrow')) {
    return key;
  }
  
  // For single characters, uppercase them
  if (key.length === 1) {
    return key.toUpperCase();
  }
  
  return key;
}

/**
 * Checks if a key is valid for use as a hotkey
 */
export function isValidHotkeyKey(key: string): boolean {
  // Allow single characters (letters, numbers, symbols)
  if (key.length === 1) {
    return true;
  }
  
  // Allow arrow keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    return true;
  }
  
  return false;
}
