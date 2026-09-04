/**
 * Phase 6: Query Engine & Aggregations Schema
 */

export type QueryFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_equal'
  | 'less_than'
  | 'less_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_null'
  | 'is_not_null'
  | 'date_before'
  | 'date_after'
  | 'date_range';

export interface QueryFilter {
  field: string;
  operator: QueryFilterOperator;
  value?: any;
  secondValue?: any; // for 'between' and 'date_range'
}

export interface QueryFilterGroup {
  logic: 'AND' | 'OR';
  filters: Array<QueryFilter | QueryFilterGroup>;
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryPagination {
  type?: 'offset' | 'cursor';
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export type AggregationFunction = 'COUNT' | 'SUM' | 'AVERAGE' | 'MIN' | 'MAX';

export interface QueryAggregation {
  alias: string;
  function: AggregationFunction;
  field?: string; // required for SUM, AVERAGE, MIN, MAX; optional for COUNT(*)
}

export interface QueryDefinition {
  id: string;
  name: string;
  sourceCollectionId: string;
  select?: string[]; // specific field names or empty for all
  filterGroup?: QueryFilterGroup;
  filters?: QueryFilter[]; // shorthand top-level AND filters
  sort?: QuerySort[];
  pagination?: QueryPagination;
  search?: {
    term: string;
    fields?: string[];
    fuzzy?: boolean;
  };
  groupBy?: string[];
  aggregations?: QueryAggregation[];
  includeRelations?: string[]; // relation IDs or field names
  cacheTtlMs?: number;
}
