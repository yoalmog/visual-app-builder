import { DataCollection, DataRelationship, DataRecord } from '../schema/project';

export interface CascadeDeleteResult {
  recordsToDelete: { collectionId: string; recordId: string }[];
  recordsToUpdate: { collectionId: string; recordId: string; updates: Record<string, any> }[];
  blockedReason?: string;
}

export class RelationshipManager {
  private collections: Map<string, DataCollection> = new Map();

  constructor(collections: DataCollection[] = []) {
    this.updateCollections(collections);
  }

  public updateCollections(collections: DataCollection[]): void {
    this.collections.clear();
    for (const col of collections) {
      this.collections.set(col.id, col);
    }
  }

  /**
   * Validates all relationships defined in the collection schema.
   */
  public validateRelationships(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const entries = Array.from(this.collections.entries());

    for (const [colId, col] of entries) {
      for (const rel of col.relationships || []) {
        if (!rel.id || !rel.sourceCollectionId || !rel.targetCollectionId || !rel.sourceField || !rel.targetField) {
          errors.push(`Collection ${colId}: Relationship ${rel.id || 'unnamed'} is missing required fields.`);
          continue;
        }

        const sourceCol = this.collections.get(rel.sourceCollectionId);
        const targetCol = this.collections.get(rel.targetCollectionId);

        if (!sourceCol) {
          errors.push(`Relationship ${rel.id}: sourceCollectionId '${rel.sourceCollectionId}' does not exist.`);
        } else {
          const sField = sourceCol.fields.find(f => f.id === rel.sourceField || f.name === rel.sourceField);
          if (!sField) {
            errors.push(`Relationship ${rel.id}: sourceField '${rel.sourceField}' does not exist in collection '${sourceCol.name}'.`);
          }
        }

        if (!targetCol) {
          errors.push(`Relationship ${rel.id}: targetCollectionId '${rel.targetCollectionId}' does not exist.`);
        } else {
          const tField = targetCol.fields.find(f => f.id === rel.targetField || f.name === rel.targetField);
          if (!tField) {
            errors.push(`Relationship ${rel.id}: targetField '${rel.targetField}' does not exist in collection '${targetCol.name}'.`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Plans cascade actions when deleting a record.
   * Supports 'cascade', 'set_null', and 'restrict'.
   */
  public planDelete(
    collectionId: string,
    recordId: string,
    allRecords: Record<string, DataRecord[]>
  ): CascadeDeleteResult {
    const recordsToDelete: { collectionId: string; recordId: string }[] = [{ collectionId, recordId }];
    const recordsToUpdate: { collectionId: string; recordId: string; updates: Record<string, any> }[] = [];

    const queue: { collectionId: string; recordId: string }[] = [{ collectionId, recordId }];
    const visitedDeletes = new Set<string>([`${collectionId}:${recordId}`]);
    const entries = Array.from(this.collections.entries());

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentRec = (allRecords[current.collectionId] || []).find(r => r.id === current.recordId);
      if (!currentRec) continue;

      for (const [sColId, sCol] of entries) {
        for (const rel of sCol.relationships || []) {
          if (rel.targetCollectionId === current.collectionId) {
            const cascadeAction = rel.onDelete || 'set_null';
            const sRecords = allRecords[sColId] || [];

            const matchingChildren = sRecords.filter(r => {
              const foreignVal = r.values ? r.values[rel.sourceField] : (r as any)[rel.sourceField];
              const targetVal = (currentRec.values ? currentRec.values[rel.targetField] : (currentRec as any)[rel.targetField]) || currentRec.id;
              return foreignVal === targetVal;
            });

            if (matchingChildren.length > 0) {
              if (cascadeAction === 'restrict') {
                return {
                  recordsToDelete: [],
                  recordsToUpdate: [],
                  blockedReason: `Delete restricted: Record ${current.recordId} is referenced by ${matchingChildren.length} record(s) in collection ${sCol.name} (relationship ${rel.name}).`,
                };
              } else if (cascadeAction === 'cascade') {
                for (const child of matchingChildren) {
                  const key = `${sColId}:${child.id}`;
                  if (!visitedDeletes.has(key)) {
                    visitedDeletes.add(key);
                    recordsToDelete.push({ collectionId: sColId, recordId: child.id });
                    queue.push({ collectionId: sColId, recordId: child.id });
                  }
                }
              } else if (cascadeAction === 'set_null') {
                for (const child of matchingChildren) {
                  recordsToUpdate.push({
                    collectionId: sColId,
                    recordId: child.id,
                    updates: { [rel.sourceField]: null },
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      recordsToDelete,
      recordsToUpdate,
    };
  }

  /**
   * Resolves a nested data path like "user.profile.name" or "items[].product.title"
   */
  public resolveNestedPath(
    record: any,
    path: string,
    allRecords: Record<string, DataRecord[]> = {}
  ): any {
    if (!record || !path) return record;

    const parts = path.split('.');
    let current: any = record;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (current === null || current === undefined) return undefined;

      if (part.endsWith('[]')) {
        const fieldName = part.slice(0, -2);
        const arr = current.values ? current.values[fieldName] : current[fieldName];
        if (!Array.isArray(arr)) return [];

        const remainingPath = parts.slice(i + 1).join('.');
        if (!remainingPath) return arr;

        return arr.map(item => this.resolveNestedPath(item, remainingPath, allRecords));
      } else {
        const valDirect = current.values ? current.values[part] : current[part];
        if (valDirect !== undefined) {
          current = valDirect;
        } else {
          // Check if 'part' corresponds to a relationship name
          let foundRel = false;
          const colValues = Array.from(this.collections.values());
          for (const col of colValues) {
            const rel = (col.relationships || []).find((r: DataRelationship) => r.name === part);
            if (rel) {
              const foreignKey = current.values ? current.values[rel.sourceField] : current[rel.sourceField];
              if (foreignKey !== undefined) {
                const targetRecords = allRecords[rel.targetCollectionId] || [];
                if (rel.type === 'one_to_many' || rel.type === 'many_to_many') {
                  current = targetRecords.filter((tr: DataRecord) => {
                    const val = tr.values ? tr.values[rel.targetField] : (tr as any)[rel.targetField];
                    return val === foreignKey;
                  });
                } else {
                  const matched = targetRecords.find((tr: DataRecord) => {
                    const val = tr.values ? tr.values[rel.targetField] : (tr as any)[rel.targetField];
                    return val === foreignKey;
                  });
                  current = matched ? (matched.values || matched) : null;
                }
                foundRel = true;
                break;
              }
            }
          }
          if (!foundRel) {
            return undefined;
          }
        }
      }
    }

    return current;
  }
}
