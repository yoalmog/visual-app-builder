import { ComponentNode } from '../schema/component';
import { findNode, findParent } from './find-node';

export interface TreeValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTree(root: ComponentNode): TreeValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  function traverse(node: ComponentNode, parentId?: string, path: string[] = []) {
    if (!node || !node.id) {
      errors.push(`Encountered node without a valid ID at path ${path.join(' > ')}`);
      return;
    }

    if (seenIds.has(node.id)) {
      errors.push(`Duplicate component ID found: "${node.id}"`);
    } else {
      seenIds.add(node.id);
    }

    if (path.includes(node.id)) {
      errors.push(`Cycle detected: node "${node.id}" is an ancestor of itself`);
      return;
    }

    if (parentId && node.parentId !== parentId) {
      errors.push(
        `Node "${node.id}" has inconsistent parentId: expected "${parentId}", found "${node.parentId}"`
      );
    }

    const currentPath = [...path, node.id];
    for (const child of node.children || []) {
      traverse(child, node.id, currentPath);
    }
  }

  traverse(root, undefined, []);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getAncestors(root: ComponentNode, nodeId: string): ComponentNode[] {
  const ancestors: ComponentNode[] = [];
  let currentParent = findParent(root, nodeId);
  while (currentParent) {
    ancestors.push(currentParent);
    currentParent = findParent(root, currentParent.id);
  }
  return ancestors;
}

export function getSiblings(root: ComponentNode, nodeId: string): ComponentNode[] {
  const parent = findParent(root, nodeId);
  if (!parent) return [];
  return parent.children.filter((c) => c.id !== nodeId);
}

export function getCommonParent(root: ComponentNode, nodeIds: string[]): ComponentNode | null {
  if (nodeIds.length === 0) return null;
  if (nodeIds.length === 1) return findParent(root, nodeIds[0]);

  const ancestorLists = nodeIds.map((id) => {
    const parent = findParent(root, id);
    if (!parent) return [];
    return [parent, ...getAncestors(root, parent.id)];
  });

  if (ancestorLists.some((list) => list.length === 0)) return null;

  const firstList = ancestorLists[0];
  for (const candidate of firstList) {
    if (ancestorLists.every((list) => list.some((a) => a.id === candidate.id))) {
      return candidate;
    }
  }

  return null;
}

export function snapToGrid(value: number, gridSize = 8): number {
  return Math.round(value / gridSize) * gridSize;
}
