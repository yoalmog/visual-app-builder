// Page & Selection Context Builders
import { AppPage } from '../../builder/schema/page';
import { ComponentNode } from '../../builder/schema/component';
import { AISecretFilter } from '../security/AISecretFilter';

export interface PageContextSummary {
  pageId: string;
  name: string;
  slug: string;
  componentTree: any;
  bindingsCount: number;
}

export class PageContextBuilder {
  public static build(page: AppPage): PageContextSummary {
    let bindingsCount = 0;

    const simplifyNode = (node: ComponentNode): any => {
      if (!node) return null;
      if (node.bindings && Object.keys(node.bindings).length > 0) {
        bindingsCount += Object.keys(node.bindings).length;
      }
      return {
        id: node.id,
        type: node.type,
        name: node.name,
        props: node.props,
        styles: node.styles,
        bindings: node.bindings,
        children: Array.isArray(node.children) ? node.children.map(simplifyNode) : [],
      };
    };

    return AISecretFilter.redactObject({
      pageId: page.id,
      name: page.name,
      slug: page.slug,
      componentTree: simplifyNode(page.root),
      bindingsCount,
    });
  }
}

export interface SelectionContextSummary {
  selectedNodeId: string;
  type: string;
  name: string;
  props: Record<string, any>;
  styles: Record<string, any>;
  bindings?: Record<string, any>;
  parentId?: string;
  childrenCount: number;
}

export class SelectionContextBuilder {
  public static build(node: ComponentNode | null): SelectionContextSummary | null {
    if (!node) return null;
    return AISecretFilter.redactObject({
      selectedNodeId: node.id,
      type: node.type,
      name: node.name,
      props: node.props || {},
      styles: node.styles || {},
      bindings: node.bindings || {},
      parentId: node.parentId,
      childrenCount: Array.isArray(node.children) ? node.children.length : 0,
    });
  }
}
