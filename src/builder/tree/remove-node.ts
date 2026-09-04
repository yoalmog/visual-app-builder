import { ComponentNode } from '../schema/component';

export function removeNode(root: ComponentNode, id: string): ComponentNode {
  // If root itself is targeted, we cannot remove the root
  if (root.id === id) return root;

  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== id)
      .map((child) => removeNode(child, id)),
  };
}

export function removeNodes(root: ComponentNode, ids: string[]): ComponentNode {
  const idSet = new Set(ids);
  if (idSet.has(root.id)) return root;

  return {
    ...root,
    children: root.children
      .filter((child) => !idSet.has(child.id))
      .map((child) => removeNodes(child, ids)),
  };
}
