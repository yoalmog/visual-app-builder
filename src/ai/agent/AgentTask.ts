// Agent Task & Step Models
import { AIRisk } from '../../builder/schema/ai';
import { AIOperation } from '../operations/AIOperation';

export type AgentTaskStatus =
  | 'pending'
  | 'planning'
  | 'running'
  | 'waiting_approval'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentStep {
  stepNumber: number;
  thought: string;
  toolName: string;
  toolArgs: Record<string, any>;
  toolResult?: any;
  status: 'running' | 'completed' | 'failed';
  timestamp: string;
}

export interface AgentTask {
  id: string;
  goal: string;
  status: AgentTaskStatus;
  currentStep: number;
  maxSteps: number;
  steps: AgentStep[];
  plannedOperations: AIOperation[];
  appliedOperations: AIOperation[];
  pendingApproval?: {
    highestRisk: AIRisk;
    reason: string;
    operations: AIOperation[];
  };
  startedAt: string;
  completedAt?: string;
  error?: string;
}
