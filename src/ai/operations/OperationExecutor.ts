// Operation Executor: Applies typed AIOperation list onto AppProject
import { AppProject, DataCollection, Variable, DesignToken } from '../../builder/schema/project';
import { AppPage } from '../../builder/schema/page';
import { ComponentNode } from '../../builder/schema/component';
import { WorkflowDefinition } from '../../builder/schema/workflow';
import { Role } from '../../builder/schema/rbac';
import { AIOperation } from './AIOperation';
import { insertNode } from '../../builder/tree/insert-node';
import { removeNode } from '../../builder/tree/remove-node';
import { updateNode } from '../../builder/tree/update-node';
import { moveNode } from '../../builder/tree/move-node';
import { findNode } from '../../builder/tree/find-node';

export class OperationExecutor {
  /**
   * Applies an array of operations sequentially to an AppProject, producing an updated project.
   */
  public static execute(
    project: AppProject,
    operations: AIOperation[]
  ): { updatedProject: AppProject; appliedCount: number; errors: Array<{ opId: string; error: string }> } {
    // Deep clone the project
    let current: AppProject = JSON.parse(JSON.stringify(project));
    const errors: Array<{ opId: string; error: string }> = [];
    let appliedCount = 0;

    for (const op of operations) {
      try {
        current = this.applySingle(current, op);
        appliedCount++;
      } catch (err: any) {
        errors.push({ opId: op.id, error: err.message || 'Operation execution failed' });
      }
    }

    return { updatedProject: current, appliedCount, errors };
  }

  private static applySingle(project: AppProject, op: AIOperation): AppProject {
    switch (op.type) {
      case 'create_page': {
        if (project.pages.some((p) => p.id === op.pageId)) {
          return project; // idempotent
        }
        const rootId = `root_${op.pageId}`;
        const newPage: AppPage = {
          id: op.pageId,
          name: op.name,
          slug: op.slug.startsWith('/') ? op.slug : `/${op.slug}`,
          root: {
            id: rootId,
            type: 'container',
            name: `${op.name} Root`,
            props: {},
            styles: {
              minHeight: '100vh',
              width: '100%',
              backgroundColor: '#FFFFFF',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            },
            locked: false,
            states: {},
            interactions: [],
            children: [],
          },
        };
        project.pages.push(newPage);
        break;
      }

      case 'delete_page': {
        if (project.pages.length > 1) {
          project.pages = project.pages.filter((p) => p.id !== op.pageId);
        }
        break;
      }

      case 'rename_page': {
        const page = project.pages.find((p) => p.id === op.pageId);
        if (page) {
          page.name = op.newName;
          if (op.newSlug) {
            page.slug = op.newSlug.startsWith('/') ? op.newSlug : `/${op.newSlug}`;
          }
        }
        break;
      }

      case 'add_component': {
        const page = project.pages.find((p) => p.id === op.pageId);
        if (!page) throw new Error(`Page ${op.pageId} not found`);

        const newNode = this.normalizeNode(op.node, op.parentId);
        const updatedRoot = insertNode(page.root, op.parentId, newNode, op.index);
        page.root = updatedRoot;
        break;
      }

      case 'remove_component': {
        const page = project.pages.find((p) => p.id === op.pageId);
        if (!page) throw new Error(`Page ${op.pageId} not found`);
        page.root = removeNode(page.root, op.nodeId);
        break;
      }

      case 'move_component': {
        const page = project.pages.find((p) => p.id === op.pageId);
        if (!page) throw new Error(`Page ${op.pageId} not found`);
        page.root = moveNode(page.root, op.nodeId, op.newParentId, op.newIndex);
        break;
      }

      case 'update_component': {
        const page = project.pages.find((p) => p.id === op.pageId);
        if (!page) throw new Error(`Page ${op.pageId} not found`);

        page.root = updateNode(page.root, op.nodeId, (node) => ({
          ...node,
          props: op.props ? { ...node.props, ...op.props } : node.props,
          styles: op.styles ? { ...node.styles, ...op.styles } : node.styles,
          bindings: op.bindings ? { ...(node.bindings || {}), ...op.bindings } : node.bindings,
        }));
        break;
      }


      case 'create_collection': {
        if (!Array.isArray(project.collections)) project.collections = [];
        if (project.collections.some((c) => c.id === op.collectionId)) return project;

        const newCol: DataCollection = {
          id: op.collectionId,
          name: op.name,
          fields: op.fields || [
            { id: 'f_id', name: 'id', type: 'text', required: true, unique: true },
            { id: 'f_created_at', name: 'createdAt', type: 'date', required: true },
          ],
          records: [],
          dataSource: 'local',
          primaryKey: 'id',
        };
        project.collections.push(newCol);
        break;
      }

      case 'add_field': {
        if (!Array.isArray(project.collections)) project.collections = [];
        const col = project.collections.find((c) => c.id === op.collectionId);
        if (!col) throw new Error(`Collection ${op.collectionId} not found`);
        if (!Array.isArray(col.fields)) col.fields = [];

        if (!col.fields.some((f) => f.id === op.field.id || f.name === op.field.name)) {
          col.fields.push({
            id: op.field.id,
            name: op.field.name,
            type: op.field.type as any,
            required: !!op.field.required,
            defaultValue: op.field.defaultValue,
            unique: !!op.field.unique,
          });
        }
        break;
      }

      case 'create_relationship': {
        if (!Array.isArray(project.collections)) project.collections = [];
        const col = project.collections.find((c) => c.id === op.collectionId);
        if (!col) throw new Error(`Collection ${op.collectionId} not found`);
        if (!Array.isArray(col.relationships)) col.relationships = [];

        const relTypeMap: Record<string, import('../../builder/schema/project').RelationshipType> = {
          '1:1': 'one_to_one',
          '1:N': 'one_to_many',
          'N:1': 'many_to_one',
          'N:M': 'many_to_many',
        };

        col.relationships.push({
          id: op.relationship.id,
          name: op.relationship.name,
          sourceCollectionId: op.collectionId,
          sourceField: op.relationship.foreignKey || 'id',
          targetCollectionId: op.relationship.targetCollectionId,
          targetField: 'id',
          type: relTypeMap[op.relationship.type] || 'many_to_one',
          onDelete: op.relationship.onDelete || 'set_null',
        });
        break;
      }


      case 'create_query': {
        if (!Array.isArray(project.queries)) project.queries = [];
        if (!project.queries.some((q) => q.id === op.query.id)) {
          project.queries.push(op.query as any);
        }
        break;
      }

      case 'create_binding': {
        const page = project.pages.find((p) => p.id === op.pageId);
        if (!page) throw new Error(`Page ${op.pageId} not found`);
        page.root = updateNode(page.root, op.nodeId, (node) => ({
          ...node,
          bindings: {
            ...(node.bindings || {}),
            [op.propName]: { property: op.propName, type: 'expression', expression: op.expression },
          },
        }));
        break;
      }

      case 'create_variable': {
        if (!Array.isArray(project.variables)) project.variables = [];
        if (!project.variables.some((v) => v.id === op.variable.id)) {
          project.variables.push(op.variable as Variable);
        }
        break;
      }

      case 'create_workflow': {
        if (!Array.isArray(project.workflows)) project.workflows = [];
        if (!project.workflows.some((w) => w.id === op.workflow.id)) {
          project.workflows.push({
            id: op.workflow.id,
            name: op.workflow.name,
            description: op.workflow.description,
            version: 1,
            nodes: op.workflow.nodes,
            triggerType: 'manual',
          });
        }
        break;
      }

      case 'add_workflow_action': {
        if (!Array.isArray(project.workflows)) project.workflows = [];
        const wf = project.workflows.find((w) => w.id === op.workflowId);
        if (wf) {
          wf.nodes.push(op.actionNode);
        }
        break;
      }

      case 'create_role': {
        if (!Array.isArray(project.roles)) project.roles = [];
        if (!project.roles.some((r) => r.id === op.role.id)) {
          project.roles.push({
            id: op.role.id,
            name: op.role.name,
            description: op.role.description,
            permissions: op.role.permissions,
          });
        }
        break;
      }

      case 'assign_permission': {
        if (!Array.isArray(project.roles)) project.roles = [];
        const role = project.roles.find((r) => r.id === op.roleId);
        if (role) {
          if (!role.permissions.includes(op.permission)) {
            role.permissions.push(op.permission);
          }
        }
        break;
      }

      case 'update_theme': {
        if (!project.theme) project.theme = {} as any;
        if (op.theme.primaryColor) project.theme.primaryColor = op.theme.primaryColor;
        if (op.theme.backgroundColor) project.theme.backgroundColor = op.theme.backgroundColor;
        if (op.theme.textColor) project.theme.textColor = op.theme.textColor;
        if (op.theme.borderRadius) project.theme.borderRadius = op.theme.borderRadius;
        if (op.theme.colors) {
          project.theme.colors = { ...(project.theme.colors || {}), ...op.theme.colors };
        }
        break;
      }

      case 'create_token': {
        if (!Array.isArray(project.tokens)) project.tokens = [];
        if (!project.tokens.some((t) => t.id === op.token.id)) {
          project.tokens.push(op.token as DesignToken);
        }
        break;
      }

      case 'create_reusable_component': {
        if (!Array.isArray(project.components)) project.components = [];
        if (!project.components.some((c) => c.id === op.component.id)) {
          project.components.push(op.component as any);
        }
        break;
      }

      case 'update_responsive_style': {
        const page = project.pages.find((p) => p.id === op.pageId);
        if (!page) throw new Error(`Page ${op.pageId} not found`);
        page.root = updateNode(page.root, op.nodeId, (node) => ({
          ...node,
          responsiveStyles: {
            ...(node.responsiveStyles || {}),
            [op.breakpoint]: {
              ...(node.responsiveStyles?.[op.breakpoint] || {}),
              ...op.styles,
            },
          },
        }));
        break;
      }

    }

    return project;
  }

  private static normalizeNode(raw: any, parentId?: string): ComponentNode {
    const node: ComponentNode = {
      id: raw.id,
      type: raw.type,
      name: raw.name || raw.type,
      props: raw.props || {},
      styles: raw.styles || {},
      bindings: raw.bindings || {},
      locked: Boolean(raw.locked),
      states: raw.states || {},
      interactions: raw.interactions || [],
      parentId,
      children: [],
    };
    if (Array.isArray(raw.children)) {
      node.children = raw.children.map((child: any) => this.normalizeNode(child, node.id));
    }
    return node;
  }
}
