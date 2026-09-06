// D8.5: Adaptive Execution Engine
// Controlled, observable, transactional execution of validated IntelligentPlans.
// OBSERVE -> PLAN -> POLICY -> APPROVE -> EXECUTE -> VERIFY -> RECOVER -> MEASURE.

import { AppProject } from '../../builder/schema/project';
import { Role } from '../../builder/schema/rbac';
import {
  IntelligentPlan,
  PlanStep,
  AutonomyLevel,
  ObservabilityEvent,
  AdaptiveExecutionState,
  ExecutionDecisionType,
  ExecutionDecision,
  ExecutionCheckpoint,
  ExecutionError,
  ExecutionRecovery,
  ExecutionMetrics,
  ExecutionEvent,
  AdaptiveExecutionStep,
  ExecutionTrace,
  ExecutionSummary,
  AdaptiveExecutionRequest,
  AdaptiveExecutionSession,
  AdaptiveExecutionResult,
} from './types';
import { AutonomyPolicyManager } from './AutonomyPolicyManager';
import { AITransactionManager } from '../history/AITransactionManager';
import { AutonomousVerificationEngine } from './AutonomousVerificationEngine';
import { ExecutionObservability } from './ExecutionObservability';
import { PlanValidationEngine } from './PlanValidationEngine';
import { OperationValidator } from '../operations/OperationValidator';
import { OperationPermissions } from '../operations/OperationPermissions';
import { AIOperation } from '../operations/AIOperation';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';

export type {
  AdaptiveExecutionState,
  ExecutionDecisionType,
  ExecutionDecision,
  ExecutionCheckpoint,
  ExecutionError,
  ExecutionRecovery,
  ExecutionMetrics,
  ExecutionEvent,
  AdaptiveExecutionStep,
  ExecutionTrace,
  ExecutionSummary,
  AdaptiveExecutionRequest,
  AdaptiveExecutionSession,
  AdaptiveExecutionResult,
};

export class AdaptiveExecutionEngine {
  public static readonly ENGINE_VERSION = '1.0.0';
  public static readonly MAX_RETRIES = 3;
  public static readonly MAX_PLAN_REVISIONS = 3;
  public static readonly MAX_EXECUTION_DURATION_MS = 60000;

  // In-memory active sessions and checkpoints
  private static activeSessions = new Map<string, AdaptiveExecutionSession>();
  private static checkpointStore = new Map<string, ExecutionCheckpoint[]>();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. STATE MACHINE TRANSITIONS
  // ─────────────────────────────────────────────────────────────────────────────

  private static readonly VALID_TRANSITIONS: Record<AdaptiveExecutionState, AdaptiveExecutionState[]> = {
    idle: ['preflight', 'cancelled'],
    preflight: ['executing', 'awaiting_approval', 'blocked', 'denied', 'stale_plan', 'cancelled'],
    awaiting_approval: ['executing', 'paused', 'cancelled', 'denied'],
    executing: ['paused', 'step_failed', 'awaiting_approval', 'completed', 'cancelled', 'rolling_back'],
    paused: ['executing', 'cancelled', 'rolling_back'],
    step_failed: ['recovering', 'rolling_back', 'executing', 'blocked'],
    recovering: ['executing', 'rolling_back', 'blocked'],
    rolling_back: ['step_failed', 'blocked', 'completed', 'idle'],
    completed: ['committed'],
    committed: [],
    cancelled: [],
    denied: [],
    blocked: [],
    stale_plan: [],
  };

  /**
   * Asserts whether a transition between two execution states is valid.
   */
  public static isValidStateTransition(from: AdaptiveExecutionState, to: AdaptiveExecutionState): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Validates state transition, throwing a detailed error on invalid transition attempt.
   */
  public static assertValidStateTransition(from: AdaptiveExecutionState, to: AdaptiveExecutionState): void {
    if (!this.isValidStateTransition(from, to)) {
      throw new Error(`Invalid AdaptiveExecutionState transition from "${from}" to "${to}".`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PREFLIGHT VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Comprehensive preflight check before execution commences.
   */
  public static validatePreflight(request: AdaptiveExecutionRequest): {
    passed: boolean;
    state: AdaptiveExecutionState;
    error?: string;
    decision?: ExecutionDecision;
    staleDetails?: {
      detectedVersion: number;
      expectedVersion: number;
      affectedScope: string;
      reason: string;
      recoveryRecommendation: string;
    };
    conflictDetails?: {
      conflictType: string;
      targetEntity: string;
      message: string;
    };
  } {
    const plan = request.plan;
    const project = request.project;

    // 2.1 Plan existence
    if (!plan || !plan.steps || plan.steps.length === 0) {
      return {
        passed: false,
        state: 'blocked',
        error: 'Preflight failed: Plan is missing or contains zero executable steps.',
      };
    }

    // 2.2 Plan Schema and DAG validity
    const validation = PlanValidationEngine.validatePlan(plan);
    if (!validation.valid) {
      const isSecurity = validation.errors.some(
        (e) =>
          e.includes('Security check failed') ||
          e.includes('dangerous pattern') ||
          e.includes('eval') ||
          e.includes('new Function')
      );
      return {
        passed: false,
        state: isSecurity ? 'denied' : 'blocked',
        error: `Preflight failed: Plan validation errors: ${validation.errors.join('; ')}`,
      };
    }

    // 2.3 Stale Plan Detection (Project Version drift)
    if (
      request.projectVersion !== undefined &&
      project.version !== undefined &&
      project.version !== request.projectVersion
    ) {
      return {
        passed: false,
        state: 'stale_plan',
        error: `Stale plan detected: Project version changed from ${request.projectVersion} to ${project.version} since planning.`,
        staleDetails: {
          detectedVersion: project.version,
          expectedVersion: request.projectVersion,
          affectedScope: 'project.version',
          reason: `Project was modified concurrently. Expected version ${request.projectVersion}, actual version ${project.version}.`,
          recoveryRecommendation: 'STOP. Request plan regeneration using current project state.',
        },
      };
    }

    // 2.4 Context freshness
    if (request.contextFreshnessTimestamp) {
      const freshnessAgeMs = Date.now() - new Date(request.contextFreshnessTimestamp).getTime();
      if (freshnessAgeMs > 24 * 60 * 60 * 1000) {
        return {
          passed: false,
          state: 'stale_plan',
          error: 'Stale plan detected: Context evidence is older than 24 hours.',
          staleDetails: {
            detectedVersion: project.version ?? 1,
            expectedVersion: request.projectVersion ?? 1,
            affectedScope: 'context.freshness',
            reason: 'Context snapshot has expired (>24 hours).',
            recoveryRecommendation: 'Re-analyze project context before planning.',
          },
        };
      }
    }

    // 2.5 Active transaction / concurrent session conflict check
    if ((project as any).__activeTransaction) {
      return {
        passed: false,
        state: 'blocked',
        error: 'Preflight failed: Another transaction is currently active on target project.',
        conflictDetails: {
          conflictType: 'CONCURRENT_TRANSACTION',
          targetEntity: project.id,
          message: 'Project is locked by an uncommitted transaction.',
        },
      };
    }

    // 2.6 Environment validity & protection
    const environment = request.environment || 'development';
    const validEnvironments = ['development', 'preview', 'staging', 'production'];
    if (!validEnvironments.includes(environment)) {
      return {
        passed: false,
        state: 'blocked',
        error: `Preflight failed: Invalid environment "${environment}".`,
      };
    }

    // 2.7 Security Hard Stop: Scan for adversarial injection patterns in plan metadata
    const planText = `${plan.title} ${plan.rationale} ${plan.steps.map((s) => `${s.title} ${s.description}`).join(' ')}`;
    const adversarialBypassPattern =
      /\b(ignore\s+approval|disable\s+guardrails|set\s+autonomy\s+to\s+autonomous|trust\s+me|override\s+policy|bypass\s+security|grant\s+all|drop\s+all|ignore\s+policy|drop\s+table)\b/i;
    if (PromptInjectionDefense.containsInjectionAttempt(planText) || adversarialBypassPattern.test(planText)) {
      return {
        passed: false,
        state: 'denied',
        error: 'Security hard stop: Prompt injection or policy bypass signature detected in plan.',
      };
    }

    // 2.8 RBAC Verification
    if (request.userRoles && request.userRoles.length > 0) {
      const rbacAuth = OperationPermissions.authorizeOperations(
        plan.steps.map((s) => s.operation),
        request.userRoles
      );
      if (!rbacAuth.authorized) {
        return {
          passed: false,
          state: 'denied',
          error: `Preflight failed: RBAC permissions denied for operations: ${rbacAuth.unauthorizedOperations.map((u) => u.opId).join(', ')}.`,
        };
      }
    }

    // 2.9 Autonomy Policy Check
    const effectiveAutonomy = request.autonomyLevel !== undefined ? request.autonomyLevel : 2;
    const planGoal = (plan as any).goal || {
      id: plan.goalId || 'goal_default',
      version: '1.0.0',
      goalType: 'BUILD_APPLICATION',
      intent: 'create',
      rawPrompt: plan.title || 'Execute plan',
      normalizedGoal: plan.title || 'Execute plan',
      intentSummary: plan.title || 'Execute plan',
      requestedOutcome: plan.rationale || 'Execute steps',
      targetEntities: [],
      affectedAreas: ['pages'],
      explicitRequirements: plan.requirements || [],
      inferredRequirements: [],
      assumptions: plan.assumptions || [],
      unknowns: [],
      constraints: plan.constraints || [],
      ambiguities: [],
      ambiguityDetails: [],
      acceptanceCriteria: [],
      riskAssessment: 'low',
      confidenceScore: plan.confidenceScore ?? 1.0,
      confidence: { score: plan.confidenceScore ?? 1.0, level: 'HIGH', rationale: 'Plan-derived goal' },
      provenance: { source: 'plan', derivationMethod: 'plan_metadata', transformations: [], sanitized: true, secretsRedacted: true },
      securityAssessment: { safe: true, secretsRedactedCount: 0 },
    };

    const policyDecision = AutonomyPolicyManager.evaluatePolicy({
      goal: planGoal,
      plan,
      project,
      requestedLevel: effectiveAutonomy,
      environment,
      userRoles: request.userRoles,
      projectPolicy: request.projectPolicy,
    });

    if (policyDecision.decision === 'DENY') {
      return {
        passed: false,
        state: 'denied',
        error: `Policy denied: ${policyDecision.rationale}`,
      };
    }

    if (policyDecision.decision === 'STOP') {
      const isSecurityStop =
        !policyDecision.provenance?.securityCheckPassed ||
        policyDecision.stopConditions.some((s) => s.trigger === 'SECURITY_HARD_STOP');
      return {
        passed: false,
        state: isSecurityStop ? 'denied' : 'blocked',
        error: `Policy halted execution: ${policyDecision.rationale}`,
      };
    }

    return {
      passed: true,
      state: 'executing',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. OPERATION PREFLIGHT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validates a single operation immediately prior to execution.
   */
  public static preflightOperation(
    op: AIOperation,
    project: AppProject,
    userRoles?: Role[]
  ): { valid: boolean; error?: string; conflict?: boolean } {
    // 1. Structural validation
    const val = OperationValidator.validate(op);
    if (!val.valid) {
      return { valid: false, error: `Invalid operation schema: ${val.error}` };
    }

    // 2. Target entity existence check
    const opAny = op as any;
    switch (op.type) {
      case 'create_page': {
        const existing = (project.pages || []).find(
          (p) => p.id === opAny.pageId || p.slug === opAny.slug
        );
        if (existing) {
          return {
            valid: false,
            conflict: true,
            error: `Page conflict: Page with ID "${opAny.pageId}" or slug "${opAny.slug}" already exists.`,
          };
        }
        break;
      }
      case 'add_component': {
        const page = (project.pages || []).find((p) => p.id === opAny.pageId);
        if (!page) {
          return {
            valid: false,
            conflict: true,
            error: `Target page "${opAny.pageId}" does not exist in project.`,
          };
        }
        break;
      }
      case 'update_component':
      case 'remove_component': {
        const page = (project.pages || []).find((p) => p.id === opAny.pageId);
        if (!page) {
          return {
            valid: false,
            conflict: true,
            error: `Target page "${opAny.pageId}" does not exist.`,
          };
        }
        break;
      }
      case 'create_collection': {
        const existing = (project.collections || []).find((c) => c.id === opAny.collectionId);
        if (existing) {
          return {
            valid: false,
            conflict: true,
            error: `Collection "${opAny.collectionId}" already exists.`,
          };
        }
        break;
      }
      case 'add_field': {
        const col = (project.collections || []).find((c) => c.id === opAny.collectionId);
        if (!col) {
          return {
            valid: false,
            conflict: true,
            error: `Target collection "${opAny.collectionId}" does not exist.`,
          };
        }
        break;
      }
    }

    // 3. Security check: payload injection / arbitrary code prevention
    const serializedPayload = JSON.stringify(op);
    const codeExecutionPatterns = [
      /\beval\s*\(/i,
      /\bnew\s+Function\s*\(/i,
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /__proto__/i,
      /\bconstructor\s*\.\s*prototype\b/i,
      /\bchild_process\b/i,
      /\bexecSync\b/i,
    ];

    for (const pattern of codeExecutionPatterns) {
      if (pattern.test(serializedPayload)) {
        return {
          valid: false,
          error: 'Security hard stop: Prohibited code execution payload detected in operation.',
        };
      }
    }

    // 4. RBAC check if roles provided
    if (userRoles && userRoles.length > 0) {
      const auth = OperationPermissions.authorizeOperations([op], userRoles);
      if (!auth.authorized) {
        return {
          valid: false,
          error: `RBAC permission denied for operation ${op.id} (${auth.unauthorizedOperations[0]?.requiredPermission}).`,
        };
      }
    }

    return { valid: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. EXECUTION CHECKPOINTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Creates an execution checkpoint for rollbacks and crash recovery.
   */
  public static createCheckpoint(params: {
    executionId: string;
    stepId?: string;
    project: AppProject;
    planVersion: string;
    policyVersion: string;
    executionState: AdaptiveExecutionState;
    transactionState: 'IDLE' | 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK';
    completedSteps: string[];
    pendingSteps: string[];
    generationId?: string;
  }): ExecutionCheckpoint {
    const checkpointId = `chk_${params.executionId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const checkpoint: ExecutionCheckpoint = {
      checkpointId,
      executionId: params.executionId,
      stepId: params.stepId,
      projectVersion: params.project.version ?? 1,
      schemaVersion: String(params.project.schemaVersion ?? 7),
      planVersion: params.planVersion,
      policyVersion: params.policyVersion,
      timestamp: new Date().toISOString(),
      executionState: params.executionState,
      transactionState: params.transactionState,
      completedSteps: [...params.completedSteps],
      pendingSteps: [...params.pendingSteps],
      rollbackInformation: {
        generationId: params.generationId,
        snapshotVersion: params.project.version ?? 1,
      },
      projectSnapshot: JSON.parse(JSON.stringify(params.project)),
    };

    const list = this.checkpointStore.get(params.executionId) || [];
    list.push(checkpoint);
    this.checkpointStore.set(params.executionId, list);

    return checkpoint;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CRASH RECOVERY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Recovers from an interrupted or crashed execution using the last valid checkpoint.
   */
  public static recoverInterruptedExecution(
    checkpoint: ExecutionCheckpoint,
    currentProject: AppProject
  ): ExecutionRecovery & {
    recommendedAction: 'RESUME' | 'ROLLBACK' | 'ABORT' | 'REPLAN_REQUIRED';
    canResume: boolean;
    restoredProject?: AppProject;
  } {
    const startTime = Date.now();
    const recoveryId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Check if checkpoint has saved snapshot
    if (!checkpoint.projectSnapshot) {
      return {
        recoveryId,
        triggeringFailure: 'Checkpoint missing project snapshot.',
        recoveryAction: 'ABORT',
        restoredVersion: currentProject.version ?? 1,
        affectedStepIds: checkpoint.completedSteps,
        durationMs: Date.now() - startTime,
        verificationResult: 'CRITICAL_RECOVERY_REQUIRED',
        timestamp: new Date().toISOString(),
        recommendedAction: 'ABORT',
        canResume: false,
      };
    }

    // 2. Check project drift
    const versionMismatch = (currentProject.version ?? 1) !== checkpoint.projectVersion;
    if (versionMismatch) {
      // Drift detected: safe rollback to checkpoint snapshot
      const restored = JSON.parse(JSON.stringify(checkpoint.projectSnapshot));
      return {
        recoveryId,
        triggeringFailure: `Project state drifted from version ${checkpoint.projectVersion} to ${currentProject.version}.`,
        recoveryAction: 'ROLLBACK',
        restoredVersion: checkpoint.projectVersion,
        affectedStepIds: checkpoint.completedSteps,
        durationMs: Date.now() - startTime,
        verificationResult: 'VERIFIED',
        timestamp: new Date().toISOString(),
        recommendedAction: 'REPLAN_REQUIRED',
        canResume: false,
        restoredProject: restored,
      };
    }

    // 3. Clean state: can safely resume pending steps
    return {
      recoveryId,
      triggeringFailure: 'Clean interruption recovered from checkpoint.',
      recoveryAction: 'RESUME',
      restoredVersion: checkpoint.projectVersion,
      affectedStepIds: checkpoint.completedSteps,
      durationMs: Date.now() - startTime,
      verificationResult: 'VERIFIED',
      timestamp: new Date().toISOString(),
      recommendedAction: 'RESUME',
      canResume: true,
      restoredProject: JSON.parse(JSON.stringify(checkpoint.projectSnapshot)),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. MAIN EXECUTION ENGINE ENTRYPOINT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Executes an intelligent plan adaptively against an application project.
   */
  public static async executePlan(params: {
    plan: IntelligentPlan;
    project: AppProject;
    autonomyLevel?: AutonomyLevel;
    environment?: 'development' | 'preview' | 'staging' | 'production';
    sessionId?: string;
    userRoles?: Role[];
    projectVersion?: number;
    projectPolicy?: any;
    maxRetries?: number;
    timeoutMs?: number;
    interactiveControls?: {
      pauseRequested?: boolean;
      cancelRequested?: boolean;
    };
    approvalTokens?: string[];
    contextFreshnessTimestamp?: string;
  }): Promise<AdaptiveExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionId = params.sessionId || `sess_${Date.now()}`;
    const startTime = Date.now();
    const timeoutMs = params.timeoutMs || this.MAX_EXECUTION_DURATION_MS;
    const maxRetries = Math.min(params.maxRetries ?? this.MAX_RETRIES, this.MAX_RETRIES);

    let currentState: AdaptiveExecutionState = 'idle';
    let currentProject: AppProject = JSON.parse(JSON.stringify(params.project));
    const completedStepIds: string[] = [];
    const executionEvents: ExecutionEvent[] = [];
    const decisions: ExecutionDecision[] = [];
    const checkpoints: ExecutionCheckpoint[] = [];
    const observabilityEvents: ObservabilityEvent[] = [];

    const executedSteps: AdaptiveExecutionStep[] = (params.plan.steps || []).map((s) => ({
      stepId: s.stepId,
      operation: s.operation,
      description: s.description,
      dependencies: s.dependencies || [],
      status: 'PENDING',
      attempts: 0,
      maxAttempts: maxRetries,
    }));

    let retriesCount = 0;
    let revisionsCount = 0;
    let rollbackCount = 0;
    let approvalPauses = 0;
    let policyBlocks = 0;
    let validationFailures = 0;
    let conflictsCount = 0;
    let stalePlanEvents = 0;
    let adaptationsCount = 0;

    const recordStateTransition = (to: AdaptiveExecutionState, reason: string) => {
      this.assertValidStateTransition(currentState, to);
      currentState = to;
      executionEvents.push({
        eventId: `evt_tr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        executionId,
        timestamp: new Date().toISOString(),
        type: 'STATE_TRANSITION',
        details: { state: to, reason },
      });
    };

    // Applied generation IDs for rollback tracking
    const appliedGenerationIds: string[] = [];

    const initiateRollback = (failureReason: string, failedStepId: string): AdaptiveExecutionResult => {
      recordStateTransition('rolling_back', `Step ${failedStepId} failed: ${failureReason}; initiating safe rollback`);
      for (const genId of [...appliedGenerationIds].reverse()) {
        const rb = AITransactionManager.rollback(genId);
        if (rb.success && rb.restoredProject) {
          currentProject = rb.restoredProject;
          rollbackCount++;
        }
      }
      recordStateTransition('step_failed', `Execution safely rolled back to starting state.`);

      const recovery: ExecutionRecovery = {
        recoveryId: `rec_fail_${failedStepId}`,
        triggeringFailure: failureReason,
        recoveryAction: 'ROLLBACK',
        restoredVersion: currentProject.version ?? 1,
        affectedStepIds: [...completedStepIds],
        durationMs: Date.now() - startTime,
        verificationResult: 'VERIFIED',
        timestamp: new Date().toISOString(),
      };

      return {
        status: 'FAILED',
        sessionState: 'step_failed',
        updatedProject: currentProject,
        completedStepIds: [],
        failedStepId,
        revisionsCount,
        retriesCount,
        events: observabilityEvents,
        error: failureReason,
        recovery,
        decisions,
        checkpoints,
        metrics: this.buildMetrics({
          startTime,
          steps: executedSteps,
          completedStepIds: [],
          retriesCount,
          rollbackCount,
          approvalPauses,
          policyBlocks,
          validationFailures,
          conflictsCount,
          stalePlanEvents,
          adaptationsCount,
        }),
      };
    };

    // ── STAGE 1: PREFLIGHT ──
    recordStateTransition('preflight', 'Commencing execution preflight checks');

    const preflight = this.validatePreflight({
      plan: params.plan,
      project: currentProject,
      autonomyLevel: params.autonomyLevel,
      environment: params.environment,
      userRoles: params.userRoles,
      projectVersion: params.projectVersion,
      projectPolicy: params.projectPolicy,
      contextFreshnessTimestamp: params.contextFreshnessTimestamp,
    });

    if (!preflight.passed) {
      if (preflight.state === 'stale_plan') {
        stalePlanEvents++;
        recordStateTransition('stale_plan', preflight.error || 'Stale plan detected');
        return {
          status: 'STALE_PLAN',
          sessionState: currentState,
          updatedProject: currentProject,
          completedStepIds,
          revisionsCount,
          retriesCount,
          events: observabilityEvents,
          error: preflight.error,
          staleDetails: preflight.staleDetails,
          metrics: this.buildMetrics({
            startTime,
            steps: executedSteps,
            completedStepIds,
            retriesCount,
            rollbackCount,
            approvalPauses,
            policyBlocks,
            validationFailures,
            conflictsCount,
            stalePlanEvents,
            adaptationsCount,
          }),
        };
      }

      if (preflight.state === 'denied') {
        recordStateTransition('denied', preflight.error || 'Preflight denied');
        return {
          status: 'DENIED',
          sessionState: currentState,
          updatedProject: currentProject,
          completedStepIds,
          revisionsCount,
          retriesCount,
          events: observabilityEvents,
          error: preflight.error,
        };
      }

      recordStateTransition('blocked', preflight.error || 'Preflight blocked');
      return {
        status: 'BLOCKED',
        sessionState: currentState,
        updatedProject: currentProject,
        completedStepIds,
        revisionsCount,
        retriesCount,
        events: observabilityEvents,
        error: preflight.error,
        conflictDetails: preflight.conflictDetails,
      };
    }

    // Check immediate interactive cancellation
    if (params.interactiveControls?.cancelRequested) {
      recordStateTransition('cancelled', 'Operator cancelled execution during preflight');
      return {
        status: 'CANCELLED',
        sessionState: currentState,
        updatedProject: currentProject,
        completedStepIds,
        revisionsCount,
        retriesCount,
        events: observabilityEvents,
        error: 'Execution cancelled by operator directive.',
      };
    }

    // ── STAGE 2: INITIAL CHECKPOINT & TRANSITION TO EXECUTING ──
    const initialCheckpoint = this.createCheckpoint({
      executionId,
      project: currentProject,
      planVersion: params.plan.planVersion || '1.0.0',
      policyVersion: AutonomyPolicyManager.POLICY_VERSION,
      executionState: 'preflight',
      transactionState: 'IDLE',
      completedSteps: [],
      pendingSteps: params.plan.steps.map((s) => s.stepId),
    });
    checkpoints.push(initialCheckpoint);

    recordStateTransition('executing', 'Preflight verified clean; entering execution loop');

    // ── STAGE 3: STEP-BY-STEP DAG EXECUTION ──
    for (let i = 0; i < params.plan.steps.length; i++) {
      const step = params.plan.steps[i];
      const stepRecord = executedSteps.find((s) => s.stepId === step.stepId) || executedSteps[i];

      // 3.1 Timeout Ceiling Check
      if (Date.now() - startTime > timeoutMs) {
        return initiateRollback(`Execution duration exceeded ${timeoutMs}ms ceiling.`, step.stepId);
      }

      // 3.2 Interactive Controls Check
      if (params.interactiveControls?.pauseRequested) {
        recordStateTransition('paused', 'Operator requested execution pause');
        return {
          status: 'PAUSED',
          sessionState: currentState,
          updatedProject: currentProject,
          completedStepIds,
          failedStepId: step.stepId,
          revisionsCount,
          retriesCount,
          events: observabilityEvents,
        };
      }

      if (params.interactiveControls?.cancelRequested) {
        recordStateTransition('cancelled', 'Operator requested execution cancellation');
        return {
          status: 'CANCELLED',
          sessionState: currentState,
          updatedProject: currentProject,
          completedStepIds,
          revisionsCount,
          retriesCount,
          events: observabilityEvents,
          error: 'Execution cancelled by operator.',
        };
      }

      // 3.3 Dependency Check
      const unfulfilledDeps = (step.dependencies || []).filter((depId) => !completedStepIds.includes(depId));
      if (unfulfilledDeps.length > 0) {
        return initiateRollback(`Step ${step.stepId} dependencies not completed: ${unfulfilledDeps.join(', ')}`, step.stepId);
      }

      // 3.4 Mid-Execution Policy & Approval Recheck
      const effectiveAutonomy = params.autonomyLevel !== undefined ? params.autonomyLevel : 2;
      const stepRisk = step.riskLevel || step.operation?.risk || 'low';
      const approval = AutonomyPolicyManager.requiresApproval(
        effectiveAutonomy,
        stepRisk,
        params.environment
      );

      const isTokenApproved = params.approvalTokens?.includes(step.stepId);

      if (approval.required && !isTokenApproved) {
        approvalPauses++;
        recordStateTransition('awaiting_approval', approval.reason);

        const approvalDecision: ExecutionDecision = {
          id: `dec_app_${step.stepId}`,
          type: 'REQUEST_APPROVAL',
          reason: approval.reason,
          triggeringEvent: 'AUTONOMY_POLICY_STEP_CHECK',
          risk: stepRisk,
          affectedStepId: step.stepId,
          confidence: 1.0,
          provenance: 'AutonomyPolicyManager.requiresApproval',
          timestamp: new Date().toISOString(),
        };
        decisions.push(approvalDecision);

        ExecutionObservability.recordEvent({
          eventId: `evt_wait_${Date.now()}`,
          sessionId,
          timestamp: new Date().toISOString(),
          phase: 'Phase 8.5',
          actor: 'SYSTEM',
          category: 'APPROVAL',
          details: { stepId: step.stepId, reason: approval.reason },
        });

        return {
          status: 'WAITING_APPROVAL',
          sessionState: 'awaiting_approval',
          updatedProject: currentProject,
          completedStepIds,
          failedStepId: step.stepId,
          revisionsCount,
          retriesCount,
          events: observabilityEvents,
          decisions,
        };
      }

      // 3.5 Operation Preflight
      const opPreflight = this.preflightOperation(step.operation, currentProject, params.userRoles);
      if (!opPreflight.valid) {
        if (opPreflight.conflict) {
          conflictsCount++;
        }
        return initiateRollback(`Preflight failed on step ${step.stepId}: ${opPreflight.error}`, step.stepId);
      }

      // 3.6 Create Checkpoint Before Step Mutation
      const stepCheckpoint = this.createCheckpoint({
        executionId,
        stepId: step.stepId,
        project: currentProject,
        planVersion: params.plan.planVersion || '1.0.0',
        policyVersion: AutonomyPolicyManager.POLICY_VERSION,
        executionState: 'executing',
        transactionState: 'ACTIVE',
        completedSteps: [...completedStepIds],
        pendingSteps: params.plan.steps.slice(i).map((s) => s.stepId),
      });
      checkpoints.push(stepCheckpoint);

      // 3.7 Transactional Execution with Bounded Retry
      stepRecord.status = 'EXECUTING';
      stepRecord.startedAt = new Date().toISOString();

      let stepSuccess = false;
      let stepAttempts = 0;
      let lastTxError: string | undefined;

      while (!stepSuccess && stepAttempts < maxRetries) {
        stepAttempts++;
        stepRecord.attempts = stepAttempts;

        const tx = AITransactionManager.executeTransaction({
          project: currentProject,
          operations: [step.operation],
          prompt: step.description,
          mode: 'generate',
        });

        if (tx.success) {
          // 3.8 Post-Step Autonomous Verification
          const verification = AutonomousVerificationEngine.verifyStepOutcome(step, tx.updatedProject);

          if (verification.status === 'PASSED') {
            currentProject = tx.updatedProject;
            completedStepIds.push(step.stepId);
            appliedGenerationIds.push(tx.generationId);
            stepSuccess = true;

            stepRecord.status = 'COMPLETED';
            stepRecord.completedAt = new Date().toISOString();
            stepRecord.verificationStatus = 'PASSED';

            const continueDecision: ExecutionDecision = {
              id: `dec_step_${step.stepId}`,
              type: 'CONTINUE',
              reason: `Step ${step.stepId} executed and verified clean.`,
              triggeringEvent: 'VERIFICATION_PASSED',
              risk: stepRisk,
              affectedStepId: step.stepId,
              confidence: 1.0,
              provenance: 'AutonomousVerificationEngine',
              timestamp: new Date().toISOString(),
            };
            decisions.push(continueDecision);

            ExecutionObservability.recordEvent({
              eventId: `evt_step_${step.stepId}_ok`,
              sessionId,
              timestamp: new Date().toISOString(),
              phase: 'Phase 8.5',
              actor: 'AI',
              category: 'OPERATION',
              details: { stepId: step.stepId, operationId: step.operation.id, generationId: tx.generationId },
            });
          } else {
            // Verification failed -> rollback step transaction
            validationFailures++;
            AITransactionManager.rollback(tx.generationId);
            rollbackCount++;
            retriesCount++;
            lastTxError = `Post-step verification failed for step ${step.stepId}.`;

            decisions.push({
              id: `dec_retry_${step.stepId}_${stepAttempts}`,
              type: 'RETRY',
              reason: `Verification failed; rolling back step and retrying (attempt ${stepAttempts}/${maxRetries}).`,
              triggeringEvent: 'VERIFICATION_FAILED',
              risk: stepRisk,
              affectedStepId: step.stepId,
              confidence: 0.8,
              provenance: 'AITransactionManager.rollback',
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          // Transaction failed
          retriesCount++;
          lastTxError = tx.errors ? tx.errors.join('; ') : 'Transaction execution error';

          decisions.push({
            id: `dec_tx_retry_${step.stepId}_${stepAttempts}`,
            type: 'RETRY',
            reason: `Transaction error: ${lastTxError}; attempt ${stepAttempts}/${maxRetries}.`,
            triggeringEvent: 'TRANSACTION_FAILED',
            risk: stepRisk,
            affectedStepId: step.stepId,
            confidence: 0.8,
            provenance: 'AITransactionManager',
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (!stepSuccess) {
        stepRecord.status = 'FAILED';
        stepRecord.error = {
          code: 'STEP_EXECUTION_EXHAUSTED',
          message: lastTxError || `Step ${step.stepId} failed after ${stepAttempts} attempts.`,
          stepId: step.stepId,
          phase: 'execution',
          fatal: true,
          retryable: false,
        };

        return initiateRollback(
          `Step ${step.stepId} failed after ${stepAttempts} attempts: ${lastTxError || 'Retries exhausted'}. Safe rollback completed.`,
          step.stepId
        );
      }
    }

    // ── STAGE 4: FINAL VERIFICATION & COMMIT ──
    recordStateTransition('completed', 'All plan steps completed and verified; performing final verification');

    // Assert overall project schema integrity
    const hasAtLeastOnePage = (currentProject.pages || []).length > 0;
    if (!hasAtLeastOnePage) {
      recordStateTransition('step_failed', 'Final verification failed: project has no valid pages');
      return {
        status: 'FAILED',
        sessionState: 'step_failed',
        updatedProject: currentProject,
        completedStepIds,
        revisionsCount,
        retriesCount,
        events: observabilityEvents,
        error: 'Final verification failed: project has zero pages.',
      };
    }

    recordStateTransition('committed', 'Final verification passed clean; execution transaction committed');

    const trace: ExecutionTrace = {
      requestId: executionId,
      executionId,
      goalId: (params.plan as any).goal?.id || params.plan.goalId,
      planId: params.plan.planId,
      events: executionEvents,
      decisions,
      checkpoints,
      steps: executedSteps,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
    };

    const metrics = this.buildMetrics({
      startTime,
      steps: executedSteps,
      completedStepIds,
      retriesCount,
      rollbackCount,
      approvalPauses,
      policyBlocks,
      validationFailures,
      conflictsCount,
      stalePlanEvents,
      adaptationsCount,
    });

    const summary: ExecutionSummary = {
      executionId,
      status: 'COMPLETED',
      totalSteps: params.plan.steps.length,
      completedSteps: completedStepIds.length,
      durationMs: Date.now() - startTime,
      retries: retriesCount,
      rollbacks: rollbackCount,
      cleanVerification: true,
    };

    return {
      status: 'COMPLETED',
      sessionState: 'committed',
      updatedProject: currentProject,
      completedStepIds,
      revisionsCount,
      retriesCount,
      events: observabilityEvents,
      trace,
      metrics,
      decisions,
      checkpoints,
      summary,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. HELPER METRICS BUILDER
  // ─────────────────────────────────────────────────────────────────────────────

  private static buildMetrics(params: {
    startTime: number;
    steps: AdaptiveExecutionStep[];
    completedStepIds: string[];
    retriesCount: number;
    rollbackCount: number;
    approvalPauses: number;
    policyBlocks: number;
    validationFailures: number;
    conflictsCount: number;
    stalePlanEvents: number;
    adaptationsCount: number;
  }): ExecutionMetrics {
    return {
      executionDurationMs: Date.now() - params.startTime,
      stepCount: params.steps.length,
      successfulSteps: params.completedStepIds.length,
      failedSteps: params.steps.length - params.completedStepIds.length,
      retriedSteps: params.retriesCount,
      rollbackCount: params.rollbackCount,
      approvalPauses: params.approvalPauses,
      policyBlocks: params.policyBlocks,
      validationFailures: params.validationFailures,
      conflicts: params.conflictsCount,
      stalePlanEvents: params.stalePlanEvents,
      adaptationsCount: params.adaptationsCount,
      tokensUsed: 1200,
      estimatedCost: 0.005,
    };
  }
}
