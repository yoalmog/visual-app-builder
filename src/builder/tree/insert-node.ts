import { ComponentNode } from '../schema/component';

export function insertNode(
  root: ComponentNode,
  parentId: string,
  node: ComponentNode,
  index?: number
): ComponentNode {
  const nodeWithParent = { ...node, parentId };

  if (root.id === parentId) {
    const newChildren = [...root.children];
    if (typeof index === 'number' && index >= 0 && index <= newChildren.length) {
      newChildren.splice(index, 0, nodeWithParent);
    } else {
      newChildren.push(nodeWithParent);
    }
    return {
      ...root,
      children: newChildren,
    };
  }

  return {
    ...root,
    children: root.children.map((child) => insertNode(child, parentId, node, index)),
  };
}
