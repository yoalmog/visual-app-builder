// D8.4: Plan Validation Engine
// Pre-execution validation for generated plans: dependency DAG checks, conflict detection, and safety enforcement.

import { IntelligentPlan, PlanValidationResult } from './types';
import { OperationValidator } from '../operations/OperationValidator';
import { COMPONENT_REGISTRY } from '../../builder/components/registry';

export class PlanValidationEngine {
  /**
   * Validates a plan thoroughly before any transactions are initiated.
   */
  public static validatePlan(plan: IntelligentPlan): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const duplicateOps: string[] = [];
    const unsupportedOps: string[] = [];

    if (!plan.steps || plan.steps.length === 0) {
      return {
        valid: false,
        errors: ['Plan contains zero executable steps'],
        warnings: [],
        hasCyclicDependencies: false,
        duplicateOperations: [],
        unsupportedOperations: [],
      };
    }

    const seenStepIds = new Set<string>();
    const seenOpIds = new Set<string>();
    const pageMutations = new Map<string, string[]>(); // pageId -> operation types

    // 1. Structural and operation-level checks
    for (const step of plan.steps) {
      if (seenStepIds.has(step.stepId)) {
        errors.push(`Duplicate stepId detected: ${step.stepId}`);
      }
      seenStepIds.add(step.stepId);

      if (!step.operation || typeof step.operation !== 'object') {
        errors.push(`Step ${step.stepId} lacks a valid operation`);
        continue;
      }

      if (seenOpIds.has(step.operation.id)) {
        duplicateOps.push(step.operation.id);
        errors.push(`Duplicate operation ID: ${step.operation.id}`);
      }
      seenOpIds.add(step.operation.id);

      // Validate operation against semantic rules
      const val = OperationValidator.validate(step.operation);
      if (!val.valid) {
        errors.push(`Step ${step.stepId} operation invalid: ${val.error}`);
      }

      // Check component registry
      if (step.operation.type === 'add_component') {
        const compType = (step.operation as any).node?.type;
        if (!compType || !COMPONENT_REGISTRY[compType as keyof typeof COMPONENT_REGISTRY]) {
          unsupportedOps.push(compType || 'unknown');
          errors.push(`Step ${step.stepId}: Unsupported component type "${compType}"`);
        }
      }

      // Track page mutations for conflict detection
      const pageId = (step.operation as any).pageId;
      if (pageId) {
        if (!pageMutations.has(pageId)) {
          pageMutations.set(pageId, []);
        }
        pageMutations.get(pageId)!.push(step.operation.type);
      }

      // Check verification and rollback strategy
      if (!step.verificationStrategy) {
        errors.push(`Step ${step.stepId} is missing required verificationStrategy`);
      }
      if (!step.rollbackStrategy) {
        errors.push(`Step ${step.stepId} is missing required rollbackStrategy`);
      }
    }

    // 2. Conflict detection: Cannot create and delete same page in same plan
    pageMutations.forEach((types, pId) => {
      if (types.includes('create_page') && types.includes('delete_page')) {
        errors.push(`Conflicting operations detected for page ${pId}: plan attempts to both create and delete`);
      }
    });

    // 3. Missing dependency detection
    const missingDependencies: string[] = [];
    for (const step of plan.steps) {
      for (const dep of step.dependencies || []) {
        if (!seenStepIds.has(dep)) {
          const msg = `Step ${step.stepId} references missing/unresolved dependency: ${dep}`;
          missingDependencies.push(dep);
          errors.push(msg);
        }
      }
    }

    // 4. Security validation (reject dangerous code execution, SQL injections, child_process)
    const securityViolations: string[] = [];
    const dangerousPatterns = [
      /\beval\s*\(/i,
      /\bnew\s+Function\s*\(/i,
      /\bchild_process\b/i,
      /\bspawn\s*\(/i,
      /\bdrop\s+table\b/i,
    ];
    for (const step of plan.steps) {
      const stepStr = `${step.title} ${step.description} ${JSON.stringify(step.operation || {})}`;
      for (const pat of dangerousPatterns) {
        if (pat.test(stepStr)) {
          const violation = `Security check failed in step ${step.stepId}: dangerous pattern detected.`;
          securityViolations.push(violation);
          errors.push(violation);
          break;
        }
      }
    }

    // 5. Acceptance criteria coverage gap tracking
    const acceptanceCoverageGaps: string[] = [];
    if (plan.acceptanceCoverage && plan.acceptanceCoverage.length > 0) {
      for (const cov of plan.acceptanceCoverage) {
        if (cov.coverageStatus === 'not_covered') {
          acceptanceCoverageGaps.push(cov.criterionId);
          warnings.push(`Acceptance criterion "${cov.criterionId}" has no addressing tasks in plan.`);
        }
      }
    }

    // 6. Cyclic dependency detection (DAG validation)
    const hasCycles = this.detectCycles(plan.steps);
    if (hasCycles) {
      errors.push('Cyclic dependency loop detected between plan steps');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      hasCyclicDependencies: hasCycles,
      duplicateOperations: duplicateOps,
      unsupportedOperations: unsupportedOps,
      missingDependencies,
      acceptanceCoverageGaps,
      securityViolations,
    };
  }

  private static detectCycles(steps: IntelligentPlan['steps']): boolean {
    const adj = new Map<string, string[]>();
    for (const step of steps) {
      adj.set(step.stepId, step.dependencies || []);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const checkCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (checkCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.stepId)) {
        if (checkCycle(step.stepId)) return true;
      }
    }

    return false;
  }
}
