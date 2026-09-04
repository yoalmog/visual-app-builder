/**
 * Phase 5: DataProvider Interface and Implementations
 * 
 * This module defines the provider-independent data layer.
 * Visual Builder and Renderer communicate exclusively through these interfaces,
 * never accessing vendor-specific SDKs directly in UI components.
 */

import { DataRecord, DataCollection, AppProject } from '../schema/project';

// ─── Filter / Sort / Pagination Types ────────────────────────────────────────

export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'is_empty' | 'is_not_empty';

export interface DataFilter {
  field: string;
  operator: FilterOperator;
  value?: any;
}

export type SortDirection = 'asc' | 'desc';

export interface DataSort {
  field: string;
  direction: SortDirection;
}

export interface DataQueryOptions {
  filters?: DataFilter[];
  sort?: DataSort;
  page?: number;      // 1-indexed
  pageSize?: number;  // default 50, max 1000
  search?: string;    // full-text search hint
}

export interface DataQueryResult {
  records: DataRecord[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface DataProvider {
  readonly type: 'local' | 'cloud' | 'api';

  list(collectionId: string, options?: DataQueryOptions): Promise<DataQueryResult>;
  get(collectionId: string, recordId: string): Promise<DataRecord | null>;
  create(collectionId: string, values: Record<string, any>): Promise<{ success: boolean; id?: string; error?: string }>;
  update(collectionId: string, recordId: string, values: Record<string, any>): Promise<{ success: boolean; error?: string }>;
  delete(collectionId: string, recordId: string): Promise<{ success: boolean; error?: string }>;

  // Optional: test connectivity
  testConnection?(): Promise<{ success: boolean; error?: string }>;
  healthCheck?(): Promise<boolean>;
}

// ─── Helper: Apply Filters ────────────────────────────────────────────────────

function applyFilter(record: DataRecord, filter: DataFilter): boolean {
  const val = record.values[filter.field];
  const fv = filter.value;

  switch (filter.operator) {
    case 'equals':
      // eslint-disable-next-line eqeqeq
      return val == fv;
    case 'not_equals':
      // eslint-disable-next-line eqeqeq
      return val != fv;
    case 'contains':
      if (typeof val === 'string') return val.toLowerCase().includes(String(fv).toLowerCase());
      if (Array.isArray(val)) return val.includes(fv);
      return false;
    case 'starts_with':
      return typeof val === 'string' && val.toLowerCase().startsWith(String(fv).toLowerCase());
    case 'ends_with':
      return typeof val === 'string' && val.toLowerCase().endsWith(String(fv).toLowerCase());
    case 'greater_than':
      return Number(val) > Number(fv);
    case 'less_than':
      return Number(val) < Number(fv);
    case 'greater_equal':
      return Number(val) >= Number(fv);
    case 'less_equal':
      return Number(val) <= Number(fv);
    case 'is_empty':
      return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
    case 'is_not_empty':
      return val !== undefined && val !== null && val !== '' && (!Array.isArray(val) || val.length > 0);
    default:
      return true;
  }
}

function applyFiltersAndSort(records: DataRecord[], options?: DataQueryOptions): DataRecord[] {
  let result = [...records];

  if (options?.filters && options.filters.length > 0) {
    result = result.filter((r) => options.filters!.every((f) => applyFilter(r, f)));
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    result = result.filter((r) =>
      Object.values(r.values).some((v) => String(v).toLowerCase().includes(q))
    );
  }

  if (options?.sort) {
    const { field, direction } = options.sort;
    result.sort((a, b) => {
      const av = a.values[field];
      const bv = b.values[field];
      let cmp = 0;
      if (av < bv) cmp = -1;
      else if (av > bv) cmp = 1;
      return direction === 'desc' ? -cmp : cmp;
    });
  }

  return result;
}

function paginate(records: DataRecord[], page = 1, pageSize = 50): DataQueryResult {
  const total = records.length;
  const clampedPageSize = Math.min(Math.max(pageSize, 1), 1000);
  const clampedPage = Math.max(page, 1);
  const start = (clampedPage - 1) * clampedPageSize;
  const end = start + clampedPageSize;
  return {
    records: records.slice(start, end),
    total,
    page: clampedPage,
    pageSize: clampedPageSize,
    hasMore: end < total,
  };
}

// ─── LocalDataProvider ────────────────────────────────────────────────────────

/**
 * Preserves Phase 4 local collection storage.
 * All data is held in memory (seeded from project schema records).
 */
export class LocalDataProvider implements DataProvider {
  readonly type = 'local' as const;
  private store: Record<string, DataRecord[]> = {};

  constructor(collections: DataCollection[] = []) {
    for (const col of collections) {
      this.store[col.id] = JSON.parse(JSON.stringify(col.records || []));
    }
  }

  async list(collectionId: string, options?: DataQueryOptions): Promise<DataQueryResult> {
    const raw = this.store[collectionId] || [];
    const filtered = applyFiltersAndSort(raw, options);
    return paginate(filtered, options?.page, options?.pageSize);
  }

  async get(collectionId: string, recordId: string): Promise<DataRecord | null> {
    const records = this.store[collectionId] || [];
    return records.find((r) => r.id === recordId) || null;
  }

  async create(collectionId: string, values: Record<string, any>): Promise<{ success: boolean; id?: string; error?: string }> {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: DataRecord = { id, values: { ...values } };
    if (!this.store[collectionId]) {
      this.store[collectionId] = [];
    }
    this.store[collectionId].push(record);
    return { success: true, id };
  }

  async update(collectionId: string, recordId: string, values: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    const records = this.store[collectionId] || [];
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx === -1) return { success: false, error: `Record '${recordId}' not found` };
    records[idx] = { ...records[idx], values: { ...records[idx].values, ...values } };
    return { success: true };
  }

  async delete(collectionId: string, recordId: string): Promise<{ success: boolean; error?: string }> {
    const records = this.store[collectionId] || [];
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx === -1) return { success: false, error: `Record '${recordId}' not found` };
    records.splice(idx, 1);
    return { success: true };
  }

  testConnection(): Promise<{ success: boolean; error?: string }> {
    return Promise.resolve({ success: true });
  }

  healthCheck(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

// ─── MockCloudDataProvider ────────────────────────────────────────────────────

/**
 * Deterministic in-memory mock cloud provider for automated testing.
 * Supports full CRUD, filtering, sorting, pagination.
 * Includes configurable latency (default 0ms for tests).
 */
export class MockCloudDataProvider implements DataProvider {
  readonly type = 'cloud' as const;
  private store: Record<string, DataRecord[]> = {};
  private latencyMs: number;

  constructor(initialData: Record<string, DataRecord[]> = {}, latencyMs = 0) {
    this.store = JSON.parse(JSON.stringify(initialData));
    this.latencyMs = latencyMs;
  }

  private delay(): Promise<void> {
    if (this.latencyMs <= 0) return Promise.resolve();
    return new Promise((r) => setTimeout(r, this.latencyMs));
  }

  async list(collectionId: string, options?: DataQueryOptions): Promise<DataQueryResult> {
    await this.delay();
    const raw = this.store[collectionId] || [];
    const filtered = applyFiltersAndSort(raw, options);
    return paginate(filtered, options?.page, options?.pageSize);
  }

  async get(collectionId: string, recordId: string): Promise<DataRecord | null> {
    await this.delay();
    return (this.store[collectionId] || []).find((r) => r.id === recordId) || null;
  }

  async create(collectionId: string, values: Record<string, any>): Promise<{ success: boolean; id?: string; error?: string }> {
    await this.delay();
    const id = `cloud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (!this.store[collectionId]) this.store[collectionId] = [];
    this.store[collectionId].push({ id, values: { ...values } });
    return { success: true, id };
  }

  async update(collectionId: string, recordId: string, values: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    await this.delay();
    const records = this.store[collectionId] || [];
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx === -1) return { success: false, error: `Record '${recordId}' not found in cloud` };
    records[idx] = { ...records[idx], values: { ...records[idx].values, ...values } };
    return { success: true };
  }

  async delete(collectionId: string, recordId: string): Promise<{ success: boolean; error?: string }> {
    await this.delay();
    const records = this.store[collectionId] || [];
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx === -1) return { success: false, error: `Record '${recordId}' not found in cloud` };
    records.splice(idx, 1);
    return { success: true };
  }

  testConnection(): Promise<{ success: boolean; error?: string }> {
    return Promise.resolve({ success: true });
  }

  healthCheck(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /** For test introspection */
  getStore(): Record<string, DataRecord[]> {
    return this.store;
  }
}

// ─── ApiDataProvider ──────────────────────────────────────────────────────────

export interface ApiConnectorConfig {
  id: string;
  baseUrl: string;
  path: string;
  method: string;
  headers?: Record<string, string>;
  responseMapping?: string;
}

/**
 * REST API data provider.
 * Executes requests via /api/connectors/proxy to keep secrets server-side.
 */
export class ApiDataProvider implements DataProvider {
  readonly type = 'api' as const;
  private connector: ApiConnectorConfig;

  constructor(connector: ApiConnectorConfig) {
    this.connector = connector;
  }

  async list(_collectionId: string, options?: DataQueryOptions): Promise<DataQueryResult> {
    const res = await this._executeProxy('GET', undefined, options);
    const data = this._extractData(res);
    const records = Array.isArray(data)
      ? data.map((item: any, i: number) => ({ id: item.id || String(i), values: item }))
      : [];
    return paginate(records, options?.page, options?.pageSize);
  }

  async get(_collectionId: string, recordId: string): Promise<DataRecord | null> {
    const res = await this._executeProxy('GET', recordId);
    if (!res) return null;
    const data = this._extractData(res);
    return data ? { id: data.id || recordId, values: data } : null;
  }

  async create(_collectionId: string, values: Record<string, any>): Promise<{ success: boolean; id?: string; error?: string }> {
    const res = await this._executeProxy('POST', undefined, undefined, values);
    if (!res) return { success: false, error: 'API request failed' };
    return { success: true, id: res?.id };
  }

  async update(_collectionId: string, recordId: string, values: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    await this._executeProxy('PUT', recordId, undefined, values);
    return { success: true };
  }

  async delete(_collectionId: string, recordId: string): Promise<{ success: boolean; error?: string }> {
    await this._executeProxy('DELETE', recordId);
    return { success: true };
  }

  private async _executeProxy(method: string, id?: string, _options?: DataQueryOptions, body?: any): Promise<any> {
    try {
      const path = id ? `${this.connector.path}/${id}` : this.connector.path;
      const proxyRes = await fetch('/api/connectors/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: this.connector.id,
          method,
          path,
          headers: this.connector.headers || {},
          body,
        }),
      });
      if (!proxyRes.ok) return null;
      return proxyRes.json();
    } catch {
      return null;
    }
  }

  testConnection(): Promise<{ success: boolean; error?: string }> {
    return Promise.resolve({ success: true });
  }

  healthCheck(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private _extractData(response: any): any {
    if (!response) return null;
    const mapping = this.connector.responseMapping;
    if (!mapping) return response;
    const parts = mapping.split('.');
    let current = response;
    for (const part of parts) {
      if (current && typeof current === 'object') current = current[part];
      else return null;
    }
    return current;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createDataProvider(
  typeOrProject: 'local' | 'cloud' | 'api' | AppProject,
  options: {
    collections?: DataCollection[];
    initialData?: Record<string, DataRecord[]>;
    connector?: ApiConnectorConfig;
    latencyMs?: number;
  } = {}
): DataProvider {
  if (typeof typeOrProject === 'object' && typeOrProject !== null) {
    const project = typeOrProject as AppProject;
    return new MockCloudDataProvider(undefined, 0);
  }
  const type = typeOrProject as 'local' | 'cloud' | 'api';
  switch (type) {
    case 'cloud':
      return new MockCloudDataProvider(options.initialData, options.latencyMs);
    case 'api':
      if (!options.connector) throw new Error('ApiDataProvider requires a connector config');
      return new ApiDataProvider(options.connector);
    case 'local':
    default:
      return new LocalDataProvider(options.collections);
  }
}
