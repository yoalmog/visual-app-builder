import { ComponentNode } from '../schema/component';

export function updateNode(
  root: ComponentNode,
  id: string,
  updater: (node: ComponentNode) => ComponentNode
): ComponentNode {
  if (root.id === id) {
    return updater(root);
  }

  return {
    ...root,
    children: root.children.map((child) => updateNode(child, id, updater)),
  };
}
