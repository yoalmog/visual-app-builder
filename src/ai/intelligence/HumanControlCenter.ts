// D8.13: Human-in-the-Loop Control Center
// Central coordination for operator control: start, pause, resume, approve, reject, retry, rollback, and autonomy adjustment.

import { AppProject } from '../../builder/schema/project';
import { IntelligentPlan, AutonomyLevel, DevelopmentSession } from './types';
import { IntelligentSessionManager } from './IntelligentSessionManager';
import { AdaptiveExecutionEngine, AdaptiveExecutionResult } from './AdaptiveExecutionEngine';
import { AITransactionManager } from '../history/AITransactionManager';

export class HumanControlCenter {
  /**
   * Starts or triggers autonomous execution for a session.
   */
  public static async startExecution(sessionId: string, project: AppProject): Promise<AdaptiveExecutionResult> {
    const session = IntelligentSessionManager.getSession(sessionId);
    if (!session || !session.currentPlan) {
      throw new Error(`Session ${sessionId} has no plan to execute.`);
    }

    IntelligentSessionManager.updateSessionState(sessionId, 'EXECUTING');

    const result = await AdaptiveExecutionEngine.executePlan({
      plan: session.currentPlan,
      project,
      autonomyLevel: session.autonomyLevel,
      sessionId,
    });

    if (result.status === 'COMPLETED') {
      IntelligentSessionManager.updateSessionState(sessionId, 'COMPLETED');
    } else if (result.status === 'WAITING_APPROVAL') {
      IntelligentSessionManager.updateSessionState(sessionId, 'WAITING_APPROVAL');
    } else {
      IntelligentSessionManager.updateSessionState(sessionId, 'FAILED');
    }

    return result;
  }

  /**
   * Operator approves a pending step or plan.
   */
  public static async approve(sessionId: string, project: AppProject): Promise<AdaptiveExecutionResult> {
    const session = IntelligentSessionManager.getSession(sessionId);
    if (!session || !session.currentPlan) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    // Temporary elevation to allow approved execution
    const elevatedLevel = Math.max(session.autonomyLevel, 3) as AutonomyLevel;

    return await AdaptiveExecutionEngine.executePlan({
      plan: session.currentPlan,
      project,
      autonomyLevel: elevatedLevel,
      sessionId,
    });
  }

  /**
   * Operator pauses execution.
   */
  public static pause(sessionId: string): DevelopmentSession | undefined {
    return IntelligentSessionManager.updateSessionState(sessionId, 'PAUSED');
  }

  /**
   * Operator cancels execution.
   */
  public static cancel(sessionId: string): DevelopmentSession | undefined {
    return IntelligentSessionManager.updateSessionState(sessionId, 'CANCELLED');
  }

  /**
   * Operator updates autonomy level.
   */
  public static setAutonomyLevel(sessionId: string, level: AutonomyLevel): DevelopmentSession | undefined {
    const session = IntelligentSessionManager.getSession(sessionId);
    if (!session) return undefined;
    session.autonomyLevel = level;
    IntelligentSessionManager.saveSession(session);
    return session;
  }

  /**
   * Safe rollback to snapshot.
   */
  public static rollbackLastTransaction(generationId: string): { success: boolean; restoredProject?: AppProject } {
    return AITransactionManager.rollback(generationId);
  }
}
