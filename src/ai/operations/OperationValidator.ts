// Operation Validator: Zod schema and reference checks
import { z } from 'zod';
import { AIOperation } from './AIOperation';
import { COMPONENT_REGISTRY } from '../../builder/components/registry';

export class OperationValidator {
  /**
   * Validates a single operation against structural and semantic rules.
   */
  public static validate(op: AIOperation): { valid: boolean; error?: string } {
    if (!op || typeof op !== 'object') {
      return { valid: false, error: 'Operation must be an object' };
    }

    if (!op.id || typeof op.id !== 'string') {
      return { valid: false, error: 'Operation missing unique string id' };
    }

    if (!op.type || typeof op.type !== 'string') {
      return { valid: false, error: 'Operation missing valid type' };
    }

    // Risk check
    if (!['low', 'medium', 'high', 'critical'].includes(op.risk)) {
      return { valid: false, error: `Invalid risk level: ${op.risk}` };
    }

    // Specific type checks
    switch (op.type) {
      case 'create_page':
        if (!op.pageId || !op.name || !op.slug) {
          return { valid: false, error: 'create_page requires pageId, name, and slug' };
        }
        break;

      case 'add_component':
        if (!op.pageId || !op.parentId || !op.node || !op.node.type) {
          return { valid: false, error: 'add_component requires pageId, parentId, and node with type' };
        }
        // Verify component type exists in registry
        if (!COMPONENT_REGISTRY[op.node.type as keyof typeof COMPONENT_REGISTRY]) {
          return { valid: false, error: `Unknown component type: "${op.node.type}". Must be a registered component.` };
        }
        break;

      case 'update_component':
        if (!op.pageId || !op.nodeId) {
          return { valid: false, error: 'update_component requires pageId and nodeId' };
        }
        break;

      case 'create_collection':
        if (!op.collectionId || !op.name) {
          return { valid: false, error: 'create_collection requires collectionId and name' };
        }
        break;

      case 'add_field':
        if (!op.collectionId || !op.field || !op.field.name || !op.field.type) {
          return { valid: false, error: 'add_field requires collectionId, field.name, and field.type' };
        }
        break;

      case 'create_workflow':
        if (!op.workflow || !op.workflow.id || !op.workflow.name || !Array.isArray(op.workflow.nodes)) {
          return { valid: false, error: 'create_workflow requires id, name, and nodes array' };
        }
        break;

      case 'update_theme':
        if (!op.theme || typeof op.theme !== 'object') {
          return { valid: false, error: 'update_theme requires theme object' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Validates an entire list of operations.
   */
  public static validateAll(ops: AIOperation[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const op of ops) {
      const res = this.validate(op);
      if (!res.valid) {
        errors.push(`Operation ${op.id} (${op.type}): ${res.error}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
