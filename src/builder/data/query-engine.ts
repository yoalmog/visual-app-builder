import { DataRecord, DataCollection } from '../schema/project';
import { QueryDefinition, QueryFilter, QueryFilterGroup, QuerySort, QueryPagination, QueryAggregation } from '../schema/query';
import { evaluateExpression } from '../expressions/expression-evaluator';

export interface QueryExecutionResult {
  records: DataRecord[];
  totalCount: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  aggregations?: Record<string, number | Record<string, number>>;
  nextCursor?: string | null;
}

export class QueryEngine {
  public static getFieldValue(rec: DataRecord, field: string): any {
    if (!rec) return undefined;
    if (field === 'id') return rec.id;
    if (rec.values && rec.values[field] !== undefined) return rec.values[field];
    return (rec as any)[field];
  }

  /**
   * Executes a query against in-memory records.
   */
  public executeQuery(
    collection: DataCollection,
    records: DataRecord[],
    query: QueryDefinition
  ): QueryExecutionResult {
    let result = [...records];

    // 1. Evaluate computed fields first if any
    result = this.enrichComputedFields(result, collection);

    // 2. Global search if specified
    if (query.search && query.search.term) {
      const term = query.search.term.toLowerCase();
      const fields = query.search.fields && query.search.fields.length > 0
        ? query.search.fields
        : (collection.fields || []).map(f => f.name);

      result = result.filter(rec => {
        return fields.some(f => {
          const val = QueryEngine.getFieldValue(rec, f);
          return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
        });
      });
    }

    // 3. Filter records
    if (query.filterGroup) {
      result = result.filter(rec => this.evaluateFilterGroup(rec, query.filterGroup!));
    } else if (query.filters && query.filters.length > 0) {
      result = result.filter(rec => this.evaluateFilterList(rec, query.filters!, 'AND'));
    }

    const totalCount = result.length;

    // 4. Compute aggregations before pagination
    let aggregationsResult: Record<string, any> | undefined;
    if (query.aggregations && query.aggregations.length > 0) {
      aggregationsResult = this.computeAggregations(result, query.aggregations, query.groupBy);
    }

    // 5. Sort records
    if (query.sort && query.sort.length > 0) {
      result = this.sortRecords(result, query.sort);
    }

    // 6. Paginate records
    let page: number | undefined;
    let pageSize: number | undefined;
    let totalPages: number | undefined;
    let nextCursor: string | null = null;

    if (query.pagination) {
      if (query.pagination.type === 'cursor' || 'cursor' in query.pagination) {
        const cursor = query.pagination.cursor;
        const limit = query.pagination.limit || query.pagination.pageSize || 20;

        let startIndex = 0;
        if (cursor) {
          const idx = result.findIndex(r => r.id === cursor);
          if (idx !== -1) {
            startIndex = idx + 1;
          }
        }

        const sliced = result.slice(startIndex, startIndex + limit);
        nextCursor = sliced.length === limit && startIndex + limit < result.length
          ? sliced[sliced.length - 1].id
          : null;
        result = sliced;
      } else {
        // Offset pagination
        page = query.pagination.page || 1;
        pageSize = query.pagination.pageSize || query.pagination.limit || 20;
        totalPages = Math.ceil(totalCount / pageSize);

        const start = query.pagination.offset !== undefined ? query.pagination.offset : (page - 1) * pageSize;
        result = result.slice(start, start + pageSize);
      }
    }

    return {
      records: result,
      totalCount,
      page,
      pageSize,
      totalPages,
      aggregations: aggregationsResult,
      nextCursor,
    };
  }

  private enrichComputedFields(records: DataRecord[], collection: DataCollection): DataRecord[] {
    const computedFields = (collection.fields || []).filter(f => f.computedExpression);
    if (computedFields.length === 0) return records;

    return records.map(rec => {
      const enriched: any = { ...rec, values: { ...(rec.values || {}) } };
      for (const field of computedFields) {
        try {
          const evalRes = evaluateExpression(field.computedExpression!, {
            record: enriched.values,
            data: enriched.values,
            ...enriched.values,
          });
          const val = evalRes.success ? evalRes.value : null;
          enriched.values[field.id] = val;
          enriched.values[field.name] = val;
          enriched[field.id] = val;
          enriched[field.name] = val;
        } catch {
          enriched.values[field.id] = null;
          enriched[field.id] = null;
        }
      }
      return enriched;
    });
  }

  private evaluateFilterGroup(record: DataRecord, group: QueryFilterGroup): boolean {
    if (!group.filters || group.filters.length === 0) {
      return true;
    }

    if (group.logic === 'OR') {
      return group.filters.some(item => {
        if ('logic' in item) {
          return this.evaluateFilterGroup(record, item as QueryFilterGroup);
        } else {
          return this.evaluateFilter(record, item as QueryFilter);
        }
      });
    } else {
      return group.filters.every(item => {
        if ('logic' in item) {
          return this.evaluateFilterGroup(record, item as QueryFilterGroup);
        } else {
          return this.evaluateFilter(record, item as QueryFilter);
        }
      });
    }
  }

  private evaluateFilterList(record: DataRecord, filters: QueryFilter[], op: 'AND' | 'OR'): boolean {
    if (op === 'OR') {
      return filters.some(f => this.evaluateFilter(record, f));
    }
    return filters.every(f => this.evaluateFilter(record, f));
  }

  public evaluateFilter(record: DataRecord, filter: QueryFilter): boolean {
    const val = QueryEngine.getFieldValue(record, filter.field);
    const target = filter.value;

    switch (filter.operator) {
      case 'equals':
        return val == target;
      case 'not_equals':
        return val != target;
      case 'greater_than':
        return Number(val) > Number(target);
      case 'greater_equal':
        return Number(val) >= Number(target);
      case 'less_than':
        return Number(val) < Number(target);
      case 'less_equal':
        return Number(val) <= Number(target);
      case 'between': {
        const [low, high] = Array.isArray(target) ? target : [filter.value, filter.secondValue];
        return Number(val) >= Number(low) && Number(val) <= Number(high);
      }
      case 'in':
        if (Array.isArray(target)) {
          return target.includes(val);
        }
        return false;
      case 'not_in':
        if (Array.isArray(target)) {
          return !target.includes(val);
        }
        return true;
      case 'contains':
        return String(val ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
      case 'not_contains':
        return !String(val ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
      case 'starts_with':
        return String(val ?? '').toLowerCase().startsWith(String(target ?? '').toLowerCase());
      case 'ends_with':
        return String(val ?? '').toLowerCase().endsWith(String(target ?? '').toLowerCase());
      case 'is_empty':
      case 'is_null':
        return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
      case 'is_not_empty':
      case 'is_not_null':
        return val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
      default:
        return true;
    }
  }

  private sortRecords(records: DataRecord[], sorts: QuerySort[]): DataRecord[] {
    return [...records].sort((a, b) => {
      for (const sort of sorts) {
        const valA = QueryEngine.getFieldValue(a, sort.field);
        const valB = QueryEngine.getFieldValue(b, sort.field);

        if (valA === valB) continue;

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (valA instanceof Date && valB instanceof Date) {
          comparison = valA.getTime() - valB.getTime();
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }

        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private computeAggregations(
    records: DataRecord[],
    aggregations: QueryAggregation[],
    groupBy?: string[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    const primaryGroupBy = groupBy && groupBy.length > 0 ? groupBy[0] : undefined;

    for (const agg of aggregations) {
      const key = agg.alias || `${agg.function}_${agg.field || 'all'}`;

      if (primaryGroupBy) {
        // Grouped aggregation
        const groups: Record<string, DataRecord[]> = {};
        for (const rec of records) {
          const groupVal = String(QueryEngine.getFieldValue(rec, primaryGroupBy) ?? 'null');
          if (!groups[groupVal]) groups[groupVal] = [];
          groups[groupVal].push(rec);
        }

        const groupAggs: Record<string, number> = {};
        for (const [groupName, groupRecords] of Object.entries(groups)) {
          groupAggs[groupName] = this.calcSingleAgg(groupRecords, agg);
        }
        result[key] = groupAggs;
      } else {
        result[key] = this.calcSingleAgg(records, agg);
      }
    }

    return result;
  }

  private calcSingleAgg(records: DataRecord[], agg: QueryAggregation): number {
    if (agg.function === 'COUNT') {
      if (!agg.field || agg.field === '*') return records.length;
      return records.filter(r => {
        const v = QueryEngine.getFieldValue(r, agg.field!);
        return v !== null && v !== undefined;
      }).length;
    }

    if (!agg.field) return 0;

    const fieldName = agg.field;
    const numbers = records
      .map(r => Number(QueryEngine.getFieldValue(r, fieldName)))
      .filter(n => !isNaN(n) && n !== null);

    if (numbers.length === 0) return 0;

    switch (agg.function) {
      case 'SUM':
        return numbers.reduce((acc, curr) => acc + curr, 0);
      case 'AVERAGE':
        return numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;
      case 'MIN':
        return Math.min(...numbers);
      case 'MAX':
        return Math.max(...numbers);
      default:
        return 0;
    }
  }
}
