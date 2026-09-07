// D8.13: Human-in-the-Loop (HITL) Control Center & Policy Arbitration Engine
// Centralized authority, supervisory oversight, live breakpoints, stepping, dual-control,
// emergency stop (kill-switch), policy arbitration, and cryptographic audit records.

import * as crypto from 'crypto';
import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { IntelligentPlan, PlanStep, AutonomyLevel, AIRisk } from './types';
import {
  HITLStatus,
  HITLInterventionAction,
  HITLBreakpoint,
  HITLBreakpointHit,
  PolicyConflict,
  ArbitrationStrategy,
  ArbitrationDecision,
  DualControlRequest,
  BreakGlassOverride,
  HITLAuditRecord,
  StepInterventionPayload,
  HITLSession,
  HITLExecutionResult,
} from './hitl-types';
import { AITransactionManager } from '../history/AITransactionManager';
import { AutonomousVerificationEngine } from './AutonomousVerificationEngine';
import { AutonomyPolicyManager } from './AutonomyPolicyManager';
import { ExecutionEventStore } from '../observability/ExecutionEventStore';
import { ExperienceStore } from './ExperienceStore';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';
import { AISecretFilter } from '../security/AISecretFilter';

export class HumanControlCenter {
  private static sessions: Map<string, HITLSession> = new Map();
  private static breakpoints: Map<string, HITLBreakpoint[]> = new Map();
  private static dualControlRequests: Map<string, DualControlRequest> = new Map();
  private static breakGlassOverrides: Map<string, BreakGlassOverride> = new Map();
  private static auditLogs: HITLAuditRecord[] = [];
  private static storageFilePath = '.phase8/hitl-sessions.json';

  // ─────────────────────────────────────────────────────────────
  // 1. SESSION MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  public static createSession(params: {
    sessionId?: string;
    projectId: string;
    plan?: IntelligentPlan;
    autonomyLevel?: AutonomyLevel;
  }): HITLSession {
    const sessionId = params.sessionId || `hitl-sess-${params.projectId}-${Date.now()}`;
    const projectBreakpoints = this.getBreakpoints(params.projectId);

    const session: HITLSession = {
      sessionId,
      projectId: params.projectId,
      status: 'MONITORING',
      autonomyLevel: params.autonomyLevel !== undefined ? params.autonomyLevel : 2,
      currentStepIndex: 0,
      totalSteps: params.plan?.steps.length || 0,
      isDraining: false,
      activePlan: params.plan,
      activeBreakpoints: [...projectBreakpoints],
      hitBreakpoints: [],
      auditTrail: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    this.recordAudit({
      sessionId,
      projectId: params.projectId,
      actor: 'SYSTEM',
      role: 'SUPERVISOR',
      action: 'START',
      justification: 'Initialized HITL supervisor session.',
    });

    return session;
  }

  public static getSession(sessionId: string): HITLSession | undefined {
    return this.sessions.get(sessionId);
  }

  public static updateSessionState(sessionId: string, status: HITLStatus): HITLSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.status = status;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. BREAKPOINT CONTROLS
  // ─────────────────────────────────────────────────────────────

  public static getBreakpoints(projectId: string): HITLBreakpoint[] {
    return this.breakpoints.get(projectId) || [];
  }

  public static setBreakpoints(projectId: string, bps: HITLBreakpoint[]): void {
    this.breakpoints.set(projectId, bps);
  }

  public static addBreakpoint(
    projectId: string,
    bp: Omit<HITLBreakpoint, 'id' | 'hitCount' | 'createdAt'>
  ): HITLBreakpoint {
    const list = this.getBreakpoints(projectId);
    const newBp: HITLBreakpoint = {
      ...bp,
      id: `bp-${projectId}-${Date.now()}-${list.length + 1}`,
      hitCount: 0,
      createdAt: new Date().toISOString(),
    };
    list.push(newBp);
    this.breakpoints.set(projectId, list);
    return newBp;
  }

  public static removeBreakpoint(projectId: string, breakpointId: string): boolean {
    const list = this.getBreakpoints(projectId);
    const filtered = list.filter((b) => b.id !== breakpointId);
    if (filtered.length !== list.length) {
      this.breakpoints.set(projectId, filtered);
      return true;
    }
    return false;
  }

  public static evaluateBreakpoints(params: {
    session: HITLSession;
    step?: PlanStep;
    operation?: AIOperation;
    riskLevel?: AIRisk | string;
    mutationCount?: number;
  }): HITLBreakpointHit | null {
    const bps = params.session.activeBreakpoints.filter((b) => b.isEnabled);

    for (const bp of bps) {
      let isHit = false;
      let reason = '';

      // Entity ID match
      if (bp.targetEntityId) {
        const stepEntity = params.step?.expectedResult?.entityId;
        const opEntity = (params.operation as any)?.nodeId || (params.operation as any)?.componentId;
        if (bp.targetEntityId === stepEntity || bp.targetEntityId === opEntity) {
          isHit = true;
          reason = `Breakpoint triggered: matches target entity ID "${bp.targetEntityId}".`;
        }
      }

      // Risk level match
      if (!isHit && bp.minRiskLevel) {
        const riskOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
        const currentRisk = (params.riskLevel || params.step?.riskLevel || 'low').toLowerCase();
        const minRisk = bp.minRiskLevel.toLowerCase();
        if ((riskOrder[currentRisk] || 1) >= (riskOrder[minRisk] || 1)) {
          isHit = true;
          reason = `Breakpoint triggered: current risk "${currentRisk}" meets or exceeds threshold "${minRisk}".`;
        }
      }

      // Action / Operation type match
      if (!isHit && bp.actionType) {
        const currentOpType = params.operation?.type || (params.step?.operation as any)?.type;
        if (currentOpType === bp.actionType) {
          isHit = true;
          reason = `Breakpoint triggered: action type "${currentOpType}" matches breakpoint filter.`;
        }
      }

      // Mutation budget ceiling
      if (!isHit && bp.maxMutationBudget !== undefined && params.mutationCount !== undefined) {
        if (params.mutationCount > bp.maxMutationBudget) {
          isHit = true;
          reason = `Breakpoint triggered: mutation count ${params.mutationCount} exceeds configured limit ${bp.maxMutationBudget}.`;
        }
      }

      if (isHit) {
        bp.hitCount++;
        const hit: HITLBreakpointHit = {
          hitId: `hit-${bp.id}-${Date.now()}`,
          breakpointId: bp.id,
          breakpointName: bp.name,
          sessionId: params.session.sessionId,
          stepIndex: params.session.currentStepIndex,
          stepId: params.step?.stepId,
          entityId: params.step?.expectedResult?.entityId,
          riskLevel: params.riskLevel || params.step?.riskLevel,
          reason,
          timestamp: new Date().toISOString(),
        };
        params.session.hitBreakpoints.push(hit);
        return hit;
      }
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. EXECUTION LIFECYCLE & STEPPING
  // ─────────────────────────────────────────────────────────────

  public static async startExecution(sessionId: string, project: AppProject): Promise<HITLExecutionResult> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.activePlan) {
      return {
        success: false,
        status: 'IDLE',
        currentStepIndex: 0,
        totalSteps: 0,
        error: `Session ${sessionId} not found or has no plan.`,
      };
    }

    session.status = 'MONITORING';
    session.currentStepIndex = 0;
    session.updatedAt = new Date().toISOString();

    // Execute step by step
    return await this.executeNextSteps(session, project);
  }

  public static pauseExecution(sessionId: string, reason = 'Operator requested pause'): HITLSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found.`);

    session.status = 'PAUSED_BY_OPERATOR';
    session.updatedAt = new Date().toISOString();

    this.recordAudit({
      sessionId,
      projectId: session.projectId,
      actor: 'OPERATOR',
      role: 'USER',
      action: 'PAUSE',
      justification: reason,
    });

    return session;
  }

  public static async resumeExecution(sessionId: string, project: AppProject): Promise<HITLExecutionResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, status: 'IDLE', currentStepIndex: 0, totalSteps: 0, error: 'Session not found' };
    }

    if (session.status === 'EMERGENCY_STOPPED') {
      return {
        success: false,
        status: 'EMERGENCY_STOPPED',
        currentStepIndex: session.currentStepIndex,
        totalSteps: session.totalSteps,
        error: 'Cannot resume an emergency stopped session.',
      };
    }

    session.status = 'MONITORING';
    session.updatedAt = new Date().toISOString();

    this.recordAudit({
      sessionId,
      projectId: session.projectId,
      actor: 'OPERATOR',
      role: 'USER',
      action: 'STEP_NEXT',
      justification: 'Resumed execution from pause.',
    });

    return await this.executeNextSteps(session, project);
  }

  public static async stepNext(
    sessionId: string,
    project: AppProject,
    intervention?: StepInterventionPayload
  ): Promise<HITLExecutionResult> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.activePlan) {
      return { success: false, status: 'IDLE', currentStepIndex: 0, totalSteps: 0, error: 'Session not found' };
    }

    if (session.currentStepIndex >= session.activePlan.steps.length) {
      session.status = 'COMPLETED';
      return {
        success: true,
        status: 'COMPLETED',
        updatedProject: project,
        currentStepIndex: session.currentStepIndex,
        totalSteps: session.totalSteps,
      };
    }

    session.status = 'STEPPING';
    const currentStep = session.activePlan.steps[session.currentStepIndex];

    // Check operator intervention
    if (intervention && intervention.stepId === currentStep.stepId) {
      if (intervention.skip) {
        session.currentStepIndex++;
        this.recordAudit({
          sessionId,
          projectId: session.projectId,
          actor: 'OPERATOR',
          role: 'USER',
          action: 'SKIP_STEP',
          targetId: currentStep.stepId,
          justification: intervention.operatorNotes || 'Operator skipped step.',
        });
        return {
          success: true,
          status: session.currentStepIndex >= session.totalSteps ? 'COMPLETED' : 'STEPPING',
          updatedProject: project,
          currentStepIndex: session.currentStepIndex,
          totalSteps: session.totalSteps,
        };
      }

      if (intervention.modifiedOperation) {
        currentStep.operation = intervention.modifiedOperation;
      }
    }

    // Evaluate breakpoints
    const hit = this.evaluateBreakpoints({
      session,
      step: currentStep,
      operation: currentStep.operation,
      riskLevel: currentStep.riskLevel,
      mutationCount: 1,
    });

    if (hit) {
      session.status = 'PAUSED_BY_OPERATOR';
      return {
        success: true,
        status: 'PAUSED_BY_OPERATOR',
        updatedProject: project,
        currentStepIndex: session.currentStepIndex,
        totalSteps: session.totalSteps,
        hitBreakpoint: hit,
      };
    }

    // Execute single step through AITransactionManager
    const op = currentStep.operation
      ? {
          ...currentStep.operation,
          risk: (currentStep.operation as any).risk || currentStep.riskLevel || 'low',
        }
      : null;

    const tx = AITransactionManager.executeTransaction({
      project,
      operations: op ? [op] : [],
      prompt: `HITL Step ${session.currentStepIndex + 1}: ${currentStep.title}`,
      mode: 'agent',
    });

    if (!tx.success || !tx.updatedProject) {
      session.status = 'INTERVENING';
      return {
        success: false,
        status: 'INTERVENING',
        currentStepIndex: session.currentStepIndex,
        totalSteps: session.totalSteps,
        error: `Step execution failed: ${tx.errors?.join(', ')}`,
      };
    }

    const mutatedProject = tx.updatedProject;
    session.inFlightTransactionId = tx.generationId;

    // Autonomous Verification of step
    const verification = await AutonomousVerificationEngine.verify({
      intent: currentStep.title,
      projectBefore: project,
      projectAfter: mutatedProject,
      projectVersion: (mutatedProject as any).version || 2,
      affectedResources: [{ type: 'component', id: (currentStep.operation as any)?.nodeId || 'target' }],
      riskLevel: ((currentStep.riskLevel?.toUpperCase() as any) || 'LOW'),
      expectedChanges: [{
        entityType: 'component',
        entityId: (currentStep.operation as any)?.nodeId || 'target',
        changeType: 'update',
      }],
      expectedPostconditions: [],
    });

    if (verification.status === 'FAIL') {
      AITransactionManager.rollback(tx.generationId);
      session.status = 'ROLLED_BACK';
      return {
        success: false,
        status: 'ROLLED_BACK',
        updatedProject: project,
        currentStepIndex: session.currentStepIndex,
        totalSteps: session.totalSteps,
        verification,
        error: 'Step verification failed; transaction rolled back cleanly.',
      };
    }

    session.currentStepIndex++;
    const isFinished = session.currentStepIndex >= session.totalSteps;
    session.status = isFinished ? 'COMPLETED' : 'PAUSED_BY_OPERATOR';

    return {
      success: true,
      status: session.status,
      updatedProject: mutatedProject,
      currentStepIndex: session.currentStepIndex,
      totalSteps: session.totalSteps,
      verification,
    };
  }

  private static async executeNextSteps(session: HITLSession, project: AppProject): Promise<HITLExecutionResult> {
    let currentProject = project;

    while (session.activePlan && session.currentStepIndex < session.activePlan.steps.length) {
      if (session.isDraining) {
        session.status = 'DRAINING';
        return {
          success: true,
          status: 'DRAINING',
          updatedProject: currentProject,
          currentStepIndex: session.currentStepIndex,
          totalSteps: session.totalSteps,
        };
      }

      if (session.status === 'PAUSED_BY_OPERATOR' || session.status === 'EMERGENCY_STOPPED') {
        return {
          success: true,
          status: session.status,
          updatedProject: currentProject,
          currentStepIndex: session.currentStepIndex,
          totalSteps: session.totalSteps,
        };
      }

      const stepResult = await this.stepNext(session.sessionId, currentProject);
      if (!stepResult.success) {
        return stepResult;
      }

      if (stepResult.hitBreakpoint) {
        return stepResult;
      }

      if (stepResult.updatedProject) {
        currentProject = stepResult.updatedProject;
      }

      if (session.currentStepIndex < session.totalSteps) {
        session.status = 'MONITORING';
      }
    }

    session.status = 'COMPLETED';
    return {
      success: true,
      status: 'COMPLETED',
      updatedProject: currentProject,
      currentStepIndex: session.currentStepIndex,
      totalSteps: session.totalSteps,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. EMERGENCY STOP (KILL-SWITCH) & DRAINING
  // ─────────────────────────────────────────────────────────────

  public static async emergencyStop(
    sessionId: string,
    project: AppProject,
    operatorId: string,
    reason: string
  ): Promise<{
    success: boolean;
    restoredProject?: AppProject;
    audit: HITLAuditRecord;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found.`);

    session.status = 'EMERGENCY_STOPPED';
    session.updatedAt = new Date().toISOString();

    let restoredProject = project;
    // Rollback any in-flight transaction
    if (session.inFlightTransactionId) {
      const rollbackRes = AITransactionManager.rollback(session.inFlightTransactionId);
      if (rollbackRes.success && rollbackRes.restoredProject) {
        restoredProject = rollbackRes.restoredProject;
      }
      session.inFlightTransactionId = undefined;
    }

    const audit = this.recordAudit({
      sessionId,
      projectId: session.projectId,
      actor: operatorId,
      role: 'OPERATOR',
      action: 'EMERGENCY_STOP',
      justification: reason,
    });

    // Record high-priority observability event
    ExecutionEventStore.appendEvent({
      eventId: `evt-em-stop-${Date.now()}`,
      sequenceNumber: Date.now(),
      timestamp: { iso: new Date().toISOString(), epochMs: Date.now() },
      eventType: 'SAFETY_VIOLATION_DETECTED' as any,
      status: 'BLOCKED',
      source: 'HUMAN_OPERATOR' as any,
      severity: 'CRITICAL',
      correlation: {
        traceId: `trc-em-${sessionId}`,
        sessionId,
        projectId: session.projectId,
      },
      metadata: { operatorId, reason },
      outcome: {
        status: 'BLOCKED',
        summary: `EMERGENCY STOP engaged by ${operatorId}: ${reason}`,
      },
    });

    return {
      success: true,
      restoredProject,
      audit,
    };
  }

  public static drainSession(sessionId: string): HITLSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found.`);

    session.isDraining = true;
    session.status = 'DRAINING';
    session.updatedAt = new Date().toISOString();

    this.recordAudit({
      sessionId,
      projectId: session.projectId,
      actor: 'OPERATOR',
      role: 'USER',
      action: 'DRAIN',
      justification: 'Requested clean drain of active session.',
    });

    return session;
  }

  // ─────────────────────────────────────────────────────────────
  // 5. POLICY ARBITRATION MATRIX
  // ─────────────────────────────────────────────────────────────

  public static arbitratePolicyConflict(params: {
    conflict: PolicyConflict;
    operatorRole: string;
    requestedStrategy?: ArbitrationStrategy;
    operatorId: string;
    justification: string;
    projectId?: string;
  }): ArbitrationDecision {
    const decisionId = `arb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sanitizedJustification = AISecretFilter.redactText(
      PromptInjectionDefense.sanitizeInstruction(params.justification).sanitized
    );

    // Hard Stop Security Invariants: Prompt injection, destructive code, arbitrary eval
    const hasHardStopViolation =
      PromptInjectionDefense.containsInjectionAttempt(params.justification) ||
      params.conflict.policyRule.includes('PROHIBITED_CODE') ||
      params.conflict.policyRule.includes('EVAL_PROHIBITED');

    if (hasHardStopViolation) {
      const decision: ArbitrationDecision = {
        decisionId,
        conflictId: params.conflict.conflictId,
        strategy: 'LEAST_PRIVILEGE_STRICT',
        allowed: false,
        effectiveAutonomyLevel: 0,
        rationale: 'Arbitration rejected: Hard security invariants (no eval, no injection) cannot be overridden.',
        requiredAuthorizersCount: 1,
        grantedAuthorizations: [],
        auditId: `audit-${decisionId}`,
        decidedAt: new Date().toISOString(),
      };
      return decision;
    }

    const strategy = params.requestedStrategy || (
      params.operatorRole === 'admin' || params.operatorRole === 'owner'
        ? 'HUMAN_OVERRIDE_WITH_AUDIT'
        : params.conflict.severity === 'CRITICAL'
        ? 'DUAL_CONTROL_REQUIRED'
        : 'CONSERVATIVE_FALLBACK'
    );

    let allowed = false;
    let rationale = '';
    let effectiveAutonomy: AutonomyLevel = 2;

    switch (strategy) {
      case 'HUMAN_OVERRIDE_WITH_AUDIT': {
        if (params.operatorRole === 'admin' || params.operatorRole === 'owner' || params.operatorRole === 'lead') {
          allowed = true;
          effectiveAutonomy = 3;
          rationale = `Human override authorized by privileged role "${params.operatorRole}" with cryptographic audit.`;
        } else {
          allowed = false;
          effectiveAutonomy = 1;
          rationale = `Human override denied: Operator role "${params.operatorRole}" has insufficient privilege.`;
        }
        break;
      }

      case 'DUAL_CONTROL_REQUIRED': {
        allowed = false;
        effectiveAutonomy = 2;
        rationale = 'Dual control authorization mandated before policy conflict can be resolved.';
        break;
      }

      case 'CONSERVATIVE_FALLBACK': {
        allowed = true;
        effectiveAutonomy = 1;
        rationale = 'Policy conflict resolved via conservative fallback with reduced autonomy level.';
        break;
      }

      case 'LEAST_PRIVILEGE_STRICT':
      default: {
        allowed = false;
        effectiveAutonomy = 0;
        rationale = 'Least privilege policy enforced: conflicting action blocked.';
        break;
      }
    }

    const audit = this.recordAudit({
      sessionId: `arb-sess-${params.conflict.conflictId}`,
      projectId: params.projectId || 'system',
      actor: params.operatorId,
      role: params.operatorRole,
      action: strategy,
      targetId: params.conflict.targetEntityId,
      justification: sanitizedJustification,
    });

    const decision: ArbitrationDecision = {
      decisionId,
      conflictId: params.conflict.conflictId,
      strategy,
      allowed,
      effectiveAutonomyLevel: effectiveAutonomy,
      rationale,
      requiredAuthorizersCount: strategy === 'DUAL_CONTROL_REQUIRED' ? 2 : 1,
      grantedAuthorizations: allowed ? [params.operatorId] : [],
      auditId: audit.auditId,
      decidedAt: new Date().toISOString(),
    };

    // Feed human correction back into learning
    if (allowed && strategy === 'HUMAN_OVERRIDE_WITH_AUDIT') {
      ExperienceStore.insert({
        id: `exp-arb-${decisionId}`,
        projectId: params.projectId || 'system',
        category: 'USER_CORRECTION',
        outcome: 'SUCCESS',
        validity: 'VALID',
        description: `Operator override: ${params.conflict.requestedAction} resolved via ${strategy}.`,
        context: {
          projectId: params.projectId || 'system',
          projectVersion: 1,
          schemaVersion: 1,
          environment: 'development',
        },
        features: {
          version: '1.0.0',
          operationTypes: [],
          componentTypes: [],
          mutationCount: 0,
          operationCount: 0,
          riskLevel: 'MEDIUM',
          approvalRequired: true,
          rollbackOccurred: false,
          tags: ['hitl', 'policy_arbitration', 'operator_override'],
        },
        provenance: {
          source: 'user_feedback',
          projectId: params.projectId || 'system',
          projectVersion: 1,
          schemaVersion: 1,
          environment: 'development',
          actor: params.operatorId,
          timestamp: new Date().toISOString(),
          sanitized: true,
        },
        evidence: [sanitizedJustification],
        timesMatched: 0,
        successScore: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return decision;
  }

  // ─────────────────────────────────────────────────────────────
  // 6. DUAL-CONTROL GATING (FOUR-EYES PRINCIPLE)
  // ─────────────────────────────────────────────────────────────

  public static requestDualControl(params: {
    action: string;
    targetResource: string;
    riskLevel: string;
    operatorId: string;
    role: string;
    signature: string;
  }): DualControlRequest {
    const requestId = `dc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const request: DualControlRequest = {
      requestId,
      action: params.action,
      targetResource: params.targetResource,
      riskLevel: params.riskLevel,
      requiredApprovals: 2,
      currentApprovals: [
        {
          operatorId: params.operatorId,
          role: params.role,
          timestamp: new Date().toISOString(),
          signature: params.signature || `sig-${params.operatorId}`,
        },
      ],
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    this.dualControlRequests.set(requestId, request);
    return request;
  }

  public static approveDualControl(params: {
    requestId: string;
    secondOperatorId: string;
    role: string;
    signature: string;
  }): {
    success: boolean;
    request: DualControlRequest;
    token?: string;
    error?: string;
  } {
    const req = this.dualControlRequests.get(params.requestId);
    if (!req) throw new Error(`Dual control request ${params.requestId} not found.`);

    if (req.status !== 'PENDING') {
      return { success: false, request: req, error: `Request status is ${req.status}.` };
    }

    // Four-eyes invariant: Same operator cannot approve twice
    const alreadySigned = req.currentApprovals.some((a) => a.operatorId === params.secondOperatorId);
    if (alreadySigned) {
      return {
        success: false,
        request: req,
        error: 'Dual control violation: First operator cannot act as second approver.',
      };
    }

    req.currentApprovals.push({
      operatorId: params.secondOperatorId,
      role: params.role,
      timestamp: new Date().toISOString(),
      signature: params.signature || `sig-${params.secondOperatorId}`,
    });

    if (req.currentApprovals.length >= req.requiredApprovals) {
      req.status = 'APPROVED';
      const token = `dc-token-${crypto.randomBytes(16).toString('hex')}`;
      return { success: true, request: req, token };
    }

    return { success: false, request: req };
  }

  public static rejectDualControl(requestId: string, operatorId: string, reason: string): DualControlRequest {
    const req = this.dualControlRequests.get(requestId);
    if (!req) throw new Error(`Dual control request ${requestId} not found.`);
    req.status = 'REJECTED';
    return req;
  }

  // ─────────────────────────────────────────────────────────────
  // 7. BREAK-GLASS OVERRIDE
  // ─────────────────────────────────────────────────────────────

  public static activateBreakGlass(params: {
    operatorId: string;
    operatorRole: string;
    justification: string;
    targetSessionId: string;
    grantedPermissions: string[];
    durationMinutes?: number;
  }): BreakGlassOverride {
    const overrideId = `bg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duration = (params.durationMinutes || 30) * 60 * 1000;

    const signature = crypto
      .createHash('sha256')
      .update(`${overrideId}:${params.operatorId}:${params.justification}:${params.targetSessionId}`)
      .digest('hex');

    const override: BreakGlassOverride = {
      overrideId,
      operatorId: params.operatorId,
      operatorRole: params.operatorRole,
      justification: params.justification,
      targetSessionId: params.targetSessionId,
      grantedPermissions: params.grantedPermissions,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + duration).toISOString(),
      signature,
      verified: true,
    };

    this.breakGlassOverrides.set(overrideId, override);

    this.recordAudit({
      sessionId: params.targetSessionId,
      projectId: 'system',
      actor: params.operatorId,
      role: params.operatorRole,
      action: 'BREAK_GLASS',
      justification: params.justification,
    });

    return override;
  }

  public static verifyBreakGlass(overrideId: string): boolean {
    const override = this.breakGlassOverrides.get(overrideId);
    if (!override) return false;
    const now = new Date().toISOString();
    return override.verified && now <= override.expiresAt;
  }

  // ─────────────────────────────────────────────────────────────
  // 8. AUDIT & PROVENANCE RECORDING
  // ─────────────────────────────────────────────────────────────

  public static recordAudit(params: {
    sessionId: string;
    projectId: string;
    actor: string;
    role: string;
    action: HITLInterventionAction | string;
    targetId?: string;
    justification?: string;
    beforeStateSummary?: string;
    afterStateSummary?: string;
  }): HITLAuditRecord {
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const sanitizedJustification = params.justification
      ? AISecretFilter.redactText(PromptInjectionDefense.sanitizeInstruction(params.justification).sanitized)
      : undefined;

    const hash = crypto
      .createHash('sha256')
      .update(`${auditId}:${params.sessionId}:${params.actor}:${params.action}:${timestamp}`)
      .digest('hex');

    const record: HITLAuditRecord = {
      auditId,
      sessionId: params.sessionId,
      projectId: params.projectId,
      actor: params.actor,
      role: params.role,
      action: params.action,
      targetId: params.targetId,
      justification: sanitizedJustification,
      beforeStateSummary: params.beforeStateSummary,
      afterStateSummary: params.afterStateSummary,
      hash,
      timestamp,
    };

    this.auditLogs.push(record);

    const session = this.sessions.get(params.sessionId);
    if (session) {
      session.auditTrail.push(record);
    }

    return record;
  }

  public static getAuditTrail(sessionId?: string): HITLAuditRecord[] {
    if (sessionId) {
      return this.auditLogs.filter((a) => a.sessionId === sessionId);
    }
    return [...this.auditLogs];
  }

  // ─────────────────────────────────────────────────────────────
  // 9. TEARDOWN & RECOVERY
  // ─────────────────────────────────────────────────────────────

  public static clear(): void {
    this.sessions.clear();
    this.breakpoints.clear();
    this.dualControlRequests.clear();
    this.breakGlassOverrides.clear();
    this.auditLogs = [];
  }
}
