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

/**
 * Formats a signed offset as [-]mm:ss or [-]h:mm:ss, keeping tenths of a
 * second when present.
 */
export function formatOffsetMs(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const totalTenths = Math.round(Math.abs(ms) / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = `${(totalSeconds % 60).toString().padStart(2, "0")}${tenths ? `.${tenths}` : ""}`;
  return hours > 0
    ? `${sign}${hours}:${minutes.toString().padStart(2, "0")}:${seconds}`
    : `${sign}${minutes.toString().padStart(2, "0")}:${seconds}`;
}

/**
 * Parses [-]seconds, [-]mm:ss or [-]h:mm:ss (seconds may be fractional) into
 * milliseconds. Returns null if the input isn't a valid time.
 */
export function parseOffsetInput(value: string): number | null {
  const match = value.trim().match(/^(-)?(?:(?:(\d+):)?(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const [, sign, hoursPart, minutesPart, secondsPart] = match;
  const hours = hoursPart ? Number(hoursPart) : 0;
  const minutes = minutesPart ? Number(minutesPart) : 0;
  const seconds = Number(secondsPart);
  if (minutesPart && seconds >= 60) return null;
  if (hoursPart && minutes >= 60) return null;

  const ms = Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  return sign ? -ms : ms;
}
