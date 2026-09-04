import { DesignToken, DesignTokenCategory } from '../schema/project';
import { ComponentNode } from '../schema/component';

export interface TokenReferenceMatch {
  nodeId: string;
  nodeName: string;
  property: string;
}

/**
 * Scan a component tree and return all nodes referencing a given token ID.
 */
export function findTokenReferences(root: ComponentNode, tokenId: string): TokenReferenceMatch[] {
  const matches: TokenReferenceMatch[] = [];

  function walk(node: ComponentNode) {
    if (node.tokenReferences) {
      for (const [prop, refId] of Object.entries(node.tokenReferences)) {
        if (refId === tokenId) {
          matches.push({
            nodeId: node.id,
            nodeName: node.name,
            property: prop,
          });
        }
      }
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);
  return matches;
}

/**
 * Replace or remove all references to an oldTokenId across a component tree.
 * If replacementTokenId is null, the reference is removed.
 */
export function replaceTokenReferencesInTree(
  root: ComponentNode,
  oldTokenId: string,
  replacementTokenId: string | null
): ComponentNode {
  function walk(node: ComponentNode): ComponentNode {
    let updatedReferences = node.tokenReferences ? { ...node.tokenReferences } : undefined;
    let changed = false;

    if (updatedReferences) {
      for (const [prop, refId] of Object.entries(updatedReferences)) {
        if (refId === oldTokenId) {
          changed = true;
          if (replacementTokenId) {
            updatedReferences[prop] = replacementTokenId;
          } else {
            delete updatedReferences[prop];
          }
        }
      }
      if (Object.keys(updatedReferences).length === 0) {
        updatedReferences = undefined;
      }
    }

    const updatedChildren = node.children ? node.children.map(walk) : [];

    if (changed || updatedChildren !== node.children) {
      return {
        ...node,
        tokenReferences: updatedReferences,
        children: updatedChildren,
      };
    }

    return node;
  }

  return walk(root);
}

/**
 * Resolve a token's raw CSS value given a token ID or name.
 */
export function resolveTokenValue(
  tokens: DesignToken[] | undefined,
  tokenIdOrName: string
): string | Record<string, any> | undefined {
  if (!tokens || tokens.length === 0) return undefined;
  const found = tokens.find((t) => t.id === tokenIdOrName || t.name === tokenIdOrName);
  return found?.value;
}

/**
 * Filter tokens by category.
 */
export function getTokensByCategory(
  tokens: DesignToken[] | undefined,
  category: DesignTokenCategory
): DesignToken[] {
  if (!tokens) return [];
  return tokens.filter((t) => t.category === category);
}

/**
 * Check if a token name already exists.
 */
export function isTokenNameTaken(
  tokens: DesignToken[] | undefined,
  name: string,
  excludeId?: string
): boolean {
  if (!tokens) return false;
  const normalized = name.trim().toLowerCase();
  return tokens.some((t) => t.id !== excludeId && t.name.toLowerCase() === normalized);
}
