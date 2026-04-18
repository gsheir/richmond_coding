// Game clock for Richmond Hockey coding app
import { ClockMode, ClockState } from "./types";

export class GameClock {
  private mode: ClockMode;
  private state: ClockState;
  private startTime: number;
  private elapsedMs: number;
  private pausedElapsedMs: number;
  private currentPeriod: string;
  private offsetMs: number;
  private stateChangeListeners: ((state: ClockState) => void)[];
  private timeChangeListeners: ((timeMs: number) => void)[];

  constructor(mode: ClockMode = ClockMode.LIVE) {
    this.mode = mode;
    this.state = ClockState.STOPPED;
    this.startTime = 0;
    this.elapsedMs = 0;
    this.pausedElapsedMs = 0;
    this.currentPeriod = "Q1";
    this.offsetMs = 0;
    this.stateChangeListeners = [];
    this.timeChangeListeners = [];
  }

  start(): void {
    if (this.state === ClockState.RUNNING) return;

    if (this.state === ClockState.PAUSED) {
      // Resume from paused state
      this.elapsedMs = this.pausedElapsedMs;
      this.startTime = Date.now();
      this.state = ClockState.RUNNING;
      this.notifyStateChange();
    } else if (this.state === ClockState.STOPPED) {
      // Start fresh
      this.elapsedMs = 0;
      this.pausedElapsedMs = 0;
      this.startTime = Date.now();
      this.state = ClockState.RUNNING;
      this.notifyStateChange();
    }
  }

  pause(): void {
    if (this.state === ClockState.RUNNING) {
      this.pausedElapsedMs = this.elapsedMs + (Date.now() - this.startTime);
      this.state = ClockState.PAUSED;
      this.notifyStateChange();
    }
  }

  resume(): void {
    if (this.state === ClockState.PAUSED) {
      this.elapsedMs = this.pausedElapsedMs;
      this.startTime = Date.now();
      this.state = ClockState.RUNNING;
      this.notifyStateChange();
    }
  }

  stop(): void {
    this.state = ClockState.STOPPED;
    this.elapsedMs = 0;
    this.pausedElapsedMs = 0;
    this.notifyStateChange();
  }

  restoreTimeMs(timeMs: number): void {
    // Restore clock time when loading a saved match
    // Set to PAUSED state so the time is visible
    this.pausedElapsedMs = timeMs;
    if (timeMs > 0 && this.state === ClockState.STOPPED) {
      this.state = ClockState.PAUSED;
      this.notifyStateChange();
    }
  }

  currentTimeMs(): number {
    if (this.state === ClockState.STOPPED) {
      return 0;
    } else if (this.state === ClockState.PAUSED) {
      return this.pausedElapsedMs;
    } else {
      return this.elapsedMs + (Date.now() - this.startTime);
    }
  }

  setTimeMs(timeMs: number): void {
    if (this.mode === ClockMode.RETROSPECTIVE) {
      if (this.state === ClockState.RUNNING) {
        this.elapsedMs = timeMs;
        this.startTime = Date.now();
      } else {
        this.pausedElapsedMs = timeMs;
      }
      this.notifyTimeChange(timeMs);
    }
  }

  setOffsetMs(offsetMs: number): void {
    if (this.mode === ClockMode.RETROSPECTIVE) {
      this.offsetMs = offsetMs;
    }
  }

  jumpToVideoTimeMs(videoTimeMs: number): void {
    if (this.mode === ClockMode.RETROSPECTIVE) {
      const codingTimeMs = videoTimeMs - this.offsetMs;
      this.setTimeMs(Math.max(0, codingTimeMs));
    }
  }

  setPeriod(period: string): void {
    this.currentPeriod = period;
  }

  getTimeString(): string {
    const timeMs = this.currentTimeMs();
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  getState(): ClockState {
    return this.state;
  }

  getPeriod(): string {
    return this.currentPeriod;
  }

  canPause(): boolean {
    return this.mode === ClockMode.RETROSPECTIVE;
  }

  canRewind(): boolean {
    return this.mode === ClockMode.RETROSPECTIVE;
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
