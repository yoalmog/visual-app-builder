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

  // Actions
  setOpen: (open: boolean) => void;
  setMode: (mode: AIMode) => void;
  fetchTimeline: (traceId: string, projectId: string) => ExecutionTimeline | null;
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

  setOpen: (open: boolean) => set({ isOpen: open }),
  setMode: (mode: AIMode) => set({ mode }),
  fetchTimeline: (traceId: string, projectId: string) => ExecutionTimelineEngine.getTimeline(traceId, projectId),

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
