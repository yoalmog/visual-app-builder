// D8.13: Human-in-the-Loop (HITL) Control Center & Policy Arbitration Types
// Strongly-typed contracts governing operator oversight, live stepping, breakpoints,
// policy arbitration, dual-control approval, emergency stops, and immutable audit trails.

import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { IntelligentPlan, PlanStep, AutonomyLevel, AIRisk } from './types';
import { VerificationResult as D86VerificationResult } from './verification-types';
import { Explanation } from '../explainability/explainability-types';

// ── HITL Control State Machine ──
export type HITLStatus =
  | 'IDLE'
  | 'MONITORING'
  | 'PENDING_APPROVAL'
  | 'PAUSED_BY_OPERATOR'
  | 'STEPPING'
  | 'INTERVENING'
  | 'ARBITRATING'
  | 'EMERGENCY_STOPPED'
  | 'DRAINING'
  | 'ROLLED_BACK'
  | 'COMPLETED';

// ── Intervention Actions ──
export type HITLInterventionAction =
  | 'APPROVE'
  | 'REJECT'
  | 'OVERRIDE_PARAMETERS'
  | 'VETO_STRATEGY'
  | 'INJECT_STEP'
  | 'SKIP_STEP'
  | 'FORCE_ROLLBACK'
  | 'ADJUST_AUTONOMY'
  | 'STEP_NEXT'
  | 'EMERGENCY_STOP';

// ── Breakpoints ──
export interface HITLBreakpoint {
  id: string;
  name: string;
  isEnabled: boolean;
  targetEntityId?: string;
  minRiskLevel?: AIRisk | 'low' | 'medium' | 'high' | 'critical';
  actionType?: string;
  maxMutationBudget?: number;
  conditionFormula?: string;
  hitCount: number;
  createdAt: string;
}

export interface HITLBreakpointHit {
  hitId: string;
  breakpointId: string;
  breakpointName: string;
  sessionId: string;
  stepIndex?: number;
  stepId?: string;
  entityId?: string;
  riskLevel?: string;
  reason: string;
  capturedStateSnapshot?: Record<string, unknown>;
  timestamp: string;
}

// ── Policy Arbitration ──
export interface PolicyConflict {
  conflictId: string;
  policyRule: string;
  requestedAction: string;
  targetEntityId?: string;
  violationReason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
}

export type ArbitrationStrategy =
  | 'HUMAN_OVERRIDE_WITH_AUDIT'
  | 'CONSERVATIVE_FALLBACK'
  | 'LEAST_PRIVILEGE_STRICT'
  | 'CONDITIONAL_DELEGATION'
  | 'DUAL_CONTROL_REQUIRED';

export interface ArbitrationDecision {
  decisionId: string;
  conflictId: string;
  strategy: ArbitrationStrategy;
  allowed: boolean;
  effectiveAutonomyLevel: AutonomyLevel;
  rationale: string;
  requiredAuthorizersCount: number;
  grantedAuthorizations: string[];
  auditId: string;
  decidedAt: string;
}

// ── Dual-Control Approvals (Four-Eyes Principle) ──
export interface DualControlRequest {
  requestId: string;
  action: string;
  targetResource: string;
  riskLevel: string;
  requiredApprovals: number;
  currentApprovals: Array<{
    operatorId: string;
    role: string;
    timestamp: string;
    signature: string;
  }>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  expiresAt: string;
}

// ── Break-Glass Override ──
export interface BreakGlassOverride {
  overrideId: string;
  operatorId: string;
  operatorRole: string;
  justification: string;
  targetSessionId: string;
  grantedPermissions: string[];
  activatedAt: string;
  expiresAt: string;
  signature: string;
  verified: boolean;
}

// ── Immutable Audit Record ──
export interface HITLAuditRecord {
  auditId: string;
  sessionId: string;
  projectId: string;
  actor: string;
  role: string;
  action: HITLInterventionAction | string;
  targetId?: string;
  justification?: string;
  beforeStateSummary?: string;
  afterStateSummary?: string;
  hash: string;
  timestamp: string;
}

// ── Stepping & Step Mutation ──
export interface StepInterventionPayload {
  stepId: string;
  modifiedOperation?: AIOperation;
  skip?: boolean;
  customParameters?: Record<string, unknown>;
  operatorNotes?: string;
}

// ── HITL Session ──
export interface HITLSession {
  sessionId: string;
  projectId: string;
  status: HITLStatus;
  autonomyLevel: AutonomyLevel;
  currentStepIndex: number;
  totalSteps: number;
  isDraining: boolean;
  activePlan?: IntelligentPlan;
  activeBreakpoints: HITLBreakpoint[];
  hitBreakpoints: HITLBreakpointHit[];
  pendingDualControl?: DualControlRequest;
  lastArbitration?: ArbitrationDecision;
  auditTrail: HITLAuditRecord[];
  inFlightTransactionId?: string;
  startedAt: string;
  updatedAt: string;
}

// ── Operational Execution Result ──
export interface HITLExecutionResult {
  success: boolean;
  status: HITLStatus;
  updatedProject?: AppProject;
  currentStepIndex: number;
  totalSteps: number;
  verification?: D86VerificationResult;
  hitBreakpoint?: HITLBreakpointHit;
  arbitration?: ArbitrationDecision;
  dualControl?: DualControlRequest;
  explanation?: Explanation;
  auditRecord?: HITLAuditRecord;
  error?: string;
}
