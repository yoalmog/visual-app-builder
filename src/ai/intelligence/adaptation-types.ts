// D8.12: Controlled Adaptation Engine Type Definitions
// Strongly-typed models governing evidence-based adaptation proposals, candidate strategies,
// risk/benefit/confidence models, policy re-checks, approval gating, transactions,
// empirical measurements, rollback, provenance, and learning feedback.

import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { AutonomyLevel, AutonomyPolicyDecision } from './types';
import { ExperienceId, ExperiencePatternId } from './learning-types';
import { DecisionCandidate, DecisionStrategyType } from './decision-types';
import { VerificationResult as D86VerificationResult, VerificationPostcondition } from './verification-types';
import { ExecutionTraceId, ExecutionEventId, ExecutionSessionId } from '../observability/observability-types';
import { Explanation } from '../explainability/explainability-types';

// ── Identifiers (Section 10) ──
export type AdaptationId = string;
export type AdaptationProposalId = string;
export type AdaptationSessionId = string;
export type AdaptationCheckpointId = string;
export type AdaptationVersionId = string;
export type AdaptationEvidenceId = string;
export type AdaptationEvaluationId = string;
export type AdaptationExperimentId = string;
export type AdaptationOutcomeId = string;

// ── State Machine (Section 28) ──
export type AdaptationStage =
  | 'IDLE'
  | 'OBSERVING'
  | 'EVIDENCE_LOADING'
  | 'EVIDENCE_VALIDATED'
  | 'PATTERN_ANALYSIS'
  | 'OPPORTUNITY_DETECTED'
  | 'CANDIDATES_GENERATING'
  | 'CANDIDATES_VALIDATED'
  | 'CONSTRAINT_FILTERING'
  | 'RISK_ANALYSIS'
  | 'BENEFIT_ANALYSIS'
  | 'CONFIDENCE_ANALYSIS'
  | 'REVERSIBILITY_ANALYSIS'
  | 'DECISION_OPTIMIZATION'
  | 'EXPLANATION_BUILDING'
  | 'POLICY_CHECK'
  | 'APPROVAL_CHECK'
  | 'AWAITING_APPROVAL'
  | 'SELECTED'
  | 'CHECKPOINTING'
  | 'APPLYING'
  | 'TRANSACTION_COMMITTING'
  | 'VERIFYING'
  | 'MEASURING'
  | 'COMPARING'
  | 'ACCEPTED'
  | 'ROLLING_BACK'
  | 'ROLLBACK_VERIFYING'
  | 'FEEDBACK'
  | 'LEARNING'
  | 'COMPLETED';

export type AdaptationTerminalStatus =
  | 'BLOCKED'
  | 'UNCERTAIN'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'NO_SAFE_ADAPTATION'
  | 'INCONCLUSIVE'
  | 'STALE_ADAPTATION';

export type AdaptationStatus =
  | 'PROPOSED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'APPLYING'
  | 'VERIFYING'
  | 'ACCEPTED'
  | 'IMPROVED'
  | 'UNCHANGED'
  | 'REGRESSED'
  | AdaptationTerminalStatus;

// ── Sources & Categories (Sections 12 & 14) ──
export type AdaptationSource =
  | 'EXPERIENCE_STORE'
  | 'EXECUTION_TRACE'
  | 'METRICS_AGGREGATION'
  | 'EXPLAINABILITY_RECONSTRUCTION'
  | 'VERIFICATION_OUTCOME'
  | 'RECOVERY_OUTCOME'
  | 'USER_CORRECTION'
  | 'MANUAL_OVERRIDE'
  | 'OBSERVABILITY_BOTTLENECK'
  | 'SCHEMA_OBSERVATION';

export type AdaptationCategory =
  | 'PLAN_SELECTION'
  | 'DECISION_SELECTION'
  | 'EXECUTION_ORDER'
  | 'RETRY_SELECTION'
  | 'RECOVERY_SELECTION'
  | 'VERIFICATION_SELECTION'
  | 'PROVIDER_SELECTION'
  | 'PERFORMANCE_OPTIMIZATION'
  | 'CONTEXT_SELECTION'
  | 'EVIDENCE_SELECTION'
  | 'UI_BEHAVIOR'
  | 'WORKFLOW_STRATEGY'
  | 'DATA_ACCESS_STRATEGY'
  | 'REFERENCE_RESOLUTION'
  | 'COMPONENT_SELECTION'
  | 'ROUTE_SELECTION'
  | 'LEARNING_PRIORITY'
  | 'OBSERVABILITY_CONFIGURATION';

// ── Minimal Change Scopes (Section 16) ──
export type AdaptationScope =
  | 'NO_CHANGE'
  | 'CONFIGURATION_LEVEL'
  | 'SELECTION_LEVEL'
  | 'STRATEGY_LEVEL'
  | 'LOCAL_BEHAVIOR'
  | 'SCOPED_BEHAVIOR'
  | 'COMPONENT_LEVEL'
  | 'WORKFLOW_LEVEL'
  | 'LARGER_SCOPE';

export type AdaptationTargetType = 'page' | 'component' | 'collection' | 'workflow' | 'strategy' | 'config' | 'project';

export interface AdaptationTarget {
  targetType: AdaptationTargetType;
  targetId?: string;
  name: string;
  description?: string;
  affectedEntityIds: string[];
  currentConfiguration?: Record<string, any>;
}

export type AdaptationValidity = 'VALID' | 'STALE' | 'EXPIRED' | 'SUPERSEDED' | 'INVALID' | 'UNCERTAIN';

// ── Evidence, Pattern, Opportunity (Sections 11–13) ──
export interface AdaptationEvidence {
  evidenceId: AdaptationEvidenceId;
  source: AdaptationSource;
  sourceIdentifier: string;
  traceId?: ExecutionTraceId;
  experienceId?: ExperienceId;
  summary: string;
  timestamp: string;
  weight: number; // 0.0 to 1.0
  redacted?: boolean;
}

export interface AdaptationPattern {
  patternId: string;
  name: string;
  category: string;
  occurrencesCount: number;
  sampleSize: number;
  isRecurring: boolean;
  evidence: AdaptationEvidence[];
  detectedAt: string;
}

export interface AdaptationChange {
  changeType: 'PARAMETER_TWEAK' | 'STRATEGY_SWAP' | 'RETRY_ADJUSTMENT' | 'COMPONENT_MODIFICATION' | 'WORKFLOW_STEP_UPDATE';
  description: string;
  beforeStateSummary: string;
  afterStateSummary: string;
  operations?: AIOperation[];
}

// ── Risk, Benefit, Confidence, Reversibility (Sections 15–19) ──
export type AdaptationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AdaptationRisk {
  overallRisk: AdaptationRiskLevel;
  mutationRisk: AdaptationRiskLevel;
  dataRisk: AdaptationRiskLevel;
  schemaRisk: AdaptationRiskLevel;
  reversibilityRisk: AdaptationRiskLevel;
  regressionRisk: AdaptationRiskLevel;
  rationale: string;
}

export interface AdaptationBenefit {
  primaryMetric: string;
  estimatedImprovementPercentage: number;
  expectedBenefitSummary: string;
  dimensions: {
    successRateDelta?: number;
    latencyReductionMs?: number;
    mutationReductionCount?: number;
    recoveryReductionCount?: number;
    reliabilityBoostScore?: number;
  };
}

export interface AdaptationConfidence {
  score: number; // 0.0 to 1.0
  grade: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  sampleSize: number;
  evidenceConsistency: number; // 0.0 to 1.0
  rationale: string;
}

export interface AdaptationReversibility {
  isReversible: boolean;
  strategy: 'TRANSACTION_ROLLBACK' | 'INVERSE_OPERATION' | 'CONFIG_RESTORE' | 'NON_REVERSIBLE';
  estimatedRollbackDurationMs: number;
  safeguards: string[];
}

export interface AdaptationConstraint {
  constraintId: string;
  category: 'SECURITY' | 'AUTONOMY' | 'POLICY' | 'SCHEMA' | 'MUTATION_BUDGET' | 'ENVIRONMENT';
  rule: string;
  isHardStop: boolean;
  passed: boolean;
  violationMessage?: string;
}

// ── Candidates (Section 15) ──
export interface AdaptationCandidate {
  candidateId: string;
  strategyType: DecisionStrategyType | string;
  title: string;
  description: string;
  scope: AdaptationScope;
  target: AdaptationTarget;
  proposedChange: AdaptationChange;
  benefit: AdaptationBenefit;
  risk: AdaptationRisk;
  confidence: AdaptationConfidence;
  reversibility: AdaptationReversibility;
  constraints: AdaptationConstraint[];
  operations: AIOperation[];
  score: number; // 0.0 to 1.0 (derived by D8.9 formula)
  rejectionReason?: string;
}

// ── Proposal (Section 11) ──
export interface AdaptationProposal {
  adaptationId: AdaptationId;
  proposalId: AdaptationProposalId;
  projectId: string;
  projectVersion: number;
  schemaVersion: number;
  category: AdaptationCategory;
  observedPattern: AdaptationPattern;
  problemStatement: string;
  target: AdaptationTarget;
  scope: AdaptationScope;
  candidates: AdaptationCandidate[];
  selectedCandidate?: AdaptationCandidate;
  policyConstraints: AdaptationConstraint[];
  expectedBenefit: AdaptationBenefit;
  risk: AdaptationRisk;
  confidence: AdaptationConfidence;
  reversibility: AdaptationReversibility;
  requiredApproval: boolean;
  verificationCriteria: VerificationPostcondition[];
  measurementCriteria: {
    baselineMetricName: string;
    targetThreshold: number;
    acceptableMargin: number;
  };
  rollbackStrategy: string;
  validity: AdaptationValidity;
  createdAt: string;
  expiresAt: string;
  version: number;
  provenance: AdaptationProvenance;
}

// ── Policy, Approval, Transaction (Sections 21–23) ──
export interface AdaptationPolicyResult {
  evaluatedAt: string;
  allowed: boolean;
  effectiveAutonomyLevel: AutonomyLevel;
  violatedRules: string[];
  requiresApproval: boolean;
  policyReason: string;
}

export interface AdaptationApprovalRequirement {
  required: boolean;
  reason?: string;
  riskLevel: AdaptationRiskLevel;
  environment: string;
}

export interface AdaptationApprovalResult {
  status: 'GRANTED' | 'DENIED' | 'NOT_REQUIRED' | 'PENDING';
  approvedBy?: string;
  approvedAt?: string;
  denialReason?: string;
}

export interface AdaptationTransaction {
  transactionId: string;
  startedAt: string;
  committedAt?: string;
  rolledBackAt?: string;
  operationsCount: number;
  success: boolean;
  error?: string;
}

// ── Verification, Measurement, Comparison (Sections 25–26) ──
export interface AdaptationBaseline {
  capturedAt: string;
  metricName: string;
  value: number;
  sampleCount: number;
  sourceTraceIds: string[];
}

export interface AdaptationMeasurement {
  measuredAt: string;
  metricName: string;
  value: number;
  sampleCount: number;
  durationMs?: number;
}

export interface AdaptationComparison {
  baseline: AdaptationBaseline;
  postMeasurement: AdaptationMeasurement;
  absoluteDelta: number;
  percentageDelta: number;
  outcome: 'IMPROVED' | 'UNCHANGED' | 'REGRESSED' | 'INCONCLUSIVE';
  statisticalConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  summary: string;
}

export interface AdaptationRollback {
  rollbackId: string;
  initiatedAt: string;
  completedAt?: string;
  reason: string;
  revertedOperationsCount: number;
  verifiedClean: boolean;
  error?: string;
}

// ── Provenance & Provenance Claim (Section 48) ──
export interface AdaptationProvenanceClaim {
  fact: string;
  source: AdaptationSource;
  identifier: string;
  timestamp: string;
}

export interface AdaptationProvenance {
  creator: 'CONTROLLED_ADAPTATION_ENGINE';
  engineVersion: string;
  generatedAt: string;
  projectId: string;
  claims: AdaptationProvenanceClaim[];
  hash: string;
}

// ── Checkpoint & Session (Sections 37 & 46) ──
export interface AdaptationCheckpoint {
  checkpointId: AdaptationCheckpointId;
  adaptationId: AdaptationId;
  proposalId: AdaptationProposalId;
  sessionId: AdaptationSessionId;
  projectId: string;
  stage: AdaptationStage;
  timestamp: string;
  projectVersionBefore: number;
  projectVersionAfter?: number;
  savedStateSnapshot: Record<string, unknown>;
}

export interface AdaptationSession {
  sessionId: AdaptationSessionId;
  adaptationId: AdaptationId;
  projectId: string;
  currentStage: AdaptationStage;
  status: AdaptationStatus;
  proposal: AdaptationProposal;
  policyResult?: AdaptationPolicyResult;
  approvalResult?: AdaptationApprovalResult;
  transaction?: AdaptationTransaction;
  verificationResult?: D86VerificationResult;
  measurementComparison?: AdaptationComparison;
  rollback?: AdaptationRollback;
  explanation?: Explanation;
  checkpoints: AdaptationCheckpoint[];
  createdAt: string;
  updatedAt: string;
}

// ── Metrics (Section 52) ──
export interface AdaptationMetrics {
  totalAdaptationProposals: number;
  approvedAdaptations: number;
  rejectedAdaptations: number;
  blockedAdaptations: number;
  cancelledAdaptations: number;
  successfulAdaptations: number;
  rolledBackAdaptations: number;
  failedAdaptations: number;
  uncertainAdaptations: number;
  staleAdaptations: number;
  averageAdaptationDurationMs: number;
  candidateCount: number;
  candidateRejectionCount: number;
  approvalRequiredCount: number;
  approvalGrantedCount: number;
  approvalDeniedCount: number;
  policyDeniedCount: number;
  verificationPassCount: number;
  verificationFailCount: number;
  improvementConfirmedCount: number;
  improvementInconclusiveCount: number;
  regressionCount: number;
  rollbackCount: number;
  userCorrectionCount: number;
  mutationCount: number;
  unexpectedMutationCount: number;
  adaptationLoopCount: number;
}

// ── Adaptation Feedback (Section 35) ──
export interface AdaptationFeedback {
  feedbackId: string;
  adaptationId: AdaptationId;
  projectId: string;
  action: 'USER_ACCEPTED' | 'USER_REJECTED' | 'USER_CANCELLED' | 'USER_CORRECTED' | 'SYSTEM_REINFORCED';
  userNotes?: string;
  timestamp?: string;
  recordedAt?: string;
}

export interface AdaptationSummary {
  adaptationId: AdaptationId;
  status: AdaptationStatus;
  headline: string;
  whyProposed: string;
  whatWasChanged: string;
  verificationOutcome: string;
  measurementOutcome: string;
  rollbackOccurred: boolean;
  explanationSummary?: string;
}

export interface AdaptationEvaluation {
  evaluationId: AdaptationEvaluationId;
  proposalId: AdaptationProposalId;
  timestamp: string;
  passed: boolean;
  score: number;
  details: string;
}
