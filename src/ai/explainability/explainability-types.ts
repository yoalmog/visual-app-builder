// D8.11: Explainability Engine Type Definitions
// Strongly-typed contract for observational, evidence-backed, causally-traceable AI explainability.

import { ExecutionTraceId, ExecutionEventId, ExecutionSessionId, ExecutionTrace, ExecutionEvent, ExecutionEventType } from '../observability/observability-types';
import { DecisionCandidate, DecisionSelection, DecisionStrategyType } from '../intelligence/decision-types';
import { VerificationResult as D86VerificationResult, VerificationCheck } from '../intelligence/verification-types';
import { RecoveryResult as D87RecoveryResult, RecoveryStrategy } from '../intelligence/recovery-types';
import { ExperienceRecord } from '../intelligence/learning-types';

// ── Identifiers ──
export type ExplainabilityRequestId = string;
export type ExplanationId = string;
export type ExplanationSessionId = string;
export type ExplanationTraceId = ExecutionTraceId;
export type ExplanationNodeId = string;
export type ExplanationEdgeId = string;
export type EvidenceId = string;
export type ReasonId = string;
export type ConstraintId = string;
export type DecisionId = string;
export type PolicyDecisionId = string;
export type ApprovalDecisionId = string;
export type ExecutionId = string;
export type VerificationId = string;
export type RecoveryId = string;
export type LearningId = string;

// ── State Machine (Section 7) ──
export type ExplanationState =
  | 'IDLE'
  | 'REQUEST_RECEIVED'
  | 'TRACE_LOADING'
  | 'TRACE_VALIDATED'
  | 'EVIDENCE_COLLECTING'
  | 'EVIDENCE_VALIDATED'
  | 'CAUSAL_RECONSTRUCTION'
  | 'DECISION_RECONSTRUCTION'
  | 'POLICY_RECONSTRUCTION'
  | 'EXECUTION_RECONSTRUCTION'
  | 'RESULT_RECONSTRUCTION'
  | 'UNCERTAINTY_ANALYSIS'
  | 'REDACTION'
  | 'EXPLANATION_ASSEMBLY'
  | 'EXPLANATION_VALIDATION'
  | 'PERSISTING'
  | 'COMPLETED'
  // Terminal states
  | 'BLOCKED'
  | 'UNCERTAIN'
  | 'FAILED'
  | 'CANCELLED';

export type ExplanationStatus = 'COMPLETED' | 'BLOCKED' | 'UNCERTAIN' | 'FAILED' | 'CANCELLED';

// ── Evidence Taxonomy (Section 8 & 18) ──
export type EvidenceStatementType =
  | 'FACT'
  | 'INFERENCE'
  | 'CONSTRAINT'
  | 'POLICY'
  | 'DECISION'
  | 'OUTCOME'
  | 'UNCERTAINTY';

export type EvidenceType =
  | 'TRACE_EVENT'
  | 'DECISION_RECORD'
  | 'POLICY_EVALUATION'
  | 'APPROVAL_RECORD'
  | 'TRANSACTION_RECORD'
  | 'OPERATION_LOG'
  | 'VERIFICATION_CHECK'
  | 'RECOVERY_DIAGNOSIS'
  | 'EXPERIENCE_RECORD'
  | 'SYSTEM_STATE';

export type EvidenceSource =
  | 'EXECUTION_TRACE'
  | 'DECISION_OPTIMIZER'
  | 'POLICY_ENGINE'
  | 'APPROVAL_GATE'
  | 'TRANSACTION_MANAGER'
  | 'VERIFICATION_ENGINE'
  | 'RECOVERY_ENGINE'
  | 'LEARNING_STORE'
  | 'USER_INTERACTION';

export type EvidenceStrength = 'CONCLUSIVE' | 'STRONG' | 'CORROBORATIVE' | 'WEAK' | 'INSUFFICIENT';

export type EvidenceFreshness = 'REALTIME' | 'RECENT' | 'HISTORICAL' | 'STALE' | 'UNKNOWN';

export interface EvidenceReference {
  evidenceId: EvidenceId;
  type: EvidenceType;
  source: EvidenceSource;
  sourceIdentifier: string;
  projectId: string;
  traceId?: ExplanationTraceId;
  eventId?: ExecutionEventId;
  summary: string;
  strength: EvidenceStrength;
  freshness: EvidenceFreshness;
  dataSnippet?: Record<string, unknown>;
  timestamp: string;
  redacted?: boolean;
}

export interface EvidenceBundle {
  bundleId: string;
  projectId: string;
  traceId: ExplanationTraceId;
  references: EvidenceReference[];
  totalCollected: number;
  totalValid: number;
  totalRedacted: number;
  collectedAt: string;
}

// ── Uncertainty Representation (Section 17) ──
export type UncertaintyCategory =
  | 'MISSING_EVIDENCE'
  | 'CONFLICTING_EVIDENCE'
  | 'PARTIAL_TRACE'
  | 'TRUNCATED_TRACE'
  | 'UNKNOWN_CAUSALITY'
  | 'STALE_EVIDENCE'
  | 'AMBIGUOUS_STATE'
  | 'UNVERIFIED_RESULT'
  | 'REDACTED_EVIDENCE';

export interface ExplanationUncertainty {
  hasUncertainty: boolean;
  categories: UncertaintyCategory[];
  knownFacts: string[];
  unknownFactors: string[];
  reasonsWhyUnknown: string[];
  impactOnReliability: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ── Confidence (Section 18) ──
export type ConfidenceGrade = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface ExplanationConfidence {
  level: ConfidenceGrade;
  evidenceCompleteness: ConfidenceGrade;
  causalConfidence: ConfidenceGrade;
  decisionConfidence: ConfidenceGrade;
  resultConfidence: ConfidenceGrade;
  score?: number; // 0.0 to 1.0 if strictly derived from structured data
  rationale: string;
}

// ── Causal Graph (Section 9) ──
export type CausalNodeType =
  | 'USER_REQUEST'
  | 'CONTEXT'
  | 'INTENT'
  | 'PLAN'
  | 'CANDIDATE_STRATEGIES'
  | 'CONSTRAINT_FILTERING'
  | 'RISK_ANALYSIS'
  | 'POLICY_CHECK'
  | 'APPROVAL_GATE'
  | 'SELECTED_STRATEGY'
  | 'TRANSACTION'
  | 'OPERATION'
  | 'VERIFICATION'
  | 'RECOVERY'
  | 'LEARNING'
  | 'FINAL_RESULT';

export type CausalCauseType =
  | 'INITIATED_BY'
  | 'DERIVED_FROM'
  | 'FILTERED_BY'
  | 'SCORED_BY'
  | 'GOVERNED_BY'
  | 'APPROVED_BY'
  | 'EXECUTED_VIA'
  | 'VERIFIED_BY'
  | 'TRIGGERED_BY'
  | 'LEARNED_FROM'
  | 'UNCERTAIN_LINK';

export interface ExplanationNode {
  nodeId: ExplanationNodeId;
  type: CausalNodeType;
  label: string;
  summary: string;
  statementType: EvidenceStatementType;
  timestamp?: string;
  sequenceNumber?: number;
  evidenceIds: EvidenceId[];
  metadata: Record<string, unknown>;
  uncertainty?: string;
}

export interface ExplanationEdge {
  edgeId: ExplanationEdgeId;
  sourceNodeId: ExplanationNodeId;
  targetNodeId: ExplanationNodeId;
  causeType: CausalCauseType;
  description: string;
  evidenceIds: EvidenceId[];
  confidence: ConfidenceGrade;
  order: number;
  timestamp?: string;
}

export interface CausalChain {
  nodes: ExplanationNode[];
  edges: ExplanationEdge[];
  rootNodeId: ExplanationNodeId;
  terminalNodeId: ExplanationNodeId;
  isComplete: boolean;
  brokenLinks: string[];
}

// ── Domain-Specific Explanation Components (Sections 10–16) ──
export type ReasonCategory =
  | 'USER_GOAL'
  | 'CONSTRAINT_SATISFACTION'
  | 'RISK_MINIMIZATION'
  | 'POLICY_COMPLIANCE'
  | 'APPROVAL_REQUIREMENT'
  | 'VERIFICATION_OUTCOME'
  | 'RECOVERY_HEALING'
  | 'HISTORICAL_OPTIMIZATION';

export interface Reason {
  reasonId: ReasonId;
  category: ReasonCategory;
  statement: string;
  statementType: EvidenceStatementType;
  supportingEvidenceIds: EvidenceId[];
}

export interface ConstraintExplanation {
  constraintId: ConstraintId;
  category: string;
  rule: string;
  isHardStop: boolean;
  satisfied: boolean;
  evaluationDetail: string;
  evidenceId: EvidenceId;
}

export interface RiskFactor {
  factor: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigatedBy?: string;
  evidenceId: EvidenceId;
}

export interface RiskExplanation {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
  summary: string;
  evidenceId: EvidenceId;
}

export interface DecisionFactor {
  name: string;
  weight: number;
  score: number;
  rationale: string;
}

export interface DecisionAlternative {
  candidateId: string;
  strategyType: DecisionStrategyType;
  title: string;
  score?: number;
  risk: string;
}

export interface RejectedAlternative extends DecisionAlternative {
  rejectionReason: string;
  violatedConstraints: string[];
  evidenceId: EvidenceId;
}

export interface SelectedAlternative extends DecisionAlternative {
  selectionRationale: string;
  evidenceId: EvidenceId;
}

export interface StrategyExplanation {
  selectedStrategy: DecisionStrategyType;
  strategyRationale: string;
  whyPreferredOverAlternatives: string;
  evidenceId: EvidenceId;
}

export interface DecisionExplanation {
  decisionId: DecisionId;
  topic: string;
  candidatesCount: number;
  selectedAlternative: SelectedAlternative;
  rejectedAlternatives: RejectedAlternative[];
  strategyExplanation: StrategyExplanation;
  constraintsApplied: ConstraintExplanation[];
  riskExplanation: RiskExplanation;
  scoringBreakdown: DecisionFactor[];
  deterministicScore?: number;
  priorExperienceInfluenced: boolean;
  evidenceIds: EvidenceId[];
  isDeterministic: boolean;
}

export interface PolicyExplanation {
  policyChecked: boolean;
  policyCategory: string;
  policyAllowed: boolean;
  policyDenied: boolean;
  approvalRequired: boolean;
  autonomyLimitsAffected: boolean;
  operationBlocked: boolean;
  summary: string;
  violatedRules: string[];
  effectiveAutonomyLevel: number;
  evidenceIds: EvidenceId[];
}

export interface ApprovalExplanation {
  approvalRequired: boolean;
  whyRequired?: string;
  approvalStatus: 'GRANTED' | 'DENIED' | 'NOT_REQUIRED' | 'PENDING';
  approvalScope?: string;
  approvedBy?: string;
  denialReason?: string;
  coveredOperation?: string;
  summary: string;
  evidenceIds: EvidenceId[];
}

export interface ExecutionExplanation {
  transactionId?: string;
  operationsExecutedCount: number;
  operationTypes: string[];
  executionStatus: string;
  durationMs?: number;
  retriesCount: number;
  rollbackOccurred: boolean;
  rollbackReason?: string;
  checkpointId?: string;
  summary: string;
  evidenceIds: EvidenceId[];
}

export interface VerificationExplanation {
  verificationConducted: boolean;
  verificationStatus: 'PASS' | 'FAIL' | 'UNCERTAIN' | 'SKIPPED';
  dimensionsChecked: string[];
  passedChecksCount: number;
  failedChecksCount: number;
  failedPostconditions: string[];
  structuralDifferences: string[];
  invariantsPreserved: boolean;
  summary: string;
  executionSuccessVsVerifiedCorrectness: string;
  evidenceIds: EvidenceId[];
}

export interface RecoveryExplanation {
  recoveryInitiated: boolean;
  triggeringFailure?: string;
  failureClassification?: string;
  diagnosisSummary?: string;
  recoveryStrategy?: string;
  policyResult?: string;
  approvalResult?: string;
  recoveryStepsExecuted: string[];
  recoveryResultStatus?: 'SUCCEEDED' | 'FAILED' | 'NOT_TRIGGERED';
  finalVerificationStatus?: string;
  summary: string;
  evidenceIds: EvidenceId[];
}

export interface LearningExplanation {
  priorExperienceUsed: boolean;
  experienceCategories: string[];
  relevantExperienceCount: number;
  howExperienceInfluencedRanking: string;
  experienceIsEvidenceNotAuthority: true;
  summary: string;
  evidenceIds: EvidenceId[];
}

export interface ResultExplanation {
  finalOutcome: string;
  whatActuallyHappened: string;
  whatUserRequested: string;
  differenceSummary?: string;
  unresolvedIssues: string[];
  evidenceIds: EvidenceId[];
}

// ── Provenance & Redaction (Sections 19 & 20) ──
export interface ProvenanceClaim {
  claim: string;
  source: EvidenceSource;
  sourceType: EvidenceType;
  sourceIdentifier: string;
  timestamp: string;
  traceId: ExplanationTraceId;
  projectId: string;
  causalRelation: string;
  evidenceStrength: EvidenceStrength;
}

export interface Provenance {
  creator: 'EXPLAINABILITY_ENGINE';
  engineVersion: string;
  generatedAt: string;
  traceId: ExplanationTraceId;
  projectId: string;
  claims: ProvenanceClaim[];
  hash: string;
}

export interface RedactionResult {
  secretsRedactedCount: number;
  sensitiveKeysRedactedCount: number;
  sanitizedTextSnippetsCount: number;
  redactedLabels: string[];
  summary: string;
}

// ── Explanation Request & Main Model ──
export type ExplanationScope = 'FULL' | 'DECISION_ONLY' | 'POLICY_ONLY' | 'EXECUTION_ONLY' | 'VERIFICATION_ONLY' | 'RECOVERY_ONLY';

export type ExplanationAudience = 'DEVELOPER' | 'ADMIN' | 'END_USER' | 'AUDITOR';

export interface ExplanationRequest {
  requestId: ExplainabilityRequestId;
  projectId: string;
  traceId: ExplanationTraceId;
  sessionId?: ExplanationSessionId;
  scope?: ExplanationScope;
  audience?: ExplanationAudience;
  userPrompt?: string;
  includeCausalChain?: boolean;
  requestedAt: string;
}

export interface ExplanationSummary {
  headline: string;
  whyThisHappened: string;
  whatWasExecuted: string;
  whatWasVerified: string;
  keyConstraints: string[];
  riskAndPolicySummary: string;
  uncertaintiesSummary: string;
}

export interface Explanation {
  explanationId: ExplanationId;
  requestId: ExplainabilityRequestId;
  projectId: string;
  traceId: ExplanationTraceId;
  sessionId: ExplanationSessionId;
  state: ExplanationState;
  status: ExplanationStatus;
  summary: ExplanationSummary;
  causalChain?: CausalChain;
  decisionExplanation?: DecisionExplanation;
  policyExplanation?: PolicyExplanation;
  approvalExplanation?: ApprovalExplanation;
  executionExplanation?: ExecutionExplanation;
  verificationExplanation?: VerificationExplanation;
  recoveryExplanation?: RecoveryExplanation;
  learningExplanation?: LearningExplanation;
  resultExplanation: ResultExplanation;
  evidenceBundle: EvidenceBundle;
  uncertainty: ExplanationUncertainty;
  confidence: ExplanationConfidence;
  provenance: Provenance;
  redaction: RedactionResult;
  createdAt: string;
  completedAt?: string;
}

// ── Checkpoint & Session (Sections 27 & 28) ──
export interface ExplanationCheckpoint {
  checkpointId: string;
  explanationId: ExplanationId;
  requestId: ExplainabilityRequestId;
  projectId: string;
  traceId: ExplanationTraceId;
  sessionId: ExplanationSessionId;
  state: ExplanationState;
  evidenceCollectedCount: number;
  nodesCount: number;
  edgesCount: number;
  timestamp: string;
  savedStateSnapshot: Partial<Explanation>;
}

export interface ExplanationSession {
  sessionId: ExplanationSessionId;
  projectId: string;
  traceId: ExplanationTraceId;
  currentState: ExplanationState;
  checkpoints: ExplanationCheckpoint[];
  latestExplanation?: Explanation;
  createdAt: string;
  updatedAt: string;
}

export interface ExplanationMetrics {
  totalDurationMs: number;
  traceLoadingMs: number;
  evidenceCollectionMs: number;
  causalReconstructionMs: number;
  redactionMs: number;
  totalEvidenceItems: number;
  uncertaintyItems: number;
  causalNodesCount: number;
  causalEdgesCount: number;
}

// ── Query Models ──
export interface ExplanationQuery {
  projectId: string;
  traceId?: ExplanationTraceId;
  explanationId?: ExplanationId;
  status?: ExplanationStatus;
  hasUncertainty?: boolean;
  minConfidence?: ConfidenceGrade;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

export interface ExplanationQueryResult {
  explanations: Explanation[];
  totalCount: number;
  hasMore: boolean;
}

// Auxiliary convenience types
export type Constraint = ConstraintExplanation;
export type ExplanationPolicyResult = PolicyExplanation;
export type ExplanationApprovalResult = ApprovalExplanation;
export type ExplanationExecutionResult = ExecutionExplanation;
export type ExplanationVerificationResult = VerificationExplanation;
export type ExplanationRecoveryResult = RecoveryExplanation;
export type ExplanationLearningResult = LearningExplanation;

