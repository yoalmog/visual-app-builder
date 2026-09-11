import { DataCollection, DataField, DataFieldType, DataRecord } from '../schema/project';

export interface LiveApiTestResult {
  success: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  data: any;
  inferredFields: DataField[];
  inferredRecords: DataRecord[];
  error?: string;
}

/**
 * Executes a real HTTP request to any external REST or Supabase endpoint,
 * analyzes the JSON payload, and automatically discovers schema fields and records.
 */
export async function testAndIntrospectEndpoint(params: {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  apiKey?: string;
  body?: string;
}): Promise<LiveApiTestResult> {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const method = params.method || 'GET';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(params.headers || {}),
  };

  if (params.apiKey) {
    headers['apikey'] = params.apiKey;
    if (!headers['Authorization']) {
      headers['Authorization'] = `Bearer ${params.apiKey}`;
    }
  }

  try {
    const res = await fetch(params.url, {
      method,
      headers,
      body: method === 'POST' && params.body ? params.body : undefined,
    });

    const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
    let jsonData: any;

    try {
      jsonData = await res.json();
    } catch {
      jsonData = await res.text();
    }

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        statusText: res.statusText,
        durationMs,
        data: jsonData,
        inferredFields: [],
        inferredRecords: [],
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    // Introspect schema from JSON data
    const { fields, records } = inferFieldsAndRecords(jsonData);

    return {
      success: true,
      status: res.status,
      statusText: res.statusText,
      durationMs,
      data: jsonData,
      inferredFields: fields,
      inferredRecords: records,
    };
  } catch (err: any) {
    const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
    return {
      success: false,
      status: 0,
      statusText: 'Network / CORS Error',
      durationMs,
      data: null,
      inferredFields: [],
      inferredRecords: [],
      error: err.message || 'Failed to fetch from endpoint. Check CORS or URL validity.',
    };
  }
}

/**
 * Automatically infers schema fields and records from raw JSON array or object.
 */
function inferFieldsAndRecords(payload: any): { fields: DataField[]; records: DataRecord[] } {
  const items: any[] = Array.isArray(payload) ? payload : typeof payload === 'object' && payload !== null ? [payload] : [];
  if (items.length === 0) {
    return {
      fields: [{ id: 'field_id', name: 'id', type: 'text', required: true }],
      records: [],
    };
  }

  // Collect all unique keys from the first 25 sample items
  const sampleItems = items.slice(0, 25);
  const keyTypeMap = new Map<string, Set<string>>();

  for (const item of sampleItems) {
    if (typeof item !== 'object' || item === null) continue;
    for (const [k, v] of Object.entries(item)) {
      if (!keyTypeMap.has(k)) keyTypeMap.set(k, new Set());
      keyTypeMap.get(k)!.add(detectValueType(v));
    }
  }

  const fields: DataField[] = [];
  // Ensure 'id' is first if present
  if (keyTypeMap.has('id')) {
    fields.push({
      id: 'field_id',
      name: 'id',
      type: 'text',
      required: true,
      unique: true,
    });
    keyTypeMap.delete('id');
  }

  for (const [key, typeSet] of Array.from(keyTypeMap.entries())) {
    let resolvedType: DataFieldType = 'text';
    if (typeSet.has('number') && typeSet.size === 1) resolvedType = 'number';
    else if (typeSet.has('boolean') && typeSet.size === 1) resolvedType = 'boolean';
    else if (typeSet.has('date') && typeSet.size === 1) resolvedType = 'date';
    else if (typeSet.has('email')) resolvedType = 'email';
    else if (typeSet.has('url') || key.toLowerCase().includes('url') || key.toLowerCase().includes('avatar') || key.toLowerCase().includes('image')) {
      resolvedType = key.toLowerCase().includes('image') || key.toLowerCase().includes('avatar') ? 'image' : 'url';
    } else if (typeSet.has('JSON') || typeSet.has('object')) {
      resolvedType = 'JSON';
    }

    fields.push({
      id: `field_${key.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: key,
      type: resolvedType,
      required: false,
    });
  }

  // Convert items into DataRecord instances
  const records: DataRecord[] = items.slice(0, 100).map((item, idx) => {
    const recId = item.id ? String(item.id) : `rec_${idx + 1}_${Date.now()}`;
    const values: Record<string, any> = {};
    for (const f of fields) {
      values[f.name] = item[f.name] !== undefined ? item[f.name] : null;
    }
    return {
      id: recId,
      values,
    };
  });

  return { fields, records };
}

function detectValueType(val: any): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'object') return 'JSON';
  if (typeof val === 'string') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'email';
    if (/^https?:\/\//i.test(val)) return 'url';
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(val) && !isNaN(Date.parse(val))) return 'date';
    return 'text';
  }
  return 'text';
}

/**
 * Creates a complete DataCollection object from an introspected LiveApiTestResult.
 */
export function createCollectionFromApiResult(name: string, result: LiveApiTestResult): DataCollection {
  const collectionId = `col_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
  return {
    id: collectionId,
    name,
    fields: result.inferredFields,
    records: result.inferredRecords,
  };
}
