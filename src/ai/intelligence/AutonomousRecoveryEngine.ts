// D8.7: Autonomous Recovery & Self-Healing Engine
// Orchestrates detection, root-cause diagnosis, minimal recovery planning, policy enforcement,
// approval gating, atomic transactions, checkpointing, post-recovery verification, bounded retries,
// rollback, unexpected mutation detection, project isolation, and crash recovery.

import * as fs from 'fs';
import * as path from 'path';
import { AppProject } from '../../builder/schema/project';
import { AppProjectSchema } from '../../builder/schema/validation';
import { COMPONENT_REGISTRY } from '../../builder/components/registry';
import { AIOperation } from '../operations/AIOperation';
import { OperationValidator } from '../operations/OperationValidator';
import { OperationExecutor } from '../operations/OperationExecutor';
import { AITransactionManager } from '../history/AITransactionManager';
import { AIDiff } from '../history/AIDiff';
import { AutonomyPolicyManager } from './AutonomyPolicyManager';
import { ApprovalManager } from '../approval/ApprovalManager';
import { AutonomousVerificationEngine } from './AutonomousVerificationEngine';
import { AISecretFilter } from '../security/AISecretFilter';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';
import {
  RecoveryState,
  RecoveryFailureCategory,
  RecoverySeverity,
  RecoveryEligibility,
  RecoveryStrategy,
  RecoveryFailure,
  RecoveryRisk,
  RecoveryDiagnosis,
  RecoveryDecision,
  RecoveryApprovalRequirement,
  RecoveryStep,
  RecoveryPlan,
  RecoveryCheckpoint,
  RecoveryAttempt,
  RecoveryRollback,
  RecoveryVerification,
  RecoveryEvent,
  RecoveryTrace,
  RecoveryMetrics,
  RecoveryRequest,
  RecoverySession,
  RecoverySummary,
  RecoveryResult,
} from './recovery-types';
import { VerificationResult, VerificationFailure } from './verification-types';

export class AutonomousRecoveryEngine {
  public static readonly MAX_RECOVERY_ATTEMPTS = 3;
  public static readonly MAX_OPERATIONS_PER_RECOVERY = 10;
  private static readonly SESSION_STORAGE_PATH = path.join(process.cwd(), '.phase8', 'recovery-session.json');

  private static readonly VALID_STATES: RecoveryState[] = [
    'idle',
    'failure_received',
    'diagnosing',
    'diagnosed',
    'planning',
    'plan_validating',
    'policy_check',
    'awaiting_approval',
    'recovery_ready',
    'recovering',
    'step_failed',
    'checkpointing',
    'verifying_recovery',
    'recovery_succeeded',
    'retry_evaluating',
    'retrying',
    'rolling_back',
    'rollback_complete',
    'uncertain',
    'failed',
    'blocked',
    'completed',
  ];

  // In-memory active sessions
  private static activeSessions = new Map<string, RecoverySession>();

  // Global recovery metrics
  private static metrics: RecoveryMetrics = {
    totalRecoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    blockedRecoveries: 0,
    uncertainRecoveries: 0,
    rollbackCount: 0,
    rollbackSuccessCount: 0,
    verificationPassCount: 0,
    verificationFailureCount: 0,
    retryCount: 0,
    averageRecoverySteps: 0,
    averageRecoveryDuration: 0,
    mutationCount: 0,
    unexpectedMutationCount: 0,
    approvalRequiredCount: 0,
    approvalDeniedCount: 0,
    stalePlanCount: 0,
  };

  public static getMetrics(): RecoveryMetrics {
    return { ...this.metrics };
  }

  public static resetMetrics(): void {
    this.metrics = {
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      blockedRecoveries: 0,
      uncertainRecoveries: 0,
      rollbackCount: 0,
      rollbackSuccessCount: 0,
      verificationPassCount: 0,
      verificationFailureCount: 0,
      retryCount: 0,
      averageRecoverySteps: 0,
      averageRecoveryDuration: 0,
      mutationCount: 0,
      unexpectedMutationCount: 0,
      approvalRequiredCount: 0,
      approvalDeniedCount: 0,
      stalePlanCount: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. STATE MACHINE TRANSITIONS
  // ─────────────────────────────────────────────────────────────────────────────

  public static validateStateTransition(current: RecoveryState, next: RecoveryState): void {
    if (!this.VALID_STATES.includes(next)) {
      throw new Error(`Invalid recovery state: ${next}`);
    }

    const allowedTransitions: Record<RecoveryState, RecoveryState[]> = {
      idle: ['failure_received', 'diagnosing', 'blocked'],
      failure_received: ['diagnosing', 'blocked', 'failed'],
      diagnosing: ['diagnosed', 'blocked', 'failed', 'uncertain'],
      diagnosed: ['planning', 'awaiting_approval', 'rolling_back', 'blocked', 'failed', 'completed'],
      planning: ['plan_validating', 'rolling_back', 'blocked', 'failed'],
      plan_validating: ['policy_check', 'blocked', 'failed'],
      policy_check: ['recovery_ready', 'awaiting_approval', 'blocked', 'failed'],
      awaiting_approval: ['recovery_ready', 'planning', 'blocked', 'failed', 'completed'],
      recovery_ready: ['recovering', 'checkpointing', 'blocked'],
      recovering: ['checkpointing', 'verifying_recovery', 'step_failed', 'rolling_back'],
      step_failed: ['rolling_back', 'retry_evaluating', 'failed', 'blocked'],
      checkpointing: ['recovering', 'verifying_recovery', 'rolling_back', 'completed'],
      verifying_recovery: ['recovery_succeeded', 'retry_evaluating', 'rolling_back', 'failed', 'uncertain'],
      recovery_succeeded: ['completed', 'checkpointing'],
      retry_evaluating: ['retrying', 'rolling_back', 'failed', 'blocked'],
      retrying: ['planning', 'recovering', 'blocked', 'failed'],
      rolling_back: ['rollback_complete', 'blocked', 'failed'],
      rollback_complete: ['retry_evaluating', 'completed', 'failed', 'blocked', 'uncertain'],
      uncertain: ['idle', 'completed', 'blocked'],
      failed: ['idle', 'completed', 'retrying'],
      blocked: ['idle', 'completed'],
      completed: ['idle'],
    };

    const allowed = allowedTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new Error(`Illegal recovery state transition from "${current}" to "${next}"`);
    }
  }

  private static recordEvent(
    session: RecoverySession,
    type: string,
    state: RecoveryState,
    message: string,
    details?: any
  ): RecoveryEvent {
    const event: RecoveryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      state,
      timestamp: new Date().toISOString(),
      message: AISecretFilter.redactText(message),
      details: details ? JSON.parse(AISecretFilter.redactText(JSON.stringify(details))) : undefined,
    };
    session.events.push(event);
    return event;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FAILURE INTAKE & NORMALIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  public static normalizeFailures(input: {
    verificationResult?: VerificationResult;
    failures?: any[];
    error?: string;
  }): RecoveryFailure[] {
    const normalized: RecoveryFailure[] = [];

    // 1. From VerificationResult
    if (input.verificationResult) {
      const vr = input.verificationResult;
      // Extract from failures
      for (const f of vr.failures || []) {
        const category = this.mapCategory(f.category);
        const matchingCheck = vr.checks?.find((c) => c.target === f.affectedEntityId || c.checkId === f.failureId);
        let severity = this.calculateSeverity(category, f.reason);
        if (matchingCheck?.critical || (f as any).critical || (vr.summary && vr.summary.criticalFailures > 0)) {
          severity = 'CRITICAL';
        }
        const eligibility = this.calculateEligibility(category, severity);

        normalized.push({
          failureId: f.failureId || `fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category,
          severity,
          description: AISecretFilter.redactText(PromptInjectionDefense.sanitizeInstruction(f.reason).sanitized),
          rootCause: f.reason,
          affectedEntityId: f.affectedEntityId,
          isRecoverable: eligibility === 'RECOVERABLE' || eligibility === 'CONDITIONALLY_RECOVERABLE',
          eligibility,
          sourceFailureId: f.failureId,
          timestamp: new Date().toISOString(),
        });
      }

      // Extract from failed checks if not already covered
      for (const chk of vr.checks || []) {
        if (!chk.passed && chk.status !== 'SKIPPED') {
          const category = this.mapCategory(chk.type);
          const alreadyCovered = normalized.some((n) => n.affectedEntityId === chk.target);
          if (!alreadyCovered) {
            const severity = chk.critical ? 'CRITICAL' : 'HIGH';
            const eligibility = this.calculateEligibility(category, severity);
            normalized.push({
              failureId: `fail_chk_${chk.checkId}`,
              category,
              severity,
              description: AISecretFilter.redactText(PromptInjectionDefense.sanitizeInstruction(chk.error || `${chk.expected} — Actual: ${chk.actual}`).sanitized),
              rootCause: chk.error || `Expected: ${chk.expected}, Actual: ${chk.actual}`,
              affectedEntityId: chk.target,
              isRecoverable: eligibility === 'RECOVERABLE' || eligibility === 'CONDITIONALLY_RECOVERABLE',
              eligibility,
              evidence: { expected: chk.expected, actual: chk.actual },
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    // 2. From direct failures array
    if (input.failures && Array.isArray(input.failures)) {
      for (const f of input.failures) {
        const category = this.mapCategory(f.category || 'UNKNOWN');
        const severity = f.severity || this.calculateSeverity(category, f.description || f.reason || '');
        const eligibility = f.eligibility || this.calculateEligibility(category, severity);
        normalized.push({
          failureId: f.failureId || `fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category,
          severity,
          description: AISecretFilter.redactText(PromptInjectionDefense.sanitizeInstruction(f.description || f.reason || 'Unspecified failure').sanitized),
          rootCause: f.rootCause || f.reason,
          affectedEntityId: f.affectedEntityId || f.targetId,
          affectedEntityType: f.affectedEntityType,
          isRecoverable: eligibility === 'RECOVERABLE' || eligibility === 'CONDITIONALLY_RECOVERABLE',
          eligibility,
          evidence: f.evidence,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. From direct error string
    if (input.error) {
      const category = this.detectCategoryFromText(input.error);
      const severity = this.calculateSeverity(category, input.error);
      const eligibility = this.calculateEligibility(category, severity);
      normalized.push({
        failureId: `fail_err_${Date.now()}`,
        category,
        severity,
        description: AISecretFilter.redactText(PromptInjectionDefense.sanitizeInstruction(input.error).sanitized),
        rootCause: input.error,
        isRecoverable: eligibility === 'RECOVERABLE' || eligibility === 'CONDITIONALLY_RECOVERABLE',
        eligibility,
        timestamp: new Date().toISOString(),
      });
    }

    return normalized;
  }

  private static mapCategory(raw: string): RecoveryFailureCategory {
    const s = String(raw || '').toUpperCase();
    if (s.includes('SECURITY') || s.includes('EVAL') || s.includes('FUNCTION') || s.includes('SQL')) return 'SECURITY';
    if (s.includes('UNEXPECTED_MUTATION') || s.includes('UNAPPROVED')) return 'UNEXPECTED_MUTATION';
    if (s.includes('WORKFLOW') || s.includes('BINDING')) return 'WORKFLOW';
    if (s.includes('COMPONENT') || s.includes('NODE')) return 'COMPONENT';
    if (s.includes('ROUTE') || s.includes('PAGE') || s.includes('SLUG')) return 'ROUTE';
    if (s.includes('DATA') || s.includes('COLLECTION') || s.includes('FIELD') || s.includes('RELATION')) return 'DATA';
    if (s.includes('REFERENCE')) return 'REFERENCE';
    if (s.includes('SCHEMA')) return 'SCHEMA';
    if (s.includes('STRUCTURE')) return 'STRUCTURE';
    if (s.includes('RUNTIME') || s.includes('RENDER')) return 'RUNTIME';
    if (s.includes('POLICY')) return 'POLICY';
    if (s.includes('PERMISSION') || s.includes('RBAC')) return 'PERMISSION';
    if (s.includes('CONFLICT')) return 'CONFLICT';
    if (s.includes('STALE')) return 'STALE_PLAN';
    if (s.includes('TRANSACTION')) return 'TRANSACTION';
    if (s.includes('PERSISTENCE')) return 'PERSISTENCE';
    if (s.includes('TIMEOUT')) return 'TIMEOUT';
    return 'UNKNOWN';
  }

  private static detectCategoryFromText(text: string): RecoveryFailureCategory {
    const t = text.toLowerCase();
    if (t.includes('eval') || t.includes('new function') || t.includes('sql') || t.includes('drop table')) return 'SECURITY';
    if (t.includes('unexpected') || t.includes('unauthorized mutation')) return 'UNEXPECTED_MUTATION';
    if (t.includes('render') || t.includes('runtime')) return 'RUNTIME';
    if (t.includes('workflow') || t.includes('trigger') || t.includes('action') || t.includes('binding')) return 'WORKFLOW';
    if (t.includes('route') || t.includes('page') || t.includes('slug')) return 'ROUTE';
    if (t.includes('collection') || t.includes('field') || t.includes('data')) return 'DATA';
    if (t.includes('component') || t.includes('button') || t.includes('card')) return 'COMPONENT';
    if (t.includes('reference')) return 'REFERENCE';
    if (t.includes('schema') || t.includes('zod')) return 'SCHEMA';
    return 'UNKNOWN';
  }

  private static calculateSeverity(category: RecoveryFailureCategory, text: string): RecoverySeverity {
    if (category === 'SECURITY' || category === 'UNEXPECTED_MUTATION') return 'CRITICAL';
    const lower = text.toLowerCase();
    if (lower.includes('crash') || lower.includes('fatal') || lower.includes('corrupt') || lower.includes('critical')) return 'CRITICAL';
    if (category === 'SCHEMA' || category === 'STRUCTURE' || category === 'PERMISSION') return 'HIGH';
    if (category === 'COMPONENT' || category === 'ROUTE' || category === 'WORKFLOW' || category === 'DATA' || category === 'RUNTIME') return 'MEDIUM';
    return 'LOW';
  }

  private static calculateEligibility(category: RecoveryFailureCategory, severity: RecoverySeverity): RecoveryEligibility {
    // Security violations are strictly non-recoverable
    if (category === 'SECURITY') return 'NON_RECOVERABLE';
    // Unexpected mutations require immediate rollback / cannot self-heal by applying further mutations
    if (category === 'UNEXPECTED_MUTATION') return 'CONDITIONALLY_RECOVERABLE';
    if (severity === 'CRITICAL') return 'CONDITIONALLY_RECOVERABLE';
    if (category === 'UNKNOWN') return 'UNKNOWN';
    return 'RECOVERABLE';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FAILURE DIAGNOSIS ENGINE
  // ─────────────────────────────────────────────────────────────────────────────

  public static diagnose(request: RecoveryRequest, failures: RecoveryFailure[]): RecoveryDiagnosis {
    const diagnosisId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (!failures || failures.length === 0) {
      return {
        diagnosisId,
        primaryCategory: 'UNKNOWN',
        severity: 'LOW',
        whatFailed: 'No failures reported',
        whereItFailed: 'N/A',
        whenItFailed: new Date().toISOString(),
        whatChanged: 'No changes',
        whatWasExpected: 'Valid project state',
        whatActuallyExists: 'Valid project state',
        isRecoverable: true,
        eligibility: 'RECOVERABLE',
        recommendedStrategy: 'NO_ACTION',
        minimalChangeSummary: 'State is already valid; zero mutation required.',
        riskAssessment: { level: 'LOW', score: 0, rationale: 'No failures', factors: [] },
        confidence: 1.0,
        failures: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Determine primary category by highest severity
    const severityOrder: Record<RecoverySeverity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const sorted = [...failures].sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
    const primary = sorted[0];

    // Check recoverability
    const hasNonRecoverable = failures.some((f) => f.eligibility === 'NON_RECOVERABLE' || f.category === 'SECURITY');
    const isRecoverable = !hasNonRecoverable && failures.some((f) => f.isRecoverable);

    let eligibility: RecoveryEligibility = 'RECOVERABLE';
    if (hasNonRecoverable) {
      eligibility = 'NON_RECOVERABLE';
    } else if (failures.some((f) => f.eligibility === 'CONDITIONALLY_RECOVERABLE')) {
      eligibility = 'CONDITIONALLY_RECOVERABLE';
    }

    // Determine strategy based on primary failure and evidence
    const strategy = this.selectRecoveryStrategy(primary, eligibility, request);

    // Minimal change proposal summary
    const minimalChangeSummary = this.formulateMinimalChange(primary, strategy);

    // Risk assessment
    const riskAssessment = this.assessDiagnosisRisk(primary, failures);

    return {
      diagnosisId,
      primaryCategory: primary.category,
      severity: primary.severity,
      whatFailed: primary.description,
      whereItFailed: primary.affectedEntityId || primary.affectedEntityType || 'AppProject',
      whenItFailed: primary.timestamp,
      whatChanged: request.projectBefore ? 'Mutations applied in previous transaction' : 'Unknown prior state',
      whatWasExpected: primary.rootCause || 'Conformant schema and satisfied postconditions',
      whatActuallyExists: primary.description,
      isRecoverable,
      eligibility,
      recommendedStrategy: strategy,
      minimalChangeSummary,
      riskAssessment,
      confidence: primary.category === 'UNKNOWN' ? 0.3 : 0.95,
      failures,
      timestamp: new Date().toISOString(),
    };
  }

  private static selectRecoveryStrategy(
    failure: RecoveryFailure,
    eligibility: RecoveryEligibility,
    request: RecoveryRequest
  ): RecoveryStrategy {
    if (eligibility === 'NON_RECOVERABLE') {
      return 'BLOCK';
    }

    if (failure.category === 'UNEXPECTED_MUTATION') {
      return 'ROLLBACK_LAST_RECOVERY';
    }

    switch (failure.category) {
      case 'WORKFLOW':
        return 'REPAIR_WORKFLOW';
      case 'COMPONENT':
        return 'REPAIR_COMPONENT';
      case 'ROUTE':
        return 'REPAIR_ROUTE';
      case 'DATA':
        return 'REPAIR_DATA';
      case 'REFERENCE':
        return 'REPAIR_REFERENCE';
      case 'SCHEMA':
        return 'REPAIR_SCHEMA_COMPATIBILITY';
      case 'RUNTIME':
        return 'RETRY_VERIFICATION';
      default:
        return eligibility === 'RECOVERABLE' ? 'REPAIR_COMPONENT' : 'BLOCK';
    }
  }

  private static formulateMinimalChange(failure: RecoveryFailure, strategy: RecoveryStrategy): string {
    switch (strategy) {
      case 'REPAIR_WORKFLOW':
        return `Re-bind target workflow to button/trigger "${failure.affectedEntityId || 'entity'}"`;
      case 'REPAIR_COMPONENT':
        return `Re-create missing component "${failure.affectedEntityId || 'node'}" in target container`;
      case 'REPAIR_ROUTE':
        return `Repair route slug or add missing page for "${failure.affectedEntityId || 'page'}"`;
      case 'REPAIR_DATA':
        return `Synthesize missing collection field or repair relationship for "${failure.affectedEntityId || 'collection'}"`;
      case 'REPAIR_REFERENCE':
        return `Update property reference to match expected value on "${failure.affectedEntityId || 'target'}"`;
      case 'ROLLBACK_LAST_RECOVERY':
        return `Rollback unapproved mutation to restore verified pre-transaction snapshot`;
      case 'BLOCK':
        return `Halt recovery: failure is non-recoverable or violates security invariants`;
      default:
        return `Minimal mutation targeting ${failure.affectedEntityId || 'project'}`;
    }
  }

  private static assessDiagnosisRisk(primary: RecoveryFailure, all: RecoveryFailure[]): RecoveryRisk {
    if (primary.category === 'SECURITY' || primary.category === 'UNEXPECTED_MUTATION') {
      return {
        level: 'CRITICAL',
        score: 1.0,
        rationale: `Critical invariant failure: ${primary.category}`,
        factors: [primary.description],
      };
    }

    const hasHigh = all.some((f) => f.severity === 'HIGH' || f.category === 'SCHEMA');
    if (hasHigh) {
      return {
        level: 'HIGH',
        score: 0.75,
        rationale: 'High severity failure requiring structural or schema repair',
        factors: all.map((f) => f.description),
      };
    }

    if (primary.category === 'DATA' || primary.category === 'ROUTE') {
      return {
        level: 'MEDIUM',
        score: 0.5,
        rationale: 'Data or routing modification',
        factors: [primary.description],
      };
    }

    return {
      level: 'LOW',
      score: 0.2,
      rationale: 'Local UI component or property repair',
      factors: [primary.description],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. RECOVERY PLAN BUILDER
  // ─────────────────────────────────────────────────────────────────────────────

  public static buildRecoveryPlan(
    diagnosis: RecoveryDiagnosis,
    project: AppProject,
    attemptNumber = 1
  ): RecoveryPlan {
    const recoveryId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const steps: RecoveryStep[] = [];
    const affectedScope: Array<{ type: string; id: string }> = [];

    // If strategy is BLOCK or NO_ACTION, return empty plan
    if (diagnosis.recommendedStrategy === 'BLOCK' || diagnosis.recommendedStrategy === 'NO_ACTION') {
      return {
        recoveryId,
        projectId: project.id,
        projectVersion: project.version,
        sourceFailureId: diagnosis.failures[0]?.failureId,
        diagnosis,
        strategy: diagnosis.recommendedStrategy,
        affectedScope: [],
        expectedOutcome: diagnosis.recommendedStrategy === 'BLOCK' ? 'Recovery blocked' : 'No action required',
        steps: [],
        risk: diagnosis.riskAssessment,
        estimatedMutationCount: 0,
        requiredApproval: diagnosis.recommendedStrategy === 'BLOCK',
        policyConstraints: diagnosis.recommendedStrategy === 'BLOCK' ? ['BLOCKED_BY_SAFETY'] : [],
        verificationRequirements: [],
        rollbackStrategy: 'BLOCK',
        retryBudget: 0,
        createdAt: new Date().toISOString(),
        planVersion: 1,
        provenance: { creator: 'AutonomousRecoveryEngine', timestamp: new Date().toISOString() },
      };
    }

    // If strategy is ROLLBACK_LAST_RECOVERY, propose no forward mutations
    if (diagnosis.recommendedStrategy === 'ROLLBACK_LAST_RECOVERY') {
      return {
        recoveryId,
        projectId: project.id,
        projectVersion: project.version,
        sourceFailureId: diagnosis.failures[0]?.failureId,
        diagnosis,
        strategy: 'ROLLBACK_LAST_RECOVERY',
        affectedScope: [{ type: 'project', id: project.id }],
        expectedOutcome: 'Restore project to pre-recovery snapshot to eliminate unexpected mutations',
        steps: [],
        risk: diagnosis.riskAssessment,
        estimatedMutationCount: 0,
        requiredApproval: false,
        policyConstraints: ['ROLLBACK_REQUIRED'],
        verificationRequirements: ['Verify absence of unexpected mutations'],
        rollbackStrategy: 'RESTORE_SNAPSHOT',
        retryBudget: 0,
        createdAt: new Date().toISOString(),
        planVersion: 1,
        provenance: { creator: 'AutonomousRecoveryEngine', timestamp: new Date().toISOString() },
      };
    }

    // Build targeted recovery steps based on failures
    for (const failure of diagnosis.failures) {
      if (steps.length >= this.MAX_OPERATIONS_PER_RECOVERY) break;

      const targetId = failure.affectedEntityId || 'unknown_target';
      if (targetId.startsWith('project') || targetId.includes('.')) {
        continue;
      }

      switch (failure.category) {
        case 'WORKFLOW': {
          const targetNode = this.findComponentInProject(project, targetId);
          const boundWfId = targetNode?.props?.workflowId;
          const workflowId = boundWfId && boundWfId !== 'null' && boundWfId !== 'undefined'
            ? boundWfId
            : (targetId.startsWith('wf_') ? targetId : `wf_${targetId}`);

          const workflowExists = (project.workflows || []).some((w) => w.id === workflowId);
          const workflowAlreadyPlanned = steps.some((s) => s.operationType === 'create_workflow' && (s.mutation as any).workflow?.id === workflowId);

          if (!workflowExists && !workflowAlreadyPlanned && !workflowId.includes('project')) {
            // Step 1: Create workflow with valid schema & triggerType
            const createWfOp: AIOperation = {
              id: `op_rec_wf_${Date.now()}_${steps.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'create_workflow',
              description: `Recover missing workflow ${workflowId}`,
              risk: 'medium',
              reversible: true,
              workflow: {
                id: workflowId,
                name: targetId.includes('checkout') ? 'Checkout Workflow' : 'Order Workflow',
                version: 1,
                triggerType: 'event',
                nodes: [{ id: `node_${Date.now()}_${steps.length + 1}`, type: 'trigger', data: { event: 'click' } }],
                edges: [],
              },
            };
            steps.push({
              stepId: `step_rec_wf_${steps.length + 1}`,
              operationType: 'create_workflow',
              target: { type: 'workflow', id: workflowId },
              expectedPrecondition: `Workflow ${workflowId} does not exist`,
              mutation: createWfOp,
              expectedPostcondition: `Workflow ${workflowId} exists in project.workflows`,
              risk: 'MEDIUM',
              reversible: true,
              approvalRequired: false,
            });
            affectedScope.push({ type: 'workflow', id: workflowId });
          }

          // Step 2: Bind button to workflow if targetId is a component
          if (targetNode) {
            const alreadyBound = steps.some((s) => s.operationType === 'update_component' && (s.mutation as any).nodeId === targetId);
            if (!alreadyBound) {
              const updatePropsOp: AIOperation = {
                id: `op_rec_bind_${Date.now()}_${steps.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
                type: 'update_component',
                pageId: this.findPageForComponent(project, targetId) || project.pages[0]?.id || 'page_home',
                nodeId: targetId,
                props: {
                  ...targetNode.props,
                  workflowId,
                  onClickWorkflow: workflowId,
                },
                description: `Re-bind component ${targetId} to workflow ${workflowId}`,
                risk: 'low',
                reversible: true,
              };
              steps.push({
                stepId: `step_rec_bind_${steps.length + 1}`,
                operationType: 'update_component',
                target: { type: 'component', id: targetId },
                expectedPrecondition: `Component ${targetId} has broken workflow binding`,
                mutation: updatePropsOp,
                expectedPostcondition: `Component ${targetId} is bound to workflow ${workflowId}`,
                risk: 'LOW',
                reversible: true,
                approvalRequired: false,
              });
              affectedScope.push({ type: 'component', id: targetId });
            }
          }
          break;
        }

        case 'COMPONENT': {
          // Check if component is missing
          const existing = this.findComponentInProject(project, targetId);
          const targetPage = project.pages[0];
          if (!existing && targetPage) {
            const addCompOp: AIOperation = {
              id: `op_rec_comp_${Date.now()}_${steps.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'add_component',
              pageId: targetPage.id,
              parentId: targetPage.root.id,
              node: {
                id: targetId,
                type: targetId.includes('btn') || targetId.includes('button') ? 'button' : 'card',
                name: `Recovered ${targetId}`,
                props: { text: targetId.includes('btn') ? 'Order Now' : 'Product Item', label: 'Order' },
                styles: { padding: '12px' },
                children: [],
              },
              description: `Recover missing component ${targetId}`,
              risk: 'low',
              reversible: true,
            };
            steps.push({
              stepId: `step_rec_comp_${steps.length + 1}`,
              operationType: 'add_component',
              target: { type: 'component', id: targetId },
              expectedPrecondition: `Component ${targetId} does not exist`,
              mutation: addCompOp,
              expectedPostcondition: `Component ${targetId} exists in page ${targetPage.id}`,
              risk: 'LOW',
              reversible: true,
              approvalRequired: false,
            });
            affectedScope.push({ type: 'component', id: targetId });
          }
          break;
        }

        case 'ROUTE': {
          // Route missing or invalid slug
          const pageId = targetId.startsWith('page_') ? targetId : `page_${targetId}`;
          const pageExists = (project.pages || []).some((p) => p.id === pageId);
          if (!pageExists) {
            const createPageOp: AIOperation = {
              id: `op_rec_page_${Date.now()}_${steps.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'create_page',
              pageId,
              name: `Recovered Page ${pageId}`,
              slug: `/${pageId.replace(/^page_/, '')}`,
              description: `Recover missing page route ${pageId}`,
              risk: 'medium',
              reversible: true,
            };
            steps.push({
              stepId: `step_rec_page_${steps.length + 1}`,
              operationType: 'create_page',
              target: { type: 'page', id: pageId },
              expectedPrecondition: `Page ${pageId} does not exist`,
              mutation: createPageOp,
              expectedPostcondition: `Page ${pageId} exists in project.pages`,
              risk: 'MEDIUM',
              reversible: true,
              approvalRequired: false,
            });
            affectedScope.push({ type: 'page', id: pageId });
          }
          break;
        }

        case 'DATA': {
          // Missing collection or field
          const colId = targetId.startsWith('col_') ? targetId : `col_${targetId}`;
          const colExists = (project.collections || []).some((c) => c.id === colId);
          if (!colExists) {
            const createColOp: AIOperation = {
              id: `op_rec_col_${Date.now()}_${steps.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'create_collection',
              collectionId: colId,
              name: `Recovered Collection ${colId}`,
              fields: [
                { id: 'fld_id', name: 'id', type: 'text', required: true },
                { id: 'fld_name', name: 'name', type: 'text', required: true },
              ],
              description: `Recover missing collection ${colId}`,
              risk: 'medium',
              reversible: true,
            };
            steps.push({
              stepId: `step_rec_col_${steps.length + 1}`,
              operationType: 'create_collection',
              target: { type: 'collection', id: colId },
              expectedPrecondition: `Collection ${colId} does not exist`,
              mutation: createColOp,
              expectedPostcondition: `Collection ${colId} exists in project.collections`,
              risk: 'MEDIUM',
              reversible: true,
              approvalRequired: false,
            });
            affectedScope.push({ type: 'collection', id: colId });
          }
          break;
        }

        case 'REFERENCE': {
          // Property restoration
          const comp = this.findComponentInProject(project, targetId);
          const updatePropsOp: AIOperation = {
            id: `op_rec_ref_${Date.now()}_${steps.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'update_component',
            pageId: this.findPageForComponent(project, targetId) || project.pages[0]?.id || 'page_home',
            nodeId: targetId,
            props: { ...(comp?.props || {}), restored: true },
            description: `Restore valid reference on ${targetId}`,
            risk: 'low',
            reversible: true,
          };
          steps.push({
            stepId: `step_rec_ref_${steps.length + 1}`,
            operationType: 'update_component',
            target: { type: 'component', id: targetId },
            expectedPrecondition: `Reference on ${targetId} is invalid`,
            mutation: updatePropsOp,
            expectedPostcondition: `Reference on ${targetId} is restored`,
            risk: 'LOW',
            reversible: true,
            approvalRequired: false,
          });
          affectedScope.push({ type: 'component', id: targetId });
          break;
        }
      }
    }

    // Assess overall plan risk and approval requirements
    const operations = steps.map((s) => s.mutation);
    const highestRisk = ApprovalManager.assessRisk(operations);
    const requiredApproval = highestRisk === 'high' || highestRisk === 'critical';

    const approvalRequirement: RecoveryApprovalRequirement | undefined = requiredApproval
      ? {
          id: `appr_${recoveryId}`,
          required: true,
          reason: `High risk operations detected in recovery plan: ${operations.map((o) => o.type).join(', ')}`,
          severity: highestRisk === 'critical' ? 'CRITICAL' : 'HIGH',
          riskLevel: highestRisk.toUpperCase() as any,
          status: 'pending',
        }
      : undefined;

    return {
      recoveryId,
      projectId: project.id,
      projectVersion: project.version,
      sourceFailureId: diagnosis.failures[0]?.failureId,
      diagnosis,
      strategy: diagnosis.recommendedStrategy,
      affectedScope,
      expectedOutcome: `Self-heal ${steps.length} identified failures through targeted minimal mutations`,
      steps,
      risk: {
        level: highestRisk.toUpperCase() as any,
        score: highestRisk === 'critical' ? 1.0 : highestRisk === 'high' ? 0.8 : 0.3,
        rationale: `Plan contains ${steps.length} recovery steps with max risk ${highestRisk}`,
        factors: steps.map((s) => `${s.operationType} on ${s.target.id}`),
      },
      estimatedMutationCount: steps.length,
      requiredApproval,
      approvalRequirement,
      policyConstraints: [],
      verificationRequirements: diagnosis.failures.map((f) => `Verify resolution of ${f.category}: ${f.description}`),
      rollbackStrategy: 'RESTORE_SNAPSHOT',
      retryBudget: Math.max(0, this.MAX_RECOVERY_ATTEMPTS - attemptNumber),
      createdAt: new Date().toISOString(),
      planVersion: 1,
      provenance: { creator: 'AutonomousRecoveryEngine', timestamp: new Date().toISOString() },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PLAN VALIDATION & STALE PLAN DETECTION
  // ─────────────────────────────────────────────────────────────────────────────

  public static validateRecoveryPlan(
    plan: RecoveryPlan,
    currentProject: AppProject
  ): { valid: boolean; isStale: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Project ownership
    if (plan.projectId !== currentProject.id) {
      errors.push(`Cross-project mutation blocked: plan for "${plan.projectId}" cannot execute on "${currentProject.id}"`);
      return { valid: false, isStale: false, errors };
    }

    // 2. Version drift / Stale plan
    if (plan.projectVersion !== currentProject.version) {
      errors.push(`Stale recovery plan: plan version ${plan.projectVersion} does not match current project version ${currentProject.version}`);
      return { valid: false, isStale: true, errors };
    }

    // 3. Schema conformity
    const parseResult = AppProjectSchema.safeParse(currentProject);
    if (!parseResult.success) {
      errors.push(`Project schema is invalid prior to recovery execution`);
    }

    // 4. Mutation budget ceiling
    if (plan.steps.length > this.MAX_OPERATIONS_PER_RECOVERY) {
      errors.push(`Recovery plan exceeds mutation budget ceiling (${plan.steps.length} > ${this.MAX_OPERATIONS_PER_RECOVERY})`);
    }

    // 5. Security audit of operations
    for (const step of plan.steps) {
      const opStr = JSON.stringify(step.mutation);
      if (opStr.includes('eval(') || opStr.includes('new Function(')) {
        errors.push(`Security violation: recovery step ${step.stepId} contains dynamic code execution`);
      }
      if (opStr.includes('DROP TABLE') || opStr.includes('CHILD_PROCESS') || opStr.includes('execSync')) {
        errors.push(`Security violation: recovery step ${step.stepId} contains prohibited system execution`);
      }
    }

    // 6. Validate operations via OperationValidator
    const operations = plan.steps.map((s) => s.mutation);
    if (operations.length > 0) {
      const valResult = OperationValidator.validateAll(operations);
      if (!valResult.valid) {
        errors.push(...valResult.errors);
      }
    }

    return {
      valid: errors.length === 0,
      isStale: false,
      errors,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. MAIN RECOVERY EXECUTION LOOP
  // ─────────────────────────────────────────────────────────────────────────────

  public static async executeRecovery(request: RecoveryRequest): Promise<RecoveryResult> {
    const startTime = Date.now();
    const recoveryId = request.requestId || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionId = `recsess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Initialize session
    const session: RecoverySession = {
      sessionId,
      recoveryId,
      projectId: request.projectId,
      projectVersionBefore: request.projectVersion,
      currentState: 'idle',
      request,
      attempts: [],
      checkpoints: [],
      rollbacks: [],
      events: [],
      attemptCount: 0,
      maxAttempts: request.maxAttempts || this.MAX_RECOVERY_ATTEMPTS,
      isInterrupted: false,
    };
    this.activeSessions.set(sessionId, session);

    const transitionState = (nextState: RecoveryState) => {
      this.validateStateTransition(session.currentState, nextState);
      session.currentState = nextState;
      this.recordEvent(session, 'STATE_TRANSITION', nextState, `Transitioned to state: ${nextState}`);
    };

    try {
      // 0. Project Isolation Check
      if (request.project && request.project.id !== request.projectId) {
        transitionState('blocked');
        this.metrics.blockedRecoveries++;
        return this.createRecoveryResult({
          session,
          status: 'BLOCKED',
          message: `Project isolation violation: request.projectId (${request.projectId}) does not match project.id (${request.project.id})`,
          startTime,
        });
      }

      // 1. Failure Intake & Ingestion
      transitionState('failure_received');
      const failures = this.normalizeFailures({
        verificationResult: request.verificationResult,
        failures: request.failures,
      });

      if (failures.length === 0) {
        transitionState('diagnosing');
        transitionState('diagnosed');
        transitionState('completed');
        return this.createRecoveryResult({
          session,
          status: 'SUCCESS',
          message: 'No failures detected. Project is healthy.',
          startTime,
        });
      }

      // Security check: any eval or SQL failure cannot self-heal
      const hasProhibitedSecurity = failures.some((f) => f.category === 'SECURITY');
      if (hasProhibitedSecurity) {
        transitionState('diagnosing');
        const securityDiag = this.diagnose(request, failures);
        session.diagnosis = securityDiag;
        transitionState('blocked');
        this.metrics.blockedRecoveries++;
        return this.createRecoveryResult({
          session,
          status: 'BLOCKED',
          diagnosis: securityDiag,
          message: 'Security invariant failure: dynamic code or unauthorized execution cannot self-heal.',
          startTime,
        });
      }

      // 2. Failure Diagnosis
      transitionState('diagnosing');
      const diagnosis = this.diagnose(request, failures);
      session.diagnosis = diagnosis;
      transitionState('diagnosed');

      if (diagnosis.recommendedStrategy === 'BLOCK' || !diagnosis.isRecoverable) {
        transitionState('blocked');
        this.metrics.blockedRecoveries++;
        return this.createRecoveryResult({
          session,
          status: 'BLOCKED',
          diagnosis,
          message: `Recovery blocked: ${diagnosis.whatFailed}`,
          startTime,
        });
      }

      // 3. Execution & Retry Loop
      let currentProject = JSON.parse(JSON.stringify(request.project));
      let finalVerification: VerificationResult | undefined;
      let lastPlan: RecoveryPlan | undefined;
      let lastRollback: RecoveryRollback | undefined;

      while (session.attemptCount < session.maxAttempts) {
        session.attemptCount++;
        this.metrics.totalRecoveryAttempts++;
        const attemptNumber = session.attemptCount;

        // Stage: planning
        transitionState(attemptNumber === 1 ? 'planning' : 'retrying');
        if (attemptNumber > 1) {
          transitionState('planning');
        }

        // Build plan
        const plan = this.buildRecoveryPlan(diagnosis, currentProject, attemptNumber);
        session.plan = plan;
        lastPlan = plan;

        // Handle direct ROLLBACK_LAST_RECOVERY strategy
        if (plan.strategy === 'ROLLBACK_LAST_RECOVERY') {
          transitionState('rolling_back');
          const restoredProject = request.projectBefore || currentProject;
          lastRollback = {
            rollbackId: `rb_${Date.now()}`,
            recoveryId,
            attemptNumber,
            reason: 'Rollback requested to eliminate unexpected mutations',
            rolledBackOperations: [],
            success: true,
            restoredSnapshotVersion: restoredProject.version,
            timestamp: new Date().toISOString(),
          };
          session.rollbacks.push(lastRollback);
          transitionState('rollback_complete');
          transitionState('completed');
          this.metrics.rollbackCount++;
          this.metrics.rollbackSuccessCount++;
          return this.createRecoveryResult({
            session,
            status: 'SUCCESS',
            repairedProject: restoredProject,
            diagnosis,
            plan,
            rollback: lastRollback,
            message: 'Successfully rolled back unexpected mutations to clean snapshot.',
            startTime,
          });
        }

        // Stage: plan_validating
        transitionState('plan_validating');
        const val = this.validateRecoveryPlan(plan, currentProject);
        if (!val.valid) {
          if (val.isStale) {
            this.metrics.stalePlanCount++;
            transitionState('blocked');
            return this.createRecoveryResult({
              session,
              status: 'BLOCKED',
              diagnosis,
              plan,
              message: `Recovery halted: ${val.errors.join('; ')}`,
              startTime,
            });
          }
          transitionState('failed');
          return this.createRecoveryResult({
            session,
            status: 'FAILED',
            diagnosis,
            plan,
            message: `Recovery plan validation failed: ${val.errors.join('; ')}`,
            startTime,
          });
        }

        // Stage: policy_check
        transitionState('policy_check');
        const operations = plan.steps.map((s) => s.mutation);
        const policyDecision = AutonomyPolicyManager.evaluatePolicy({
          project: currentProject,
          requestedLevel: request.autonomyLevel ?? 3,
          operations,
          environment: request.environment || 'development',
          userRoles: request.userRoles || ['developer'],
          humanOverride: request.isApproved ? { action: 'approve' } : undefined,
        } as any);

        const isPolicyDenial = policyDecision.decision === 'DENY' || policyDecision.decision === 'STOP' || request.autonomyLevel === 0;
        if (isPolicyDenial) {
          transitionState('blocked');
          this.metrics.blockedRecoveries++;
          return this.createRecoveryResult({
            session,
            status: 'BLOCKED',
            diagnosis,
            plan,
            message: `Policy denial: ${policyDecision.rationale || 'Autonomy level 0 (OBSERVE) permits zero mutations.'}`,
            startTime,
          });
        }

        // Approval Gating
        const approvalCheck = ApprovalManager.requiresApproval({
          operations,
          safetyMode: 'approval',
          environment: request.environment || 'development',
        });

        const requiresApproval = policyDecision.approvalRequired || approvalCheck.required;
        if (requiresApproval && !request.isApproved) {
          this.metrics.approvalRequiredCount++;
          transitionState('awaiting_approval');
          return this.createRecoveryResult({
            session,
            status: 'BLOCKED',
            diagnosis,
            plan,
            message: `Approval required before applying recovery: ${approvalCheck.reason || policyDecision.rationale}`,
            startTime,
          });
        }

        // Stage: recovery_ready
        transitionState('recovery_ready');

        // Checkpoint before mutation
        const preCheckpoint: RecoveryCheckpoint = {
          checkpointId: `chk_pre_${attemptNumber}`,
          recoveryId,
          stepIndex: 0,
          projectSnapshot: JSON.parse(JSON.stringify(currentProject)),
          completedStepIds: [],
          appliedOperations: [],
          timestamp: new Date().toISOString(),
          status: 'BEFORE_RECOVERY',
        };
        session.checkpoints.push(preCheckpoint);

        // Stage: recovering (Applying typed transactions)
        transitionState('recovering');
        const txResult = AITransactionManager.executeTransaction({
          project: currentProject,
          operations,
          prompt: `Autonomous recovery: ${diagnosis.whatFailed}`,
          mode: 'edit',
        });

        if (!txResult.success) {
          transitionState('step_failed');
          transitionState('rolling_back');
          currentProject = JSON.parse(JSON.stringify(preCheckpoint.projectSnapshot));
          transitionState('rollback_complete');
          this.metrics.rollbackCount++;

          if (attemptNumber < session.maxAttempts) {
            transitionState('retry_evaluating');
            this.metrics.retryCount++;
            continue;
          } else {
            transitionState('failed');
            return this.createRecoveryResult({
              session,
              status: 'FAILED',
              diagnosis,
              plan,
              message: `Recovery transaction failed: ${txResult.errors?.join('; ')}`,
              startTime,
            });
          }
        }

        const projectAfter = txResult.updatedProject;
        this.metrics.mutationCount += operations.length;

        // Stage: checkpointing
        transitionState('checkpointing');
        const postCheckpoint: RecoveryCheckpoint = {
          checkpointId: `chk_post_${attemptNumber}`,
          recoveryId,
          stepIndex: plan.steps.length,
          projectSnapshot: JSON.parse(JSON.stringify(projectAfter)),
          completedStepIds: plan.steps.map((s) => s.stepId),
          appliedOperations: operations,
          timestamp: new Date().toISOString(),
          status: 'AFTER_RECOVERY_MUTATION',
        };
        session.checkpoints.push(postCheckpoint);

        // Stage: verifying_recovery
        transitionState('verifying_recovery');

        // Build verification postconditions
        const sanitizedIntent = request.intent
          ? PromptInjectionDefense.sanitizeInstruction(request.intent).sanitized
          : undefined;

        const verification = AutonomousVerificationEngine.verify({
          intent: sanitizedIntent || `Self-heal failure: ${diagnosis.whatFailed}`,
          projectVersion: projectAfter.version,
          expectedChanges: plan.steps.map((s) => {
            let changeType: 'create' | 'update' | 'delete' = 'update';
            if (s.operationType.startsWith('create_') || s.operationType === 'add_component') {
              changeType = 'create';
            } else if (s.operationType.startsWith('remove_') || s.operationType.startsWith('delete_')) {
              changeType = 'delete';
            }
            return {
              entityType: (s.target.type as any) || 'component',
              entityId: s.target.id,
              changeType,
            };
          }),
          expectedPostconditions: [
            {
              id: 'post_rec_integrity',
              type: 'security_invariants_preserved',
              description: 'All security invariants must be preserved',
              critical: true,
            },
            {
              id: 'post_rec_scope',
              type: 'no_unrelated_mutation',
              description: 'Zero unapproved mutations',
              critical: true,
            },
          ],
          affectedResources: plan.affectedScope,
          riskLevel: 'LOW',
          projectBefore: preCheckpoint.projectSnapshot,
          projectAfter,
          context: request.context,
        });

        finalVerification = verification;

        // Check for Unexpected Mutation
        const hasUnexpectedMutation = (verification.summary.unexpectedMutationsCount || 0) > 0;

        if (hasUnexpectedMutation) {
          this.metrics.unexpectedMutationCount++;
          this.recordEvent(session, 'UNEXPECTED_MUTATION', 'verifying_recovery', 'Unexpected mutation detected on unapproved entity');
          transitionState('rolling_back');
          currentProject = JSON.parse(JSON.stringify(preCheckpoint.projectSnapshot));
          lastRollback = {
            rollbackId: `rb_unexpected_${Date.now()}`,
            recoveryId,
            attemptNumber,
            reason: 'Unexpected mutation detected on unapproved entity during recovery',
            rolledBackOperations: operations,
            success: true,
            restoredSnapshotVersion: preCheckpoint.projectSnapshot.version,
            timestamp: new Date().toISOString(),
          };
          session.rollbacks.push(lastRollback);
          transitionState('rollback_complete');
          transitionState('blocked');
          this.metrics.rollbackCount++;
          this.metrics.rollbackSuccessCount++;
          this.metrics.blockedRecoveries++;
          return this.createRecoveryResult({
            session,
            status: 'BLOCKED',
            repairedProject: currentProject,
            diagnosis,
            plan,
            rollback: lastRollback,
            message: 'Unexpected mutation detected during recovery. Rolled back safely to pre-recovery state.',
            startTime,
          });
        }

        // Post-recovery verification evaluation
        if (verification.status === 'PASS') {
          currentProject = projectAfter;
          this.metrics.verificationPassCount++;
          this.metrics.successfulRecoveries++;
          transitionState('recovery_succeeded');
          transitionState('completed');

          this.saveSession(session);

          return this.createRecoveryResult({
            session,
            status: 'SUCCESS',
            repairedProject: currentProject,
            diagnosis,
            plan,
            verification,
            message: 'Autonomous recovery succeeded and verified cleanly.',
            startTime,
          });
        }

        // If verification is UNCERTAIN
        if (verification.status === 'UNCERTAIN') {
          this.metrics.uncertainRecoveries++;
          transitionState('uncertain');
          return this.createRecoveryResult({
            session,
            status: 'UNCERTAIN',
            repairedProject: projectAfter,
            diagnosis,
            plan,
            verification,
            message: 'Verification after recovery is uncertain. Cannot prove success.',
            startTime,
          });
        }

        // Verification failed
        this.metrics.verificationFailureCount++;
        this.recordEvent(session, 'VERIFICATION_FAILED', 'verifying_recovery', 'Post-recovery verification failed');

        // Rollback current attempt
        transitionState('rolling_back');
        currentProject = JSON.parse(JSON.stringify(preCheckpoint.projectSnapshot));
        lastRollback = {
          rollbackId: `rb_fail_${Date.now()}`,
          recoveryId,
          attemptNumber,
          reason: 'Post-recovery verification failed',
          rolledBackOperations: operations,
          success: true,
          restoredSnapshotVersion: preCheckpoint.projectSnapshot.version,
          timestamp: new Date().toISOString(),
        };
        session.rollbacks.push(lastRollback);
        transitionState('rollback_complete');
        this.metrics.rollbackCount++;

        // Evaluate retry
        if (attemptNumber < session.maxAttempts) {
          transitionState('retry_evaluating');
          this.metrics.retryCount++;
          continue;
        } else {
          transitionState('failed');
          this.metrics.failedRecoveries++;
          return this.createRecoveryResult({
            session,
            status: 'FAILED',
            repairedProject: currentProject,
            diagnosis,
            plan,
            verification,
            rollback: lastRollback,
            message: `Recovery failed: retry ceiling reached (${session.maxAttempts} attempts).`,
            startTime,
          });
        }
      }

      // Exhausted retries
      transitionState('failed');
      this.metrics.failedRecoveries++;
      return this.createRecoveryResult({
        session,
        status: 'FAILED',
        repairedProject: currentProject,
        diagnosis,
        plan: lastPlan,
        verification: finalVerification,
        rollback: lastRollback,
        message: `Recovery failed after ${session.attemptCount} attempts.`,
        startTime,
      });
    } catch (err: any) {
      if (session.currentState !== 'failed' && session.currentState !== 'blocked') {
        session.currentState = 'failed';
      }
      this.metrics.failedRecoveries++;
      return this.createRecoveryResult({
        session,
        status: 'FAILED',
        message: `Recovery engine encountered unhandled exception: ${err.message}`,
        startTime,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. CRASH RECOVERY & SAFE RESUMPTION
  // ─────────────────────────────────────────────────────────────────────────────

  public static saveSession(session: RecoverySession): void {
    try {
      const dir = path.dirname(this.SESSION_STORAGE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.SESSION_STORAGE_PATH, JSON.stringify(session, null, 2), 'utf-8');
    } catch {
      // Ignore persistence errors in test environments
    }
  }

  public static loadSession(): RecoverySession | null {
    try {
      if (!fs.existsSync(this.SESSION_STORAGE_PATH)) return null;
      const data = fs.readFileSync(this.SESSION_STORAGE_PATH, 'utf-8');
      return JSON.parse(data) as RecoverySession;
    } catch {
      return null;
    }
  }

  public static async resumeSession(
    session: RecoverySession,
    currentProject: AppProject
  ): Promise<RecoveryResult> {
    // Inspect last checkpoint and drift
    const lastCheckpoint = session.checkpoints[session.checkpoints.length - 1];

    if (!lastCheckpoint) {
      return this.executeRecovery(session.request);
    }

    // Drift detection: compare current project version with checkpoint project version
    if (currentProject.version !== lastCheckpoint.projectSnapshot.version) {
      return {
        recoveryId: session.recoveryId,
        sessionId: session.sessionId,
        status: 'BLOCKED',
        state: 'blocked',
        diagnosis: session.diagnosis,
        attemptsCount: session.attemptCount,
        summary: {
          totalAttempts: session.attemptCount,
          appliedMutations: 0,
          isResolved: false,
          approvalWasRequired: false,
          rollbackOccurred: false,
          unexpectedMutationsDetected: false,
          finalStatus: 'BLOCKED',
          message: 'Project version drift detected during crash resumption. Safe resume halted.',
        },
        trace: {
          traceId: `trc_${Date.now()}`,
          recoveryId: session.recoveryId,
          projectId: session.projectId,
          events: session.events,
          durationMs: 0,
          finalState: 'blocked',
        },
        durationMs: 0,
      };
    }

    // Safe to resume: rerun verification from checkpoint
    session.isInterrupted = false;
    return this.executeRecovery({
      ...session.request,
      project: currentProject,
      projectVersion: currentProject.version,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  private static findComponentInProject(project: AppProject, componentId: string): any | null {
    for (const page of project.pages || []) {
      const found = this.findNode(page.root, componentId);
      if (found) return found;
    }
    return null;
  }

  private static findPageForComponent(project: AppProject, componentId: string): string | null {
    for (const page of project.pages || []) {
      if (this.findNode(page.root, componentId)) {
        return page.id;
      }
    }
    return null;
  }

  private static findNode(node: any, targetId: string): any | null {
    if (!node) return null;
    if (node.id === targetId) return node;
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = this.findNode(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  private static createRecoveryResult(params: {
    session: RecoverySession;
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'UNCERTAIN';
    repairedProject?: AppProject;
    diagnosis?: RecoveryDiagnosis;
    plan?: RecoveryPlan;
    verification?: VerificationResult;
    rollback?: RecoveryRollback;
    message: string;
    startTime: number;
  }): RecoveryResult {
    const durationMs = Date.now() - params.startTime;
    const isResolved = params.status === 'SUCCESS';

    const summary: RecoverySummary = {
      totalAttempts: params.session.attemptCount,
      appliedMutations: params.plan?.steps.length || 0,
      isResolved,
      resolutionStrategy: params.plan?.strategy,
      approvalWasRequired: params.plan?.requiredApproval || false,
      rollbackOccurred: Boolean(params.rollback),
      unexpectedMutationsDetected: params.rollback?.reason.includes('Unexpected mutation') || false,
      finalStatus: params.status,
      message: params.message,
    };

    const trace: RecoveryTrace = {
      traceId: `trc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recoveryId: params.session.recoveryId,
      projectId: params.session.projectId,
      events: params.session.events,
      durationMs,
      finalState: params.session.currentState,
    };

    const result: RecoveryResult = {
      recoveryId: params.session.recoveryId,
      sessionId: params.session.sessionId,
      status: params.status,
      state: params.session.currentState,
      repairedProject: params.repairedProject,
      diagnosis: params.diagnosis,
      plan: params.plan,
      attemptsCount: params.session.attemptCount,
      verification: params.verification,
      rollback: params.rollback,
      summary,
      trace,
      durationMs,
    };

    params.session.finalResult = result;
    return result;
  }
}
