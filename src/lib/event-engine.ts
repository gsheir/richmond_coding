// Event engine for managing phase workflow
import { GameClock } from "./clock";
import {
  Phase,
  PhaseStatus,
  ButtonType,
  ButtonConfig,
  createPhase,
  classifyPhase,
  addContextToPhase,
  terminatePhase,
} from "./types";

export class EventEngine {
  private clock: GameClock;
  private phases: Phase[];
  private activePhase: Phase | null;
  private nextPhaseId: number;
  private buttonConfig: Record<string, ButtonConfig>;
  private phaseStartedListeners: ((phase: Phase) => void)[];
  private phaseClassifiedListeners: ((phase: Phase) => void)[];
  private phaseTerminatedListeners: ((phase: Phase) => void)[];

  constructor(clock: GameClock) {
    this.clock = clock;
    this.phases = [];
    this.activePhase = null;
    this.nextPhaseId = 0;
    this.buttonConfig = {};
    this.phaseStartedListeners = [];
    this.phaseClassifiedListeners = [];
    this.phaseTerminatedListeners = [];
  }

  setButtonConfig(buttons: ButtonConfig[]): void {
    this.buttonConfig = {};
    buttons.forEach((btn) => {
      this.buttonConfig[btn.code] = btn;
    });
  }

  startUndefinedPhase(leadMs: number = 5000, lagMs: number = 5000): Phase | null {
    if (this.activePhase !== null) {
      return null;
    }

    const period = this.clock.getPeriod();
    const startTimeMs = this.clock.currentTimeMs();

    const phase = createPhase(this.nextPhaseId++, startTimeMs, period, leadMs, lagMs);
    this.phases.push(phase);
    this.activePhase = phase;

    this.notifyPhaseStarted(phase);
    return phase;
  }

  classifyActivePhase(code: string): boolean {
    if (!this.activePhase) return false;
    if (this.activePhase.status !== PhaseStatus.UNDEFINED) return false;

    const button = this.buttonConfig[code];
    if (!button) return false;

    const index = this.phases.indexOf(this.activePhase);
    if (index === -1) return false;

    this.activePhase = classifyPhase(this.activePhase, code, button.label);
    this.phases[index] = this.activePhase;

    this.notifyPhaseClassified(this.activePhase);
    return true;
  }

  addContextToActivePhase(context: string): boolean {
    if (!this.activePhase) return false;

    const index = this.phases.indexOf(this.activePhase);
    if (index === -1) return false;

    this.activePhase = addContextToPhase(this.activePhase, context);
    this.phases[index] = this.activePhase;

    return true;
  }

  terminateActivePhase(terminationEvent: string | null = null): boolean {
    if (!this.activePhase) return false;

    const endTimeMs = this.clock.currentTimeMs();
    const index = this.phases.indexOf(this.activePhase);
    if (index === -1) return false;

    // Get the category from the button config
    const button = terminationEvent ? this.buttonConfig[terminationEvent] : null;
    const terminationCategory = button?.category || null;

    this.activePhase = terminatePhase(this.activePhase, endTimeMs, terminationEvent, terminationCategory);
    this.phases[index] = this.activePhase;

    this.notifyPhaseTerminated(this.activePhase);
    this.activePhase = null;

    return true;
  }

  handleButtonClick(code: string, buttonType: ButtonType): void {
    const button = this.buttonConfig[code];
    if (!button) return;

    switch (buttonType) {
      case ButtonType.PHASE:
        // Check if clicking the same phase button again
        if (this.activePhase !== null && 
            this.activePhase.status === PhaseStatus.CLASSIFIED &&
            this.activePhase.phaseCode === code) {
          // Same phase clicked - use SAME_PHASE termination
          this.terminateActivePhase("SAME_PHASE");
          return; // Don't start a new phase
        }
        
        // If there's a different classified phase active, auto-terminate it first
        if (this.activePhase !== null && this.activePhase.status === PhaseStatus.CLASSIFIED) {
          const terminationCode = this.determineAutoTermination(this.activePhase, button);
          this.terminateActivePhase(terminationCode);
          // activePhase is now null
        }
        
        // Start new undefined phase if needed
        if (this.activePhase === null) {
          this.startUndefinedPhase();
        }
        
        // Classify the phase (whether it was existing undefined or newly created)
        this.classifyActivePhase(code);
        break;

      case ButtonType.CONTEXT:
        this.addContextToActivePhase(code);
        break;

      case ButtonType.TERMINATION:
        this.terminateActivePhase(code);
        break;
    }
  }

  private determineAutoTermination(currentPhase: Phase, newPhaseButton: ButtonConfig): string | null {
    const currentButton = this.buttonConfig[currentPhase.phaseCode || ""];
    if (!currentButton) return null;
    
    const currentPossession = currentButton.possessionState;
    const currentHierarchy = currentButton.hierarchyLevel;
    const newPossession = newPhaseButton.possessionState;
    const newHierarchy = newPhaseButton.hierarchyLevel;
    
    // Determine transition type needed
    let transitionType: string | null = null;
    
    if (currentPossession === newPossession) {
      // Same possession state
      if (newHierarchy !== undefined && currentHierarchy !== undefined) {
        if (newHierarchy > currentHierarchy) {
          transitionType = "upgrade";
        } else if (newHierarchy < currentHierarchy) {
          transitionType = "downgrade";
        }
      }
    } else if (currentPossession === "in-possession" && newPossession === "out-of-possession") {
      transitionType = "ball-lost";
    } else if (currentPossession === "out-of-possession" && newPossession === "in-possession") {
      transitionType = "ball-won";
    }
    
    if (!transitionType) return null;
    
    // Find termination button with matching transition type and possession context
    // Prefer buttons that match the current possession state, fall back to generic ones
    const terminationButtons = Object.values(this.buttonConfig).filter(
      btn => btn.type === ButtonType.TERMINATION && btn.transitionType === transitionType
    );
    
    // First try to find a button specific to the current possession state
    const specificButton = terminationButtons.find(
      btn => btn.forPossessionState === currentPossession
    );
    
    if (specificButton) {
      return specificButton.code;
    }
    
    // Fall back to a generic button (no forPossessionState specified)
    const genericButton = terminationButtons.find(
      btn => !btn.forPossessionState
    );
    
    return genericButton?.code || terminationButtons[0]?.code || null;
  }

  getActivePhase(): Phase | null {
    return this.activePhase;
  }

  getAllPhases(): Phase[] {
    return [...this.phases];
  }

  undoLastAction(): boolean {
    if (this.phases.length === 0) return false;

    // Remove the last phase
    const removedPhase = this.phases.pop();
    
    // If the removed phase was active, clear active phase
    if (removedPhase && this.activePhase?.id === removedPhase.id) {
      this.activePhase = null;
    }

    this.nextPhaseId--;
    return true;
  }

  updatePhase(phaseId: number, updates: Partial<Phase>): boolean {
    const index = this.phases.findIndex((p) => p.id === phaseId);
    if (index === -1) return false;

    this.phases[index] = {
      ...this.phases[index],
      ...updates,
    };

    // If updating the active phase, update the reference
    if (this.activePhase?.id === phaseId) {
      this.activePhase = this.phases[index];
    }

    return true;
  }

  clearAll(): void {
    this.phases = [];
    this.activePhase = null;
    this.nextPhaseId = 0;
  }

  loadPhases(phases: Phase[]): void {
    this.phases = [...phases];
    this.nextPhaseId = phases.length > 0 ? Math.max(...phases.map((p) => p.id)) + 1 : 0;
    this.activePhase = null;
  }

  onPhaseStarted(listener: (phase: Phase) => void): () => void {
    this.phaseStartedListeners.push(listener);
    return () => {
      this.phaseStartedListeners = this.phaseStartedListeners.filter(
        (l) => l !== listener
      );
    };
  }

  onPhaseClassified(listener: (phase: Phase) => void): () => void {
    this.phaseClassifiedListeners.push(listener);
    return () => {
      this.phaseClassifiedListeners = this.phaseClassifiedListeners.filter(
        (l) => l !== listener
      );
    };
  }

  onPhaseTerminated(listener: (phase: Phase) => void): () => void {
    this.phaseTerminatedListeners.push(listener);
    return () => {
      this.phaseTerminatedListeners = this.phaseTerminatedListeners.filter(
        (l) => l !== listener
      );
    };
  }

  private notifyPhaseStarted(phase: Phase): void {
    this.phaseStartedListeners.forEach((listener) => listener(phase));
  }

  private notifyPhaseClassified(phase: Phase): void {
    this.phaseClassifiedListeners.forEach((listener) => listener(phase));
  }

  private notifyPhaseTerminated(phase: Phase): void {
    this.phaseTerminatedListeners.forEach((listener) => listener(phase));
  }
}
