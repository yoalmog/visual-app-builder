// AI Store: Dedicated state management for AI Conversation, Planning, and Agent Execution
import { create } from 'zustand';
import { AIMessage, AIMode } from '../../builder/schema/ai';
import { AIOperation } from '../operations/AIOperation';
import { PlanOutput, AIPlanner } from '../planner/AIPlanner';
import { ApprovalRequest, ApprovalManager } from '../approval/ApprovalManager';
import { AgentTask } from '../agent/AgentTask';
import { AgentEngine } from '../agent/AgentEngine';
import { AITransactionManager } from '../history/AITransactionManager';
import { ProviderFactory } from '../providers/ProviderFactory';
import { AppProject } from '../../builder/schema/project';
import { ComponentNode } from '../../builder/schema/component';
import { AutonomousVerificationEngine } from '../intelligence/AutonomousVerificationEngine';
import { VerificationResult } from '../intelligence/verification-types';
import { AutonomousRecoveryEngine } from '../intelligence/AutonomousRecoveryEngine';
import { RecoveryResult, RecoverySession } from '../intelligence/recovery-types';
import { AutonomousLearningEngine } from '../intelligence/AutonomousLearningEngine';
import { LearningRecommendation, LearningMetrics } from '../intelligence/learning-types';
import { DecisionOptimizationEngine } from '../intelligence/DecisionOptimizationEngine';
import { DecisionSession, DecisionSelection } from '../intelligence/decision-types';
import { ExecutionTimelineEngine } from '../observability/ExecutionTimelineEngine';
import { ExecutionTimeline, ExecutionEvent } from '../observability/observability-types';
import { ExplainabilityEngine } from '../explainability/ExplainabilityEngine';
import { Explanation } from '../explainability/explainability-types';
import { ControlledAdaptationEngine } from '../intelligence/ControlledAdaptationEngine';
import {
  AdaptationProposal,
  AdaptationSession,
  AdaptationComparison,
  AdaptationFeedback,
} from '../intelligence/adaptation-types';
import { HumanControlCenter } from '../intelligence/HumanControlCenter';
import {
  HITLStatus,
  HITLBreakpoint,
  HITLSession,
  ArbitrationDecision,
  HITLExecutionResult,
  PolicyConflict,
  ArbitrationStrategy,
  StepInterventionPayload,
} from '../intelligence/hitl-types';
import { IntelligentPlan, AutonomyLevel } from '../intelligence/types';
import { DynamicGuardrailsEngine } from '../intelligence/DynamicGuardrailsEngine';
import {
  DynamicGuardrailPolicy,
  GuardrailBreach,
  GuardrailEvaluationResult,
  SafetySynthesisContext,
} from '../intelligence/guardrail-types';
import { UnifiedOrchestrationEngine } from '../intelligence/UnifiedOrchestrationEngine';
import {
  OrchestrationSession,
  UnifiedOrchestrationResult,
  OrchestrationRequest,
} from '../intelligence/orchestration-types';
import { MultiAgentSecurityAuditor } from '../security/MultiAgentSecurityAuditor';
import { CryptographicAuditLedger } from '../security/CryptographicAuditLedger';
import {
  SecurityScanResult,
  LedgerVerificationResult,
  SecurityAuditContext,
} from '../security/security-types';
import { PerformanceProfilerEngine } from '../performance/PerformanceProfilerEngine';
import { IntelligentCacheEngine } from '../performance/IntelligentCacheEngine';
import { TokenEconomicsEngine } from '../performance/TokenEconomicsEngine';
import {
  PipelinePerformanceProfile,
  TokenUsageReport,
  CacheStats,
} from '../performance/performance-types';
import { SwarmConsensusEngine } from '../swarm/SwarmConsensusEngine';
import { SwarmPersonaRegistry } from '../swarm/SwarmPersonaRegistry';
import {
  SwarmConsensusResult,
  AgentPersona,
  SwarmConfig,
} from '../swarm/swarm-types';
import { PlatformCertificationEngine } from '../certification/PlatformCertificationEngine';
import { PlatformCertificationReport } from '../certification/certification-types';
import { FullPlatformCertificationEngine, MasterPlatformCertificationResult } from '../certification/FullPlatformCertificationEngine';
import {
  EnterprisePlatformRecoveryManager,
  EnterprisePlatformState,
  defaultEnterprisePlatformRecoveryManager,
} from '../../builder/platform/enterprise/EnterprisePlatformRecoveryManager';

export interface AIStoreState {
  isOpen: boolean;
  mode: AIMode;
  messages: AIMessage[];
  currentPlan: PlanOutput | null;
  pendingOperations: AIOperation[];
  pendingApproval: ApprovalRequest | null;
  activeAgentTask: AgentTask | null;
  isGenerating: boolean;
  streamStage: string;
  streamPercent: number;
  lastGenerationId: string | null;
  error: string | null;
  verificationStatus: 'idle' | 'executing' | 'verifying' | 'verified' | 'failed' | 'uncertain' | 'blocked' | 'recovery_required';
  lastVerificationResult: VerificationResult | null;
  recoveryStatus: 'idle' | 'diagnosing' | 'recovering' | 'verifying' | 'recovered' | 'failed' | 'blocked' | 'uncertain' | 'awaiting_approval';
  lastRecoveryResult: RecoveryResult | null;
  learningStatus: 'idle' | 'matching' | 'recommending' | 'applied' | 'rejected' | 'blocked';
  activeRecommendations: LearningRecommendation[];
  learningMetrics: Partial<LearningMetrics> | null;
  decisionStatus: 'idle' | 'analyzing' | 'selected' | 'awaiting_approval' | 'executing' | 'verified' | 'blocked' | 'uncertain' | 'failed';
  activeDecisionSession: DecisionSession | null;
  activeDecisionSelection: DecisionSelection | null;
  timelineStatus: 'idle' | 'running' | 'completed' | 'failed' | 'blocked' | 'uncertain';
  activeTraceId: string | null;
  activeTimeline: ExecutionTimeline | null;
  timelineEvents: ExecutionEvent[];
  explanationStatus: 'idle' | 'explaining' | 'completed' | 'uncertain' | 'blocked' | 'failed';
  activeExplanation: Explanation | null;
  explanationError: string | null;
  adaptationStatus: 'idle' | 'proposing' | 'proposed' | 'awaiting_approval' | 'applying' | 'verified' | 'improved' | 'inconclusive' | 'regressed' | 'rolled_back' | 'blocked' | 'uncertain' | 'failed';
  activeAdaptationProposals: AdaptationProposal[];
  activeAdaptationSession: AdaptationSession | null;
  activeAdaptationComparison: AdaptationComparison | null;
  adaptationError: string | null;

  // HITL State
  hitlStatus: HITLStatus;
  activeHitlSession: HITLSession | null;
  activeBreakpoints: HITLBreakpoint[];
  lastArbitrationDecision: ArbitrationDecision | null;
  hitlError: string | null;

  // Dynamic Guardrails State
  activeGuardrailPolicy: DynamicGuardrailPolicy | null;
  lastGuardrailEvaluation: GuardrailEvaluationResult | null;
  guardrailBreaches: GuardrailBreach[];

  // Unified Orchestration State
  activeOrchestrationSession: OrchestrationSession | null;
  lastOrchestrationResult: UnifiedOrchestrationResult | null;
  orchestrationStatus: 'idle' | 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'contained';

  // Security State (D8.16)
  securityStatus: 'clean' | 'warning' | 'quarantined' | 'auditing';
  lastSecurityScan: SecurityScanResult | null;
  ledgerIntegrity: LedgerVerificationResult | null;

  // Performance & Token Economics State (D8.17)
  performanceProfile: PipelinePerformanceProfile | null;
  tokenUsageReport: TokenUsageReport | null;
  cacheStats: CacheStats | null;

  // Swarm Consensus State (D8.19)
  activeSwarmResult: SwarmConsensusResult | null;
  isSwarmDebating: boolean;
  activeSwarmPersonas: AgentPersona[];

  // Platform Certification State (D8.20)
  certificationReport: PlatformCertificationReport | null;
  isCertifying: boolean;

  // Master Full-Platform Certification (Workstream E12)
  masterCertificationResult: MasterPlatformCertificationResult | null;
  isMasterCertifying: boolean;
  enterprisePlatformState: EnterprisePlatformState | null;

  // Actions
  setOpen: (open: boolean) => void;
  setMode: (mode: AIMode) => void;
  fetchTimeline: (traceId: string, projectId: string) => ExecutionTimeline | null;
  explainTrace: (params: { traceId: string; projectId: string; userPrompt?: string }) => Promise<Explanation | undefined>;
  clearExplanation: () => void;
  proposeAdaptations: (params: { project: AppProject; maxCandidates?: number }) => Promise<AdaptationProposal[]>;
  applyAdaptation: (params: { proposal: AdaptationProposal; project: AppProject; isApproved?: boolean }) => Promise<{ success: boolean; project?: AppProject; comparison?: AdaptationComparison; error?: string }>;
  rollbackAdaptationSession: (params: { sessionId: string; project: AppProject }) => Promise<{ success: boolean; project?: AppProject; error?: string }>;
  clearAdaptation: () => void;

  // Guardrail Actions
  synthesizeGuardrails: (context: SafetySynthesisContext) => DynamicGuardrailPolicy;
  evaluatePreExecutionGuardrails: (params: { policyId: string; project: AppProject; planOrOperations: any; operatorRole?: string; targetEntities?: string[] }) => GuardrailEvaluationResult;
  clearGuardrails: () => void;

  // Orchestration Actions
  runUnifiedOrchestration: (request: OrchestrationRequest, project: AppProject) => Promise<UnifiedOrchestrationResult>;
  cancelOrchestrationSession: (sessionId: string) => void;
  clearOrchestration: () => void;

  // Security Actions (D8.16)
  auditSecurity: (params: { target: any; type?: 'code' | 'prompt' | 'plan' | 'component' | 'project'; context?: SecurityAuditContext }) => SecurityScanResult;
  verifySecurityLedger: () => LedgerVerificationResult;
  clearSecurityQuarantine: () => void;

  // Performance Actions (D8.17)
  getPerformanceMetrics: () => PipelinePerformanceProfile;
  getTokenEconomicsReport: (prompt: string, completion?: string) => TokenUsageReport;
  getCacheStats: () => CacheStats;
  clearCache: () => void;

  // Swarm Consensus Actions (D8.19)
  runSwarmDebate: (params: { goal: string; project: AppProject; config?: SwarmConfig }) => Promise<SwarmConsensusResult>;
  getSwarmPersonas: () => AgentPersona[];
  clearSwarm: () => void;

  // Platform Certification Actions (D8.20)
  runPlatformCertification: () => Promise<PlatformCertificationReport>;
  loadPlatformCertification: () => PlatformCertificationReport | null;

  // Full-Spectrum Master Platform Certification Actions (E12)
  runMasterPlatformCertification: () => Promise<MasterPlatformCertificationResult>;
  loadMasterPlatformCertification: () => MasterPlatformCertificationResult | null;
  loadEnterprisePlatformState: () => EnterprisePlatformState;

  // HITL Actions
  startHitlExecution: (params: { sessionId?: string; project: AppProject; plan?: IntelligentPlan; autonomyLevel?: AutonomyLevel }) => Promise<HITLExecutionResult>;
  pauseHitlExecution: (sessionId: string, reason?: string) => void;
  resumeHitlExecution: (sessionId: string, project: AppProject) => Promise<HITLExecutionResult>;
  stepNextHitl: (sessionId: string, project: AppProject, intervention?: StepInterventionPayload) => Promise<HITLExecutionResult>;
  emergencyStopHitl: (sessionId: string, project: AppProject, operatorId: string, reason: string) => Promise<{ success: boolean; project?: AppProject }>;
  arbitratePolicy: (params: { conflict: PolicyConflict; operatorRole: string; requestedStrategy?: ArbitrationStrategy; operatorId: string; justification: string; projectId?: string }) => ArbitrationDecision;
  addHitlBreakpoint: (projectId: string, bp: Omit<HITLBreakpoint, 'id' | 'hitCount' | 'createdAt'>) => HITLBreakpoint;
  removeHitlBreakpoint: (projectId: string, bpId: string) => void;
  sendMessage: (params: {
    prompt: string;
    project: AppProject;
    activePageId?: string;
    selectedNode?: ComponentNode | null;
    environment?: 'development' | 'preview' | 'production';
  }) => Promise<AppProject | undefined>;
  applyPlan: (project: AppProject) => AppProject | undefined;
  recoverVerificationFailure: (params: { project: AppProject; verificationResult: VerificationResult }) => Promise<AppProject | undefined>;
  approveRecovery: (project: AppProject) => Promise<AppProject | undefined>;
  fetchRecommendations: (params: { project: AppProject; targetOperationType?: string; failureCategory?: string }) => Promise<LearningRecommendation[]>;
  applyRecommendation: (params: { recommendation: LearningRecommendation; project: AppProject; isApproved?: boolean }) => Promise<AppProject | undefined>;
  rejectRecommendation: (params: { recommendation: LearningRecommendation; project: AppProject; reason?: string }) => void;
  optimizeDecision: (params: { project: AppProject; intent: string; environment?: string }) => Promise<DecisionSelection | undefined>;
  applyDecision: (params: { project: AppProject; isApproved?: boolean }) => Promise<AppProject | undefined>;
  correctDecision: (params: { project: AppProject; alternativeCandidateId: string; notes?: string }) => Promise<AppProject | undefined>;
  rollbackLast: () => { success: boolean; restoredProject?: AppProject; error?: string };
  approvePending: (project: AppProject) => AppProject | undefined;
  cancelGeneration: () => void;
  clearConversation: () => void;
}

let activeAbortController: AbortController | null = null;

export const useAIStore = create<AIStoreState>((set, get) => ({
  isOpen: false,
  mode: 'generate',
  messages: [
    {
      id: 'welcome_msg',
      role: 'assistant',
      content:
        '👋 Welcome to the AI Application Builder! Tell me what you want to build (e.g. "Build me a restaurant app" or "Create a customer dashboard") or ask me to modify the selected component.',
      timestamp: new Date().toISOString(),
      suggestedActions: [
        'Build me a restaurant ordering app',
        'Create a customer CRM dashboard',
        'Add a pricing section with three plans',
        'Make this page look good on mobile',
      ],
    },
  ],
  currentPlan: null,
  pendingOperations: [],
  pendingApproval: null,
  activeAgentTask: null,
  isGenerating: false,
  streamStage: '',
  streamPercent: 0,
  lastGenerationId: null,
  error: null,
  verificationStatus: 'idle',
  lastVerificationResult: null,
  recoveryStatus: 'idle',
  lastRecoveryResult: null,
  learningStatus: 'idle',
  activeRecommendations: [],
  learningMetrics: null,
  decisionStatus: 'idle',
  activeDecisionSession: null,
  activeDecisionSelection: null,
  timelineStatus: 'idle',
  activeTraceId: null,
  activeTimeline: null,
  timelineEvents: [],
  explanationStatus: 'idle',
  activeExplanation: null,
  explanationError: null,
  adaptationStatus: 'idle',
  activeAdaptationProposals: [],
  activeAdaptationSession: null,
  activeAdaptationComparison: null,
  adaptationError: null,
  hitlStatus: 'IDLE',
  activeHitlSession: null,
  activeBreakpoints: [],
  lastArbitrationDecision: null,
  hitlError: null,
  activeGuardrailPolicy: null,
  lastGuardrailEvaluation: null,
  guardrailBreaches: [],
  activeOrchestrationSession: null,
  lastOrchestrationResult: null,
  orchestrationStatus: 'idle',
  securityStatus: 'clean',
  lastSecurityScan: null,
  ledgerIntegrity: null,
  performanceProfile: null,
  tokenUsageReport: null,
  cacheStats: null,
  activeSwarmResult: null,
  isSwarmDebating: false,
  activeSwarmPersonas: SwarmPersonaRegistry.getPersonas(),
  certificationReport: null,
  isCertifying: false,
  masterCertificationResult: null,
  isMasterCertifying: false,
  enterprisePlatformState: null,

  setOpen: (open: boolean) => set({ isOpen: open }),
  setMode: (mode: AIMode) => set({ mode }),
  fetchTimeline: (traceId: string, projectId: string) => ExecutionTimelineEngine.getTimeline(traceId, projectId),
  explainTrace: async ({ traceId, projectId, userPrompt }) => {
    set({ explanationStatus: 'explaining', explanationError: null });
    try {
      const explanation = await ExplainabilityEngine.explain({
        requestId: `req_exp_${Date.now()}`,
        projectId,
        traceId,
        userPrompt,
        requestedAt: new Date().toISOString(),
      });
      set({
        explanationStatus: explanation.status === 'COMPLETED' ? 'completed' : explanation.status === 'UNCERTAIN' ? 'uncertain' : explanation.status === 'BLOCKED' ? 'blocked' : 'failed',
        activeExplanation: explanation,
      });
      return explanation;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to generate explanation';
      set({ explanationStatus: 'failed', explanationError: errorMsg });
      return undefined;
    }
  },
  clearExplanation: () => set({ activeExplanation: null, explanationStatus: 'idle', explanationError: null }),

  proposeAdaptations: async ({ project, maxCandidates }) => {
    set({ adaptationStatus: 'proposing', adaptationError: null });
    try {
      const proposals = await ControlledAdaptationEngine.proposeAdaptations({
        project,
        experienceLookbackCount: maxCandidates || 50,
      });
      set({
        activeAdaptationProposals: proposals,
        adaptationStatus: proposals.length > 0 ? 'proposed' : 'idle',
      });
      return proposals;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to propose adaptations';
      set({ adaptationStatus: 'failed', adaptationError: errorMsg });
      return [];
    }
  },

  applyAdaptation: async ({ proposal, project, isApproved }) => {
    set({ adaptationStatus: 'applying', adaptationError: null });
    try {
      const res = await ControlledAdaptationEngine.applyAdaptation({
        proposal,
        project,
        isApproved,
      });

      let nextStatus: AIStoreState['adaptationStatus'] = 'failed';
      if (res.status === 'IMPROVED') nextStatus = 'improved';
      else if (res.status === 'ACCEPTED') nextStatus = 'inconclusive';
      else if (res.status === 'ROLLED_BACK') nextStatus = 'rolled_back';
      else if (res.status === 'BLOCKED') nextStatus = 'blocked';
      else if (res.status === 'UNCERTAIN') nextStatus = 'uncertain';

      const session = ControlledAdaptationEngine.getSession(`sess-${proposal.adaptationId}`) || null;

      set({
        adaptationStatus: nextStatus,
        activeAdaptationSession: session,
        activeAdaptationComparison: res.comparison || null,
        adaptationError: res.error || null,
      });

      return {
        success: res.success,
        project: res.updatedProject,
        comparison: res.comparison,
        error: res.error,
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Adaptation application failed';
      set({ adaptationStatus: 'failed', adaptationError: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  rollbackAdaptationSession: async ({ sessionId, project }) => {
    set({ adaptationStatus: 'applying', adaptationError: null });
    try {
      const res = await ControlledAdaptationEngine.rollbackAdaptation({
        sessionId,
        project,
      });
      set({
        adaptationStatus: res.success ? 'rolled_back' : 'failed',
        adaptationError: res.rollback.error || null,
      });
      return {
        success: res.success,
        project: res.restoredProject,
        error: res.rollback.error,
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Adaptation rollback failed';
      set({ adaptationStatus: 'failed', adaptationError: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  clearAdaptation: () => set({
    adaptationStatus: 'idle',
    activeAdaptationProposals: [],
    activeAdaptationSession: null,
    activeAdaptationComparison: null,
    adaptationError: null,
  }),

  synthesizeGuardrails: (context: SafetySynthesisContext) => {
    const policy = DynamicGuardrailsEngine.synthesizePolicy(context);
    set({ activeGuardrailPolicy: policy });
    return policy;
  },

  evaluatePreExecutionGuardrails: (params: any) => {
    const result = DynamicGuardrailsEngine.evaluatePreExecution({
      policyId: params.policyId,
      project: params.project || ({ id: 'default', pages: [] } as any),
      planOrOperations: params.planOrOperations,
      operatorRole: params.operatorRole || 'editor',
    });
    set({ lastGuardrailEvaluation: result, guardrailBreaches: result.breaches });
    return result;
  },

  clearGuardrails: () => {
    set({ activeGuardrailPolicy: null, lastGuardrailEvaluation: null, guardrailBreaches: [] });
  },

  runUnifiedOrchestration: async (request: OrchestrationRequest, project: AppProject) => {
    set({ orchestrationStatus: 'running' });
    try {
      const result = await UnifiedOrchestrationEngine.orchestrate(request, project);
      const session = UnifiedOrchestrationEngine.getSession(result.sessionId) || null;
      set({
        activeOrchestrationSession: session,
        lastOrchestrationResult: result,
        orchestrationStatus: result.success
          ? 'completed'
          : result.status === 'AWAITING_APPROVAL'
          ? 'awaiting_approval'
          : result.status === 'CONTAINED_AND_ROLLED_BACK'
          ? 'contained'
          : 'failed',
      });
      return result;
    } catch (err: any) {
      set({ orchestrationStatus: 'failed', error: err.message });
      throw err;
    }
  },

  cancelOrchestrationSession: (sessionId: string) => {
    UnifiedOrchestrationEngine.cancelSession(sessionId);
    const session = UnifiedOrchestrationEngine.getSession(sessionId) || null;
    set({ activeOrchestrationSession: session, orchestrationStatus: 'failed' });
  },

  clearOrchestration: () => {
    set({
      activeOrchestrationSession: null,
      lastOrchestrationResult: null,
      orchestrationStatus: 'idle',
    });
  },

  auditSecurity: ({ target, type = 'code', context }) => {
    set({ securityStatus: 'auditing' });
    let scanResult: SecurityScanResult;
    switch (type) {
      case 'prompt':
        scanResult = MultiAgentSecurityAuditor.auditAgentPrompt(target, context?.actorRole, context);
        break;
      case 'plan':
        scanResult = MultiAgentSecurityAuditor.auditPlan(target, context);
        break;
      case 'component':
        scanResult = MultiAgentSecurityAuditor.auditComponent(target, context);
        break;
      case 'project':
        scanResult = MultiAgentSecurityAuditor.auditProject(target, context);
        break;
      case 'code':
      default:
        scanResult = MultiAgentSecurityAuditor.auditCodeString(typeof target === 'string' ? target : JSON.stringify(target), context);
        break;
    }

    const newStatus = scanResult.quarantineRecommended
      ? 'quarantined'
      : !scanResult.safe
      ? 'warning'
      : 'clean';

    set({ securityStatus: newStatus, lastSecurityScan: scanResult });
    return scanResult;
  },

  verifySecurityLedger: () => {
    const integrity = CryptographicAuditLedger.verifyLedgerIntegrity();
    set({ ledgerIntegrity: integrity });
    return integrity;
  },

  clearSecurityQuarantine: () => {
    set({ securityStatus: 'clean', lastSecurityScan: null });
  },

  getPerformanceMetrics: () => {
    const profile = PerformanceProfilerEngine.computeProfile();
    set({ performanceProfile: profile });
    return profile;
  },

  getTokenEconomicsReport: (prompt: string, completion?: string) => {
    const report = TokenEconomicsEngine.buildUsageReport({ prompt, completion });
    set({ tokenUsageReport: report });
    return report;
  },

  getCacheStats: () => {
    const stats = IntelligentCacheEngine.getStats();
    set({ cacheStats: stats });
    return stats;
  },

  clearCache: () => {
    IntelligentCacheEngine.clear();
    set({ cacheStats: IntelligentCacheEngine.getStats() });
  },

  runSwarmDebate: async ({ goal, project, config }) => {
    set({ isSwarmDebating: true });
    try {
      const result = await SwarmConsensusEngine.runDebate({ goal, project, config });
      set({ activeSwarmResult: result, isSwarmDebating: false });
      return result;
    } catch (err) {
      set({ isSwarmDebating: false });
      throw err;
    }
  },

  getSwarmPersonas: () => {
    const personas = SwarmPersonaRegistry.getPersonas();
    set({ activeSwarmPersonas: personas });
    return personas;
  },

  clearSwarm: () => {
    SwarmPersonaRegistry.reset();
    set({
      activeSwarmResult: null,
      isSwarmDebating: false,
      activeSwarmPersonas: SwarmPersonaRegistry.getPersonas(),
    });
  },

  runPlatformCertification: async () => {
    set({ isCertifying: true });
    try {
      const report = await PlatformCertificationEngine.runPlatformCertification();
      set({ certificationReport: report, isCertifying: false });
      return report;
    } catch (err) {
      set({ isCertifying: false });
      throw err;
    }
  },

  loadPlatformCertification: () => {
    const report = PlatformCertificationEngine.getLatestCertification();
    if (report) {
      set({ certificationReport: report });
    }
    return report;
  },

  runMasterPlatformCertification: async () => {
    set({ isMasterCertifying: true });
    try {
      const result = await FullPlatformCertificationEngine.executeFullCertification();
      const recMgr = defaultEnterprisePlatformRecoveryManager;
      const state = recMgr.loadState();
      set({ masterCertificationResult: result, enterprisePlatformState: state, isMasterCertifying: false });
      return result;
    } catch (err) {
      set({ isMasterCertifying: false });
      throw err;
    }
  },

  loadMasterPlatformCertification: () => {
    const result = FullPlatformCertificationEngine.getLatestCertification();
    if (result) {
      set({ masterCertificationResult: result });
    }
    return result;
  },

  loadEnterprisePlatformState: () => {
    const recMgr = defaultEnterprisePlatformRecoveryManager;
    const state = recMgr.loadState();
    set({ enterprisePlatformState: state });
    return state;
  },

  startHitlExecution: async ({ sessionId, project, plan, autonomyLevel }) => {
    set({ hitlStatus: 'MONITORING', hitlError: null });
    try {
      const session = HumanControlCenter.createSession({
        sessionId,
        projectId: project.id,
        plan,
        autonomyLevel,
      });
      set({ activeHitlSession: session, activeBreakpoints: session.activeBreakpoints });
      const res = await HumanControlCenter.startExecution(session.sessionId, project);
      set({
        hitlStatus: res.status,
        activeHitlSession: HumanControlCenter.getSession(session.sessionId) || null,
        hitlError: res.error || null,
      });
      return res;
    } catch (err: any) {
      const errorMsg = err?.message || 'HITL execution failed';
      set({ hitlStatus: 'INTERVENING', hitlError: errorMsg });
      return { success: false, status: 'INTERVENING', currentStepIndex: 0, totalSteps: 0, error: errorMsg };
    }
  },

  pauseHitlExecution: (sessionId: string, reason?: string) => {
    try {
      const session = HumanControlCenter.pauseExecution(sessionId, reason);
      set({ hitlStatus: session.status, activeHitlSession: session });
    } catch {}
  },

  resumeHitlExecution: async (sessionId: string, project: AppProject) => {
    set({ hitlStatus: 'MONITORING', hitlError: null });
    try {
      const res = await HumanControlCenter.resumeExecution(sessionId, project);
      set({
        hitlStatus: res.status,
        activeHitlSession: HumanControlCenter.getSession(sessionId) || null,
        hitlError: res.error || null,
      });
      return res;
    } catch (err: any) {
      const errorMsg = err?.message || 'HITL resume failed';
      set({ hitlStatus: 'INTERVENING', hitlError: errorMsg });
      return { success: false, status: 'INTERVENING', currentStepIndex: 0, totalSteps: 0, error: errorMsg };
    }
  },

  stepNextHitl: async (sessionId: string, project: AppProject, intervention?: StepInterventionPayload) => {
    set({ hitlStatus: 'STEPPING', hitlError: null });
    try {
      const res = await HumanControlCenter.stepNext(sessionId, project, intervention);
      set({
        hitlStatus: res.status,
        activeHitlSession: HumanControlCenter.getSession(sessionId) || null,
        hitlError: res.error || null,
      });
      return res;
    } catch (err: any) {
      const errorMsg = err?.message || 'Step execution failed';
      set({ hitlStatus: 'INTERVENING', hitlError: errorMsg });
      return { success: false, status: 'INTERVENING', currentStepIndex: 0, totalSteps: 0, error: errorMsg };
    }
  },

  emergencyStopHitl: async (sessionId: string, project: AppProject, operatorId: string, reason: string) => {
    try {
      const res = await HumanControlCenter.emergencyStop(sessionId, project, operatorId, reason);
      set({
        hitlStatus: 'EMERGENCY_STOPPED',
        activeHitlSession: HumanControlCenter.getSession(sessionId) || null,
      });
      return { success: res.success, project: res.restoredProject };
    } catch (err: any) {
      return { success: false };
    }
  },

  arbitratePolicy: (params) => {
    const decision = HumanControlCenter.arbitratePolicyConflict(params);
    set({ lastArbitrationDecision: decision });
    return decision;
  },

  addHitlBreakpoint: (projectId, bp) => {
    const newBp = HumanControlCenter.addBreakpoint(projectId, bp);
    set({ activeBreakpoints: HumanControlCenter.getBreakpoints(projectId) });
    return newBp;
  },

  removeHitlBreakpoint: (projectId, bpId) => {
    HumanControlCenter.removeBreakpoint(projectId, bpId);
    set({ activeBreakpoints: HumanControlCenter.getBreakpoints(projectId) });
  },


  sendMessage: async ({ prompt, project, activePageId, selectedNode, environment }) => {
    const userMsg: AIMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    // Initialize D8.10 Execution Trace
    const trace = ExecutionTimelineEngine.startTrace({
      projectId: project.id,
      sessionId: `sess_${Date.now()}`,
      requestId: `req_${Date.now()}`,
      context: { environment: environment || 'development' },
    });

    ExecutionTimelineEngine.recordEvent({
      eventType: 'REQUEST_RECEIVED',
      status: 'STARTED',
      source: 'USER',
      severity: 'INFO',
      correlation: {
        traceId: trace.traceId,
        sessionId: trace.sessionId,
        projectId: project.id,
      },
      metadata: { promptLength: prompt.length },
    });

    set((s) => ({
      messages: [...s.messages, userMsg],
      isGenerating: true,
      error: null,
      streamStage: 'Analyzing request...',
      streamPercent: 10,
      activeTraceId: trace.traceId,
      timelineStatus: 'running',
      timelineEvents: [...trace.events],
    }));

    activeAbortController = new AbortController();

    try {
      if (get().mode === 'agent') {
        set({ streamStage: 'Agent executing multi-step task...', streamPercent: 40 });

        const task = await AgentEngine.runTask({
          goal: prompt,
          project,
          environment: environment || 'development',
          signal: activeAbortController.signal,
        });

        set({ activeAgentTask: task, isGenerating: false, streamPercent: 100 });

        if (task.status === 'waiting_approval' && task.pendingApproval) {
          const approvalReq: ApprovalRequest = {
            id: `req_${Date.now()}`,
            generationId: task.id,
            operations: task.pendingApproval.operations,
            highestRisk: task.pendingApproval.highestRisk,
            reason: task.pendingApproval.reason,
            environment: environment || 'development',
            status: 'pending',
            createdAt: new Date().toISOString(),
          };

          const assistantMsg: AIMessage = {
            id: `msg_asst_${Date.now()}`,
            role: 'assistant',
            content: `Agent paused at step ${task.currentStep}: Approval required for ${task.pendingApproval.highestRisk.toUpperCase()} risk operations.\nReason: ${task.pendingApproval.reason}`,
            timestamp: new Date().toISOString(),
          };

          set((s) => ({
            messages: [...s.messages, assistantMsg],
            pendingApproval: approvalReq,
            pendingOperations: task.pendingApproval!.operations,
          }));

          return undefined;
        }

        const assistantMsg: AIMessage = {
          id: `msg_asst_${Date.now()}`,
          role: 'assistant',
          content: `Agent completed task in ${task.steps.length} steps: ${task.appliedOperations.length} operations applied successfully.`,
          timestamp: new Date().toISOString(),
        };

        set((s) => ({
          messages: [...s.messages, assistantMsg],
        }));

        return undefined;
      }

      // Standard Generation / Edit / Ask mode
      const provider = ProviderFactory.getProvider(project.aiMetadata?.settings?.provider || 'mock');

      let streamedText = '';
      await provider.stream?.(
        {
          id: `req_${Date.now()}`,
          prompt,
          context: { project, activePageId, selectedNode },
          signal: activeAbortController.signal,
        },
        {
          onToken: (token) => {
            streamedText += token;
          },
          onProgress: (stage, percent) => {
            set({ streamStage: stage, streamPercent: percent || 50 });
          },
        }
      );

      const plan = AIPlanner.plan({
        prompt,
        project,
        activePageId,
        selectedNode,
      });

      set({
        currentPlan: plan,
        pendingOperations: plan.operations,
        streamPercent: 90,
      });

      // Check if approval is required
      const approvalCheck = ApprovalManager.requiresApproval({
        operations: plan.operations,
        safetyMode: project.aiMetadata?.settings?.safetyMode || 'approval',
        environment: environment || 'development',
      });

      if (approvalCheck.required) {
        const approvalReq: ApprovalRequest = {
          id: `req_${Date.now()}`,
          generationId: `gen_${Date.now()}`,
          operations: plan.operations,
          highestRisk: approvalCheck.highestRisk,
          reason: approvalCheck.reason,
          environment: environment || 'development',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        const assistantMsg: AIMessage = {
          id: `msg_asst_${Date.now()}`,
          role: 'assistant',
          content: `${plan.explanation}\n\n⚠️ **Approval Required**: ${approvalCheck.reason}\nReview the proposed operations below to proceed.`,
          timestamp: new Date().toISOString(),
        };

        set((s) => ({
          messages: [...s.messages, assistantMsg],
          pendingApproval: approvalReq,
          isGenerating: false,
          streamPercent: 100,
        }));

        return undefined;
      }

      // Automatically apply if safe or user setting allows
      if (plan.operations.length > 0) {
        const tx = AITransactionManager.executeTransaction({
          project,
          operations: plan.operations,
          prompt,
          mode: get().mode,
        });

        if (tx.success) {
          const verification = AutonomousVerificationEngine.verify({
            intent: prompt,
            projectVersion: tx.updatedProject.version,
            expectedChanges: plan.operations.map((op) => {
              const entityId = (op as any).targetId || (op as any).pageId || (op as any).componentId || (op as any).collectionId || (op as any).workflowId || op.id;
              return {
                entityType: (op.type.includes('page') ? 'page' : op.type.includes('collection') ? 'collection' : op.type.includes('workflow') ? 'workflow' : 'component') as any,
                entityId,
                changeType: (op.type.startsWith('create') ? 'create' : op.type.startsWith('delete') ? 'delete' : 'update') as any,
              };
            }),
            expectedPostconditions: [],
            affectedResources: plan.operations.map((op) => {
              const entityId = (op as any).targetId || (op as any).pageId || (op as any).componentId || (op as any).collectionId || (op as any).workflowId || op.id;
              return { type: 'entity', id: entityId };
            }),
            riskLevel: 'LOW',
            projectBefore: project,
            projectAfter: tx.updatedProject,
          });

          const vStatus =
            verification.status === 'PASS'
              ? 'verified'
              : verification.recoveryPlan
              ? 'recovery_required'
              : verification.status === 'UNCERTAIN'
              ? 'uncertain'
              : 'failed';

          // Emit D8.10 Execution Timeline Events
          ExecutionTimelineEngine.recordEvent({
            eventType: 'TRANSACTION_COMMITTED',
            status: 'COMPLETED',
            source: 'TRANSACTION_MANAGER',
            severity: 'INFO',
            correlation: {
              traceId: trace.traceId,
              sessionId: trace.sessionId,
              projectId: project.id,
              transactionId: tx.generationId,
            },
            metadata: { appliedOperationsCount: tx.appliedOperations.length },
          });

          ExecutionTimelineEngine.recordEvent({
            eventType: verification.status === 'PASS' ? 'VERIFICATION_PASSED' : 'VERIFICATION_FAILED',
            status: verification.status === 'PASS' ? 'PASSED' : 'FAILED',
            source: 'VERIFICATION_ENGINE',
            severity: verification.status === 'PASS' ? 'INFO' : 'HIGH',
            correlation: {
              traceId: trace.traceId,
              sessionId: trace.sessionId,
              projectId: project.id,
              transactionId: tx.generationId,
            },
            evidence: {
              summary: `${verification.summary.passedChecks}/${verification.summary.totalChecks} checks passed`,
              passedChecks: verification.summary.passedChecks,
              totalChecks: verification.summary.totalChecks,
            },
          });

          ExecutionTimelineEngine.endTrace(trace.traceId, verification.status === 'PASS' ? 'PASSED' : 'FAILED');
          const finalTimeline = ExecutionTimelineEngine.getTimeline(trace.traceId, project.id);

          const assistantMsg: AIMessage = {
            id: `msg_asst_${Date.now()}`,
            role: 'assistant',
            content: `${plan.explanation}\n\n✅ Applied ${tx.appliedOperations.length} changes successfully.\nVerification: ${verification.status} (${verification.summary.passedChecks}/${verification.summary.totalChecks} checks passed).`,
            timestamp: new Date().toISOString(),
          };

          set((s) => ({
            messages: [...s.messages, assistantMsg],
            lastGenerationId: tx.generationId,
            pendingOperations: [],
            currentPlan: null,
            isGenerating: false,
            streamPercent: 100,
            verificationStatus: vStatus,
            lastVerificationResult: verification,
            activeTimeline: finalTimeline,
            timelineEvents: finalTimeline?.events || [],
            timelineStatus: verification.status === 'PASS' ? 'completed' : 'failed',
          }));

          return tx.updatedProject;
        } else {
          throw new Error(tx.errors?.join(', ') || 'Transaction failed');
        }
      } else {
        ExecutionTimelineEngine.endTrace(trace.traceId, 'COMPLETED');
        const finalTimeline = ExecutionTimelineEngine.getTimeline(trace.traceId, project.id);

        const assistantMsg: AIMessage = {
          id: `msg_asst_${Date.now()}`,
          role: 'assistant',
          content: plan.explanation,
          timestamp: new Date().toISOString(),
        };

        set((s) => ({
          messages: [...s.messages, assistantMsg],
          isGenerating: false,
          streamPercent: 100,
          activeTimeline: finalTimeline,
          timelineEvents: finalTimeline?.events || [],
          timelineStatus: 'completed',
        }));

        return undefined;
      }
    } catch (err: any) {
      ExecutionTimelineEngine.recordEvent({
        eventType: 'REQUEST_FAILED',
        status: 'FAILED',
        source: 'SYSTEM',
        severity: 'HIGH',
        correlation: {
          traceId: trace.traceId,
          sessionId: trace.sessionId,
          projectId: project.id,
        },
        outcome: {
          status: 'FAILED',
          summary: err.message || 'AI generation failed',
          error: err.message,
        },
      });
      ExecutionTimelineEngine.endTrace(trace.traceId, 'FAILED');
      const finalTimeline = ExecutionTimelineEngine.getTimeline(trace.traceId, project.id);

      const errorMsg: AIMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `❌ Error: ${err.message || 'AI generation failed.'}`,
        timestamp: new Date().toISOString(),
      };

      set((s) => ({
        messages: [...s.messages, errorMsg],
        isGenerating: false,
        error: err.message,
        activeTimeline: finalTimeline,
        timelineEvents: finalTimeline?.events || [],
        timelineStatus: 'failed',
      }));

      return undefined;
    } finally {
      activeAbortController = null;
    }
  },

  applyPlan: (project: AppProject) => {
    const ops = get().pendingOperations;
    if (ops.length === 0) return undefined;

    const tx = AITransactionManager.executeTransaction({
      project,
      operations: ops,
      prompt: 'Manual plan application',
      mode: get().mode,
    });

    if (tx.success) {
      const verification = AutonomousVerificationEngine.verify({
        intent: 'Manual plan application',
        projectVersion: tx.updatedProject.version,
        expectedChanges: ops.map((op) => {
          const entityId = (op as any).targetId || (op as any).pageId || (op as any).componentId || (op as any).collectionId || (op as any).workflowId || op.id;
          return {
            entityType: (op.type.includes('page') ? 'page' : op.type.includes('collection') ? 'collection' : op.type.includes('workflow') ? 'workflow' : 'component') as any,
            entityId,
            changeType: (op.type.startsWith('create') ? 'create' : op.type.startsWith('delete') ? 'delete' : 'update') as any,
          };
        }),
        expectedPostconditions: [],
        affectedResources: ops.map((op) => {
          const entityId = (op as any).targetId || (op as any).pageId || (op as any).componentId || (op as any).collectionId || (op as any).workflowId || op.id;
          return { type: 'entity', id: entityId };
        }),
        riskLevel: 'LOW',
        projectBefore: project,
        projectAfter: tx.updatedProject,
      });

      // Closed-loop learning observations
      AutonomousLearningEngine.observeExecution({
        projectId: project.id,
        projectVersion: tx.updatedProject.version,
        operations: ops,
        success: true,
      });
      AutonomousLearningEngine.observeVerification({
        projectId: project.id,
        projectVersion: tx.updatedProject.version,
        verificationResult: verification,
        operations: ops,
      });

      set({
        pendingOperations: [],
        currentPlan: null,
        pendingApproval: null,
        lastGenerationId: tx.generationId,
        verificationStatus: verification.status === 'PASS' ? 'verified' : 'recovery_required',
        lastVerificationResult: verification,
      });
      return tx.updatedProject;
    }

    set({ error: tx.errors?.join(', ') || 'Application failed' });
    return undefined;
  },

  recoverVerificationFailure: async ({ project, verificationResult }) => {
    set({ recoveryStatus: 'diagnosing' });
    const recoveryRes = await AutonomousRecoveryEngine.executeRecovery({
      projectId: project.id,
      projectVersion: project.version,
      project,
      verificationResult,
      intent: verificationResult.intent,
      environment: 'development',
    });

    // Learning observation
    AutonomousLearningEngine.observeRecovery({
      projectId: project.id,
      projectVersion: project.version,
      recoveryResult: recoveryRes,
    });

    if (recoveryRes.status === 'SUCCESS' && recoveryRes.repairedProject) {
      set({
        recoveryStatus: 'recovered',
        verificationStatus: 'verified',
        lastRecoveryResult: recoveryRes,
        lastVerificationResult: recoveryRes.verification || null,
      });
      return recoveryRes.repairedProject;
    }

    if (recoveryRes.state === 'awaiting_approval') {
      set({
        recoveryStatus: 'awaiting_approval',
        lastRecoveryResult: recoveryRes,
      });
      return undefined;
    }

    set({
      recoveryStatus: recoveryRes.status === 'BLOCKED' ? 'blocked' : 'failed',
      lastRecoveryResult: recoveryRes,
      error: recoveryRes.summary.message,
    });
    return undefined;
  },

  approveRecovery: async (project: AppProject) => {
    const lastRes = get().lastRecoveryResult;
    if (!lastRes) return undefined;

    set({ recoveryStatus: 'recovering' });
    const recoveryRes = await AutonomousRecoveryEngine.executeRecovery({
      projectId: project.id,
      projectVersion: project.version,
      project,
      verificationResult: get().lastVerificationResult || undefined,
      isApproved: true,
      environment: 'development',
    });

    if (recoveryRes.status === 'SUCCESS' && recoveryRes.repairedProject) {
      set({
        recoveryStatus: 'recovered',
        verificationStatus: 'verified',
        lastRecoveryResult: recoveryRes,
      });
      return recoveryRes.repairedProject;
    }

    set({
      recoveryStatus: recoveryRes.status === 'BLOCKED' ? 'blocked' : 'failed',
      lastRecoveryResult: recoveryRes,
      error: recoveryRes.summary.message,
    });
    return undefined;
  },

  fetchRecommendations: async ({ project, targetOperationType, failureCategory }) => {
    set({ learningStatus: 'matching' });
    const session = AutonomousLearningEngine.createSession(project.id, project.version);
    const recs = AutonomousLearningEngine.generateRecommendations({
      session,
      project,
      targetOperationType,
      failureCategory,
    });
    set({
      learningStatus: recs.length > 0 ? 'recommending' : 'idle',
      activeRecommendations: recs,
      learningMetrics: session.metrics,
    });
    return recs;
  },

  applyRecommendation: async ({ recommendation, project, isApproved }) => {
    const res = AutonomousLearningEngine.applyRecommendation({
      recommendation,
      project,
      isApproved,
    });

    if (res.success && res.updatedProject) {
      set((s) => ({
        learningStatus: 'applied',
        activeRecommendations: s.activeRecommendations.filter((r) => r.recommendationId !== recommendation.recommendationId),
      }));
      return res.updatedProject;
    }

    set({ error: res.error || 'Failed to apply recommendation' });
    return undefined;
  },

  rejectRecommendation: ({ recommendation, project, reason }) => {
    AutonomousLearningEngine.observeUserFeedback({
      projectId: project.id,
      projectVersion: project.version,
      recommendationId: recommendation.recommendationId,
      accepted: false,
      notes: reason,
    });

    set((s) => ({
      learningStatus: 'rejected',
      activeRecommendations: s.activeRecommendations.filter((r) => r.recommendationId !== recommendation.recommendationId),
    }));
  },

  optimizeDecision: async ({ project, intent, environment }) => {
    set({ decisionStatus: 'analyzing' });
    const session = DecisionOptimizationEngine.createSession({
      projectId: project.id,
      projectVersion: project.version,
      userIntent: intent,
      environment: (environment as any) || 'development',
    });
    DecisionOptimizationEngine.generateCandidates(session, project);
    const selection = DecisionOptimizationEngine.selectDecision(session, project);
    set({
      decisionStatus: selection.status === 'SELECTED' ? (selection.approvalRequirement.required ? 'awaiting_approval' : 'selected') : 'blocked',
      activeDecisionSession: session,
      activeDecisionSelection: selection,
    });
    return selection;
  },

  applyDecision: async ({ project, isApproved }) => {
    const session = get().activeDecisionSession;
    if (!session || !session.selection) return undefined;
    set({ decisionStatus: 'executing' });
    const res = await DecisionOptimizationEngine.executeDecision({
      session,
      project,
      isApproved,
    });
    if (res.success && res.updatedProject) {
      set({
        decisionStatus: 'verified',
        activeDecisionSelection: null,
      });
      return res.updatedProject;
    }
    set({
      decisionStatus: res.outcome.status === 'BLOCKED' ? 'blocked' : 'failed',
      error: res.error || 'Decision application failed',
    });
    return undefined;
  },

  correctDecision: async ({ project, alternativeCandidateId, notes }) => {
    const session = get().activeDecisionSession;
    if (!session) return undefined;
    set({ decisionStatus: 'executing' });
    const res = await DecisionOptimizationEngine.applyUserCorrection({
      session,
      project,
      alternativeCandidateId,
      notes,
    });
    if (res.success && res.updatedProject) {
      set({
        decisionStatus: 'verified',
        activeDecisionSelection: null,
      });
      return res.updatedProject;
    }
    set({
      decisionStatus: 'failed',
      error: res.error || 'User correction application failed',
    });
    return undefined;
  },

  rollbackLast: () => {
    const genId = get().lastGenerationId;
    if (!genId) return { success: false, error: 'No previous generation available to rollback' };

    const result = AITransactionManager.rollback(genId);
    if (result.success) {
      set((s) => ({
        lastGenerationId: null,
        messages: [
          ...s.messages,
          {
            id: `msg_rb_${Date.now()}`,
            role: 'assistant',
            content: '↺ Successfully rolled back the previous AI generation.',
            timestamp: new Date().toISOString(),
          },
        ],
      }));
    }
    return result;
  },

  approvePending: (project: AppProject) => {
    const req = get().pendingApproval;
    if (!req) return undefined;

    // Check if task is waiting
    const task = get().activeAgentTask;
    if (task && task.status === 'waiting_approval') {
      const updatedTask = AgentEngine.resumeWithApproval(task, project);
      set({ activeAgentTask: updatedTask, pendingApproval: null });
      return undefined;
    }

    const tx = AITransactionManager.executeTransaction({
      project,
      operations: req.operations,
      prompt: 'Approved operations',
      mode: get().mode,
    });

    if (tx.success) {
      set({
        pendingApproval: null,
        pendingOperations: [],
        lastGenerationId: tx.generationId,
      });
      return tx.updatedProject;
    }

    set({ error: tx.errors?.join(', ') || 'Approved transaction failed' });
    return undefined;
  },

  cancelGeneration: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    set({ isGenerating: false, streamStage: 'Cancelled by user', streamPercent: 0 });
  },

  clearConversation: () => {
    set({
      messages: [],
      currentPlan: null,
      pendingOperations: [],
      pendingApproval: null,
      activeAgentTask: null,
      error: null,
    });
  },
}));
