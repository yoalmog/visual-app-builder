import { ComponentNode } from '../schema/component';
import { findNode, findParent } from './find-node';
import { insertNode } from './insert-node';

/**
 * Clone multiple nodes with brand-new unique IDs and remap internal references
 * (e.g. action.targetNodeId) so pasted components interact with each other.
 */
export function cloneNodesWithNewIds(
  nodes: ComponentNode[],
  newParentId?: string
): { clonedNodes: ComponentNode[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();

  // Pass 1: generate new unique IDs for every node in the tree
  function mapIds(node: ComponentNode) {
    const newId = `${node.type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    idMap.set(node.id, newId);
    if (node.children) {
      node.children.forEach(mapIds);
    }
  }
  nodes.forEach(mapIds);

  // Pass 2: deep clone and remap internal references
  function clone(node: ComponentNode, parentId?: string): ComponentNode {
    const newId = idMap.get(node.id) || `${node.type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const clonedChildren = (node.children || []).map((c) => clone(c, newId));

    // Remap interactions internal targetNodeId
    let remappedInteractions = node.interactions ? JSON.parse(JSON.stringify(node.interactions)) : undefined;
    if (remappedInteractions) {
      for (const inter of remappedInteractions) {
        if (inter.actions) {
          for (const act of inter.actions) {
            if (act.targetNodeId && idMap.has(act.targetNodeId)) {
              act.targetNodeId = idMap.get(act.targetNodeId)!;
            }
          }
        }
      }
    }

    // Remap logicRules internal targetNodeId (Phase 4 AT4-107, AT4-108)
    let remappedLogicRules = node.logicRules ? JSON.parse(JSON.stringify(node.logicRules)) : undefined;
    if (remappedLogicRules) {
      for (const rule of remappedLogicRules) {
        if (rule.actions) {
          for (const act of rule.actions) {
            if (act.targetNodeId && idMap.has(act.targetNodeId)) {
              act.targetNodeId = idMap.get(act.targetNodeId)!;
            }
          }
        }
      }
    }

    return {
      ...JSON.parse(JSON.stringify(node)),
      id: newId,
      name: `${node.name} (Copy)`,
      parentId,
      children: clonedChildren,
      interactions: remappedInteractions,
      logicRules: remappedLogicRules,
    };
  }

  const clonedNodes = nodes.map((n) => clone(n, newParentId));
  return { clonedNodes, idMap };
}

export function cloneNodeWithNewIds(node: ComponentNode, newParentId?: string): ComponentNode {
  return cloneNodesWithNewIds([node], newParentId).clonedNodes[0];
}

export function duplicateNode(
  root: ComponentNode,
  nodeId: string
): { newRoot: ComponentNode; duplicatedNodeId: string } | null {
  const targetNode = findNode(root, nodeId);
  const parent = findParent(root, nodeId);

  if (!targetNode || !parent) return null;

  const cloned = cloneNodeWithNewIds(targetNode, parent.id);
  const currentIndex = parent.children.findIndex((c) => c.id === nodeId);
  const insertIndex = currentIndex >= 0 ? currentIndex + 1 : undefined;

  const newRoot = insertNode(root, parent.id, cloned, insertIndex);

  return {
    newRoot,
    duplicatedNodeId: cloned.id,
  };
}
