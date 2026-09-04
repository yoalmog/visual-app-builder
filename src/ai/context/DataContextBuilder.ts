// Data, Workflow, and Runtime Context Builders
import { DataCollection, QueryDefinition } from '../../builder/schema/project';
import { WorkflowDefinition } from '../../builder/schema/workflow';
import { AISecretFilter } from '../security/AISecretFilter';

export class DataContextBuilder {
  public static build(collections: DataCollection[] = [], queries: QueryDefinition[] = []): any {
    const summary = collections.map((col) => ({
      id: col.id,
      name: col.name,
      fields: (col.fields || []).map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        required: f.required,
      })),
      relationships: col.relationships || [],
      recordCount: (col.records || []).length,
    }));

    const querySummary = queries.map((q) => ({
      id: q.id,
      name: q.name,
      collectionId: q.sourceCollectionId,
    }));

    return AISecretFilter.redactObject({
      collections: summary,
      queries: querySummary,
    });
  }
}

export class WorkflowContextBuilder {
  public static build(workflows: WorkflowDefinition[] = []): any {
    return workflows.map((wf) => ({
      id: wf.id,
      name: wf.name,
      nodeCount: (wf.nodes || []).length,
      triggers: wf.nodes.filter((n) => n.type === 'trigger').map((n) => n.config?.triggerType || 'manual'),
    }));
  }
}


export interface RuntimeContextSummary {
  variables: Record<string, any>;
  recentErrors: Array<{ message: string; timestamp: number; stack?: string }>;
  apiErrorCount: number;
}

export class RuntimeContextBuilder {
  public static build(runtimeStore: any): RuntimeContextSummary {
    const variables = runtimeStore?.variables || {};
    const consoleLogs = runtimeStore?.consoleLogs || [];
    const recentErrors = consoleLogs
      .filter((l: any) => l.level === 'error')
      .slice(-5)
      .map((l: any) => ({
        message: l.message,
        timestamp: l.timestamp,
      }));

    const networkTrace = runtimeStore?.networkTrace || [];
    const apiErrorCount = networkTrace.filter((t: any) => t.status >= 400).length;

    return AISecretFilter.redactObject({
      variables,
      recentErrors,
      apiErrorCount,
    });
  }
}
