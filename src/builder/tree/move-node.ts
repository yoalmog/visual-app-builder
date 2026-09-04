import { ComponentNode } from '../schema/component';
import { findNode, isDescendant } from './find-node';
import { removeNode } from './remove-node';
import { insertNode } from './insert-node';

export function moveNode(
  root: ComponentNode,
  nodeId: string,
  targetParentId: string,
  index?: number
): ComponentNode {
  // Prevent moving root or self-nesting
  if (root.id === nodeId || nodeId === targetParentId) return root;

  // Prevent circular references: cannot move an ancestor into its own descendant
  if (isDescendant(root, nodeId, targetParentId)) {
    console.warn(`[moveNode] Cycle prevented: cannot move node ${nodeId} into descendant ${targetParentId}`);
    return root;
  }

  const targetNode = findNode(root, nodeId);
  if (!targetNode) return root;

  // 1. Remove node from existing tree
  const treeWithoutNode = removeNode(root, nodeId);

  // 2. Insert into target parent
  return insertNode(treeWithoutNode, targetParentId, targetNode, index);
}
