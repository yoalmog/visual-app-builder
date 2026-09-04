import { DataRecord } from '../schema/project';

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ recordId: string; message: string }>;
  updatedRecords: DataRecord[];
}

export class BulkOperationsEngine {
  /**
   * Bulk deletes records by IDs.
   */
  public bulkDelete(
    records: DataRecord[],
    recordIdsToDelete: string[]
  ): BulkOperationResult {
    const idSet = new Set(recordIdsToDelete);
    const updatedRecords: DataRecord[] = [];
    const errors: Array<{ recordId: string; message: string }> = [];
    let successCount = 0;

    for (const rec of records) {
      if (idSet.has(rec.id)) {
        successCount++;
      } else {
        updatedRecords.push(rec);
      }
    }

    // Identify if any requested id was missing
    const foundIds = new Set(records.map(r => r.id));
    for (const id of recordIdsToDelete) {
      if (!foundIds.has(id)) {
        errors.push({ recordId: id, message: `Record ${id} not found.` });
      }
    }

    return {
      successCount,
      failureCount: errors.length,
      errors,
      updatedRecords,
    };
  }

  /**
   * Bulk updates specified records with partial values.
   */
  public bulkUpdate(
    records: DataRecord[],
    recordIds: string[],
    updates: Record<string, any>
  ): BulkOperationResult {
    const idSet = new Set(recordIds);
    const updatedRecords: DataRecord[] = [];
    const errors: Array<{ recordId: string; message: string }> = [];
    let successCount = 0;

    for (const rec of records) {
      if (idSet.has(rec.id)) {
        try {
          const updatedRec: DataRecord = {
            ...rec,
            values: {
              ...(rec.values || {}),
              ...updates,
            },
            ...(typeof (rec as any).name === 'string' ? updates : {}),
          };
          updatedRecords.push(updatedRec);
          successCount++;
        } catch (err: any) {
          errors.push({ recordId: rec.id, message: err?.message || 'Update failed' });
          updatedRecords.push(rec);
        }
      } else {
        updatedRecords.push(rec);
      }
    }

    const foundIds = new Set(records.map(r => r.id));
    for (const id of recordIds) {
      if (!foundIds.has(id)) {
        errors.push({ recordId: id, message: `Record ${id} not found.` });
      }
    }

    return {
      successCount,
      failureCount: errors.length,
      errors,
      updatedRecords,
    };
  }

  /**
   * Bulk status change shortcut.
   */
  public bulkStatusChange(
    records: DataRecord[],
    recordIds: string[],
    statusField: string,
    newStatus: string
  ): BulkOperationResult {
    return this.bulkUpdate(records, recordIds, { [statusField]: newStatus });
  }
}
