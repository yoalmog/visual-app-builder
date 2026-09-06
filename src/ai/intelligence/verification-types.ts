// D8.6: Autonomous Verification Types Contract
// Defines the strongly typed verification contract between intent, plan, execution, and expected postconditions.

import { AppProject } from '../../builder/schema/project';

export type VerificationState =
  | 'idle'
  | 'collecting_evidence'
  | 'checking_structure'
  | 'checking_scope'
  | 'checking_runtime'
  | 'checking_workflows'
  | 'checking_data'
  | 'checking_security'
  | 'checking_invariants'
  | 'checking_intent'
  | 'passed'
  | 'failed'
  | 'uncertain'
  | 'blocked';

export type VerificationStatus = 'PASS' | 'FAIL' | 'UNCERTAIN' | 'BLOCKED';

export type VerificationPostconditionType =
  | 'component_exists'
  | 'component_removed'
  | 'property_equals'
  | 'route_exists'
  | 'route_resolves'
  | 'workflow_exists'
  | 'workflow_binding_exists'
  | 'data_model_exists'
  | 'relationship_exists'
  | 'required_field_exists'
  | 'navigation_target_exists'
  | 'no_unrelated_mutation'
  | 'security_invariants_preserved';

export interface VerificationPostcondition {
  id: string;
  type: VerificationPostconditionType;
  targetId?: string;
  targetType?: 'component' | 'page' | 'collection' | 'workflow' | 'route' | 'project';
  property?: string;
  expectedValue?: any;
  description: string;
  critical: boolean;
}

export interface VerificationExpectation {
  id: string;
  description: string;
  category:
    | 'structure'
    | 'property'
    | 'route'
    | 'workflow'
    | 'data'
    | 'design'
    | 'security'
    | 'runtime'
    | 'intent';
  target: {
    type: string;
    id?: string;
    property?: string;
  };
  expectedValue?: any;
  criticality: 'critical' | 'required' | 'advisory';
}

export interface VerificationEvidence {
  evidenceId: string;
  source:
    | 'schema_snapshot'
    | 'component_tree'
    | 'before_after_diff'
    | 'runtime_result'
    | 'workflow_result'
    | 'data_validation'
    | 'invariant_result'
    | 'security_result';
  targetId?: string;
  observedData: any;
  summary: string;
  timestamp: string;
}

export interface VerificationCheck {
  checkId: string;
  type: string;
  target: string;
  passed: boolean;
  status: 'PASS' | 'FAIL' | 'UNCERTAIN' | 'BLOCKED' | 'SKIPPED';
  expected: string;
  actual: string;
  evidenceId?: string;
  error?: string;
  critical?: boolean;
  durationMs?: number;
}

export interface VerificationFinding {
  findingId: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  category:
    | 'STRUCTURAL'
    | 'SCOPE'
    | 'RUNTIME'
    | 'WORKFLOW'
    | 'DATA'
    | 'DESIGN'
    | 'SECURITY'
    | 'INVARIANT'
    | 'INTENT';
  title: string;
  description: string;
  target?: string;
  evidence: string;
  recommendation?: string;
}

export interface VerificationFailure {
  failureId: string;
  category: string;
  reason: string;
  affectedEntityId?: string;
  isRecoverable: boolean;
  suggestedRecovery?: string;
}

export interface VerificationRecovery {
  recoveryId: string;
  failureId: string;
  strategy:
    | 'REVERT_MUTATION'
    | 'REBIND_WORKFLOW'
    | 'RECREATE_MISSING_ENTITY'
    | 'RESTORE_PROPERTY'
    | 'REPLAN_REQUIRED';
  description: string;
  requiredOperations?: any[];
  requiresApproval: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  attemptsCount: number;
  maxAttempts: number;
}

export interface VerificationSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  uncertainChecks: number;
  criticalFailures: number;
  scopeIntegrityPreserved: boolean;
  unexpectedMutationsCount: number;
  securityInvariantsPreserved: boolean;
  intentFulfilled: boolean;
  conclusion: string;
}

export interface VerificationTraceStage {
  stage: VerificationState;
  timestamp: string;
  durationMs: number;
  status: 'OK' | 'FAIL' | 'WARN' | 'UNCERTAIN';
  checksCount: number;
}

export interface VerificationTrace {
  traceId: string;
  verificationId: string;
  sessionId?: string;
  planId?: string;
  transactionId?: string;
  projectVersionBefore: number;
  projectVersionAfter: number;
  stages: VerificationTraceStage[];
  finalStatus: VerificationStatus;
}

export interface ExpectedChange {
  entityType: 'page' | 'component' | 'collection' | 'workflow' | 'theme' | 'asset' | 'project';
  entityId: string;
  changeType: 'create' | 'update' | 'delete';
  property?: string;
  expectedValue?: any;
}

export interface VerificationRequest {
  verificationId?: string;
  intent: string;
  planId?: string;
  transactionId?: string;
  projectVersion: number;
  expectedChanges: ExpectedChange[];
  expectedPostconditions: VerificationPostcondition[];
  affectedResources: Array<{ type: string; id: string }>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectBefore: AppProject;
  projectAfter: AppProject;
  context?: any;
  sessionId?: string;
}

export interface VerificationSession {
  sessionId: string;
  verificationId: string;
  currentState: VerificationState;
  completedStages: VerificationState[];
  pendingStages: VerificationState[];
  request: VerificationRequest;
  evidenceCollected: VerificationEvidence[];
  findings: VerificationFinding[];
  checksRun: VerificationCheck[];
  failures: VerificationFailure[];
  attemptCount: number;
  maxAttempts: number;
  recoveryAttemptCount: number;
  maxRecoveryAttempts: number;
  isInterrupted: boolean;
  lastCheckpointTimestamp?: string;
}

export interface VerificationResult {
  verificationId: string;
  status: VerificationStatus;
  intent: string;
  checks: VerificationCheck[];
  findings: VerificationFinding[];
  evidence: VerificationEvidence[];
  failures: VerificationFailure[];
  recoveryPlan?: VerificationRecovery;
  summary: VerificationSummary;
  trace: VerificationTrace;
  timestamp: string;
  durationMs: number;
}
