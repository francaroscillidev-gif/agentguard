export interface LoopState {
  commandHistory: string[];
  maxRepeatsAllowed: number;
}

export interface LoopVerdict {
  inLoop: boolean;
  repetitionCount: number;
  detectedCommand?: string;
  mitigationSuggestion?: string;
}

/**
 * Tracks agent tool-call history to prevent infinite self-healing loops
 * (e.g. failing tests -> editing the test -> failing again in cycle).
 */
export class CognitiveLoopTracker {
  private history: string[] = [];
  private maxThreshold: number;

  constructor(maxThreshold: number = 3) {
    this.maxThreshold = maxThreshold;
  }

  public recordAndEvaluate(commandOrAction: string): LoopVerdict {
    const normalized = commandOrAction.trim().toLowerCase();
    this.history.push(normalized);

    // Look at last 6 actions
    const recent = this.history.slice(-6);
    const counts = new Map<string, number>();

    for (const item of recent) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    for (const [action, count] of counts.entries()) {
      if (count >= this.maxThreshold) {
        return {
          inLoop: true,
          repetitionCount: count,
          detectedCommand: action,
          mitigationSuggestion:
            'Agent is stuck in an execution cycle. Prompt the user for manual guidance or break iteration.'
        };
      }
    }

    return {
      inLoop: false,
      repetitionCount: 1
    };
  }

  public reset(): void {
    this.history = [];
  }
}
