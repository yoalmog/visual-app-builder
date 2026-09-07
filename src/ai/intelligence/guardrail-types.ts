// D8.14: Dynamic Guardrails & Safety Policy Synthesis Engine Type Definitions
// Strongly-typed contracts for dynamic invariant synthesis, real-time containment,
// multi-phase evaluation, blast radius control, and cryptographic telemetry.

import { AIRisk } from '../../builder/schema/ai';

export type GuardrailCategory =
  | 'DATA_INTEGRITY'
  | 'PERMISSION_BOUNDARY'
  | 'RATE_AND_BUDGET'
  | 'BLAST_RADIUS'
  | 'SECURITY_INVARIANT'
  | 'DEPENDENCY_HEALTH'
  | 'SCHEMA_PRESERVATION'
  | 'USER_EXPERIENCE';

export type GuardrailPhase =
  | 'PRE_EXECUTION'
  | 'LIVE_EXECUTION'
  | 'POST_EXECUTION';

export type GuardrailSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type GuardrailAction =
  | 'ALLOW'
  | 'WARN'
  | 'THROTTLE'
  | 'CONTAIN_AND_PAUSE'
  | 'BLOCK_AND_ROLLBACK';

export type GuardrailCondition =
  | 'MAX_MUTATIONS_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_TARGET'
  | 'CRITICAL_COLLECTION_TOUCHED'
  | 'SCHEMA_TAMPERING'
  | 'PROHIBITED_CODE_DETECTED'
  | 'CREDENTIAL_LEAKAGE'
  | 'CROSS_PROJECT_ACCESS'
  | 'UNRESOLVED_DEPENDENCY'
  | 'BLAST_RADIUS_BREACH'
  | 'TIMEOUT_EXCEEDED'
  | 'UNEXPECTED_PAGE_DELETION'
  | 'CUSTOM';

export interface GuardrailRule {
  ruleId: string;
  name: string;
  description: string;
  category: GuardrailCategory;
  phase: GuardrailPhase;
  severity: GuardrailSeverity;
  enforcementAction: GuardrailAction;
  isEnabled: boolean;
  condition: GuardrailCondition;
  threshold?: number;
  targetPattern?: string;
  targetEntities?: string[];
  metadata?: Record<string, unknown>;
}

export interface DynamicGuardrailPolicy {
  policyId: string;
  projectId: string;
  goalId?: string;
  synthesizedAt: string;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rules: GuardrailRule[];
  activeBlastRadiusEntities: string[];
  maxAllowedMutations: number;
  maxExecutionDurationMs: number;
  synthesizedFrom: {
    goalDescription?: string;
    pastIncidentCount: number;
    operatorRole: string;
    environment: string;
  };
  version: number;
}

export interface GuardrailBreach {
  breachId: string;
  ruleId: string;
  ruleName: string;
  category: GuardrailCategory;
  phase: GuardrailPhase;
  severity: GuardrailSeverity;
  action: GuardrailAction;
  condition?: GuardrailCondition;
  targetEntity?: string;
  message: string;
  timestamp: string;
  contextSnapshot?: Record<string, unknown>;
}

export interface GuardrailEvaluationResult {
  passed: boolean;
  policyId: string;
  projectId: string;
  phase: GuardrailPhase;
  breaches: GuardrailBreach[];
  recommendedAction: GuardrailAction;
  summary: string;
  timestamp: string;
  evaluatedRulesCount: number;
  quarantineRequired: boolean;
}

export interface SafetySynthesisContext {
  projectId: string;
  goalId?: string;
  goalDescription?: string;
  operatorRole?: string;
  environment?: 'development' | 'staging' | 'production';
  targetEntityTypes?: string[];
  plannedOperationsCount?: number;
  riskLevel?: AIRisk;
  priorFailuresCount?: number;
  maxMutationsLimit?: number;
  maxDurationMsLimit?: number;
}

export interface GuardrailContainmentEvent {
  containmentId: string;
  projectId: string;
  sessionId?: string;
  triggerBreach: GuardrailBreach;
  actionTaken: GuardrailAction;
  rolledBackTransactionId?: string;
  pausedSessionId?: string;
  timestamp: string;
  provenanceHash: string;
}

export interface GuardrailLiveMetrics {
  mutationsCount?: number;
  executionStartTimeMs?: number;
  currentDurationMs: number;
  opsPerSecond: number;
  modifiedEntityIds?: string[];
  inFlightTransactionsCount?: number;
  memoryUsageBytes?: number;
}
