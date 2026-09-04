// Operation Permissions: Authorization verification for AI operations
import { AIOperation } from './AIOperation';
import { RbacEngine } from '../../builder/security/rbac-engine';
import { Role } from '../../builder/schema/rbac';

export class OperationPermissions {
  /**
   * Maps an operation type to its required RBAC permission string.
   */
  public static getRequiredPermission(op: AIOperation): string {
    switch (op.type) {
      case 'create_page':
      case 'rename_page':
        return 'pages.create';
      case 'delete_page':
        return 'pages.delete';
      case 'add_component':
      case 'move_component':
      case 'update_component':
      case 'update_responsive_style':
      case 'create_binding':
        return 'components.edit';
      case 'remove_component':
        return 'components.delete';
      case 'create_collection':
      case 'add_field':
      case 'create_relationship':
      case 'create_query':
        return 'collections.create';
      case 'create_variable':
        return 'variables.edit';
      case 'create_workflow':
      case 'add_workflow_action':
        return 'workflows.create';
      case 'create_role':
      case 'assign_permission':
        return 'roles.manage';
      case 'update_theme':
      case 'create_token':
      case 'create_reusable_component':
        return 'theme.edit';
      default:
        return 'project.edit';
    }
  }

  /**
   * Verifies if a user's assigned roles allow executing the given operations.
   */
  public static authorizeOperations(
    ops: AIOperation[],
    userRoles: Role[]
  ): { authorized: boolean; unauthorizedOperations: Array<{ opId: string; requiredPermission: string }> } {
    const unauthorized: Array<{ opId: string; requiredPermission: string }> = [];
    const engine = new RbacEngine(userRoles);

    const user = {
      id: 'current_user',
      roles: userRoles.map((r) => r.id),
    };

    for (const op of ops) {
      const required = this.getRequiredPermission(op);
      const [resource, action] = required.split('.');
      const allowed = engine.hasPermission(user, resource || '*', action || '*');
      if (!allowed) {
        unauthorized.push({ opId: op.id, requiredPermission: required });
      }
    }

    return {
      authorized: unauthorized.length === 0,
      unauthorizedOperations: unauthorized,
    };
  }

}
