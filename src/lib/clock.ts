// Game clock for Richmond Hockey coding app
import { ClockState } from "./types";
import { formatTimeMs } from "./utils";

export class GameClock {
  private state: ClockState;
  private startTime: number;
  private elapsedMs: number;
  private latestTimeMs: number;
  private currentPeriod: string;
  private stateChangeListeners: ((state: ClockState) => void)[];
  private timeChangeListeners: ((timeMs: number) => void)[];

  constructor() {
    this.state = ClockState.STOPPED;
    this.startTime = 0;
    this.elapsedMs = 0;
    this.latestTimeMs = 0;
    this.currentPeriod = "Q1";
    this.stateChangeListeners = [];
    this.timeChangeListeners = [];
  }

  start(): void {
    if (this.state === ClockState.RUNNING) return;

    // Resume from wherever the clock is currently positioned, whether it
    // was pre-positioned while stopped or halted mid-match.
    this.startTime = Date.now();
    this.state = ClockState.RUNNING;
    this.notifyStateChange();
  }

  stop(): void {
    if (this.state === ClockState.STOPPED) return;

    // Preserve the elapsed time so the clock can be resumed or
    // further adjusted while stopped.
    this.elapsedMs = this.elapsedMs + (Date.now() - this.startTime);
    this.state = ClockState.STOPPED;
    this.notifyStateChange();
  }

  restoreTimeMs(timeMs: number): void {
    // Restore clock time when loading a saved match
    this.elapsedMs = timeMs;
    if (timeMs > this.latestTimeMs) {
      this.latestTimeMs = timeMs;
    }
  }

  currentTimeMs(): number {
    const currentTime =
      this.state === ClockState.RUNNING
        ? this.elapsedMs + (Date.now() - this.startTime)
        : this.elapsedMs;

    // Track the latest time reached
    if (currentTime > this.latestTimeMs) {
      this.latestTimeMs = currentTime;
    }

    return currentTime;
  }

  getLatestTimeMs(): number {
    return this.latestTimeMs;
  }

  setTimeMs(timeMs: number): void {
    if (this.state === ClockState.RUNNING) {
      this.elapsedMs = timeMs;
      this.startTime = Date.now();
    } else {
      this.elapsedMs = timeMs;
    }

    if (timeMs > this.latestTimeMs) {
      this.latestTimeMs = timeMs;
    }

    this.notifyTimeChange(timeMs);
  }

  skipToStart(): void {
    this.setTimeMs(0);
  }

  skipBack(seconds: number = 5): void {
    const currentTime = this.currentTimeMs();
    const newTime = Math.max(0, currentTime - (seconds * 1000));
    this.setTimeMs(newTime);
  }

  skipForward(seconds: number = 5): void {
    const currentTime = this.currentTimeMs();
    const newTime = Math.min(this.latestTimeMs, currentTime + (seconds * 1000));
    this.setTimeMs(newTime);
  }

  skipToEnd(): void {
    this.setTimeMs(this.latestTimeMs);
  }

  setPeriod(period: string): void {
    this.currentPeriod = period;
  }

  getTimeString(): string {
    return formatTimeMs(this.currentTimeMs());
  }

  getState(): ClockState {
    return this.state;
  }

  getPeriod(): string {
    return this.currentPeriod;
  }

  onStateChange(listener: (state: ClockState) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(
        (l) => l !== listener
      );
    };
  }

  onTimeChange(listener: (timeMs: number) => void): () => void {
    this.timeChangeListeners.push(listener);
    return () => {
      this.timeChangeListeners = this.timeChangeListeners.filter(
        (l) => l !== listener
      );
    };
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach((listener) => listener(this.state));
  }

  private notifyTimeChange(timeMs: number): void {
    this.timeChangeListeners.forEach((listener) => listener(timeMs));
  }
}
