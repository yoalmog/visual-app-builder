// D8.9: Controlled Decision Optimization Type Definitions
// Strongly-typed models for candidate generation, multi-factor scoring, constraint filtering,
// policy re-checking, approval gating, selection, verification, provenance, and feedback.

import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { AutonomyLevel } from './types';
import { ExperienceId, ExperiencePatternId, RecommendationRisk } from './learning-types';

export type DecisionContextId = string;
export type DecisionCandidateId = string;
export type DecisionStrategyId = string;
export type DecisionConstraintId = string;
export type DecisionEvidenceId = string;
export type DecisionSelectionId = string;
export type DecisionOutcomeId = string;
export type DecisionSessionId = string;

// Decision State Machine States
export type DecisionState =
  | 'IDLE'
  | 'CONTEXT_BUILDING'
  | 'CONTEXT_VALIDATED'
  | 'CANDIDATES_GENERATING'
  | 'CANDIDATES_VALIDATED'
  | 'CONSTRAINT_FILTERING'
  | 'RISK_ANALYSIS'
  | 'SCORING'
  | 'COMPARING'
  | 'POLICY_CHECK'
  | 'APPROVAL_CHECK'
  | 'SELECTED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  // Terminal alternative states
  | 'BLOCKED'
  | 'UNCERTAIN'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ROLLED_BACK';

export type DecisionStrategyType =
  | 'MINIMAL_CHANGE'
  | 'CONSERVATIVE'
  | 'RECOVERY'
  | 'RETRY'
  | 'ALTERNATIVE_SEQUENCE'
  | 'LOWER_RISK_EQUIVALENT'
  | 'USER_CONFIRMATION'
  | 'NO_OP_STOP';

export type DecisionRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DecisionOutcomeStatus =
  | 'VERIFIED_SUCCESSFUL'
  | 'VERIFIED_SUCCESSFUL_LOW_COST'
  | 'VERIFIED_SUCCESSFUL_HIGH_COST'
  | 'VERIFIED_SUCCESSFUL_WITH_RECOVERY'
  | 'VERIFIED_PARTIAL'
  | 'FAILED'
  | 'BLOCKED'
  | 'UNCERTAIN'
  | 'ROLLED_BACK'
  | 'INSUFFICIENT_EVIDENCE';

export type DecisionValidity = 'VALID' | 'STALE' | 'INVALID' | 'QUARANTINED';

export interface DecisionConfidence {
  score: number; // 0.0 to 1.0
  evidenceQuantity: number;
  evidenceQuality: number;
  recencyWeight: number;
  contradictionPenalty: number;
  rationale: string;
}

export interface DecisionEvidence {
  evidenceId: DecisionEvidenceId;
  description: string;
  source: 'experience' | 'pattern' | 'verification' | 'recovery' | 'constraint';
  supportingExperienceIds: ExperienceId[];
  contradictingExperienceIds: ExperienceId[];
  patternIds: ExperiencePatternId[];
  confidenceContribution: number; // -1.0 to 1.0
  timestamp: string;
}

export interface DecisionConstraint {
  id: DecisionConstraintId;
  category:
    | 'SECURITY'
    | 'PROJECT_ISOLATION'
    | 'SUPPORTED_OPERATIONS'
    | 'SCHEMA_CONSTRAINTS'
    | 'PERMISSIONS'
    | 'AUTONOMY_CEILING'
    | 'APPROVAL_REQUIREMENT'
    | 'TRANSACTION_BOUNDARY'
    | 'VERIFICATION_REQUIREMENT'
    | 'ENVIRONMENT_RESTRICTION';
  rule: string;
  isHardStop: boolean;
  active: boolean;
  metadata?: Record<string, unknown>;
}

export interface DecisionScoreBreakdown {
  expectedSuccess: number; // 0.0 to 1.0
  verificationConfidence: number; // 0.0 to 1.0
  historicalEffectiveness: number; // 0.0 to 1.0
  riskPenalty: number; // 0.0 to 1.0 (subtracted)
  mutationScopeCost: number; // 0.0 to 1.0 (subtracted)
  complexityPenalty: number; // 0.0 to 1.0 (subtracted)
  executionCost: number; // 0.0 to 1.0 (subtracted)
  reversibilityBonus: number; // 0.0 to 0.2 (added)
  policyCompatibilityScore: number; // 0.0 to 1.0
  schemaCompatibilityScore: number; // 0.0 to 1.0
}

export interface DecisionScore {
  totalScore: number; // 0.0 to 1.0 normalized
  breakdown: DecisionScoreBreakdown;
  rationale: string;
}

export interface DecisionCandidate {
  candidateId: DecisionCandidateId;
  strategyType: DecisionStrategyType;
  title: string;
  description: string;
  operations: AIOperation[];
  targetScope: {
    pages?: string[];
    components?: string[];
    collections?: string[];
    workflows?: string[];
  };
  risk: DecisionRisk;
  confidence: DecisionConfidence;
  score?: DecisionScore;
  reversibility: boolean;
  estimatedDurationMs: number;
  expectedBenefit: string;
  expectedCost: string;
  constraintsEvaluated: boolean;
  passedConstraints: boolean;
  rejectionReason?: string;
  validity: DecisionValidity;
  evidence: DecisionEvidence[];
}

export interface DecisionContext {
  contextId: DecisionContextId;
  projectId: string;
  projectVersion: number;
  schemaVersion: number;
  userIntent: string;
  selectedScope?: {
    pageId?: string;
    componentId?: string;
  };
  environment: 'development' | 'staging' | 'production';
  userAutonomyLevel: AutonomyLevel;
  userRoles: string[];
  recentFailureCategory?: string;
  previousExecutionState?: string;
  previousVerificationState?: string;
  previousRecoveryStrategy?: string;
  constraints: DecisionConstraint[];
  relevantExperienceIds: ExperienceId[];
  relevantPatternIds: ExperiencePatternId[];
  timestamp: string;
}

export interface DecisionPolicyResult {
  evaluated: boolean;
  allowed: boolean;
  effectiveLevel: AutonomyLevel;
  violatedRules: string[];
  policyReason?: string;
}

export interface DecisionApprovalRequirement {
  required: boolean;
  reason?: string;
  riskLevel: DecisionRisk;
  environment: string;
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface DecisionComparison {
  candidateAId: DecisionCandidateId;
  candidateBId: DecisionCandidateId;
  scoreDifference: number; // score(A) - score(B)
  riskDifference: string;
  preferredCandidateId: DecisionCandidateId;
  tradeOffSummary: string;
}

export interface DecisionSelection {
  selectionId: DecisionSelectionId;
  sessionId: DecisionSessionId;
  projectId: string;
  selectedCandidateId: DecisionCandidateId;
  strategyType: DecisionStrategyType;
  candidateTitle: string;
  rationale: string;
  confidence: DecisionConfidence;
  risk: DecisionRisk;
  policyResult: DecisionPolicyResult;
  approvalRequirement: DecisionApprovalRequirement;
  alternativesConsideredCount: number;
  status: 'SELECTED' | 'BLOCKED' | 'UNCERTAIN' | 'NO_ACTION';
  selectedAt: string;
}

export interface DecisionOutcome {
  outcomeId: DecisionOutcomeId;
  selectionId: DecisionSelectionId;
  status: DecisionOutcomeStatus;
  executionSuccess: boolean;
  verificationPassed: boolean;
  recoveryInvoked: boolean;
  durationMs: number;
  error?: string;
  updatedProjectVersion?: number;
  timestamp: string;
}

export interface DecisionTraceEvent {
  id: string;
  state: DecisionState;
  event: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface DecisionTrace {
  traceId: string;
  sessionId: DecisionSessionId;
  projectId: string;
  events: DecisionTraceEvent[];
  startedAt: string;
  completedAt?: string;
}

export interface DecisionMetrics {
  totalCandidatesGenerated: number;
  candidatesFiltered: number;
  candidatesScored: number;
  selectionsMade: number;
  approvalsRequired: number;
  approvalsGranted: number;
  policiesDenied: number;
  verificationsPassed: number;
  verificationsFailed: number;
  recoveriesInvoked: number;
  userCorrectionsCount: number;
  averageConfidence: number;
  averageScore: number;
}

export interface DecisionCheckpoint {
  checkpointId: string;
  sessionId: DecisionSessionId;
  state: DecisionState;
  projectId: string;
  projectVersion: number;
  candidatesCount: number;
  selectedCandidateId?: DecisionCandidateId;
  timestamp: string;
}

export interface DecisionFeedback {
  feedbackId: string;
  selectionId: DecisionSelectionId;
  projectId: string;
  acceptedByUser: boolean;
  userCorrection?: {
    alternativeStrategyId?: string;
    notes?: string;
  };
  outcome: DecisionOutcome;
  recordedAt: string;
}

export interface DecisionOptimizationSummary {
  sessionId: DecisionSessionId;
  projectId: string;
  chosenStrategy: DecisionStrategyType;
  risk: DecisionRisk;
  confidenceScore: number;
  verdict: 'OPTIMAL_VERIFIED' | 'SUBOPTIMAL_VERIFIED' | 'RECOVERED' | 'FAILED' | 'BLOCKED';
  efficiencyGainDescription: string;
}

export interface DecisionProvenance {
  decisionId: DecisionSelectionId;
  sessionId: DecisionSessionId;
  projectId: string;
  projectVersion: number;
  actor: string;
  timestamp: string;
  experienceIds: string[];
  patternIds: string[];
  policyEvaluated: boolean;
  approvalGranted: boolean;
  verificationId?: string;
}

export interface DecisionSession {
  sessionId: DecisionSessionId;
  projectId: string;
  projectVersion: number;
  state: DecisionState;
  context: DecisionContext;
  candidates: DecisionCandidate[];
  filteredCandidates: DecisionCandidate[];
  comparisons: DecisionComparison[];
  selection?: DecisionSelection;
  outcome?: DecisionOutcome;
  feedback?: DecisionFeedback;
  trace: DecisionTrace;
  checkpoints: DecisionCheckpoint[];
  metrics: DecisionMetrics;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
