// Data Model Generator: Infers schema collections, fields, and relationships
import { AIOperation } from '../operations/AIOperation';

export interface DataEntityDef {
  name: string;
  fields: Array<{ name: string; type: string; required?: boolean; unique?: boolean }>;
}

export interface RelationshipDef {
  fromCollection: string;
  toCollection: string;
  name: string;
  type: '1:1' | '1:N' | 'N:1' | 'N:M';
  foreignKey: string;
  onDelete?: 'cascade' | 'set_null' | 'restrict';
}

export class DataModelGenerator {
  /**
   * Generates operations to create collections, fields, and relationships for a requested domain.
   */
  public static generateDomainModel(params: {
    domainName: string;
    entities: DataEntityDef[];
    relationships?: RelationshipDef[];
  }): AIOperation[] {
    const ops: AIOperation[] = [];
    const colIdMap = new Map<string, string>(); // entity name -> collection ID

    // 1. Create collections and fields
    for (const entity of params.entities) {
      const colId = `col_${entity.name.toLowerCase().replace(/\s+/g, '_')}`;
      colIdMap.set(entity.name.toLowerCase(), colId);

      ops.push({
        id: `op_create_col_${colId}`,
        type: 'create_collection',
        description: `Create collection "${entity.name}"`,
        risk: 'medium',
        reversible: true,
        collectionId: colId,
        name: entity.name,
        fields: [
          { id: `f_id_${colId}`, name: 'id', type: 'text', required: true, unique: true },
          { id: `f_created_${colId}`, name: 'createdAt', type: 'date', required: true },
        ],
      });

      // Add declared fields
      for (const field of entity.fields) {
        if (field.name === 'id' || field.name === 'createdAt') continue;
        const fieldId = `f_${field.name.toLowerCase()}_${colId}`;
        ops.push({
          id: `op_field_${fieldId}`,
          type: 'add_field',
          description: `Add field "${field.name}" to ${entity.name}`,
          risk: 'low',
          dependencies: [`op_create_col_${colId}`],
          reversible: true,
          collectionId: colId,
          field: {
            id: fieldId,
            name: field.name,
            type: field.type,
            required: field.required ?? false,
            unique: field.unique ?? false,
          },
        });
      }
    }

    // 2. Create relationships
    if (params.relationships) {
      for (const rel of params.relationships) {
        const fromColId = colIdMap.get(rel.fromCollection.toLowerCase());
        const toColId = colIdMap.get(rel.toCollection.toLowerCase());

        if (fromColId && toColId) {
          const relId = `rel_${rel.name.toLowerCase().replace(/\s+/g, '_')}_${fromColId}`;
          ops.push({
            id: `op_${relId}`,
            type: 'create_relationship',
            description: `Create relationship "${rel.name}" from ${rel.fromCollection} to ${rel.toCollection}`,
            risk: 'low',
            dependencies: [`op_create_col_${fromColId}`, `op_create_col_${toColId}`],
            reversible: true,
            collectionId: fromColId,
            relationship: {
              id: relId,
              name: rel.name,
              type: rel.type,
              targetCollectionId: toColId,
              foreignKey: rel.foreignKey,
              onDelete: rel.onDelete || 'set_null',
            },
          });
        }
      }
    }

    return ops;
  }
}
