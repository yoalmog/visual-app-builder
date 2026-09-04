// AI Project Diff Engine
import { AppProject } from '../../builder/schema/project';

export interface ProjectDiffSummary {
  pagesAdded: string[];
  pagesRemoved: string[];
  pagesModified: string[];
  componentsAddedCount: number;
  componentsRemovedCount: number;
  collectionsAdded: string[];
  collectionsRemoved: string[];
  workflowsAdded: string[];
  workflowsRemoved: string[];
  themeModified: boolean;
  hasChanges: boolean;
}

export class AIDiff {
  public static diff(before: AppProject, after: AppProject): ProjectDiffSummary {
    const beforePages = new Map((before.pages || []).map((p) => [p.id, p]));
    const afterPages = new Map((after.pages || []).map((p) => [p.id, p]));

    const pagesAdded: string[] = [];
    const pagesRemoved: string[] = [];
    const pagesModified: string[] = [];

    afterPages.forEach((p, id) => {
      if (!beforePages.has(id)) {
        pagesAdded.push(p.name);
      } else {
        const bp = beforePages.get(id)!;
        if (JSON.stringify(bp.root) !== JSON.stringify(p.root) || bp.name !== p.name || bp.slug !== p.slug) {
          pagesModified.push(p.name);
        }
      }
    });

    beforePages.forEach((p, id) => {
      if (!afterPages.has(id)) {
        pagesRemoved.push(p.name);
      }
    });

    // Collections
    const beforeCols = new Set((before.collections || []).map((c) => c.name));
    const afterCols = new Set((after.collections || []).map((c) => c.name));

    const collectionsAdded: string[] = [];
    const collectionsRemoved: string[] = [];

    afterCols.forEach((c) => {
      if (!beforeCols.has(c)) collectionsAdded.push(c);
    });
    beforeCols.forEach((c) => {
      if (!afterCols.has(c)) collectionsRemoved.push(c);
    });

    // Workflows
    const beforeWfs = new Set((before.workflows || []).map((w) => w.name));
    const afterWfs = new Set((after.workflows || []).map((w) => w.name));

    const workflowsAdded: string[] = [];
    const workflowsRemoved: string[] = [];

    afterWfs.forEach((w) => {
      if (!beforeWfs.has(w)) workflowsAdded.push(w);
    });
    beforeWfs.forEach((w) => {
      if (!afterWfs.has(w)) workflowsRemoved.push(w);
    });

    // Component counts
    const countNodes = (node: any): number => {
      if (!node) return 0;
      let count = 1;
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          count += countNodes(child);
        }
      }
      return count;
    };

    let beforeCompCount = 0;
    (before.pages || []).forEach((p) => (beforeCompCount += countNodes(p.root)));

    let afterCompCount = 0;
    (after.pages || []).forEach((p) => (afterCompCount += countNodes(p.root)));

    const componentsAddedCount = Math.max(0, afterCompCount - beforeCompCount);
    const componentsRemovedCount = Math.max(0, beforeCompCount - afterCompCount);

    // Theme diff
    const themeModified = JSON.stringify(before.theme || {}) !== JSON.stringify(after.theme || {});

    const hasChanges =
      pagesAdded.length > 0 ||
      pagesRemoved.length > 0 ||
      pagesModified.length > 0 ||
      collectionsAdded.length > 0 ||
      collectionsRemoved.length > 0 ||
      workflowsAdded.length > 0 ||
      workflowsRemoved.length > 0 ||
      themeModified ||
      componentsAddedCount > 0 ||
      componentsRemovedCount > 0;

    return {
      pagesAdded,
      pagesRemoved,
      pagesModified,
      componentsAddedCount,
      componentsRemovedCount,
      collectionsAdded,
      collectionsRemoved,
      workflowsAdded,
      workflowsRemoved,
      themeModified,
      hasChanges,
    };
  }
}
