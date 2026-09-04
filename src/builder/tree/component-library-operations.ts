import { ComponentNode } from '../schema/component';
import { ComponentDefinition, ComponentVariant } from '../schema/project';
import { cloneNodeWithNewIds } from './duplicate-node';

export function createComponentDefinitionFromNode(
  name: string,
  sourceNode: ComponentNode
): ComponentDefinition {
  const definitionId = `comp_def_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  // Deep clone root template for the component definition
  const rootClone = cloneNodeWithNewIds(sourceNode);

  return {
    id: definitionId,
    name: name.trim() || 'Custom Component',
    root: rootClone,
    variants: [
      { id: 'variant_default', name: 'Default' },
      { id: 'variant_primary', name: 'Primary' },
    ],
  };
}

export function instantiateComponentDefinition(
  definition: ComponentDefinition,
  targetParentId: string,
  variantId?: string
): ComponentNode {
  // Clone definition root with fresh unique IDs
  const instance = cloneNodeWithNewIds(definition.root, targetParentId);
  instance.componentInstanceId = definition.id;
  instance.variantId = variantId || 'variant_default';

  // Apply variant overrides if specified
  if (variantId && definition.variants) {
    const variant = definition.variants.find((v) => v.id === variantId);
    if (variant) {
      if (variant.props) {
        instance.props = { ...instance.props, ...variant.props };
      }
      if (variant.styles) {
        instance.styles = { ...instance.styles, ...variant.styles };
      }
    }
  }

  return instance;
}
