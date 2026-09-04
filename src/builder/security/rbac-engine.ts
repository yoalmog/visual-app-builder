import { Role, Permission, RecordAuthorizationRule, ComponentPermissionGating, UnauthorizedUiBehavior } from '../schema/rbac';
import { evaluateExpression } from '../expressions/expression-evaluator';

export interface UserAuthContext {
  id: string;
  email?: string;
  role?: string;
  roles?: string[];
  attributes?: Record<string, any>;
}

export class RbacEngine {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private recordRules: RecordAuthorizationRule[] = [];

  constructor(roles: Role[] = [], permissions: Permission[] = [], recordRules: RecordAuthorizationRule[] = []) {
    this.updateConfig(roles, permissions, recordRules);
  }

  public updateConfig(roles: Role[], permissions: Permission[] = [], recordRules: RecordAuthorizationRule[] = []): void {
    this.roles.clear();
    for (const r of roles) {
      this.roles.set(r.id, r);
    }

    this.permissions.clear();
    for (const p of permissions) {
      this.permissions.set(p.id, p);
    }

    this.recordRules = [...recordRules];
  }

  /**
   * Checks if user has permission to perform action on resource.
   */
  public hasPermission(
    user: UserAuthContext | null | undefined,
    resource: string,
    action: string,
    record?: any
  ): boolean {
    if (!user) {
      // Check if anonymous role allows this
      const anonRole = this.roles.get('anonymous') || this.roles.get('public');
      if (!anonRole) return false;
      return this.roleHasPermission(anonRole, resource, action, user, record);
    }

    const userRoleIds: string[] = [];
    if (user.role) userRoleIds.push(user.role);
    if (user.roles && Array.isArray(user.roles)) {
      for (const r of user.roles) {
        if (!userRoleIds.includes(r)) userRoleIds.push(r);
      }
    }

    if (userRoleIds.length === 0) {
      userRoleIds.push('authenticated');
    }

    // Super-admin bypass
    if (userRoleIds.includes('admin') || userRoleIds.includes('super_admin')) {
      return true;
    }

    for (const roleId of userRoleIds) {
      const role = this.roles.get(roleId);
      if (role && this.roleHasPermission(role, resource, action, user, record)) {
        return true;
      }
    }

    return false;
  }

  private roleHasPermission(
    role: Role,
    resource: string,
    action: string,
    user?: UserAuthContext | null,
    record?: any
  ): boolean {
    // Check wildcard permission
    if (role.permissions.includes('*') || role.permissions.includes('*.*')) {
      return true;
    }

    const targetPattern = `${resource}.${action}`;
    const resourceWildcard = `${resource}.*`;

    for (const p of role.permissions) {
      if (p === targetPattern || p === resourceWildcard || p === '*') {
        return this.checkRecordLevelRules(resource, action, user, record);
      }

      // Check against Permission objects
      const permObj = this.permissions.get(p);
      if (permObj) {
        const matchRes = permObj.resource === '*' || permObj.resource === resource;
        const matchAct = permObj.action === '*' || permObj.action === action;
        if (matchRes && matchAct) {
          return this.checkRecordLevelRules(resource, action, user, record);
        }
      }
    }

    return false;
  }

  private checkRecordLevelRules(
    resource: string,
    action: string,
    user?: UserAuthContext | null,
    record?: any
  ): boolean {
    if (!record) return true;

    const matchingRules = this.recordRules.filter(
      r => (r.resource === '*' || r.resource === resource) && (r.action === '*' || r.action === action)
    );

    if (matchingRules.length === 0) return true;

    // Must satisfy all matching rules
    return matchingRules.every(rule => {
      try {
        const context = {
          user: user || {},
          record: record.values ? { ...record.values, id: record.id } : record,
        };
        const res = evaluateExpression(rule.conditionExpression, context);
        return Boolean(res.success && res.value);
      } catch {
        return false;
      }
    });
  }

  /**
   * Evaluates UI component permission gating.
   */
  public evaluateComponentGating(
    user: UserAuthContext | null | undefined,
    gating?: ComponentPermissionGating
  ): { allowed: boolean; behavior: UnauthorizedUiBehavior } {
    if (!gating) {
      return { allowed: true, behavior: 'hide' };
    }

    const behavior = gating.unauthorizedBehavior || 'hide';

    // 1. Role requirements
    if (gating.requiredRoles && gating.requiredRoles.length > 0) {
      const userRoles = [user?.role, ...(user?.roles || [])].filter(Boolean) as string[];
      const hasAnyRole = gating.requiredRoles.some(r => userRoles.includes(r));
      if (!hasAnyRole) {
        return { allowed: false, behavior };
      }
    }

    // 2. Permission requirements
    if (gating.requiredPermissions && gating.requiredPermissions.length > 0) {
      const hasAll = gating.requiredPermissions.every(p => {
        const [resource, action] = p.split('.');
        return this.hasPermission(user, resource || '*', action || '*');
      });
      if (!hasAll) {
        return { allowed: false, behavior };
      }
    }

    // 3. Custom auth expression
    if (gating.authExpression) {
      try {
        const res = evaluateExpression(gating.authExpression, { user: user || {} });
        const allowed = Boolean(res.success && res.value);
        if (!allowed) {
          return { allowed: false, behavior };
        }
      } catch {
        return { allowed: false, behavior };
      }
    }

    return { allowed: true, behavior };
  }
}
