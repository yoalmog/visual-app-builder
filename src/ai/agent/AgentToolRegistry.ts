// Agent Tool Registry & Built-in Typed Tools
import { AppProject } from '../../builder/schema/project';
import { ProjectContextBuilder } from '../context/ProjectContextBuilder';
import { PageContextBuilder } from '../context/PageContextBuilder';
import { DataContextBuilder } from '../context/DataContextBuilder';
import { RuntimeContextBuilder } from '../context/DataContextBuilder';
import { OperationValidator } from '../operations/OperationValidator';
import { AIOperation } from '../operations/AIOperation';

export interface AgentToolDefinition {
  name: string;
  description: string;
  permission: string;
  execute: (args: any, context: { project: AppProject; runtimeStore?: any }) => Promise<any> | any;
}

export class AgentToolRegistry {
  private static tools = new Map<string, AgentToolDefinition>();

  public static register(tool: AgentToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public static get(name: string): AgentToolDefinition | undefined {
    return this.tools.get(name);
  }

  public static list(): AgentToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

// Register default safe tools
AgentToolRegistry.register({
  name: 'inspect_project',
  description: 'Inspects project structure, pages, collections, workflows, and theme.',
  permission: 'project.view',
  execute: (_args, { project }) => {
    return ProjectContextBuilder.build(project);
  },
});

AgentToolRegistry.register({
  name: 'inspect_page',
  description: 'Inspects component hierarchy and bindings for a specific page.',
  permission: 'pages.view',
  execute: (args, { project }) => {
    const pageId = args.pageId || project.pages[0]?.id;
    const page = project.pages.find((p) => p.id === pageId);
    if (!page) return { error: `Page ${pageId} not found` };
    return PageContextBuilder.build(page);
  },
});

AgentToolRegistry.register({
  name: 'inspect_data',
  description: 'Inspects data collections, fields, and queries.',
  permission: 'collections.view',
  execute: (_args, { project }) => {
    return DataContextBuilder.build(project.collections, project.queries);
  },
});

AgentToolRegistry.register({
  name: 'inspect_runtime',
  description: 'Inspects runtime variables, console errors, and network trace.',
  permission: 'project.view',
  execute: (_args, { runtimeStore }) => {
    return RuntimeContextBuilder.build(runtimeStore);
  },
});

AgentToolRegistry.register({
  name: 'validate_operations',
  description: 'Validates an array of proposed AI operations against the schema.',
  permission: 'project.edit',
  execute: (args: { operations: AIOperation[] }) => {
    return OperationValidator.validateAll(args.operations || []);
  },
});
