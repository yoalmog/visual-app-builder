// Dashboard Generator: Synthesizes KPI widgets, analytics charts, and data tables
import { AIOperation } from '../operations/AIOperation';

export class DashboardGenerator {
  /**
   * Generates operations to construct a complete analytics and management dashboard page.
   */
  public static generateDashboard(params: {
    pageId: string;
    title: string;
    slug?: string;
    kpis: Array<{ title: string; value: string; change?: string; trend?: 'up' | 'down' }>;
    charts: Array<{ title: string; type: 'chart_line' | 'chart_bar' | 'chart_pie'; data?: any }>;
    primaryCollectionName?: string;
  }): AIOperation[] {
    const ops: AIOperation[] = [];
    const rootId = `root_${params.pageId}`;

    // 1. Create Dashboard page
    ops.push({
      id: `op_page_${params.pageId}`,
      type: 'create_page',
      description: `Create Dashboard page "${params.title}"`,
      risk: 'medium',
      reversible: true,
      pageId: params.pageId,
      name: params.title,
      slug: params.slug || '/dashboard',
    });

    // 2. Add KPI summary grid
    const kpiGridId = `kpi_grid_${params.pageId}`;
    ops.push({
      id: `op_kpi_grid_${params.pageId}`,
      type: 'add_component',
      description: 'Add KPI Metrics Grid',
      risk: 'low',
      dependencies: [`op_page_${params.pageId}`],
      reversible: true,
      pageId: params.pageId,
      parentId: rootId,
      node: {
        id: kpiGridId,
        type: 'grid',
        name: 'KPI Grid',
        props: { columns: params.kpis.length || 4 },
        styles: {
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(params.kpis.length, 4)}, 1fr)`,
          gap: '16px',
          width: '100%',
        },
        children: params.kpis.map((kpi, idx) => ({
          id: `kpi_card_${params.pageId}_${idx}`,
          type: 'statistic_kpi',
          name: `${kpi.title} KPI`,
          props: {
            title: kpi.title,
            value: kpi.value,
            change: kpi.change || '+12%',
            trend: kpi.trend || 'up',
          },
          styles: {
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          },
        })),
      },
    });

    // 3. Add Charts Row
    const chartsRowId = `charts_row_${params.pageId}`;
    ops.push({
      id: `op_charts_${params.pageId}`,
      type: 'add_component',
      description: 'Add Analytics Charts Container',
      risk: 'low',
      dependencies: [`op_page_${params.pageId}`],
      reversible: true,
      pageId: params.pageId,
      parentId: rootId,
      node: {
        id: chartsRowId,
        type: 'grid',
        name: 'Charts Section',
        props: { columns: params.charts.length || 2 },
        styles: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          width: '100%',
        },
        children: params.charts.map((chart, idx) => ({
          id: `chart_${params.pageId}_${idx}`,
          type: chart.type,
          name: chart.title,
          props: {
            title: chart.title,
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            data: [1200, 1900, 3000, 5000, 4200, 6800],
          },
          styles: {
            height: '320px',
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
          },
        })),
      },
    });

    // 4. Add Data Table
    const tableId = `table_${params.pageId}`;
    ops.push({
      id: `op_table_${params.pageId}`,
      type: 'add_component',
      description: `Add Recent ${params.primaryCollectionName || 'Records'} Table`,
      risk: 'low',
      dependencies: [`op_page_${params.pageId}`],
      reversible: true,
      pageId: params.pageId,
      parentId: rootId,
      node: {
        id: tableId,
        type: 'data_table',
        name: `${params.primaryCollectionName || 'Data'} Table`,
        props: {
          searchable: true,
          sortable: true,
          pagination: true,
          pageSize: 10,
          collection: params.primaryCollectionName?.toLowerCase(),
        },
        styles: {
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          padding: '16px',
        },
      },
    });

    return ops;
  }
}
