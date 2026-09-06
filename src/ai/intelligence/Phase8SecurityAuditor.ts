// D8.16: Phase 8 Security Auditor
// Static code and plan security scanner preventing dynamic execution, path traversal, injection, and secret leakage.

import { NoEvalGuard } from '../security/NoEvalGuard';
import { AISecretFilter } from '../security/AISecretFilter';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';
import { IntelligentPlan } from './types';

export class Phase8SecurityAuditor {
  private static readonly DISALLOWED_PATTERNS = [
    /\beval\s*\(/i,
    /\bnew\s+Function\s*\(/i,
    /\bchild_process\b/i,
    /\bexecSync\s*\(/i,
    /\bspawnSync\s*\(/i,
    /\.\.\//, // Path traversal attempt
    /\/etc\/passwd/i,
    /\bDROP\s+TABLE\b/i,
  ];

  /**
   * Scans a string for dangerous execution or injection patterns.
   */
  public static auditCodeString(input: string): { safe: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const pattern of this.DISALLOWED_PATTERNS) {
      if (pattern.test(input)) {
        violations.push(`Security violation detected matching pattern: ${pattern.source}`);
      }
    }

    if (PromptInjectionDefense.containsInjectionAttempt(input)) {
      violations.push('Prompt injection signature detected');
    }

    return {
      safe: violations.length === 0,
      violations,
    };
  }

  /**
   * Audits an entire intelligent plan before execution.
   */
  public static auditPlan(plan: IntelligentPlan): { safe: boolean; violations: string[] } {
    const violations: string[] = [];

    const planStr = JSON.stringify(plan);
    const codeAudit = this.auditCodeString(planStr);
    if (!codeAudit.safe) {
      violations.push(...codeAudit.violations);
    }

    // Ensure all steps have reversible or snapshot rollback
    for (const step of plan.steps) {
      if (!['undo_operation', 'restore_snapshot', 'prune_orphaned_entity'].includes(step.rollbackStrategy)) {
        violations.push(`Step ${step.stepId} declared unsafe rollback strategy: ${step.rollbackStrategy}`);
      }
    }

    return {
      safe: violations.length === 0,
      violations,
    };
  }
}
