// D8.8: Autonomous Learning & Experience-Based Improvement Types
// Strongly-typed models for experience storage, pattern detection, recommendations, and learning lifecycle.

import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { AutonomyLevel, AutonomyPolicyDecision } from './types';
import { VerificationResult, VerificationCheck } from './verification-types';
import { RecoveryStrategy, RecoveryResult } from './recovery-types';

export type ExperienceId = string;
export type ExperiencePatternId = string;
export type LearningObservationId = string;
export type RecommendationId = string;

export type ExperienceSource = 
  | 'execution'
  | 'verification'
  | 'recovery'
  | 'rollback'
  | 'policy'
  | 'approval'
  | 'user_feedback'
  | 'manual_override'
  | 'system';

export type ExperienceCategory =
  | 'PLAN_SUCCESS'
  | 'PLAN_FAILURE'
  | 'EXECUTION_SUCCESS'
  | 'EXECUTION_FAILURE'
  | 'VERIFICATION_SUCCESS'
  | 'VERIFICATION_FAILURE'
  | 'RECOVERY_SUCCESS'
  | 'RECOVERY_FAILURE'
  | 'ROLLBACK_SUCCESS'
  | 'ROLLBACK_FAILURE'
  | 'BLOCKED_OPERATION'
  | 'UNCERTAIN_OPERATION'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'POLICY_ALLOWED'
  | 'POLICY_DENIED'
  | 'STALE_PLAN'
  | 'UNEXPECTED_MUTATION'
  | 'RUNTIME_FAILURE'
  | 'SCHEMA_FAILURE'
  | 'REFERENCE_FAILURE'
  | 'COMPONENT_FAILURE'
  | 'ROUTE_FAILURE'
  | 'WORKFLOW_FAILURE'
  | 'DATA_FAILURE'
  | 'PROVIDER_FAILURE'
  | 'TIMEOUT'
  | 'PERFORMANCE'
  | 'USER_CORRECTION'
  | 'MANUAL_OVERRIDE'
  | 'UNKNOWN';

export type ExperienceOutcome =
  | 'SUCCESS'
  | 'FAILURE'
  | 'PARTIAL'
  | 'BLOCKED'
  | 'UNCERTAIN'
  | 'CANCELLED'
  | 'ROLLED_BACK'
  | 'SUPERSEDED'
  | 'STALE';

export type ExperienceValidity =
  | 'VALID'
  | 'STALE'
  | 'INVALID'
  | 'SUPERSEDED'
  | 'QUARANTINED';

export type RecommendationType =
  | 'RECOMMEND_OPERATION'
  | 'RECOMMEND_OPERATION_ORDER'
  | 'RECOMMEND_COMPONENT'
  | 'RECOMMEND_LAYOUT'
  | 'RECOMMEND_WORKFLOW'
  | 'RECOMMEND_REFERENCE_REPAIR'
  | 'RECOMMEND_RECOVERY_STRATEGY'
  | 'RECOMMEND_VERIFICATION'
  | 'RECOMMEND_RETRY'
  | 'RECOMMEND_NO_ACTION'
  | 'RECOMMEND_HUMAN_APPROVAL'
  | 'RECOMMEND_BLOCK'
  | 'RECOMMEND_INVESTIGATION';

export type RecommendationRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type LearningState =
  | 'idle'
  | 'observing'
  | 'normalizing'
  | 'sanitizing'
  | 'extracting'
  | 'analyzing'
  | 'matching'
  | 'recommending'
  | 'policy_check'
  | 'awaiting_approval'
  | 'applying'
  | 'verifying'
  | 'feedback'
  | 'checkpointing'
  | 'completed'
  | 'blocked'
  | 'uncertain'
  | 'failed';

export interface ExperienceProvenance {
  source: ExperienceSource;
  entityId?: string;
  projectId: string;
  projectVersion: number;
  schemaVersion: number;
  environment: string;
  actor: string;
  timestamp: string;
  sanitized: boolean;
  sanitizationNotes?: string[];
}

export interface ExperienceFeatures {
  version: string;
  operationTypes: string[];
  componentTypes: string[];
  pageTypes?: string[];
  workflowTypes?: string[];
  failureCategory?: string;
  failureSeverity?: string;
  recoveryStrategy?: string;
  mutationCount: number;
  operationCount: number;
  riskLevel: RecommendationRisk;
  approvalRequired: boolean;
  executionDurationMs?: number;
  verificationDurationMs?: number;
  recoveryDurationMs?: number;
  rollbackOccurred: boolean;
  unexpectedMutationDetected?: boolean;
  repetitionFrequency?: number;
  tags: string[];
}

export interface ExperienceContext {
  projectId: string;
  projectVersion: number;
  schemaVersion: number;
  environment: string;
  autonomyLevel?: AutonomyLevel;
  goalType?: string;
  targetEntityId?: string;
  targetEntityType?: string;
  promptSnippet?: string;
}

export interface ExperienceRecord {
  id: ExperienceId;
  projectId: string;
  category: ExperienceCategory;
  outcome: ExperienceOutcome;
  validity: ExperienceValidity;
  description: string;
  context: ExperienceContext;
  features: ExperienceFeatures;
  provenance: ExperienceProvenance;
  evidence: string[];
  associatedOperations?: AIOperation[];
  verificationSummary?: {
    passed: boolean;
    checksTotal: number;
    checksPassed: number;
  };
  recoveryDetails?: {
    strategy: RecoveryStrategy;
    attempt: number;
    success: boolean;
  };
  timesMatched: number;
  successScore: number; // 0.0 to 1.0 based on positive/negative reinforcement
  staleReason?: string;
  invalidationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperiencePattern {
  id: ExperiencePatternId;
  title: string;
  description: string;
  category: 'REPEATED_FAILURE' | 'RECOVERY_SUCCESS' | 'RECOVERY_FAILURE' | 'ROLLBACK_CAUSE' | 'STRATEGY_EFFECTIVENESS' | 'WORKFLOW_DEFECT';
  confidence: number;
  occurrenceCount: number;
  supportingExperienceIds: ExperienceId[];
  associatedOperations: string[];
  associatedComponents: string[];
  associatedFailureCategories: string[];
  recommendedAction?: string;
  recommendedStrategy?: RecoveryStrategy;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface ExperienceMatch {
  experience: ExperienceRecord;
  relevanceScore: number; // 0.0 to 1.0
  matchReasons: string[];
  isContradictory?: boolean;
}

export interface ExperienceQuery {
  projectId?: string;
  category?: ExperienceCategory;
  categories?: ExperienceCategory[];
  outcome?: ExperienceOutcome;
  validity?: ExperienceValidity;
  operationType?: string;
  componentType?: string;
  recoveryStrategy?: RecoveryStrategy;
  minSuccessScore?: number;
  limit?: number;
  allowCrossProject?: boolean;
}

export interface ExperienceQueryResult {
  experiences: ExperienceRecord[];
  totalCount: number;
  matchedCount: number;
  query: ExperienceQuery;
  timestamp: string;
}

export interface LearningObservation {
  id: LearningObservationId;
  source: ExperienceSource;
  projectId: string;
  category: ExperienceCategory;
  rawPayload: any;
  outcome: ExperienceOutcome;
  timestamp: string;
}

export interface RecommendationConfidence {
  score: number; // 0.0 to 1.0
  evidenceQuantity: number;
  evidenceQuality: number;
  recencyWeight: number;
  contradictionPenalty: number;
  rationale: string;
}

export interface RecommendationEvidence {
  summary: string;
  supportingExperienceIds: ExperienceId[];
  contradictingExperienceIds: ExperienceId[];
  patternIds: ExperiencePatternId[];
  metricsContext?: {
    successRate: number;
    sampleSize: number;
  };
}

export interface RecommendationDecision {
  accepted: boolean;
  decisionBy: 'system' | 'policy' | 'user';
  reason: string;
  timestamp: string;
}

export interface LearningRecommendation {
  recommendationId: RecommendationId;
  sessionId: string;
  projectId: string;
  type: RecommendationType;
  title: string;
  description: string;
  target?: {
    entityId?: string;
    entityType?: string;
    operationType?: string;
  };
  suggestedOperations?: AIOperation[];
  suggestedStrategy?: RecoveryStrategy;
  confidence: RecommendationConfidence;
  risk: RecommendationRisk;
  expectedBenefit: string;
  expectedCost?: string;
  evidence: RecommendationEvidence;
  validity: ExperienceValidity;
  policyCompatibility: {
    evaluated: boolean;
    allowed: boolean;
    requiredLevel?: AutonomyLevel;
    approvalRequired: boolean;
    policyReason?: string;
  };
  decision?: RecommendationDecision;
  createdAt: string;
}

export interface RecommendationOutcome {
  recommendationId: RecommendationId;
  success: boolean;
  applied: boolean;
  verificationPassed?: boolean;
  error?: string;
  feedbackNotes?: string;
  timestamp: string;
}

export interface LearningFeedback {
  recommendationId: RecommendationId;
  userAccepted?: boolean;
  executionSucceeded?: boolean;
  verificationSucceeded?: boolean;
  notes?: string;
  recordedAt: string;
}

export interface LearningCheckpoint {
  checkpointId: string;
  sessionId: string;
  state: LearningState;
  projectId: string;
  projectVersion: number;
  experienceCount: number;
  recommendationsCount: number;
  timestamp: string;
}

export interface LearningTraceEvent {
  id: string;
  state: LearningState;
  event: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

export interface LearningTrace {
  traceId: string;
  sessionId: string;
  projectId: string;
  events: LearningTraceEvent[];
  startedAt: string;
  completedAt?: string;
}

export interface LearningMetrics {
  totalExperiences: number;
  validExperiences: number;
  staleExperiences: number;
  invalidExperiences: number;
  patternsDetected: number;
  recommendationsGenerated: number;
  recommendationsAccepted: number;
  recommendationsRejected: number;
  recommendationsBlocked: number;
  recommendationsExpired: number;
  recommendationSuccessCount: number;
  recommendationFailureCount: number;
  verificationSuccessCount: number;
  verificationFailureCount: number;
  recoveryRecommendationCount: number;
  successfulRecoveryRecommendations: number;
  failedRecoveryRecommendations: number;
  rollbackCount: number;
  approvalRequiredCount: number;
  approvalDeniedCount: number;
  policyDeniedCount: number;
  crossProjectRejectionCount: number;
  securityRejectionCount: number;
  averageConfidence: number;
  averageRisk: RecommendationRisk;
  learningSessionCount: number;
  learningSessionFailureCount: number;
  learningSessionBlockedCount: number;
}

export interface LearningSummary {
  sessionId: string;
  projectId: string;
  state: LearningState;
  experiencesObserved: number;
  patternsAnalyzed: number;
  recommendationsCount: number;
  highestConfidence: number;
  highestRisk: RecommendationRisk;
  durationMs: number;
  timestamp: string;
}

export interface LearningSession {
  sessionId: string;
  projectId: string;
  projectVersion: number;
  state: LearningState;
  observations: LearningObservation[];
  recommendations: LearningRecommendation[];
  checkpoints: LearningCheckpoint[];
  trace: LearningTrace;
  metrics: Partial<LearningMetrics>;
  error?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ExperienceRetentionPolicy {
  maxExperiencesPerProject: number;
  maxStaleDays: number;
  quarantineFailedAttemptsLimit: number;
  purgeInvalidAfterDays: number;
}
