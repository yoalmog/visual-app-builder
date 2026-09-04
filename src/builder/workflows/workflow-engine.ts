import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowContext,
  WorkflowExecutionLog,
} from '../schema/workflow';
import { evaluateExpression } from '../expressions/expression-evaluator';

function safeEval(expr: string, context: Record<string, any>): any {
  const res = evaluateExpression(expr, context);
  if (!res.success) {
    throw new Error(res.error || `Evaluation error in: ${expr}`);
  }
  return res.value;
}

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private maxLoopIterations: number = 1000;

  constructor(workflows: WorkflowDefinition[] = []) {
    this.updateWorkflows(workflows);
  }

  public updateWorkflows(workflows: WorkflowDefinition[]): void {
    this.workflows.clear();
    for (const wf of workflows) {
      this.workflows.set(wf.id, wf);
    }
  }

  public async executeWorkflow(
    workflowId: string,
    inputs: Record<string, any> = {},
    customEnv: Record<string, any> = {}
  ): Promise<WorkflowExecutionLog> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionLog: WorkflowExecutionLog = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
      stepLogs: [],
      inputs,
      outputs: {},
    };

    const nodeMap = new Map<string, WorkflowNode>();
    for (const node of workflow.nodes) {
      nodeMap.set(node.id, node);
    }

    const triggerNode = workflow.nodes.find(n => n.type === 'trigger' || n.type === 'event') || workflow.nodes[0];
    if (!triggerNode) {
      executionLog.status = 'success';
      executionLog.completedAt = new Date().toISOString();
      return executionLog;
    }

    const context: WorkflowContext = {
      inputs: { ...inputs },
      variables: { ...inputs },
      steps: {},
      env: { ...customEnv },
    };

    let currentNodeId: string | undefined = triggerNode.id;
    let iterationCount = 0;
    let explicitReturn = false;

    try {
      while (currentNodeId && iterationCount < 2000) {
        iterationCount++;
        const node = nodeMap.get(currentNodeId);
        if (!node) break;

        const stepStart = Date.now();
        let stepOutput: any = null;

        try {
          stepOutput = await this.executeNodeWithRetry(node, context);
          context.steps[node.id] = stepOutput;

          // If node writes to variable
          const outputVar = node.config?.outputVariable;
          if (outputVar) {
            context.variables[outputVar] = stepOutput;
          }

          executionLog.stepLogs.push({
            nodeId: node.id,
            status: 'success',
            durationMs: Date.now() - stepStart,
            output: stepOutput,
          });

          // Determine next node
          if (node.type === 'condition' || node.type === 'branch') {
            const condMet = Boolean(stepOutput);
            currentNodeId = condMet
              ? (node.onSuccessNodeId || node.config?.trueNodeId || node.nextNodeId)
              : (node.onFailureNodeId || node.config?.falseNodeId);
          } else if (node.type === 'return') {
            explicitReturn = true;
            if (node.returnValueExpression) {
              executionLog.outputs = safeEval(node.returnValueExpression, {
                ...context.variables,
                steps: context.steps,
              });
            } else {
              executionLog.outputs = stepOutput;
            }
            break;
          } else {
            currentNodeId = node.onSuccessNodeId || node.nextNodeId;
          }
        } catch (err: any) {
          const stepError = err?.message || String(err);
          executionLog.stepLogs.push({
            nodeId: node.id,
            status: 'failed',
            durationMs: Date.now() - stepStart,
            error: stepError,
          });

          if (node.onFailureNodeId) {
            currentNodeId = node.onFailureNodeId;
          } else if (node.errorNodes && node.errorNodes.length > 0) {
            for (const errNode of node.errorNodes) {
              await this.executeNodeWithRetry(errNode, context);
            }
            break;
          } else {
            throw err;
          }
        }
      }

      if (workflow.finallyNodeId) {
        const finallyNode = nodeMap.get(workflow.finallyNodeId);
        if (finallyNode) {
          const finOut = await this.executeNodeWithRetry(finallyNode, context);
          if (finallyNode.config?.outputVariable) {
            context.variables[finallyNode.config.outputVariable] = finOut;
          }
        }
      }

      executionLog.status = 'success';
      if (!explicitReturn) {
        executionLog.outputs = context.variables;
      }
    } catch (err: any) {
      executionLog.status = 'failed';
      executionLog.error = err?.message || String(err);

      if (workflow.finallyNodeId) {
        const finallyNode = nodeMap.get(workflow.finallyNodeId);
        if (finallyNode) {
          try {
            const finOut = await this.executeNodeWithRetry(finallyNode, context);
            if (finallyNode.config?.outputVariable) {
              context.variables[finallyNode.config.outputVariable] = finOut;
            }
          } catch {
            // ignore secondary error
          }
        }
      }
    } finally {
      executionLog.completedAt = new Date().toISOString();
    }

    return executionLog;
  }

  private async executeNodeWithRetry(node: WorkflowNode, context: WorkflowContext): Promise<any> {
    const retryConfig = node.retryConfig || { maxRetries: 0 };
    const maxRetries = retryConfig.maxRetries || 0;
    const baseDelay = retryConfig.delayMs ?? retryConfig.backoffMs ?? 50;
    const factor = retryConfig.backoffFactor ?? retryConfig.backoffMultiplier ?? 1;

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      try {
        return await this.executeNode(node, context);
      } catch (err) {
        lastError = err;
        attempt++;
        if (attempt <= maxRetries) {
          const delay = baseDelay * Math.pow(factor, attempt - 1);
          if (delay > 0) {
            await new Promise(res => setTimeout(res, Math.min(delay, 2000)));
          }
        }
      }
    }

    throw lastError;
  }

  private async executeNode(node: WorkflowNode, context: WorkflowContext): Promise<any> {
    const config = node.config || node.actionConfig || {};

    switch (node.type) {
      case 'trigger':
      case 'event':
        return { triggered: true, time: new Date().toISOString() };

      case 'condition':
      case 'branch': {
        const expr = node.conditionExpression || config.conditionExpression;
        if (!expr) return true;
        return Boolean(safeEval(expr, { ...context.variables, steps: context.steps }));
      }

      case 'transform': {
        const expr = config.transformExpression;
        if (!expr) return null;
        return safeEval(expr, { ...context.variables, steps: context.steps });
      }

      case 'delay': {
        const ms = Number(node.delayMs ?? config.delayMs ?? 50);
        await new Promise(resolve => setTimeout(resolve, Math.min(ms, 3000)));
        return { delayed: ms };
      }

      case 'action': {
        if (config.expression) {
          return safeEval(config.expression, { ...context.variables, steps: context.steps });
        }
        return { actionExecuted: true, actionType: node.actionType || config.actionType, config };
      }

      case 'loop': {
        const items = Array.isArray(config.items)
          ? config.items
          : (typeof node.loopOverExpression === 'string'
              ? safeEval(node.loopOverExpression, { ...context.variables, steps: context.steps })
              : (typeof config.itemsExpression === 'string'
                  ? safeEval(config.itemsExpression, { ...context.variables, steps: context.steps })
                  : []));

        if (!Array.isArray(items)) {
          throw new Error(`Loop items must evaluate to an array. Got: ${typeof items}`);
        }

        const maxIter = node.maxIterations || this.maxLoopIterations;
        const cappedItems = items.slice(0, maxIter);
        const results = [];
        const itemKey = node.itemVariableName || 'item';
        const idxKey = node.indexVariableName || 'index';

        for (let i = 0; i < cappedItems.length; i++) {
          const loopItem = cappedItems[i];
          const itemCtx = {
            ...context.variables,
            [itemKey]: loopItem,
            [idxKey]: i,
          };
          if (config.loopExpression) {
            results.push(safeEval(config.loopExpression, itemCtx));
          } else {
            results.push(loopItem);
          }
        }

        return results;
      }

      case 'parallel': {
        const branches = node.parallelBranches || config.branches || [];
        const results = await Promise.all(
          branches.map(async (branch: any) => {
            if (branch.expression) {
              return safeEval(branch.expression, { ...context.variables, steps: context.steps });
            }
            return branch;
          })
        );
        return results;
      }

      case 'call_workflow':
      case 'sub_workflow': {
        const subWfId = node.workflowId || config.subWorkflowId;
        if (!subWfId) throw new Error('sub_workflow node missing workflowId');
        const subInputs: Record<string, any> = {};
        const mappings = node.inputMappings || config.inputMappings || {};
        for (const [key, expr] of Object.entries(mappings)) {
          subInputs[key] = safeEval(expr as string, { ...context.variables, steps: context.steps });
        }
        const subResult = await this.executeWorkflow(subWfId, subInputs, context.env);
        if (subResult.status === 'failed') {
          throw new Error(`Sub-workflow ${subWfId} failed: ${subResult.error}`);
        }
        return subResult.outputs;
      }

      case 'webhook': {
        const url = config.url;
        const method = config.method || 'POST';
        const body = config.body || {};
        return { webhookDispatched: true, url, method, body };
      }

      case 'email':
      case 'notification': {
        return { sent: true, type: node.type, payload: config };
      }

      case 'return': {
        if (node.returnValueExpression) {
          return safeEval(node.returnValueExpression, { ...context.variables, steps: context.steps });
        }
        return config;
      }

      default:
        return { executed: true, type: node.type };
    }
  }
}
