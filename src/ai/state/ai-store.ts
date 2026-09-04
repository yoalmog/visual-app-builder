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

  // Actions
  setOpen: (open: boolean) => void;
  setMode: (mode: AIMode) => void;
  sendMessage: (params: {
    prompt: string;
    project: AppProject;
    activePageId?: string;
    selectedNode?: ComponentNode | null;
    environment?: 'development' | 'preview' | 'production';
  }) => Promise<AppProject | undefined>;
  applyPlan: (project: AppProject) => AppProject | undefined;
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

  setOpen: (open: boolean) => set({ isOpen: open }),
  setMode: (mode: AIMode) => set({ mode }),

  sendMessage: async ({ prompt, project, activePageId, selectedNode, environment }) => {
    const userMsg: AIMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMsg],
      isGenerating: true,
      error: null,
      streamStage: 'Analyzing request...',
      streamPercent: 10,
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
          const assistantMsg: AIMessage = {
            id: `msg_asst_${Date.now()}`,
            role: 'assistant',
            content: `${plan.explanation}\n\n✅ Applied ${tx.appliedOperations.length} changes successfully.`,
            timestamp: new Date().toISOString(),
          };

          set((s) => ({
            messages: [...s.messages, assistantMsg],
            lastGenerationId: tx.generationId,
            pendingOperations: [],
            currentPlan: null,
            isGenerating: false,
            streamPercent: 100,
          }));

          return tx.updatedProject;
        } else {
          throw new Error(tx.errors?.join(', ') || 'Transaction failed');
        }
      } else {
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
        }));

        return undefined;
      }
    } catch (err: any) {
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
      set({
        pendingOperations: [],
        currentPlan: null,
        pendingApproval: null,
        lastGenerationId: tx.generationId,
      });
      return tx.updatedProject;
    }

    set({ error: tx.errors?.join(', ') || 'Application failed' });
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
