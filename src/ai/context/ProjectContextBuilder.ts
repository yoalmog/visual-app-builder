// Project Context Builder
import { AppProject } from '../../builder/schema/project';
import { AISecretFilter } from '../security/AISecretFilter';

export interface ProjectContextSummary {
  id: string;
  name: string;
  schemaVersion: number;
  pages: Array<{ id: string; name: string; slug: string; componentCount: number }>;
  collections: Array<{ id: string; name: string; fieldCount: number; recordCount: number }>;
  workflows: Array<{ id: string; name: string; triggerType: string }>;
  roles: string[];
  theme: { primaryColor: string; backgroundColor: string; textColor: string };
}

export class ProjectContextBuilder {
  public static build(project: AppProject): ProjectContextSummary {
    const pages = (project.pages || []).map((p) => {
      let count = 0;
      const countNodes = (node: any) => {
        if (!node) return;
        count++;
        if (Array.isArray(node.children)) {
          node.children.forEach(countNodes);
        }
      };
      countNodes(p.root);
      return { id: p.id, name: p.name, slug: p.slug, componentCount: count };
    });

    const collections = (project.collections || []).map((c) => ({
      id: c.id,
      name: c.name,
      fieldCount: (c.fields || []).length,
      recordCount: (c.records || []).length,
    }));

    const workflows = (project.workflows || []).map((w) => {
      const triggerNode = w.nodes.find((n) => n.type === 'trigger');
      return {
        id: w.id,
        name: w.name,
        triggerType: triggerNode?.config?.triggerType || 'manual',
      };
    });


    const roles = (project.roles || []).map((r) => r.name);

    return AISecretFilter.redactObject({
      id: project.id,
      name: project.name,
      schemaVersion: project.version,
      pages,
      collections,
      workflows,
      roles,
      theme: {
        primaryColor: project.theme?.primaryColor || '#4F46E5',
        backgroundColor: project.theme?.backgroundColor || '#FFFFFF',
        textColor: project.theme?.textColor || '#0F172A',
      },
    });
  }
}
