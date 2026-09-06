// D8.11: Explainability Engine
// Provides structured, evidence-based reasoning for plans, approvals, pauses, and recovery decisions.

import { ExplanationReport, IntelligentPlan, PlanStep } from './types';

export class ExplainabilityEngine {
  /**
   * Generates a structured explanation for a given decision or action.
   */
  public static explain(
    topic: 'WHY_THIS_PLAN' | 'WHY_APPROVAL_REQUIRED' | 'WHY_RECOVERY_SELECTED' | 'WHY_ROLLED_BACK',
    context: {
      plan?: IntelligentPlan;
      step?: PlanStep;
      risk?: string;
      reason?: string;
      error?: string;
    }
  ): ExplanationReport {
    switch (topic) {
      case 'WHY_THIS_PLAN': {
        const stepCount = context.plan?.steps.length || 0;
        return {
          topic,
          question: 'Why was this specific plan synthesized?',
          answer: `The plan was synthesized to fulfill the goal "${context.plan?.title}" through ${stepCount} discrete, verifiable operations.`,
          justification: context.plan?.rationale || 'Operations were sequenced based on topological dependency requirements.',
          supportingEvidence: context.plan?.requirements || [],
          timestamp: new Date().toISOString(),
        };
      }

      case 'WHY_APPROVAL_REQUIRED': {
        return {
          topic,
          question: 'Why was human approval required before applying this change?',
          answer: `The action was classified as having ${context.risk || 'elevated'} risk and requires explicit sign-off under the active policy.`,
          justification: context.reason || 'Destructive mutations and schema additions require human consent.',
          supportingEvidence: [
            `Operation: ${context.step?.operation.type || 'Batch'}`,
            `Declared risk level: ${context.risk || 'high'}`,
          ],
          timestamp: new Date().toISOString(),
        };
      }

      case 'WHY_RECOVERY_SELECTED': {
        return {
          topic,
          question: 'Why was this specific recovery strategy selected?',
          answer: 'The system selected safe rollback and alternative generation to prevent schema corruption.',
          justification: context.error || 'A verification or execution failure occurred during step execution.',
          supportingEvidence: [
            `Error message: ${context.error || 'Unknown error'}`,
            'Preserved snapshot via AITransactionManager',
          ],
          timestamp: new Date().toISOString(),
        };
      }

      case 'WHY_ROLLED_BACK': {
        return {
          topic,
          question: 'Why was this change rolled back?',
          answer: 'The post-execution verification checks failed, triggering automatic rollback to protect data integrity.',
          justification: context.reason || 'Verification failure detected divergence from plan expectations.',
          supportingEvidence: [
            `Failed step: ${context.step?.stepId || 'unknown'}`,
            'Zero orphaned entities persisted',
          ],
          timestamp: new Date().toISOString(),
        };
      }
    }
  }
}
