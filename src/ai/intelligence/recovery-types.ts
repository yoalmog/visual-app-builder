// D8.7: Autonomous Recovery & Self-Healing Types Contract
// Strongly typed models governing failure intake, diagnosis, recovery planning, policy, approval,
// transaction execution, checkpoints, rollback, verification, bounded retries, crash recovery, and provenance.

import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { VerificationResult } from './verification-types';

export type RecoveryState =
  | 'idle'
  | 'failure_received'
  | 'diagnosing'
  | 'diagnosed'
  | 'planning'
  | 'plan_validating'
  | 'policy_check'
  | 'awaiting_approval'
  | 'recovery_ready'
  | 'recovering'
  | 'step_failed'
  | 'checkpointing'
  | 'verifying_recovery'
  | 'recovery_succeeded'
  | 'retry_evaluating'
  | 'retrying'
  | 'rolling_back'
  | 'rollback_complete'
  | 'uncertain'
  | 'failed'
  | 'blocked'
  | 'completed';

export type RecoveryFailureCategory =
  | 'CODE'
  | 'STRUCTURE'
  | 'SCHEMA'
  | 'REFERENCE'
  | 'COMPONENT'
  | 'ROUTE'
  | 'WORKFLOW'
  | 'DATA'
  | 'RUNTIME'
  | 'RENDERING'
  | 'SECURITY'
  | 'PERMISSION'
  | 'POLICY'
  | 'TRANSACTION'
  | 'CONFLICT'
  | 'STALE_PLAN'
  | 'PERSISTENCE'
  | 'PROVIDER'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'RESOURCE'
  | 'DEPENDENCY'
  | 'UNEXPECTED_MUTATION'
  | 'VERIFICATION'
  | 'UNKNOWN';

export type RecoverySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecoveryEligibility =
  | 'RECOVERABLE'
  | 'CONDITIONALLY_RECOVERABLE'
  | 'NON_RECOVERABLE'
  | 'UNKNOWN';

export type RecoveryStrategy =
  | 'NO_ACTION'
  | 'RETRY_VERIFICATION'
  | 'RETRY_EXECUTION_STEP'
  | 'REPAIR_REFERENCE'
  | 'REPAIR_COMPONENT'
  | 'REPAIR_ROUTE'
  | 'REPAIR_WORKFLOW'
  | 'REPAIR_DATA'
  | 'REPAIR_SCHEMA_COMPATIBILITY'
  | 'RESTORE_CHECKPOINT'
  | 'ROLLBACK_LAST_RECOVERY'
  | 'REBUILD_AFFECTED_SCOPE'
  | 'REQUEST_HUMAN_APPROVAL'
  | 'BLOCK';

export interface RecoveryFailure {
  failureId: string;
  category: RecoveryFailureCategory;
  severity: RecoverySeverity;
  description: string;
  rootCause?: string;
  affectedEntityId?: string;
  affectedEntityType?:
    | 'component'
    | 'page'
    | 'collection'
    | 'workflow'
    | 'route'
    | 'schema'
    | 'security'
    | 'project';
  isRecoverable: boolean;
  eligibility: RecoveryEligibility;
  evidence?: any;
  sourceFailureId?: string;
  timestamp: string;
}

export interface RecoveryRisk {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  rationale: string;
  factors: string[];
}

export interface RecoveryDiagnosis {
  diagnosisId: string;
  primaryCategory: RecoveryFailureCategory;
  severity: RecoverySeverity;
  whatFailed: string;
  whereItFailed: string;
  whenItFailed: string;
  whatChanged: string;
  whatWasExpected: string;
  whatActuallyExists: string;
  isRecoverable: boolean;
  eligibility: RecoveryEligibility;
  recommendedStrategy: RecoveryStrategy;
  minimalChangeSummary: string;
  riskAssessment: RecoveryRisk;
  confidence: number;
  failures: RecoveryFailure[];
  timestamp: string;
}

export interface RecoveryDecision {
  decisionId: string;
  strategy: RecoveryStrategy;
  requiresApproval: boolean;
  approvalReason?: string;
  policyAllows: boolean;
  policyDenialReason?: string;
  reason: string;
  risk: RecoveryRisk;
  timestamp: string;
}

export interface RecoveryApprovalRequirement {
  id: string;
  required: boolean;
  reason: string;
  severity: RecoverySeverity;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  decidedAt?: string;
}

export interface RecoveryStep {
  stepId: string;
  operationType: string;
  target: { type: string; id: string };
  expectedPrecondition: string;
  mutation: AIOperation;
  expectedPostcondition: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reversible: boolean;
  approvalRequired: boolean;
}

export interface RecoveryPlan {
  recoveryId: string;
  projectId: string;
  projectVersion: number;
  sourceFailureId?: string;
  diagnosis: RecoveryDiagnosis;
  strategy: RecoveryStrategy;
  affectedScope: Array<{ type: string; id: string }>;
  expectedOutcome: string;
  steps: RecoveryStep[];
  risk: RecoveryRisk;
  estimatedMutationCount: number;
  requiredApproval: boolean;
  approvalRequirement?: RecoveryApprovalRequirement;
  policyConstraints: string[];
  verificationRequirements: string[];
  rollbackStrategy: 'RESTORE_SNAPSHOT' | 'INVERSE_OPERATIONS' | 'BLOCK';
  retryBudget: number;
  createdAt: string;
  planVersion: number;
  provenance: { creator: string; timestamp: string; hash?: string };
}

export interface RecoveryCheckpoint {
  checkpointId: string;
  recoveryId: string;
  stepIndex: number;
  projectSnapshot: AppProject;
  completedStepIds: string[];
  appliedOperations: AIOperation[];
  timestamp: string;
  status: string;
}

export interface RecoveryAttempt {
  attemptNumber: number;
  strategy: RecoveryStrategy;
  planId: string;
  startedAt: string;
  completedAt?: string;
  status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK' | 'BLOCKED';
  operationsCount: number;
  verificationResult?: VerificationResult;
  error?: string;
}

export interface RecoveryRollback {
  rollbackId: string;
  recoveryId: string;
  attemptNumber: number;
  reason: string;
  rolledBackOperations: AIOperation[];
  success: boolean;
  restoredSnapshotVersion: number;
  timestamp: string;
}

export interface RecoveryVerification {
  verificationId: string;
  status: 'PASS' | 'FAIL' | 'UNCERTAIN' | 'BLOCKED';
  originalFailureResolved: boolean;
  noUnexpectedMutations: boolean;
  checksCount: number;
  passedChecksCount: number;
  timestamp: string;
}

export interface RecoveryEvent {
  id: string;
  type: string;
  state: RecoveryState;
  timestamp: string;
  message: string;
  details?: any;
}

export interface RecoveryTrace {
  traceId: string;
  recoveryId: string;
  projectId: string;
  events: RecoveryEvent[];
  durationMs: number;
  finalState: RecoveryState;
}

export interface RecoveryMetrics {
  totalRecoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  blockedRecoveries: number;
  uncertainRecoveries: number;
  rollbackCount: number;
  rollbackSuccessCount: number;
  verificationPassCount: number;
  verificationFailureCount: number;
  retryCount: number;
  averageRecoverySteps: number;
  averageRecoveryDuration: number;
  mutationCount: number;
  unexpectedMutationCount: number;
  approvalRequiredCount: number;
  approvalDeniedCount: number;
  stalePlanCount: number;
}

export interface RecoveryRequest {
  requestId?: string;
  projectId: string;
  projectVersion: number;
  project: AppProject;
  projectBefore?: AppProject;
  verificationResult?: VerificationResult;
  failures?: RecoveryFailure[];
  intent?: string;
  environment?: 'development' | 'preview' | 'production';
  userRoles?: string[];
  autonomyLevel?: number;
  maxAttempts?: number;
  context?: any;
  approvalToken?: string;
  isApproved?: boolean;
}

export interface RecoverySession {
  sessionId: string;
  recoveryId: string;
  projectId: string;
  projectVersionBefore: number;
  currentState: RecoveryState;
  request: RecoveryRequest;
  diagnosis?: RecoveryDiagnosis;
  plan?: RecoveryPlan;
  attempts: RecoveryAttempt[];
  checkpoints: RecoveryCheckpoint[];
  rollbacks: RecoveryRollback[];
  events: RecoveryEvent[];
  attemptCount: number;
  maxAttempts: number;
  isInterrupted: boolean;
  finalResult?: RecoveryResult;
}

export interface RecoverySummary {
  totalAttempts: number;
  appliedMutations: number;
  isResolved: boolean;
  resolutionStrategy?: RecoveryStrategy;
  approvalWasRequired: boolean;
  rollbackOccurred: boolean;
  unexpectedMutationsDetected: boolean;
  finalStatus: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'UNCERTAIN';
  message: string;
}

export interface RecoveryResult {
  recoveryId: string;
  sessionId: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'UNCERTAIN';
  state: RecoveryState;
  repairedProject?: AppProject;
  diagnosis?: RecoveryDiagnosis;
  plan?: RecoveryPlan;
  attemptsCount: number;
  verification?: VerificationResult;
  rollback?: RecoveryRollback;
  summary: RecoverySummary;
  trace: RecoveryTrace;
  durationMs: number;
}
