// Agent Guardrails: Bound enforcement, loop detection, and safety ceiling
import { AgentStep, AgentTask } from './AgentTask';
import { AIError } from '../core/AIError';

export class AgentGuardrails {
  public static readonly DEFAULT_MAX_STEPS = 15;
  public static readonly DEFAULT_TIMEOUT_MS = 60000;

  /**
   * Asserts that the task has not exceeded its step limit.
   */
  public static checkStepLimit(task: AgentTask): void {
    if (task.currentStep >= task.maxSteps) {
      throw new AIError(
        'AGENT_MAX_STEPS_EXCEEDED',
        `Agent execution halted: Reached maximum step ceiling (${task.maxSteps} steps).`
      );
    }
  }

  /**
   * Checks for cyclic or infinite tool execution loops.
   */
  public static detectLoop(steps: AgentStep[]): boolean {
    if (steps.length < 3) return false;
    const last3 = steps.slice(-3);
    const firstTool = last3[0].toolName;
    const firstArgs = JSON.stringify(last3[0].toolArgs);

    return last3.every((s) => s.toolName === firstTool && JSON.stringify(s.toolArgs) === firstArgs);
  }

  /**
   * Checks for cancellation.
   */
  public static checkCancellation(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new AIError('CANCELLED', 'Agent task was cancelled by the user.');
    }
  }
}
