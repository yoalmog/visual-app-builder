// D8.15: Cross-Subsystem Autonomous Synthesis & Unified Orchestration Engine Types
// Strongly typed contracts binding all 14 preceding AI Continuum subsystems into a unified platform.

import { AppProject } from '../../builder/schema/project';
import { Role } from '../../builder/schema/rbac';
import {
  GoalRepresentation,
  RankedProjectContext,
  IntelligentPlan,
  PlanValidationResult,
  AutonomyPolicyDecision,
  AutonomyLevel,
  AIDevelopmentReport,
} from './types';
import { DynamicGuardrailPolicy, GuardrailEvaluationResult, GuardrailBreach } from './guardrail-types';
import { DecisionOptimizationSummary } from './decision-types';
import { HITLSession, HITLBreakpoint } from './hitl-types';
import { AdaptiveExecutionResult } from './types';
import { VerificationResult } from './verification-types';
import { AdaptationSession } from './adaptation-types';
import { DecisionExplanation } from '../explainability/explainability-types';

export type OrchestrationState =
  | 'IDLE'
  | 'SECURITY_AUDITING'
  | 'UNDERSTANDING_GOAL'
  | 'ANALYZING_CONTEXT'
  | 'SYNTHESIZING_GUARDRAILS'
  | 'GENERATING_PLAN'
  | 'SWARM_DEBATING'
  | 'OPTIMIZING_DECISIONS'
  | 'VALIDATING_PLAN'
  | 'GATING_AUTONOMY'
  | 'PRE_GUARDRAIL_EVALUATION'
  | 'SUPERVISED_EXECUTION'
  | 'MONITORING_WATCHDOG'
  | 'TRANSACTION_EXECUTING'
  | 'VERIFYING_MULTI_DIMENSIONAL'
  | 'POST_GUARDRAIL_EVALUATION'
  | 'EXPLAINING_DECISIONS'
  | 'LEARNING_EXPERIENCE'
  | 'GENERATING_REPORT'
  | 'COMPLETED'
  | 'CONTAINED_AND_ROLLED_BACK'
  | 'QUARANTINED'
  | 'AWAITING_APPROVAL'
  | 'CANCELLED'
  | 'FAILED'
  | 'EMERGENCY_STOPPED';

export interface OrchestrationRequest {
  projectId: string;
  prompt: string;
  environment?: 'development' | 'staging' | 'production';
  operatorRole?: string | Role;
  autonomyLevel?: AutonomyLevel;
  approvalToken?: string;
  dryRun?: boolean;
  enableHITL?: boolean;
  breakpoints?: HITLBreakpoint[];
  targetEntityId?: string;
  maxExecutionDurationMs?: number;
  maxMutations?: number;
  useSwarmConsensus?: boolean;
  swarmConsensusMode?: 'UNANIMOUS' | 'WEIGHTED_MAJORITY' | 'BFT_QUORUM' | 'HIERARCHICAL';
}

export interface SubsystemStatusSummary {
  securityAudit?: 'PENDING' | 'PASSED' | 'WARNING' | 'QUARANTINED' | 'FAILED' | 'SKIPPED';
  goalUnderstanding: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  contextIntelligence: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  guardrailsSynthesis: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  planGeneration: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  swarmConsensus?: 'PENDING' | 'REACHED' | 'BYPASSED' | 'VETOED' | 'DEADLOCK';
  decisionOptimization: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  planValidation: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  autonomyGating: 'PENDING' | 'SUCCESS' | 'BLOCKED' | 'AWAITING_APPROVAL' | 'SKIPPED';
  hitlControl: 'PENDING' | 'SUPERVISED' | 'INTERVENED' | 'EMERGENCY_STOPPED' | 'SKIPPED';
  transactionExecution: 'PENDING' | 'COMMITTED' | 'ROLLED_BACK' | 'FAILED' | 'SKIPPED';
  liveWatchdog: 'PENDING' | 'NORMAL' | 'THROTTLED' | 'BREACHED' | 'SKIPPED';
  verification: 'PENDING' | 'PASSED' | 'FAILED' | 'UNCERTAIN' | 'SKIPPED';
  postGuardrail: 'PENDING' | 'PASSED' | 'BREACHED' | 'SKIPPED';
  adaptationRecovery: 'PENDING' | 'RECOVERED' | 'NOT_NEEDED' | 'FAILED' | 'SKIPPED';
  timelineTracing: 'PENDING' | 'RECORDED' | 'FAILED';
  explainability: 'PENDING' | 'GENERATED' | 'FAILED';
  experienceLearning: 'PENDING' | 'INGESTED' | 'FAILED' | 'SKIPPED';
  reportGeneration: 'PENDING' | 'GENERATED' | 'FAILED';
  performanceProfiling?: 'PENDING' | 'PROFILED' | 'SKIPPED';
}

export interface SubsystemArtifacts {
  securityScanResult?: any;
  auditLedgerEntry?: any;
  performanceProfile?: any;
  tokenUsageReport?: any;
  swarmConsensusResult?: any;
  goal?: GoalRepresentation;
  context?: RankedProjectContext;
  guardrailPolicy?: DynamicGuardrailPolicy;
  preGuardrailResult?: GuardrailEvaluationResult;
  plan?: IntelligentPlan;
  optimizationResult?: DecisionOptimizationSummary | any;
  validationResult?: PlanValidationResult;
  autonomyDecision?: AutonomyPolicyDecision;
  hitlSession?: HITLSession;
  executionResult?: AdaptiveExecutionResult;
  verificationResult?: VerificationResult;
  postGuardrailResult?: GuardrailEvaluationResult;
  adaptationSession?: AdaptationSession;
  traceId?: string;
  explanation?: DecisionExplanation;
  experienceRecordId?: string;
  developmentReport?: AIDevelopmentReport;
  breaches?: GuardrailBreach[];
}

export type UnifiedDevelopmentReport = AIDevelopmentReport;

export interface OrchestrationSession {
  sessionId: string;
  projectId: string;
  state: OrchestrationState;
  request: OrchestrationRequest;
  artifacts: SubsystemArtifacts;
  subsystemStatus: SubsystemStatusSummary;
  currentProject: AppProject;
  initialProject: AppProject;
  errors: string[];
  warnings: string[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  provenanceHash: string;
}

export interface UnifiedOrchestrationResult {
  sessionId: string;
  projectId: string;
  status: OrchestrationState;
  success: boolean;
  updatedProject: AppProject;
  artifacts: SubsystemArtifacts;
  subsystemStatus: SubsystemStatusSummary;
  markdownReport: string;
  developmentReport: AIDevelopmentReport;
  errors: string[];
  warnings: string[];
  durationMs: number;
  provenanceHash: string;
}
