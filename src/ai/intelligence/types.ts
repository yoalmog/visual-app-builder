// Phase 8: Intelligent Autonomous Development Platform Type Definitions
import { AIOperation } from '../operations/AIOperation';
import { AIRisk } from '../../builder/schema/ai';
import { AppProject } from '../../builder/schema/project';
import { Role } from '../../builder/schema/rbac';

export type GoalType =
  | 'BUILD_APPLICATION'
  | 'CREATE_FEATURE'
  | 'REFINE_UI'
  | 'DEBUG_ERROR'
  | 'OPTIMIZE_PERFORMANCE'
  | 'SECURITY_AUDIT'
  | 'REFACTOR'
  | 'FIX_BUG'
  | 'EXPLAIN'
  | 'INSPECT'
  | 'CONFIGURE'
  | 'MIGRATE'
  | 'REMOVE';

export type GoalIntent =
  | 'create'
  | 'modify'
  | 'refactor'
  | 'fix'
  | 'debug'
  | 'optimize'
  | 'test'
  | 'explain'
  | 'inspect'
  | 'configure'
  | 'migrate'
  | 'remove';

export type AmbiguityCategory =
  | 'missing_requirement'
  | 'conflicting_requirement'
  | 'unspecified_target'
  | 'unspecified_scope'
  | 'unspecified_behavior'
  | 'insufficient_context';

export interface AmbiguityDetail {
  category: AmbiguityCategory;
  description: string;
  impact: string;
  suggestedClarification: string;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  observableTarget: string;
  expectedState: string;
  testable: boolean;
  provenance: 'explicit' | 'inferred';
}

export interface GoalProvenance {
  source: string;
  derivationMethod: string;
  transformations: string[];
  sanitized: boolean;
  secretsRedacted: boolean;
}

export interface ConfidenceAssessment {
  score: number; // 0.0 to 1.0
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
}

export interface GoalRepresentation {
  id: string;
  version: string;
  goalType: GoalType;
  intent: GoalIntent;
  rawPrompt: string;
  normalizedGoal: string;
  intentSummary: string;
  requestedOutcome: string;
  targetEntities: string[];
  affectedAreas: Array<'pages' | 'collections' | 'workflows' | 'components' | 'theme' | 'settings'>;
  explicitRequirements: string[];
  inferredRequirements: string[];
  assumptions: string[];
  unknowns: string[];
  constraints: string[];
  ambiguities: string[];
  ambiguityDetails: AmbiguityDetail[];
  acceptanceCriteria: AcceptanceCriterion[];
  riskAssessment: AIRisk;
  confidenceScore: number;
  confidence: ConfidenceAssessment;
  provenance: GoalProvenance;
  securityAssessment: {
    safe: boolean;
    flaggedReason?: string;
    secretsRedactedCount: number;
  };
  timestamp: string;
}

export type ContextCategory =
  | 'page'
  | 'component'
  | 'collection'
  | 'workflow'
  | 'query'
  | 'variable'
  | 'theme'
  | 'convention'
  | 'pattern'
  | 'constraint'
  | 'history';

export interface IntelligentContextItem {
  id: string;
  source: string;
  category: ContextCategory;
  priority: number;
  relevanceScore: number;
  content: string;
  tokenCount: number;
  freshnessTimestamp: string;
  derivationMethod?: string;
  rawEntityId?: string;
}

export interface RankedProjectContext {
  items: IntelligentContextItem[];
  totalTokens: number;
  truncatedCount: number;
  summary: string;
  categoriesIncluded?: Record<string, number>;
  duplicateEntityWarnings?: string[];
  formattedPromptContext?: string;
}

export type PlanTaskCategory =
  | 'inspect'
  | 'create'
  | 'modify'
  | 'remove'
  | 'configure'
  | 'refactor'
  | 'migrate'
  | 'test'
  | 'verify'
  | 'explain';

export type PlanTaskStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface PlanStepProvenance {
  goalRequirementId?: string;
  contextEvidenceSource?: string;
  rationale?: string;
  derivationMethod?: string;
}

export interface PlanStep {
  stepId: string;
  title: string;
  description: string;
  operation: AIOperation;
  dependencies: string[];
  riskLevel: AIRisk;
  expectedResult: {
    entityType: 'page' | 'component' | 'collection' | 'workflow' | 'theme';
    entityId: string;
    expectedState: string;
  };
  verificationStrategy: 'schema_check' | 'tree_presence' | 'route_exists' | 'type_validity';
  rollbackStrategy: 'undo_operation' | 'restore_snapshot' | 'prune_orphaned_entity';

  // D8.3 enrichments
  purpose?: string;
  category?: PlanTaskCategory;
  affectedEntities?: string[];
  acceptanceCriteriaIds?: string[];
  requiredContext?: string[];
  confidence?: number;
  ordering?: number;
  status?: PlanTaskStatus;
  provenance?: PlanStepProvenance;
}

export interface PlanAssumptionDetail {
  id: string;
  description: string;
  confidence: number;
  evidenceSource?: string;
}

export interface PlanAcceptanceCoverage {
  criterionId: string;
  description: string;
  coverageStatus: 'covered' | 'partially_covered' | 'not_covered';
  addressedByStepIds: string[];
  verificationDetails: string;
}

export interface PlanOperationGroup {
  groupId: string;
  name: string;
  category: 'UI_GROUP' | 'DATA_GROUP' | 'WORKFLOW_GROUP' | 'CONFIG_GROUP' | 'TEST_GROUP' | 'VERIFY_GROUP';
  purpose: string;
  stepIds: string[];
  affectedEntities: string[];
  risk: AIRisk;
}

export interface PlanAlternative {
  planId: string;
  title: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
  estimatedRisk: AIRisk;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number;
}

export interface PlanImpactAnalysis {
  overallImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedPages: string[];
  affectedComponents: string[];
  affectedCollections: string[];
  affectedWorkflows: string[];
  schemaChanges: boolean;
  destructiveChanges: boolean;
}

export interface PlanDiagnostics {
  knownContextCount: number;
  inferredContextCount: number;
  unknownContextCount: number;
  conflictingContextCount: number;
  totalTokensEstimated: number;
  dagCycleDetected: boolean;
  minimalChangeViolationsCount: number;
  duplicateProposalsAvoided: number;
  executionOrder: string[];
}

export interface IntelligentPlan {
  planId: string;
  goalId: string;
  title: string;
  rationale: string;
  assumptions: string[];
  requirements: string[];
  constraints: string[];
  risks: string[];
  steps: PlanStep[];
  confidenceScore: number; // 0.0 to 1.0
  estimatedTokens: number;
  createdAt: string;

  // D8.3 enrichments
  planVersion?: string;
  contextSummary?: string;
  objective?: string;
  detailedAssumptions?: PlanAssumptionDetail[];
  acceptanceCoverage?: PlanAcceptanceCoverage[];
  operationGroups?: PlanOperationGroup[];
  impactAnalysis?: PlanImpactAnalysis;
  unresolvedAmbiguities?: string[];
  missingContextDependencies?: string[];
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceAssessment?: ConfidenceAssessment;
  alternatives?: PlanAlternative[];
  recommendedPlanId?: string;
  planStatus?: 'PROPOSED' | 'VALIDATED' | 'REJECTED' | 'EXECUTING' | 'COMPLETED';
  diagnostics?: PlanDiagnostics;
}

export type DevelopmentPlan = IntelligentPlan;

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  hasCyclicDependencies: boolean;
  duplicateOperations: string[];
  unsupportedOperations: string[];
  missingDependencies?: string[];
  acceptanceCoverageGaps?: string[];
  securityViolations?: string[];
}

export type SemanticAutonomyLevel = 'manual' | 'assisted' | 'supervised' | 'conditional' | 'autonomous';

export type AutonomyEnvironment = 'development' | 'preview' | 'staging' | 'production';

export type AutonomyDecisionType = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'ESCALATE' | 'STOP';

export interface AutonomyCeilings {
  maxOperationsPerTask: number;
  maxAffectedEntities: number;
  maxWorkflowChanges: number;
  maxDataChanges: number;
  maxRetries: number;
  maxExecutionDurationMs: number;
  maxTokenBudget: number;
}

export interface PolicyApprovalRequirement {
  stepId?: string;
  opId?: string;
  operationType?: string;
  risk: AIRisk;
  reason: string;
  affectedResources: string[];
  policyRule: string;
}

export interface PolicyStopCondition {
  trigger: string;
  reason: string;
}

export interface PolicyDeniedAction {
  target: string;
  reason: string;
  rule: string;
}

export interface PolicyDecisionProvenance {
  evaluatedRules: string[];
  securityCheckPassed: boolean;
  rbacCheckPassed: boolean;
  environmentRule: string;
  planValidationRule: string;
  confidenceRule: string;
  ambiguityRule: string;
  humanDirectiveApplied?: string;
  evaluatorTimestamp: string;
}

export interface AutonomyPolicyDecision {
  requestedAutonomyLevel: AutonomyLevel;
  effectiveAutonomyLevel: AutonomyLevel;
  semanticLevel: SemanticAutonomyLevel;
  decision: AutonomyDecisionType;
  approvalRequired: boolean;
  approvalRequirements: PolicyApprovalRequirement[];
  allowedActions: string[];
  deniedActions: PolicyDeniedAction[];
  riskLevel: AIRisk;
  policyViolations: string[];
  constraints: string[];
  ceilings: AutonomyCeilings;
  escalationRequirements: string[];
  stopConditions: PolicyStopCondition[];
  confidence: number;
  confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
  provenance: PolicyDecisionProvenance;
  timestamp: string;
  policyVersion: string;
}

export interface HumanOverrideDirective {
  action: 'approve' | 'reject' | 'pause' | 'stop' | 'cancel' | 'downgrade' | 'upgrade';
  targetLevel?: AutonomyLevel | SemanticAutonomyLevel;
  reason?: string;
  approvedStepIds?: string[];
}

export interface ProjectAutonomyPolicy {
  readOnly?: boolean;
  maxLevelAllowed?: AutonomyLevel | SemanticAutonomyLevel;
  disallowedOperations?: string[];
  customCeilings?: Partial<AutonomyCeilings>;
  requireApprovalForDataChanges?: boolean;
  requireApprovalForWorkflowChanges?: boolean;
  lockedEnvironments?: AutonomyEnvironment[];
}

export interface AutonomyEvaluationParams {
  goal: GoalRepresentation;
  plan: IntelligentPlan;
  context?: RankedProjectContext;
  project?: AppProject;
  requestedLevel?: AutonomyLevel | SemanticAutonomyLevel;
  environment?: AutonomyEnvironment;
  userRoles?: Role[];
  projectPolicy?: ProjectAutonomyPolicy;
  humanOverride?: HumanOverrideDirective;
  policyVersion?: string;
  activeSessionId?: string;
}

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export interface AutonomyPolicy {
  level: AutonomyLevel;
  name: 'OBSERVE' | 'SUGGEST' | 'APPROVAL_REQUIRED' | 'CONTROLLED_AUTONOMY' | 'VERIFIED_AUTONOMY';
  description: string;
  canMutate: boolean;
  canAutoApplyLowRisk: boolean;
  canAutoApplyMediumRisk: boolean;
  canAutoApplyHighRisk: boolean;
  requiresPreVerification: boolean;
}

export interface VerificationCheck {
  checkId: string;
  type: string;
  target: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

export interface AutonomousVerificationResult {
  verificationId: string;
  stepId?: string;
  planId?: string;
  status: 'PASSED' | 'FAILED';
  checks: VerificationCheck[];
  evidence: string[];
  timestamp: string;
}

export interface IntelligentRegressionReport {
  detected: boolean;
  brokenEntities: string[];
  unexpectedRemovals: string[];
  schemaIssues: string[];
  summary: string;
}

export interface ObservabilityEvent {
  eventId: string;
  sessionId: string;
  timestamp: string;
  phase: string;
  actor: 'AI' | 'SYSTEM' | 'USER';
  category: 'DECISION' | 'PLAN' | 'OPERATION' | 'VERIFICATION' | 'APPROVAL' | 'RECOVERY';
  details: Record<string, any>;
  durationMs?: number;
  error?: string;
}

export interface ExecutionTimelineItem {
  id: string;
  timestamp: string;
  actor: 'AI' | 'SYSTEM' | 'USER';
  category: 'DECISION' | 'PLAN' | 'OPERATION' | 'VERIFICATION' | 'APPROVAL' | 'RECOVERY';
  summary: string;
  details?: Record<string, any>;
}

export interface ExplanationReport {
  topic: string;
  question: string;
  answer: string;
  justification: string;
  supportingEvidence: string[];
  timestamp: string;
}

export interface DevelopmentMemoryEntry {
  id: string;
  key: string;
  category: 'CONVENTION' | 'PATTERN' | 'CONSTRAINT' | 'DECISION' | 'RECOVERY';
  content: string;
  timesReferenced: number;
  createdAt: string;
  updatedAt: string;
}

export type SessionExecutionState =
  | 'IDLE'
  | 'PLANNING'
  | 'WAITING_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'RECOVERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'
  | 'CANCELLED';

export interface DevelopmentSession {
  sessionId: string;
  projectId: string;
  goal?: GoalRepresentation;
  currentPlan?: IntelligentPlan;
  currentStepIndex: number;
  autonomyLevel: AutonomyLevel;
  executionState: SessionExecutionState;
  timeline: ExecutionTimelineItem[];
  verificationHistory: AutonomousVerificationResult[];
  activeFailure?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIDevelopmentReport {
  sessionId: string;
  goalSummary: string;
  planSummary: string;
  completedStepsCount: number;
  totalStepsCount: number;
  operationsSummary: string[];
  verificationResults: AutonomousVerificationResult[];
  regressionDetected: boolean;
  finalStatus: SessionExecutionState;
  remainingRisks: string[];
  recommendedNextSteps: string[];
  generatedAt: string;
}

// ============================================================
// D8.5 ADAPTIVE EXECUTION ENGINE CORE TYPES
// ============================================================

export type AdaptiveExecutionState =
  | 'idle'
  | 'preflight'
  | 'awaiting_approval'
  | 'executing'
  | 'paused'
  | 'step_failed'
  | 'recovering'
  | 'rolling_back'
  | 'completed'
  | 'committed'
  | 'cancelled'
  | 'denied'
  | 'blocked'
  | 'stale_plan';

export type ExecutionDecisionType =
  | 'CONTINUE'
  | 'PAUSE'
  | 'REQUEST_APPROVAL'
  | 'RETRY'
  | 'SKIP'
  | 'ROLLBACK'
  | 'ABORT'
  | 'REPLAN_REQUIRED';

export interface ExecutionDecision {
  id: string;
  type: ExecutionDecisionType;
  reason: string;
  triggeringEvent: string;
  policyBasis?: string;
  confidence: number;
  risk: AIRisk;
  affectedStepId?: string;
  provenance: string;
  timestamp: string;
}

export interface ExecutionCheckpoint {
  checkpointId: string;
  executionId: string;
  stepId?: string;
  projectVersion: number;
  schemaVersion: string;
  planVersion: string;
  policyVersion: string;
  timestamp: string;
  executionState: AdaptiveExecutionState;
  transactionState: 'IDLE' | 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK';
  completedSteps: string[];
  pendingSteps: string[];
  rollbackInformation?: {
    generationId?: string;
    snapshotVersion?: number;
    affectedEntities?: string[];
  };
  projectSnapshot?: AppProject;
}

export interface ExecutionError {
  code: string;
  message: string;
  stepId?: string;
  phase: 'preflight' | 'policy' | 'approval' | 'transaction' | 'execution' | 'validation' | 'rollback';
  fatal: boolean;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ExecutionRecovery {
  recoveryId: string;
  triggeringFailure: string;
  recoveryAction: 'RESUME' | 'ROLLBACK' | 'ABORT' | 'REPLAN_REQUIRED';
  restoredVersion: number;
  affectedStepIds: string[];
  durationMs: number;
  verificationResult: 'VERIFIED' | 'FAILED' | 'CRITICAL_RECOVERY_REQUIRED';
  timestamp: string;
}

export interface ExecutionMetrics {
  executionDurationMs: number;
  stepCount: number;
  successfulSteps: number;
  failedSteps: number;
  retriedSteps: number;
  rollbackCount: number;
  approvalPauses: number;
  policyBlocks: number;
  validationFailures: number;
  conflicts: number;
  stalePlanEvents: number;
  adaptationsCount: number;
  tokensUsed?: number;
  estimatedCost?: number;
}

export interface ExecutionEvent {
  eventId: string;
  executionId: string;
  stepId?: string;
  timestamp: string;
  type:
    | 'STATE_TRANSITION'
    | 'POLICY_EVAL'
    | 'PREFLIGHT'
    | 'TX_BEGIN'
    | 'TX_COMMIT'
    | 'TX_ROLLBACK'
    | 'STEP_EXEC'
    | 'STEP_VERIFY'
    | 'APPROVAL_WAIT'
    | 'RETRY'
    | 'CONFLICT'
    | 'RECOVERY';
  details: Record<string, unknown>;
}

export interface AdaptiveExecutionStep {
  stepId: string;
  operation: AIOperation;
  description: string;
  dependencies: string[];
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'WAITING_APPROVAL' | 'ROLLED_BACK';
  attempts: number;
  maxAttempts: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  verificationStatus?: 'PASSED' | 'FAILED' | 'SKIPPED';
  error?: ExecutionError;
  checkpointId?: string;
}

export interface ExecutionTrace {
  requestId: string;
  executionId: string;
  goalId?: string;
  planId: string;
  events: ExecutionEvent[];
  decisions: ExecutionDecision[];
  checkpoints: ExecutionCheckpoint[];
  steps: AdaptiveExecutionStep[];
  startedAt: string;
  completedAt?: string;
}

export interface ExecutionSummary {
  executionId: string;
  status: 'COMPLETED' | 'WAITING_APPROVAL' | 'FAILED' | 'RECOVERED' | 'BLOCKED' | 'DENIED' | 'CANCELLED' | 'PAUSED' | 'STALE_PLAN';
  totalSteps: number;
  completedSteps: number;
  durationMs: number;
  retries: number;
  rollbacks: number;
  cleanVerification: boolean;
}

export interface AdaptiveExecutionRequest {
  plan: IntelligentPlan;
  project: AppProject;
  autonomyLevel?: AutonomyLevel;
  environment?: 'development' | 'preview' | 'staging' | 'production';
  userRoles?: Role[];
  policyDecision?: AutonomyPolicyDecision;
  approvalTokens?: string[];
  projectPolicy?: ProjectAutonomyPolicy;
  sessionId?: string;
  planVersion?: string;
  projectVersion?: number;
  contextFreshnessTimestamp?: string;
  maxRetries?: number;
  timeoutMs?: number;
  resumeFromCheckpoint?: ExecutionCheckpoint;
  interactiveControls?: {
    pauseRequested?: boolean;
    cancelRequested?: boolean;
  };
}

export interface AdaptiveExecutionSession {
  sessionId: string;
  executionId: string;
  plan: IntelligentPlan;
  project: AppProject;
  state: AdaptiveExecutionState;
  currentStepIndex: number;
  checkpoints: ExecutionCheckpoint[];
  latestCheckpoint?: ExecutionCheckpoint;
  metrics: ExecutionMetrics;
  trace: ExecutionTrace;
  createdAt: string;
  updatedAt: string;
}

export interface AdaptiveExecutionResult {
  status: 'COMPLETED' | 'WAITING_APPROVAL' | 'FAILED' | 'RECOVERED' | 'BLOCKED' | 'DENIED' | 'CANCELLED' | 'PAUSED' | 'STALE_PLAN';
  sessionState: AdaptiveExecutionState;
  updatedProject: AppProject;
  completedStepIds: string[];
  failedStepId?: string;
  revisionsCount: number;
  retriesCount: number;
  events: ObservabilityEvent[];
  error?: string;
  trace?: ExecutionTrace;
  metrics?: ExecutionMetrics;
  decisions?: ExecutionDecision[];
  checkpoints?: ExecutionCheckpoint[];
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
  recovery?: ExecutionRecovery;
  summary?: ExecutionSummary;
}

