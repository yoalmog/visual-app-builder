// D8.10: AI Execution Timeline & Observability Types
// Comprehensive strongly-typed models for telemetry, spans, causality, ordering, queries, and retention.

export type ExecutionTraceId = string;
export type ExecutionSessionId = string;
export type ExecutionEventId = string;
export type ExecutionSpanId = string;
export type ExecutionRequestId = string;
export type ExecutionTransactionId = string;
export type ExecutionOperationId = string;
export type ExecutionVerificationId = string;
export type ExecutionRecoveryId = string;
export type ExecutionDecisionId = string;
export type ExecutionLearningSessionId = string;

// ── Controlled Event Taxonomy (Section 9) ──
export type ExecutionEventType =
  // REQUEST
  | 'REQUEST_RECEIVED'
  | 'REQUEST_CANCELLED'
  | 'REQUEST_COMPLETED'
  | 'REQUEST_FAILED'
  // CONTEXT
  | 'CONTEXT_BUILD_STARTED'
  | 'CONTEXT_BUILD_COMPLETED'
  | 'CONTEXT_BUILD_FAILED'
  // INTENT
  | 'INTENT_CLASSIFICATION_STARTED'
  | 'INTENT_CLASSIFIED'
  | 'INTENT_CLASSIFICATION_FAILED'
  // PLANNING
  | 'PLAN_GENERATION_STARTED'
  | 'PLAN_CREATED'
  | 'PLAN_VALIDATION_STARTED'
  | 'PLAN_VALIDATED'
  | 'PLAN_REJECTED'
  // DEPENDENCIES
  | 'DEPENDENCY_ANALYSIS_STARTED'
  | 'DEPENDENCY_ANALYSIS_COMPLETED'
  | 'DEPENDENCY_CONFLICT'
  | 'DEPENDENCY_RESOLVED'
  // DECISION
  | 'DECISION_CONTEXT_CREATED'
  | 'CANDIDATES_GENERATED'
  | 'CANDIDATES_VALIDATED'
  | 'CONSTRAINTS_APPLIED'
  | 'RISK_ANALYSIS_COMPLETED'
  | 'CONFIDENCE_ANALYSIS_COMPLETED'
  | 'CANDIDATES_SCORED'
  | 'CANDIDATES_COMPARED'
  | 'DECISION_SELECTED'
  | 'DECISION_REJECTED'
  | 'DECISION_BLOCKED'
  | 'DECISION_UNCERTAIN'
  // POLICY
  | 'POLICY_CHECK_STARTED'
  | 'POLICY_CHECK_PASSED'
  | 'POLICY_CHECK_FAILED'
  // APPROVAL
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  // TRANSACTION
  | 'TRANSACTION_STARTED'
  | 'TRANSACTION_COMMITTED'
  | 'TRANSACTION_ROLLED_BACK'
  | 'TRANSACTION_FAILED'
  // EXECUTION
  | 'EXECUTION_STARTED'
  | 'OPERATION_STARTED'
  | 'OPERATION_COMPLETED'
  | 'OPERATION_FAILED'
  | 'EXECUTION_PAUSED'
  | 'EXECUTION_RESUMED'
  | 'EXECUTION_CANCELLED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  // CHECKPOINT
  | 'CHECKPOINT_CREATED'
  | 'CHECKPOINT_RESTORED'
  | 'CHECKPOINT_INVALID'
  | 'CHECKPOINT_RESUME_STARTED'
  | 'CHECKPOINT_RESUME_COMPLETED'
  // VERIFICATION
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_COMPLETED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'VERIFICATION_UNCERTAIN'
  // RECOVERY
  | 'RECOVERY_STARTED'
  | 'FAILURE_DIAGNOSIS_STARTED'
  | 'FAILURE_DIAGNOSIS_COMPLETED'
  | 'RECOVERY_PLAN_CREATED'
  | 'RECOVERY_PLAN_REJECTED'
  | 'RECOVERY_STEP_STARTED'
  | 'RECOVERY_STEP_COMPLETED'
  | 'RECOVERY_STEP_FAILED'
  | 'ROLLBACK_STARTED'
  | 'ROLLBACK_COMPLETED'
  | 'ROLLBACK_FAILED'
  | 'RECOVERY_VERIFICATION_STARTED'
  | 'RECOVERY_VERIFICATION_PASSED'
  | 'RECOVERY_VERIFICATION_FAILED'
  | 'RECOVERY_COMPLETED'
  | 'RECOVERY_FAILED'
  | 'RECOVERY_BLOCKED'
  | 'RECOVERY_UNCERTAIN'
  // LEARNING
  | 'EXPERIENCE_RECORDED'
  | 'EXPERIENCE_INVALIDATED'
  | 'LEARNING_STARTED'
  | 'LEARNING_COMPLETED'
  // OBSERVABILITY
  | 'TRACE_STARTED'
  | 'TRACE_COMPLETED'
  | 'TRACE_FAILED'
  | 'TRACE_TRUNCATED'
  | 'EVENT_REDACTED'
  | 'EVENT_REJECTED'
  | 'TIMELINE_PERSISTED'
  | 'TIMELINE_RESTORED'
  | 'EVENT_CORRECTION_RECORDED'
  // SECURITY
  | 'SECURITY_CHECK_STARTED'
  | 'SECURITY_CHECK_PASSED'
  | 'SECURITY_CHECK_FAILED'
  | 'PROMPT_INJECTION_BLOCKED'
  | 'SECRET_REDACTION_APPLIED'
  | 'PROJECT_ISOLATION_BLOCKED'
  | 'PERMISSION_BLOCKED';

export type ExecutionEventStatus =
  | 'PENDING'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PASSED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'UNCERTAIN'
  | 'SKIPPED'
  | 'RETRYING'
  | 'ROLLED_BACK';

export type ExecutionEventSource =
  | 'SYSTEM'
  | 'AI_PLANNER'
  | 'DECISION_ENGINE'
  | 'POLICY_MANAGER'
  | 'APPROVAL_MANAGER'
  | 'TRANSACTION_MANAGER'
  | 'EXECUTION_ENGINE'
  | 'VERIFICATION_ENGINE'
  | 'RECOVERY_ENGINE'
  | 'LEARNING_ENGINE'
  | 'PROVIDER'
  | 'USER'
  | 'SECURITY';

export type ExecutionEventSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ExecutionEventTimestamp {
  iso: string;
  epochMs: number;
}

export interface ExecutionEventDuration {
  durationMs: number;
  cpuTimeMs?: number;
}

export interface ExecutionEventCorrelation {
  requestId?: ExecutionRequestId;
  traceId: ExecutionTraceId;
  sessionId: ExecutionSessionId;
  projectId: string;
  transactionId?: ExecutionTransactionId;
  operationId?: ExecutionOperationId;
  decisionId?: ExecutionDecisionId;
  verificationId?: ExecutionVerificationId;
  recoveryId?: ExecutionRecoveryId;
  learningSessionId?: ExecutionLearningSessionId;
  spanId?: ExecutionSpanId;
  parentEventId?: ExecutionEventId;
}

export interface ExecutionEventCausality {
  causeType: 'USER_REQUEST' | 'DECISION' | 'POLICY' | 'APPROVAL' | 'TRANSACTION' | 'OPERATION' | 'VERIFICATION_FAILURE' | 'RECOVERY_TRIGGER' | 'ROLLBACK_TRIGGER' | 'USER_CORRECTION';
  causedByEventId?: ExecutionEventId;
  causedByEntityId?: string;
  description: string;
}

export type ExecutionEventMetadata = Record<string, unknown>;

export interface ExecutionEventEvidence {
  summary: string;
  dimensions?: string[];
  passedChecks?: number;
  totalChecks?: number;
  artifacts?: Record<string, string>;
  rawOutputSnippet?: string;
}

export interface ExecutionEventOutcome {
  status: ExecutionEventStatus;
  summary: string;
  error?: string;
  warnings?: string[];
  remediationAvailable?: boolean;
}

export interface ExecutionEvent {
  eventId: ExecutionEventId;
  sequenceNumber: number;
  timestamp: ExecutionEventTimestamp;
  eventType: ExecutionEventType;
  status: ExecutionEventStatus;
  source: ExecutionEventSource;
  severity: ExecutionEventSeverity;
  correlation: ExecutionEventCorrelation;
  causality?: ExecutionEventCausality;
  duration?: ExecutionEventDuration;
  metadata: ExecutionEventMetadata;
  evidence?: ExecutionEventEvidence;
  outcome?: ExecutionEventOutcome;
  redacted?: boolean;
}

// ── Spans ──
export type ExecutionSpanKind =
  | 'REQUEST'
  | 'CONTEXT'
  | 'PLANNING'
  | 'DECISION'
  | 'POLICY'
  | 'APPROVAL'
  | 'TRANSACTION'
  | 'OPERATION'
  | 'VERIFICATION'
  | 'RECOVERY'
  | 'LEARNING'
  | 'PROVIDER_CALL';

export type ExecutionSpanStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'BLOCKED' | 'UNCERTAIN';

export interface ExecutionSpan {
  spanId: ExecutionSpanId;
  traceId: ExecutionTraceId;
  parentSpanId?: ExecutionSpanId;
  kind: ExecutionSpanKind;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: ExecutionSpanStatus;
  attributes: Record<string, unknown>;
  eventIds: ExecutionEventId[];
  error?: string;
  projectId: string;
}

// ── Stages ──
export type ExecutionStage =
  | 'REQUEST'
  | 'CONTEXT'
  | 'INTENT'
  | 'PLANNING'
  | 'DECISION'
  | 'POLICY'
  | 'APPROVAL'
  | 'TRANSACTION'
  | 'EXECUTION'
  | 'VERIFICATION'
  | 'RECOVERY'
  | 'LEARNING';

export type ExecutionStageStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'UNCERTAIN';

// ── Metrics ──
export interface ExecutionLatencyMetrics {
  totalDurationMs: number;
  planningDurationMs: number;
  decisionDurationMs: number;
  policyDurationMs: number;
  approvalWaitMs: number;
  transactionDurationMs: number;
  operationDurationMs: number;
  verificationDurationMs: number;
  recoveryDurationMs: number;
  providerDurationMs: number;
}

export interface ExecutionOperationMetrics {
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  retriedOperations: number;
}

export interface ExecutionFailureMetrics {
  failureCategory?: string;
  failureCount: number;
  rollbackCount: number;
  policyRejections: number;
  approvalRejections: number;
}

export interface ExecutionVerificationMetrics {
  verificationCount: number;
  verificationPassed: boolean;
  checksTotal: number;
  checksPassed: number;
  unexpectedMutations: number;
}

export interface ExecutionRecoveryMetrics {
  recoveryTriggered: boolean;
  recoveryAttempts: number;
  recoverySucceeded: boolean;
  strategyUsed?: string;
}

export interface ExecutionDecisionMetrics {
  candidatesConsidered: number;
  selectedStrategy?: string;
  decisionConfidence: number;
  decisionRisk: string;
}

export interface ExecutionProviderMetrics {
  providerName: string;
  modelIdentifier?: string;
  latencyMs: number;
  retries: number;
  tokenUsage?: { prompt?: number; completion?: number; total?: number };
  structuredOutputValid: boolean;
  status: string;
}

export interface ExecutionResourceMetrics {
  affectedResourceTypes: string[];
  affectedResourceIds: string[];
  pageCount: number;
  componentCount: number;
}

export interface ExecutionMetrics {
  latency: ExecutionLatencyMetrics;
  operations: ExecutionOperationMetrics;
  failures: ExecutionFailureMetrics;
  verification: ExecutionVerificationMetrics;
  recovery: ExecutionRecoveryMetrics;
  decisions: ExecutionDecisionMetrics;
  provider?: ExecutionProviderMetrics;
  resources: ExecutionResourceMetrics;
  totalEvents: number;
  eventsDropped: number;
  eventsRedacted: number;
}

// ── Queries & Filters ──
export interface ExecutionTimelineFilter {
  projectId: string;
  traceId?: ExecutionTraceId;
  sessionId?: ExecutionSessionId;
  eventTypes?: ExecutionEventType[];
  statuses?: ExecutionEventStatus[];
  severities?: ExecutionEventSeverity[];
  startTime?: number;
  endTime?: number;
  transactionId?: ExecutionTransactionId;
  operationId?: ExecutionOperationId;
  decisionId?: ExecutionDecisionId;
  verificationId?: ExecutionVerificationId;
  recoveryId?: ExecutionRecoveryId;
  minDurationMs?: number;
  failureCategory?: string;
}

export interface ExecutionTimelineQuery {
  filter: ExecutionTimelineFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'sequenceNumber' | 'timestamp' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutionTimelineQueryResult {
  events: ExecutionEvent[];
  totalCount: number;
  hasMore: boolean;
  appliedFilter: ExecutionTimelineFilter;
}

// ── Traces & Summary ──
export interface ExecutionTraceSummary {
  traceId: ExecutionTraceId;
  projectId: string;
  sessionId: ExecutionSessionId;
  requestId?: ExecutionRequestId;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  finalStatus: ExecutionEventStatus;
  completeness: 'COMPLETE' | 'PARTIAL' | 'TRUNCATED' | 'UNCERTAIN' | 'FAILED';
  intent?: string;
  planSummary?: string;
  decisionSummary?: string;
  operationsCount: number;
  transactionCount: number;
  policyResult: 'PASSED' | 'BLOCKED' | 'NOT_APPLICABLE';
  approvalResult: 'GRANTED' | 'DENIED' | 'NOT_REQUIRED';
  verificationResult: 'PASS' | 'FAIL' | 'UNCERTAIN' | 'SKIPPED';
  recoveryResult?: 'SUCCEEDED' | 'FAILED' | 'NOT_TRIGGERED';
  learningResult?: 'RECORDED' | 'SKIPPED';
  warnings: string[];
  errors: string[];
  performanceHotspots: string[];
  affectedResources: Array<{ type: string; id: string }>;
  provenance: ExecutionProvenance;
}

export interface ExecutionTraceLink {
  fromTraceId: ExecutionTraceId;
  toTraceId: ExecutionTraceId;
  relationship: 'CORRECTION' | 'RETRY' | 'RECOVERY' | 'SUB_EXECUTION';
  reason: string;
}

export interface ExecutionTraceContext {
  environment: string;
  autonomyLevel: number;
  userRoles?: string[];
  projectVersion: number;
}

export interface ExecutionProvenance {
  creator: ExecutionEventSource;
  timestamp: string;
  systemVersion: string;
  traceId: ExecutionTraceId;
  projectId: string;
  signature?: string;
}

export interface ExecutionTrace {
  traceId: ExecutionTraceId;
  projectId: string;
  sessionId: ExecutionSessionId;
  requestId?: ExecutionRequestId;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: ExecutionEventStatus;
  completeness: 'COMPLETE' | 'PARTIAL' | 'TRUNCATED' | 'UNCERTAIN' | 'FAILED';
  context: ExecutionTraceContext;
  events: ExecutionEvent[];
  spans: ExecutionSpan[];
  metrics: ExecutionMetrics;
  summary?: ExecutionTraceSummary;
  checkpoints: ExecutionCheckpoint[];
}

export interface ExecutionTimeline {
  traceId: ExecutionTraceId;
  projectId: string;
  events: ExecutionEvent[];
  spans: ExecutionSpan[];
  summary: ExecutionTraceSummary;
  completeness: 'COMPLETE' | 'PARTIAL' | 'TRUNCATED' | 'UNCERTAIN' | 'FAILED';
}

// ── Checkpointing & State Machine ──
export interface ExecutionCheckpoint {
  checkpointId: string;
  traceId: ExecutionTraceId;
  timestamp: string;
  stage: ExecutionStage;
  sequenceNumber: number;
  lastCommittedEventId: ExecutionEventId;
  transactionState: 'IDLE' | 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK';
  verificationState?: 'PENDING' | 'PASS' | 'FAIL' | 'UNCERTAIN';
  metadata: Record<string, unknown>;
}

export type ExecutionObservabilityState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'CAPTURING'
  | 'CORRELATING'
  | 'ORDERING'
  | 'SANITIZING'
  | 'PERSISTING'
  | 'QUERYING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'TRUNCATED'
  | 'FAILED'
  | 'BLOCKED'
  | 'UNCERTAIN'
  | 'CANCELLED'
  | 'RESTORING'
  | 'RESUMING';

export interface ExecutionObservabilitySession {
  sessionId: ExecutionSessionId;
  traceId: ExecutionTraceId;
  projectId: string;
  currentState: ExecutionObservabilityState;
  stateHistory: Array<{ state: ExecutionObservabilityState; timestamp: string; reason?: string }>;
  startedAt: string;
  updatedAt: string;
}

export interface ExecutionObservabilityPolicy {
  redactSecrets: boolean;
  enforceProjectIsolation: boolean;
  maxEventsPerTrace: number;
  maxPersistedTraces: number;
  maxTraceDurationMs: number;
  allowTelemetryAuthority: false; // Strictly false: observability never has authority
}

export interface ExecutionRetentionPolicy {
  maxEventsPerTrace: number;
  maxPersistedTraces: number;
  maxAgeMs: number;
}

export interface ExecutionRedactionResult {
  redacted: boolean;
  redactedFieldCount: number;
  sanitizedMetadata: ExecutionEventMetadata;
}

export interface ExecutionObservabilitySummary {
  totalTraces: number;
  completedTraces: number;
  failedTraces: number;
  partialTraces: number;
  uncertainTraces: number;
  blockedTraces: number;
  cancelledTraces: number;
  averageTraceDurationMs: number;
  p95TraceDurationMs: number;
  totalEvents: number;
  eventsDropped: number;
  eventsRedacted: number;
}
