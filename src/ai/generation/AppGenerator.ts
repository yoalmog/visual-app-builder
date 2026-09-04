// App Generator: End-to-end full application generation coordinator
import { AIOperation } from '../operations/AIOperation';
import { PageGenerator } from './PageGenerator';
import { DataModelGenerator } from './DataModelGenerator';
import { WorkflowGenerator } from './WorkflowGenerator';
import { DashboardGenerator } from './DashboardGenerator';
import { ThemeGenerator } from './ThemeGenerator';

export interface AIAppPlan {
  appName: string;
  summary: string;
  pages: Array<{ id: string; name: string; slug: string; role: string }>;
  collections: Array<{ name: string; fields: string[] }>;
  workflows: string[];
  theme: string;
  operations: AIOperation[];
}

export class AppGenerator {
  /**
   * Generates a complete restaurant ordering application.
   */
  public static generateRestaurantApp(): AIAppPlan {
    const ops: AIOperation[] = [];

    // 1. Theme
    ops.push(...ThemeGenerator.generateTheme('emerald_fintech'));

    // 2. Data model
    ops.push(
      ...DataModelGenerator.generateDomainModel({
        domainName: 'Restaurant',
        entities: [
          {
            name: 'Categories',
            fields: [
              { name: 'name', type: 'text', required: true },
              { name: 'description', type: 'text' },
            ],
          },
          {
            name: 'MenuItems',
            fields: [
              { name: 'name', type: 'text', required: true },
              { name: 'price', type: 'number', required: true },
              { name: 'description', type: 'text' },
              { name: 'available', type: 'boolean', required: true },
            ],
          },
          {
            name: 'Orders',
            fields: [
              { name: 'customerName', type: 'text', required: true },
              { name: 'status', type: 'text', required: true },
              { name: 'totalAmount', type: 'number', required: true },
              { name: 'tableNumber', type: 'text' },
            ],
          },
        ],
        relationships: [
          {
            fromCollection: 'MenuItems',
            toCollection: 'Categories',
            name: 'ItemCategory',
            type: 'N:1',
            foreignKey: 'categoryId',
          },
        ],
      })
    );

    // 3. Pages: Home, Menu, Checkout, Orders Admin Dashboard
    ops.push(
      ...PageGenerator.generatePage({
        pageId: 'page_menu',
        name: 'Menu',
        slug: '/menu',
        description: 'Explore our fresh appetizers, entrees, and desserts.',
      })
    );

    ops.push(
      ...PageGenerator.generatePage({
        pageId: 'page_cart',
        name: 'Cart & Checkout',
        slug: '/checkout',
        description: 'Review your selected items and submit your table order.',
      })
    );

    ops.push(
      ...DashboardGenerator.generateDashboard({
        pageId: 'page_orders_admin',
        title: 'Kitchen & Orders Dashboard',
        slug: '/admin/orders',
        kpis: [
          { title: 'Active Orders', value: '14', change: '+3 new', trend: 'up' },
          { title: 'Today Revenue', value: '$2,840', change: '+18%', trend: 'up' },
          { title: 'Avg Ticket Time', value: '18m', change: '-2m', trend: 'up' },
          { title: 'Available Tables', value: '6 / 24', change: 'Busy', trend: 'down' },
        ],
        charts: [
          { title: 'Hourly Order Volume', type: 'chart_bar' },
          { title: 'Sales by Category', type: 'chart_pie' },
        ],
        primaryCollectionName: 'Orders',
      })
    );

    // 4. Workflow
    ops.push(
      WorkflowGenerator.generateFormSubmitWorkflow({
        workflowId: 'wf_place_order',
        workflowName: 'Place Restaurant Order',
        targetCollectionId: 'col_orders',
        notificationMessage: 'Order submitted to kitchen successfully!',
      })
    );

    return {
      appName: 'Gourmet Bistro Ordering',
      summary: 'Complete restaurant ordering application with interactive menu, checkout, kitchen orders dashboard, and data automation.',
      pages: [
        { id: 'page_menu', name: 'Menu', slug: '/menu', role: 'Customer Menu' },
        { id: 'page_cart', name: 'Cart & Checkout', slug: '/checkout', role: 'Checkout' },
        { id: 'page_orders_admin', name: 'Kitchen Dashboard', slug: '/admin/orders', role: 'Admin / Staff' },
      ],
      collections: [
        { name: 'Categories', fields: ['name', 'description'] },
        { name: 'MenuItems', fields: ['name', 'price', 'description', 'available'] },
        { name: 'Orders', fields: ['customerName', 'status', 'totalAmount', 'tableNumber'] },
      ],
      workflows: ['Place Restaurant Order'],
      theme: 'Emerald Fintech',
      operations: ops,
    };
  }

  /**
   * Generates a complete CRM application.
   */
  public static generateCrmApp(): AIAppPlan {
    const ops: AIOperation[] = [];

    // 1. Theme
    ops.push(...ThemeGenerator.generateTheme('modern_dark'));

    // 2. Data model
    ops.push(
      ...DataModelGenerator.generateDomainModel({
        domainName: 'CRM',
        entities: [
          {
            name: 'Companies',
            fields: [
              { name: 'name', type: 'text', required: true },
              { name: 'industry', type: 'text' },
              { name: 'website', type: 'url' },
            ],
          },
          {
            name: 'Contacts',
            fields: [
              { name: 'name', type: 'text', required: true },
              { name: 'email', type: 'email', required: true },
              { name: 'phone', type: 'text' },
              { name: 'title', type: 'text' },
            ],
          },
          {
            name: 'Deals',
            fields: [
              { name: 'title', type: 'text', required: true },
              { name: 'amount', type: 'number', required: true },
              { name: 'stage', type: 'text', required: true },
              { name: 'closeDate', type: 'date' },
            ],
          },
        ],
        relationships: [
          {
            fromCollection: 'Contacts',
            toCollection: 'Companies',
            name: 'ContactCompany',
            type: 'N:1',
            foreignKey: 'companyId',
          },
          {
            fromCollection: 'Deals',
            toCollection: 'Companies',
            name: 'DealCompany',
            type: 'N:1',
            foreignKey: 'companyId',
          },
        ],
      })
    );

    // 3. Pages
    ops.push(
      ...DashboardGenerator.generateDashboard({
        pageId: 'page_crm_dashboard',
        title: 'Sales CRM Dashboard',
        slug: '/dashboard',
        kpis: [
          { title: 'Pipeline Value', value: '$480,000', change: '+24%', trend: 'up' },
          { title: 'Active Deals', value: '42', change: '+5', trend: 'up' },
          { title: 'Win Rate', value: '38%', change: '+4%', trend: 'up' },
          { title: 'New Leads (30d)', value: '128', change: '+12%', trend: 'up' },
        ],
        charts: [
          { title: 'Monthly Revenue Closed', type: 'chart_line' },
          { title: 'Deals by Stage', type: 'chart_bar' },
        ],
        primaryCollectionName: 'Deals',
      })
    );

    ops.push(
      ...PageGenerator.generatePage({
        pageId: 'page_contacts',
        name: 'Contacts Directory',
        slug: '/contacts',
        description: 'Manage customers, key stakeholders, and communication history.',
      })
    );

    // 4. Workflow
    ops.push(
      WorkflowGenerator.generateFormSubmitWorkflow({
        workflowId: 'wf_create_lead',
        workflowName: 'Create Deal & Notify Rep',
        targetCollectionId: 'col_deals',
        notificationMessage: 'New deal logged and assigned to sales team!',
      })
    );

    return {
      appName: 'Apex Sales CRM',
      summary: 'Enterprise CRM platform with pipeline management, contacts, deals tracking, and executive analytics dashboard.',
      pages: [
        { id: 'page_crm_dashboard', name: 'Sales CRM Dashboard', slug: '/dashboard', role: 'Executive Dashboard' },
        { id: 'page_contacts', name: 'Contacts Directory', slug: '/contacts', role: 'Directory' },
      ],
      collections: [
        { name: 'Companies', fields: ['name', 'industry', 'website'] },
        { name: 'Contacts', fields: ['name', 'email', 'phone', 'title'] },
        { name: 'Deals', fields: ['title', 'amount', 'stage', 'closeDate'] },
      ],
      workflows: ['Create Deal & Notify Rep'],
      theme: 'Modern Dark SaaS',
      operations: ops,
    };
  }
}
