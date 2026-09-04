// Composite Context Builder with Budget Enforcement
import { AppProject } from '../../builder/schema/project';
import { ComponentNode } from '../../builder/schema/component';
import { ContextBudgetManager, ContextItem } from './ContextBudgetManager';
import { ProjectContextBuilder } from './ProjectContextBuilder';
import { PageContextBuilder, SelectionContextBuilder } from './PageContextBuilder';
import { DataContextBuilder, WorkflowContextBuilder, RuntimeContextBuilder } from './DataContextBuilder';

export class CompositeContextBuilder {
  public static buildContext(params: {
    project: AppProject;
    activePageId?: string;
    selectedNode?: ComponentNode | null;
    runtimeStore?: any;
    maxTokens?: number;
  }): { context: Record<string, any>; tokenCount: number; truncated: string[] } {
    const budgetManager = new ContextBudgetManager(params.maxTokens || 8000);
    const items: ContextItem[] = [];

    // 1. Selection context (highest priority: 1)
    if (params.selectedNode) {
      const sel = SelectionContextBuilder.build(params.selectedNode);
      const str = JSON.stringify(sel);
      items.push({
        id: 'selection',
        category: 'selection',
        priority: 1,
        content: str,
        estimatedTokens: ContextBudgetManager.estimateTokens(str),
      });
    }

    // 2. Page context (priority: 2)
    const activePage = params.project.pages?.find((p) => p.id === params.activePageId) || params.project.pages?.[0];
    if (activePage) {
      const pg = PageContextBuilder.build(activePage);
      const str = JSON.stringify(pg);
      items.push({
        id: 'page',
        category: 'page',
        priority: 2,
        content: str,
        estimatedTokens: ContextBudgetManager.estimateTokens(str),
      });
    }

    // 3. Project context (priority: 3)
    const prj = ProjectContextBuilder.build(params.project);
    const prjStr = JSON.stringify(prj);
    items.push({
      id: 'project',
      category: 'project',
      priority: 3,
      content: prjStr,
      estimatedTokens: ContextBudgetManager.estimateTokens(prjStr),
    });

    // 4. Data context (priority: 4)
    const data = DataContextBuilder.build(params.project.collections, params.project.queries);
    const dataStr = JSON.stringify(data);
    items.push({
      id: 'data',
      category: 'data',
      priority: 4,
      content: dataStr,
      estimatedTokens: ContextBudgetManager.estimateTokens(dataStr),
    });

    // 5. Workflow context (priority: 5)
    const workflows = WorkflowContextBuilder.build(params.project.workflows);
    const wfStr = JSON.stringify(workflows);
    items.push({
      id: 'workflows',
      category: 'workflow',
      priority: 5,
      content: wfStr,
      estimatedTokens: ContextBudgetManager.estimateTokens(wfStr),
    });

    // 6. Runtime context (priority: 6)
    if (params.runtimeStore) {
      const rt = RuntimeContextBuilder.build(params.runtimeStore);
      const rtStr = JSON.stringify(rt);
      items.push({
        id: 'runtime',
        category: 'runtime',
        priority: 6,
        content: rtStr,
        estimatedTokens: ContextBudgetManager.estimateTokens(rtStr),
      });
    }

    const { packed, totalTokens, truncatedItems } = budgetManager.pack(items);

    const contextMap: Record<string, any> = {};
    for (const item of packed) {
      try {
        contextMap[item.category] = JSON.parse(item.content);
      } catch {
        contextMap[item.category] = item.content;
      }
    }

    return { context: contextMap, tokenCount: totalTokens, truncated: truncatedItems };
  }
}
