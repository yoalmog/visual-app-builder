import { DataRecord, DataCollection } from '../schema/project';
import { QueryEngine } from './query-engine';

export interface ImportPreviewResult {
  detectedFields: string[];
  sampleRows: Record<string, any>[];
  totalRows: number;
}

export interface ImportResult {
  importedCount: number;
  records: DataRecord[];
  errors: string[];
}

export class ImportExportEngine {
  /**
   * Parses CSV string into raw rows.
   */
  public parseCSV(rawCSV: string): string[][] {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < rawCSV.length; i++) {
      const char = rawCSV[i];
      const nextChar = rawCSV[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \r\n
        }
        currentRow.push(currentField.trim());
        if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === '')) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      lines.push(currentRow);
    }

    return lines;
  }

  /**
   * Previews CSV import.
   */
  public previewCSV(rawCSV: string): ImportPreviewResult {
    const parsed = this.parseCSV(rawCSV);
    if (parsed.length === 0) {
      return { detectedFields: [], sampleRows: [], totalRows: 0 };
    }

    const headers = parsed[0];
    const dataRows = parsed.slice(1);
    const sampleRows: Record<string, any>[] = [];

    for (let i = 0; i < Math.min(5, dataRows.length); i++) {
      const row = dataRows[i];
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = row[idx] ?? '';
      });
      sampleRows.push(rowObj);
    }

    return {
      detectedFields: headers,
      sampleRows,
      totalRows: dataRows.length,
    };
  }

  /**
   * Imports CSV with optional field mapping.
   */
  public importCSV(
    rawCSV: string,
    collection: DataCollection,
    fieldMapping: Record<string, string> = {} // csvHeader -> collectionFieldId
  ): ImportResult {
    const parsed = this.parseCSV(rawCSV);
    if (parsed.length < 2) {
      return { importedCount: 0, records: [], errors: ['CSV contains no data rows.'] };
    }

    const headers = parsed[0];
    const rows = parsed.slice(1);
    const records: DataRecord[] = [];
    const errors: string[] = [];

    rows.forEach((row, rowIdx) => {
      const values: Record<string, any> = {};
      headers.forEach((header, colIdx) => {
        const targetFieldId = fieldMapping[header] || header;
        const targetField = collection.fields.find(f => f.id === targetFieldId || f.name === targetFieldId);

        let cellVal: any = row[colIdx] ?? '';
        if (targetField) {
          if (targetField.type === 'number') {
            cellVal = cellVal === '' ? null : Number(cellVal);
          } else if (targetField.type === 'boolean') {
            cellVal = cellVal === 'true' || cellVal === '1' || cellVal === 'yes';
          } else if (targetField.type === 'JSON') {
            try {
              cellVal = JSON.parse(cellVal);
            } catch {
              // keep as string
            }
          }
          values[targetField.id] = cellVal;
          values[targetField.name] = cellVal;
        } else {
          values[targetFieldId] = cellVal;
        }
      });

      // Validation
      for (const field of collection.fields) {
        if (field.required && (values[field.id] === undefined || values[field.id] === null || values[field.id] === '')) {
          errors.push(`Row ${rowIdx + 1}: Required field '${field.name}' is missing.`);
        }
      }

      records.push({
        id: `rec_${Date.now()}_${rowIdx}_${Math.random().toString(36).substr(2, 5)}`,
        values,
        ...values,
      });
    });

    return {
      importedCount: records.length,
      records,
      errors,
    };
  }

  /**
   * Previews JSON import.
   */
  public previewJSON(rawJSON: string): ImportPreviewResult {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJSON);
    } catch {
      return { detectedFields: [], sampleRows: [], totalRows: 0 };
    }

    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const fieldSet = new Set<string>();

    for (const r of rows) {
      if (typeof r === 'object' && r !== null) {
        const source = r.values || r;
        Object.keys(source).forEach(k => fieldSet.add(k));
      }
    }

    const detectedFields = Array.from(fieldSet);
    const sampleRows = rows.slice(0, 5).map(r => (r.values ? { ...r.values } : { ...r }));

    return {
      detectedFields,
      sampleRows,
      totalRows: rows.length,
    };
  }

  /**
   * Imports JSON data.
   */
  public importJSON(
    rawJSON: string,
    collection: DataCollection,
    fieldMapping: Record<string, string> = {}
  ): ImportResult {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJSON);
    } catch (err: any) {
      return { importedCount: 0, records: [], errors: [`Invalid JSON: ${err?.message}`] };
    }

    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const records: DataRecord[] = [];
    const errors: string[] = [];

    rows.forEach((r, rowIdx) => {
      const source = r.values || r;
      const values: Record<string, any> = {};

      for (const [key, val] of Object.entries(source)) {
        const targetFieldId = fieldMapping[key] || key;
        const targetField = collection.fields.find(f => f.id === targetFieldId || f.name === targetFieldId);

        if (targetField) {
          values[targetField.id] = val;
          values[targetField.name] = val;
        } else {
          values[targetFieldId] = val;
        }
      }

      records.push({
        id: r.id || `rec_${Date.now()}_${rowIdx}_${Math.random().toString(36).substr(2, 5)}`,
        values,
        ...values,
      });
    });

    return {
      importedCount: records.length,
      records,
      errors,
    };
  }

  /**
   * Exports records to CSV.
   */
  public exportCSV(
    records: DataRecord[],
    collection: DataCollection,
    fieldsToExport?: string[]
  ): string {
    const fields = fieldsToExport && fieldsToExport.length > 0
      ? fieldsToExport
      : collection.fields.map(f => f.name || f.id);

    const headerLine = fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
    const rows = records.map(rec => {
      return fields.map(f => {
        const val = QueryEngine.getFieldValue(rec, f);
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') {
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    return [headerLine, ...rows].join('\n');
  }

  /**
   * Exports records to JSON.
   */
  public exportJSON(
    records: DataRecord[],
    collection: DataCollection,
    fieldsToExport?: string[]
  ): string {
    const fields = fieldsToExport && fieldsToExport.length > 0 ? fieldsToExport : null;

    const data = records.map(rec => {
      const result: Record<string, any> = { id: rec.id };
      const fieldList = fields || collection.fields.map(f => f.name || f.id);

      for (const f of fieldList) {
        result[f] = QueryEngine.getFieldValue(rec, f);
      }
      return result;
    });

    return JSON.stringify(data, null, 2);
  }
}
