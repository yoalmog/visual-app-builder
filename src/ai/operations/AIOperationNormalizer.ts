// AIOperationNormalizer: Guarantees structural validity and schema compliance for LLM operations
import { AIOperation, BaseAIOperation } from './AIOperation';
import { COMPONENT_REGISTRY } from '../../builder/components/registry';
import { ComponentNode, ComponentType } from '../../builder/schema/component';

const COMPONENT_ALIASES: Record<string, ComponentType> = {
  form: 'container',
  table: 'data_table',
  hero: 'section',
  box: 'container',
  wrapper: 'container',
  layout: 'container',
  label: 'text',
  span: 'text',
  p: 'paragraph',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  img: 'image',
  btn: 'button',
};

export class AIOperationNormalizer {
  /**
   * Normalizes a component node tree recursively.
   */
  public static normalizeNode(rawNode: any, parentId?: string, index: number = 0): ComponentNode {
    if (!rawNode || typeof rawNode !== 'object') {
      return {
        id: `node_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'container',
        name: 'Container',
        props: {},
        styles: {},
        bindings: {},
        locked: false,
        states: {},
        interactions: [],
        parentId,
        children: [],
      };
    }

    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 6);
    const rawType = String(rawNode.type || 'container').toLowerCase();
    const resolvedType: ComponentType = COMPONENT_REGISTRY[rawType as ComponentType]
      ? (rawType as ComponentType)
      : (COMPONENT_ALIASES[rawType] || 'container');

    const node: ComponentNode = {
      id: rawNode.id ? String(rawNode.id) : `node_${ts}_${index}_${rand}`,
      type: resolvedType,
      name: rawNode.name ? String(rawNode.name) : (resolvedType.charAt(0).toUpperCase() + resolvedType.slice(1)),
      props: typeof rawNode.props === 'object' && rawNode.props !== null ? rawNode.props : {},
      styles: typeof rawNode.styles === 'object' && rawNode.styles !== null ? rawNode.styles : {},
      bindings: typeof rawNode.bindings === 'object' && rawNode.bindings !== null ? rawNode.bindings : {},
      locked: Boolean(rawNode.locked),
      states: typeof rawNode.states === 'object' && rawNode.states !== null ? rawNode.states : {},
      interactions: Array.isArray(rawNode.interactions) ? rawNode.interactions : [],
      parentId,
      children: [],
    };

    if (Array.isArray(rawNode.children)) {
      node.children = rawNode.children.map((child: any, cIdx: number) =>
        this.normalizeNode(child, node.id, cIdx)
      );
    }

    return node;
  }

  /**
   * Normalizes a single operation object, injecting required properties (id, risk, description, reversible).
   */
  public static normalizeOperation(op: any, index: number = 0, defaultPageId?: string): AIOperation {
    if (!op || typeof op !== 'object') {
      return {
        id: `op_${Date.now()}_${index}`,
        type: 'update_theme',
        description: 'Auto-fallback operation',
        risk: 'low',
        reversible: true,
        theme: {},
      } as any;
    }

    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 6);
    const cloned = { ...op };

    // 1. Ensure unique id
    if (!cloned.id || typeof cloned.id !== 'string') {
      const typePrefix = cloned.type || 'op';
      cloned.id = `op_${typePrefix}_${ts}_${index}_${rand}`;
    }

    // 2. Ensure risk
    if (!cloned.risk || !['low', 'medium', 'high', 'critical'].includes(cloned.risk)) {
      cloned.risk = (cloned.type?.includes('delete') || cloned.type?.includes('remove')) ? 'medium' : 'low';
    }

    // 3. Ensure reversible
    if (typeof cloned.reversible !== 'boolean') {
      cloned.reversible = true;
    }

    // 4. Ensure description
    if (!cloned.description || typeof cloned.description !== 'string') {
      cloned.description = `${cloned.type || 'Operation'}: ${cloned.name || cloned.pageId || cloned.collectionId || cloned.id}`;
    }

    // 5. Operation-specific hydration
    switch (cloned.type) {
      case 'create_page':
        if (!cloned.pageId) cloned.pageId = `page_${cloned.name ? cloned.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `${ts}_${index}`}`;
        if (!cloned.name) cloned.name = 'New Page';
        if (!cloned.slug) cloned.slug = `/${cloned.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        break;

      case 'create_collection':
        if (!cloned.collectionId) {
          cloned.collectionId = `col_${cloned.name ? cloned.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : `${ts}_${index}`}`;
        }
        if (!cloned.name) cloned.name = 'New Collection';
        if (!Array.isArray(cloned.fields) || cloned.fields.length === 0) {
          cloned.fields = [
            { id: 'f_id', name: 'id', type: 'text', required: true, unique: true },
            { id: 'f_title', name: 'title', type: 'text', required: true },
            { id: 'f_created', name: 'createdAt', type: 'date', required: true },
          ];
        } else {
          cloned.fields = cloned.fields.map((f: any, fIdx: number) => ({
            id: f.id || `f_${f.name ? f.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : fIdx}`,
            name: f.name || `field_${fIdx}`,
            type: f.type || 'text',
            required: Boolean(f.required),
            unique: Boolean(f.unique),
          }));
        }
        break;

      case 'add_component':
        if (!cloned.pageId) cloned.pageId = defaultPageId || 'page_home';
        if (!cloned.parentId) cloned.parentId = 'root';
        cloned.node = this.normalizeNode(cloned.node, cloned.parentId, index);
        break;

      case 'update_component':
        if (!cloned.pageId) cloned.pageId = defaultPageId || 'page_home';
        if (!cloned.nodeId && cloned.id) cloned.nodeId = cloned.id;
        break;

      case 'update_theme':
        if (!cloned.theme || typeof cloned.theme !== 'object') {
          cloned.theme = { primaryColor: '#6366F1' };
        }
        break;

      case 'create_workflow':
        if (!cloned.workflow || typeof cloned.workflow !== 'object') {
          cloned.workflow = {
            id: `wf_${ts}_${index}`,
            name: cloned.name || 'Application Workflow',
            nodes: [],
            edges: [],
          };
        } else {
          if (!cloned.workflow.id) cloned.workflow.id = `wf_${ts}_${index}`;
          if (!cloned.workflow.name) cloned.workflow.name = 'Workflow';
          if (!Array.isArray(cloned.workflow.nodes)) cloned.workflow.nodes = [];
          if (!Array.isArray(cloned.workflow.edges)) cloned.workflow.edges = [];
        }
        break;
    }

    return cloned as AIOperation;
  }

  /**
   * Normalizes an entire array of operations.
   */
  public static normalizeOperations(operations: any[], defaultPageId?: string): AIOperation[] {
    if (!Array.isArray(operations)) return [];
    return operations.map((op, idx) => this.normalizeOperation(op, idx, defaultPageId));
  }
}
