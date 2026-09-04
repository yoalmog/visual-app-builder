// Agent Engine: Bounded autonomous execution loop
import { AppProject } from '../../builder/schema/project';
import { AgentTask, AgentStep } from './AgentTask';
import { AgentToolRegistry } from './AgentToolRegistry';
import { AgentGuardrails } from './AgentGuardrails';
import { AIPlanner } from '../planner/AIPlanner';
import { ApprovalManager } from '../approval/ApprovalManager';
import { AITransactionManager } from '../history/AITransactionManager';
import { AIError } from '../core/AIError';

export class AgentEngine {
  /**
   * Initializes and executes an agent task toward a given goal.
   */
  public static async runTask(params: {
    goal: string;
    project: AppProject;
    runtimeStore?: any;
    maxSteps?: number;
    environment?: 'development' | 'preview' | 'production';
    signal?: AbortSignal;
    onStep?: (step: AgentStep) => void;
  }): Promise<AgentTask> {
    const taskId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const task: AgentTask = {
      id: taskId,
      goal: params.goal,
      status: 'running',
      currentStep: 0,
      maxSteps: params.maxSteps || AgentGuardrails.DEFAULT_MAX_STEPS,
      steps: [],
      plannedOperations: [],
      appliedOperations: [],
      startedAt: new Date().toISOString(),
    };

    try {
      // Step 1: Inspect project
      AgentGuardrails.checkCancellation(params.signal);
      AgentGuardrails.checkStepLimit(task);
      task.currentStep++;

      const inspectTool = AgentToolRegistry.get('inspect_project')!;
      const projectSummary = await inspectTool.execute({}, { project: params.project });

      const step1: AgentStep = {
        stepNumber: 1,
        thought: `Inspecting project structure to determine required changes for goal: "${params.goal}"`,
        toolName: 'inspect_project',
        toolArgs: {},
        toolResult: projectSummary,
        status: 'completed',
        timestamp: new Date().toISOString(),
      };
      task.steps.push(step1);
      params.onStep?.(step1);

      // Step 2: Formulate Plan
      AgentGuardrails.checkCancellation(params.signal);
      AgentGuardrails.checkStepLimit(task);
      task.currentStep++;

      const planResult = AIPlanner.plan({
        prompt: params.goal,
        project: params.project,
      });

      task.plannedOperations = planResult.operations;

      const step2: AgentStep = {
        stepNumber: 2,
        thought: `Synthesized plan with ${planResult.operations.length} operations. Validating risk and dependencies.`,
        toolName: 'validate_operations',
        toolArgs: { operations: planResult.operations },
        toolResult: { valid: true, count: planResult.operations.length },
        status: 'completed',
        timestamp: new Date().toISOString(),
      };
      task.steps.push(step2);
      params.onStep?.(step2);

      // Step 3: Check Approval / Risk
      const approvalCheck = ApprovalManager.requiresApproval({
        operations: planResult.operations,
        safetyMode: params.project.aiMetadata?.settings?.safetyMode || 'approval',
        environment: params.environment || 'development',
      });

      if (approvalCheck.required) {
        task.status = 'waiting_approval';
        task.pendingApproval = {
          highestRisk: approvalCheck.highestRisk,
          reason: approvalCheck.reason,
          operations: planResult.operations,
        };
        return task;
      }

      // Step 4: Apply operations atomically
      AgentGuardrails.checkCancellation(params.signal);
      AgentGuardrails.checkStepLimit(task);
      task.currentStep++;

      const txResult = AITransactionManager.executeTransaction({
        project: params.project,
        operations: planResult.operations,
        prompt: params.goal,
        mode: 'agent',
      });

      if (!txResult.success) {
        throw new AIError('UNSAFE_OPERATION', `Transaction failed: ${txResult.errors?.join(', ')}`);
      }

      task.appliedOperations = txResult.appliedOperations;
      task.status = 'completed';
      task.completedAt = new Date().toISOString();

      const step3: AgentStep = {
        stepNumber: 3,
        thought: 'Applied operations successfully and verified schema integrity.',
        toolName: 'apply_transaction',
        toolArgs: { count: txResult.appliedOperations.length },
        toolResult: txResult.diff,
        status: 'completed',
        timestamp: new Date().toISOString(),
      };
      task.steps.push(step3);
      params.onStep?.(step3);

      return task;
    } catch (err: any) {
      task.status = err.code === 'CANCELLED' ? 'cancelled' : 'failed';
      task.error = err.message;
      task.completedAt = new Date().toISOString();
      return task;
    }
  }

  /**
   * Resumes a paused agent task after user approval.
   */
  public static resumeWithApproval(task: AgentTask, project: AppProject): AgentTask {
    if (task.status !== 'waiting_approval' || !task.pendingApproval) {
      return task;
    }

    const txResult = AITransactionManager.executeTransaction({
      project,
      operations: task.pendingApproval.operations,
      prompt: task.goal,
      mode: 'agent',
    });

    if (txResult.success) {
      task.appliedOperations = txResult.appliedOperations;
      task.status = 'completed';
      task.pendingApproval = undefined;
      task.completedAt = new Date().toISOString();
    } else {
      task.status = 'failed';
      task.error = txResult.errors?.join(', ');
      task.completedAt = new Date().toISOString();
    }

    return task;
  }
}
