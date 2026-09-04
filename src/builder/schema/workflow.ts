/**
 * Phase 6: Advanced Workflow Engine Schema
 */

export type WorkflowNodeType =
  | 'event'
  | 'condition'
  | 'branch'
  | 'action'
  | 'loop'
  | 'parallel'
  | 'delay'
  | 'retry'
  | 'error_handler'
  | 'return'
  | 'call_workflow'
  | 'trigger'
  | 'transform'
  | 'sub_workflow'
  | 'webhook'
  | 'email'
  | 'notification';

export type WorkflowInputType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'record' | 'collection';

export interface WorkflowInput {
  name: string;
  type: WorkflowInputType;
  required?: boolean;
  defaultValue?: any;
  description?: string;
}

export interface WorkflowOutput {
  name: string;
  type: WorkflowInputType;
  valueExpression?: string;
}

export interface WorkflowRetryConfig {
  maxRetries: number;
  delayMs?: number;
  backoffMs?: number;
  backoffFactor?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name?: string;
  description?: string;

  // Generic config
  config?: Record<string, any>;

  // Condition / Branch
  conditionExpression?: string;
  branches?: Array<{
    id: string;
    label: string;
    conditionExpression?: string; // empty means 'else'
    targetNodeId?: string;
    nodes?: WorkflowNode[];
  }>;

  // Action
  actionType?: string;
  actionConfig?: Record<string, any>;

  // Loop
  loopOverExpression?: string; // e.g. '{{items}}'
  itemVariableName?: string;   // default 'item'
  indexVariableName?: string;  // default 'index'
  maxIterations?: number;      // safety ceiling e.g. 1000
  loopBody?: WorkflowNode[];

  // Parallel
  parallelBranches?: Array<{
    id: string;
    name: string;
    nodes: WorkflowNode[];
  }>;

  // Sub-workflow invocation
  workflowId?: string;
  inputMappings?: Record<string, string>; // argName -> expression

  // Retry & Error Handling
  retryConfig?: WorkflowRetryConfig;
  errorNodes?: WorkflowNode[];   // Failure branch
  finallyNodes?: WorkflowNode[]; // Finally branch

  // Delay / Flow
  delayMs?: number;
  returnValueExpression?: string;

  // Next node in sequence
  nextNodeId?: string;
  onSuccessNodeId?: string;
  onFailureNodeId?: string;
}

export interface ScheduledTriggerConfig {
  type: 'one_time' | 'interval' | 'cron';
  enabled: boolean;
  timestamp?: number;
  intervalMs?: number;
  cronExpression?: string;
  timezone?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  inputs?: WorkflowInput[];
  outputs?: WorkflowOutput[];
  nodes: WorkflowNode[];
  triggerType?: 'manual' | 'event' | 'schedule' | 'webhook';
  schedule?: ScheduledTriggerConfig;
  requiredPermissions?: string[];
  finallyNodeId?: string;
}

export interface WorkflowContext {
  inputs: Record<string, any>;
  variables: Record<string, any>;
  steps: Record<string, any>;
  env: Record<string, any>;
}

export interface WorkflowExecutionLog {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt?: string;
  stepLogs: Array<{
    nodeId: string;
    status: 'success' | 'failed';
    durationMs: number;
    output?: any;
    error?: string;
  }>;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: string;
}

