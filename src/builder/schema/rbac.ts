/**
 * Phase 6: Roles, Permissions & RBAC Schema
 */

export interface Permission {
  id: string;
  resource: string; // e.g. 'users', 'orders', 'projects', '*'
  action: string;   // e.g. 'read', 'create', 'update', 'delete', '*'
  scope?: string;    // e.g. 'own', 'tenant', 'all'
  description?: string;
}

export interface RecordAuthorizationRule {
  id: string;
  resource: string;
  action: string;
  conditionExpression: string; // e.g. 'user.id == record.ownerId'
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // array of permission IDs or resource.action strings
  isSystem?: boolean;
}

export type UnauthorizedUiBehavior = 'hide' | 'disable' | 'access_denied';

export interface ComponentPermissionGating {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  authExpression?: string;
  unauthorizedBehavior?: UnauthorizedUiBehavior;
}
