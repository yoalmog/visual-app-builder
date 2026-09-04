import { ComponentAction, ComponentInteraction } from '../schema/component';
import { AppProject } from '../schema/project';
import { findNode } from '../tree/find-node';

export interface InteractionRuntimeContext {
  project: AppProject;
  activePageId: string;
  setActivePage: (pageId: string) => void;
  visibleOverrides: Record<string, boolean>;
  setVisibleOverride: (nodeId: string, visible: boolean) => void;
  toggleVisibleOverride: (nodeId: string) => void;
}

/**
 * Validate a URL to prevent unsafe schemes
 */
export function isValidUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return false;
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('#');
}

/**
 * Execute a single component action in runtime/preview
 */
export function executeComponentAction(
  action: ComponentAction,
  ctx: InteractionRuntimeContext
): { success: boolean; message?: string } {
  try {
    switch (action.type) {
      case 'navigate': {
        const destPageId = action.targetPageId || action.pageId;
        if (!destPageId) return { success: false, message: 'Missing targetPageId' };
        const pageExists = ctx.project.pages.some((p) => p.id === destPageId);
        if (pageExists) {
          ctx.setActivePage(destPageId);
          return { success: true };
        }
        return { success: false, message: `Target page ${destPageId} not found` };
      }

      case 'open_url': {
        if (!action.url || !isValidUrl(action.url)) {
          return { success: false, message: 'Invalid or unsafe URL' };
        }
        if (typeof window !== 'undefined' && typeof window.open === 'function') {
          const target = action.target || '_blank';
          window.open(action.url, target);
        }
        return { success: true };
      }

      case 'show_element': {
        if (!action.targetNodeId) return { success: false, message: 'Missing targetNodeId' };
        const activePage = ctx.project.pages.find((p) => p.id === ctx.activePageId);
        if (activePage && findNode(activePage.root, action.targetNodeId)) {
          ctx.setVisibleOverride(action.targetNodeId, true);
          return { success: true };
        }
        return { success: false, message: 'Target element not found' };
      }

      case 'hide_element': {
        if (!action.targetNodeId) return { success: false, message: 'Missing targetNodeId' };
        const activePage = ctx.project.pages.find((p) => p.id === ctx.activePageId);
        if (activePage && findNode(activePage.root, action.targetNodeId)) {
          ctx.setVisibleOverride(action.targetNodeId, false);
          return { success: true };
        }
        return { success: false, message: 'Target element not found' };
      }

      case 'toggle_element': {
        if (!action.targetNodeId) return { success: false, message: 'Missing targetNodeId' };
        const activePage = ctx.project.pages.find((p) => p.id === ctx.activePageId);
        if (activePage && findNode(activePage.root, action.targetNodeId)) {
          ctx.toggleVisibleOverride(action.targetNodeId);
          return { success: true };
        }
        return { success: false, message: 'Target element not found' };
      }

      case 'scroll_to': {
        if (!action.targetNodeId) return { success: false, message: 'Missing targetNodeId' };
        if (typeof document !== 'undefined') {
          const el = document.getElementById(`builder-node-${action.targetNodeId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            return { success: true };
          }
        }
        return { success: false, message: 'Element not found in DOM' };
      }

      default:
        return { success: false, message: `Unknown action type: ${(action as any).type}` };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Execute interactions for a given event on a node
 */
export function triggerNodeInteractions(
  interactions: ComponentInteraction[] | undefined,
  event: 'click' | 'double_click' | 'double-click' | 'hover',
  ctx: InteractionRuntimeContext
) {
  if (!interactions || interactions.length === 0) return;

  for (const inter of interactions) {
    if (inter.event === event) {
      for (const action of inter.actions) {
        executeComponentAction(action, ctx);
      }
    }
  }
}
