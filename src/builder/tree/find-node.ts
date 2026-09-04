import { ComponentNode } from '../schema/component';

export function findNode(root: ComponentNode, id: string): ComponentNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(root: ComponentNode, id: string): ComponentNode | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const parent = findParent(child, id);
    if (parent) return parent;
  }
  return null;
}

export function isDescendant(root: ComponentNode, ancestorId: string, targetId: string): boolean {
  if (ancestorId === targetId) return true;
  const ancestor = findNode(root, ancestorId);
  if (!ancestor) return false;
  return findNode(ancestor, targetId) !== null;
}
