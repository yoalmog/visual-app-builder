// Typed AI Operations Schema & Definitions
import { z } from 'zod';
import { AIRisk } from '../../builder/schema/ai';

export type AIOperationType =
  | 'create_page'
  | 'delete_page'
  | 'rename_page'
  | 'add_component'
  | 'remove_component'
  | 'move_component'
  | 'update_component'
  | 'create_collection'
  | 'add_field'
  | 'create_relationship'
  | 'create_query'
  | 'create_binding'
  | 'create_variable'
  | 'create_workflow'
  | 'add_workflow_action'
  | 'create_role'
  | 'assign_permission'
  | 'update_theme'
  | 'create_token'
  | 'create_reusable_component'
  | 'update_responsive_style';

export interface BaseAIOperation {
  id: string;
  type: AIOperationType;
  description: string;
  risk: AIRisk;
  dependencies?: string[]; // IDs of preceding operations that must succeed first
  reversible: boolean;
}

export interface CreatePageOperation extends BaseAIOperation {
  type: 'create_page';
  pageId: string;
  name: string;
  slug: string;
  title?: string;
}

export interface DeletePageOperation extends BaseAIOperation {
  type: 'delete_page';
  pageId: string;
}

export interface RenamePageOperation extends BaseAIOperation {
  type: 'rename_page';
  pageId: string;
  newName: string;
  newSlug?: string;
}

export interface AddComponentOperation extends BaseAIOperation {
  type: 'add_component';
  pageId: string;
  parentId: string;
  node: {
    id: string;
    type: string;
    name: string;
    props?: Record<string, any>;
    styles?: Record<string, any>;
    bindings?: Record<string, any>;
    children?: any[];
  };
  index?: number;
}

export interface RemoveComponentOperation extends BaseAIOperation {
  type: 'remove_component';
  pageId: string;
  nodeId: string;
}

export interface MoveComponentOperation extends BaseAIOperation {
  type: 'move_component';
  pageId: string;
  nodeId: string;
  newParentId: string;
  newIndex?: number;
}

export interface UpdateComponentOperation extends BaseAIOperation {
  type: 'update_component';
  pageId: string;
  nodeId: string;
  props?: Record<string, any>;
  styles?: Record<string, any>;
  bindings?: Record<string, any>;
}

export interface CreateCollectionOperation extends BaseAIOperation {
  type: 'create_collection';
  collectionId: string;
  name: string;
  fields?: any[];
}

export interface AddFieldOperation extends BaseAIOperation {
  type: 'add_field';
  collectionId: string;
  field: {
    id: string;
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: any;
    unique?: boolean;
  };
}

export interface CreateRelationshipOperation extends BaseAIOperation {
  type: 'create_relationship';
  collectionId: string;
  relationship: {
    id: string;
    name: string;
    type: '1:1' | '1:N' | 'N:1' | 'N:M';
    targetCollectionId: string;
    foreignKey: string;
    onDelete?: 'cascade' | 'set_null' | 'restrict';
  };
}

export interface CreateQueryOperation extends BaseAIOperation {
  type: 'create_query';
  query: {
    id: string;
    name: string;
    collectionId: string;
    filters?: any[];
    sorts?: any[];
    pagination?: any;
    aggregations?: any[];
  };
}

export interface CreateBindingOperation extends BaseAIOperation {
  type: 'create_binding';
  pageId: string;
  nodeId: string;
  propName: string;
  expression: string;
}

export interface CreateVariableOperation extends BaseAIOperation {
  type: 'create_variable';
  variable: {
    id: string;
    name: string;
    type: 'text' | 'number' | 'boolean' | 'object' | 'array';
    defaultValue: any;
    scope?: 'app' | 'page' | 'local';
  };
}

export interface CreateWorkflowOperation extends BaseAIOperation {
  type: 'create_workflow';
  workflow: {
    id: string;
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
  };
}

export interface AddWorkflowActionOperation extends BaseAIOperation {
  type: 'add_workflow_action';
  workflowId: string;
  actionNode: any;
}

export interface CreateRoleOperation extends BaseAIOperation {
  type: 'create_role';
  role: {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
  };
}

export interface AssignPermissionOperation extends BaseAIOperation {
  type: 'assign_permission';
  roleId: string;
  permission: string;
}

export interface UpdateThemeOperation extends BaseAIOperation {
  type: 'update_theme';
  theme: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    colors?: Record<string, string>;
  };
}

export interface CreateTokenOperation extends BaseAIOperation {
  type: 'create_token';
  token: {
    id: string;
    name: string;
    category: 'color' | 'spacing' | 'typography' | 'radius' | 'shadow';
    value: any;
    description?: string;
  };
}

export interface CreateReusableComponentOperation extends BaseAIOperation {
  type: 'create_reusable_component';
  component: {
    id: string;
    name: string;
    root: any;
    props?: any[];
  };
}

export interface UpdateResponsiveStyleOperation extends BaseAIOperation {
  type: 'update_responsive_style';
  pageId: string;
  nodeId: string;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  styles: Record<string, any>;
}

export type AIOperation =
  | CreatePageOperation
  | DeletePageOperation
  | RenamePageOperation
  | AddComponentOperation
  | RemoveComponentOperation
  | MoveComponentOperation
  | UpdateComponentOperation
  | CreateCollectionOperation
  | AddFieldOperation
  | CreateRelationshipOperation
  | CreateQueryOperation
  | CreateBindingOperation
  | CreateVariableOperation
  | CreateWorkflowOperation
  | AddWorkflowActionOperation
  | CreateRoleOperation
  | AssignPermissionOperation
  | UpdateThemeOperation
  | CreateTokenOperation
  | CreateReusableComponentOperation
  | UpdateResponsiveStyleOperation;

// Zod schema for runtime validation
export const BaseAIOperationSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  risk: z.enum(['low', 'medium', 'high', 'critical']),
  dependencies: z.array(z.string()).optional(),
  reversible: z.boolean(),
});
