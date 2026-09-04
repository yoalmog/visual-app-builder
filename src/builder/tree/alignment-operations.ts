import { ComponentNode } from '../schema/component';
import { findNode, findParent } from './find-node';
import { updateNode } from './update-node';

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionDirection = 'horizontal' | 'vertical';
export type ZOrderAction = 'bringForward' | 'sendBackward' | 'bringToFront' | 'sendToBack';

interface NodeRect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isPositioned: boolean;
}

function getNodeRect(node: ComponentNode): NodeRect {
  const isPositioned = node.styles.position === 'relative' || node.styles.position === 'absolute';
  const left = parseInt(node.styles.left || node.styles.marginLeft || '0', 10) || 0;
  const top = parseInt(node.styles.top || node.styles.marginTop || '0', 10) || 0;
  const width = parseInt(node.styles.width || '100', 10) || 100;
  const height = parseInt(node.styles.height || '40', 10) || 40;

  return { id: node.id, left, top, width, height, isPositioned };
}

/**
 * Align multiple nodes (left, center, right, top, middle, bottom)
 */
export function alignNodes(
  root: ComponentNode,
  nodeIds: string[],
  alignment: AlignmentType
): ComponentNode {
  if (nodeIds.length < 2) return root;

  const rects: NodeRect[] = [];
  for (const id of nodeIds) {
    const node = findNode(root, id);
    if (node) {
      rects.push(getNodeRect(node));
    }
  }

  if (rects.length < 2) return root;

  let targetCoord = 0;
  switch (alignment) {
    case 'left':
      targetCoord = Math.min(...rects.map((r) => r.left));
      break;
    case 'right':
      targetCoord = Math.max(...rects.map((r) => r.left + r.width));
      break;
    case 'center': {
      const minL = Math.min(...rects.map((r) => r.left));
      const maxR = Math.max(...rects.map((r) => r.left + r.width));
      targetCoord = minL + (maxR - minL) / 2;
      break;
    }
    case 'top':
      targetCoord = Math.min(...rects.map((r) => r.top));
      break;
    case 'bottom':
      targetCoord = Math.max(...rects.map((r) => r.top + r.height));
      break;
    case 'middle': {
      const minT = Math.min(...rects.map((r) => r.top));
      const maxB = Math.max(...rects.map((r) => r.top + r.height));
      targetCoord = minT + (maxB - minT) / 2;
      break;
    }
  }

  let updatedRoot = root;
  for (const rect of rects) {
    let newLeft = rect.left;
    let newTop = rect.top;

    if (alignment === 'left') {
      newLeft = targetCoord;
    } else if (alignment === 'right') {
      newLeft = targetCoord - rect.width;
    } else if (alignment === 'center') {
      newLeft = targetCoord - rect.width / 2;
    } else if (alignment === 'top') {
      newTop = targetCoord;
    } else if (alignment === 'bottom') {
      newTop = targetCoord - rect.height;
    } else if (alignment === 'middle') {
      newTop = targetCoord - rect.height / 2;
    }

    updatedRoot = updateNode(updatedRoot, rect.id, (curr) => {
      const styles = { ...curr.styles };
      if (rect.isPositioned) {
        if (['left', 'center', 'right'].includes(alignment)) {
          styles.left = `${Math.round(newLeft)}px`;
        } else {
          styles.top = `${Math.round(newTop)}px`;
        }
      } else {
        if (['left', 'center', 'right'].includes(alignment)) {
          styles.marginLeft = `${Math.round(newLeft)}px`;
        } else {
          styles.marginTop = `${Math.round(newTop)}px`;
        }
      }
      return { ...curr, styles };
    });
  }

  return updatedRoot;
}

/**
 * Distribute nodes evenly (3+ nodes required)
 */
export function distributeNodes(
  root: ComponentNode,
  nodeIds: string[],
  direction: DistributionDirection
): ComponentNode {
  if (nodeIds.length < 3) return root;

  const rects: NodeRect[] = [];
  for (const id of nodeIds) {
    const node = findNode(root, id);
    if (node) {
      rects.push(getNodeRect(node));
    }
  }

  if (rects.length < 3) return root;

  let updatedRoot = root;

  if (direction === 'horizontal') {
    rects.sort((a, b) => a.left - b.left);
    const minLeft = rects[0].left;
    const maxLeft = rects[rects.length - 1].left;
    const step = (maxLeft - minLeft) / (rects.length - 1);

    for (let i = 0; i < rects.length; i++) {
      const targetLeft = minLeft + i * step;
      const rect = rects[i];
      updatedRoot = updateNode(updatedRoot, rect.id, (curr) => {
        const styles = { ...curr.styles };
        if (rect.isPositioned) {
          styles.left = `${Math.round(targetLeft)}px`;
        } else {
          styles.marginLeft = `${Math.round(targetLeft)}px`;
        }
        return { ...curr, styles };
      });
    }
  } else {
    rects.sort((a, b) => a.top - b.top);
    const minTop = rects[0].top;
    const maxTop = rects[rects.length - 1].top;
    const step = (maxTop - minTop) / (rects.length - 1);

    for (let i = 0; i < rects.length; i++) {
      const targetTop = minTop + i * step;
      const rect = rects[i];
      updatedRoot = updateNode(updatedRoot, rect.id, (curr) => {
        const styles = { ...curr.styles };
        if (rect.isPositioned) {
          styles.top = `${Math.round(targetTop)}px`;
        } else {
          styles.marginTop = `${Math.round(targetTop)}px`;
        }
        return { ...curr, styles };
      });
    }
  }

  return updatedRoot;
}

/**
 * Change z-order of a node among its siblings.
 */
export function changeZOrder(
  root: ComponentNode,
  nodeId: string,
  action: ZOrderAction
): ComponentNode {
  const parent = findParent(root, nodeId);
  if (!parent || !parent.children) return root;

  const idx = parent.children.findIndex((c) => c.id === nodeId);
  if (idx === -1) return root;

  const children = [...parent.children];
  const target = children[idx];

  switch (action) {
    case 'bringForward':
      if (idx < children.length - 1) {
        children[idx] = children[idx + 1];
        children[idx + 1] = target;
      }
      break;
    case 'sendBackward':
      if (idx > 0) {
        children[idx] = children[idx - 1];
        children[idx - 1] = target;
      }
      break;
    case 'bringToFront':
      children.splice(idx, 1);
      children.push(target);
      break;
    case 'sendToBack':
      children.splice(idx, 1);
      children.unshift(target);
      break;
  }

  return updateNode(root, parent.id, (curr) => ({
    ...curr,
    children,
  }));
}

/**
 * Group multiple nodes into a new container.
 */
export function groupNodes(
  root: ComponentNode,
  nodeIds: string[]
): { newRoot: ComponentNode; groupId: string | null } {
  if (nodeIds.length < 1) return { newRoot: root, groupId: null };

  const targetNodes: ComponentNode[] = [];
  for (const id of nodeIds) {
    const node = findNode(root, id);
    if (node && node.id !== root.id) {
      targetNodes.push(node);
    }
  }

  if (targetNodes.length === 0) return { newRoot: root, groupId: null };

  // Common parent or fallback to parent of first node
  const firstParent = findParent(root, targetNodes[0].id) || root;
  const groupId = `group_${Date.now()}`;

  const groupContainer: ComponentNode = {
    id: groupId,
    type: 'container',
    name: 'Group',
    props: {},
    styles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '8px',
      position: 'relative',
      minWidth: '100px',
      minHeight: '60px',
    },
    children: targetNodes.map((n) => ({ ...n, parentId: groupId })),
    parentId: firstParent.id,
  };

  // Remove nodes from current positions and add groupContainer
  let updatedRoot = root;
  for (const n of targetNodes) {
    const p = findParent(updatedRoot, n.id);
    if (p) {
      updatedRoot = updateNode(updatedRoot, p.id, (curr) => ({
        ...curr,
        children: curr.children.filter((c) => c.id !== n.id),
      }));
    }
  }

  // Insert groupContainer into firstParent
  updatedRoot = updateNode(updatedRoot, firstParent.id, (curr) => ({
    ...curr,
    children: [...curr.children, groupContainer],
  }));

  return { newRoot: updatedRoot, groupId };
}
