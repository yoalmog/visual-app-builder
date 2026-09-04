import { AppProject } from '../schema/project';
import { createInitialProject } from '../persistence/project-storage';

export interface StarterTemplateMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  createProject: (id: string, name: string) => AppProject;
}

function buildTemplateProject(
  id: string,
  name: string,
  category: string,
  description: string,
  collections: any[],
  pages: any[]
): AppProject {
  const base = createInitialProject(id);
  base.name = name;
  return {
    ...base,
    collections,
    pages: pages.length > 0 ? pages : base.pages,
  };
}

export const STARTER_TEMPLATES: StarterTemplateMeta[] = [
  {
    id: 'saas-starter',
    name: 'SaaS Platform Starter',
    category: 'SaaS',
    description: 'Complete SaaS template with subscriptions, user billing, and team workspaces.',
    icon: 'briefcase',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'SaaS', 'SaaS Platform with billing and teams', [
        {
          id: 'subscriptions',
          name: 'Subscriptions',
          fields: [
            { id: 'plan', name: 'Plan', type: 'text', required: true },
            { id: 'price', name: 'Price', type: 'number', required: true },
            { id: 'status', name: 'Status', type: 'select', required: true, options: ['active', 'trialing', 'canceled'] },
          ],
          records: [
            { id: 'sub_1', values: { plan: 'Pro', price: 49, status: 'active' }, plan: 'Pro', price: 49, status: 'active' },
          ],
        },
      ], []),
  },
  {
    id: 'crm-starter',
    name: 'CRM & Sales Pipeline',
    category: 'Sales',
    description: 'Lead management, customer accounts, and deals tracking pipeline.',
    icon: 'users',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Sales', 'CRM lead and deals pipeline', [
        {
          id: 'leads',
          name: 'Leads',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'company', name: 'Company', type: 'text', required: true },
            { id: 'email', name: 'Email', type: 'email', required: true },
            { id: 'deal_value', name: 'Deal Value', type: 'number', required: false },
            { id: 'stage', name: 'Stage', type: 'select', required: true, options: ['New', 'Qualified', 'Proposal', 'Won', 'Lost'] },
          ],
          records: [
            { id: 'lead_1', values: { name: 'Acme Corp', company: 'Acme', email: 'sales@acme.com', deal_value: 12000, stage: 'Qualified' } },
          ],
        },
      ], []),
  },
  {
    id: 'inventory-starter',
    name: 'Warehouse & Inventory Manager',
    category: 'Operations',
    description: 'SKU tracking, stock level threshold alerts, and supplier records.',
    icon: 'archive',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Operations', 'Inventory and warehouse management', [
        {
          id: 'inventory',
          name: 'Inventory Items',
          fields: [
            { id: 'sku', name: 'SKU', type: 'text', required: true, unique: true },
            { id: 'title', name: 'Title', type: 'text', required: true },
            { id: 'stock', name: 'Stock Level', type: 'number', required: true },
            { id: 'min_threshold', name: 'Min Alert Threshold', type: 'number', required: true },
          ],
          records: [
            { id: 'item_1', values: { sku: 'SKU-001', title: 'Industrial Sensor', stock: 45, min_threshold: 10 } },
          ],
        },
      ], []),
  },
  {
    id: 'restaurant-starter',
    name: 'Restaurant & Table Ordering',
    category: 'Hospitality',
    description: 'Menu management, table orders, and reservations system.',
    icon: 'coffee',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Hospitality', 'Restaurant menus and table booking', [
        {
          id: 'menu',
          name: 'Menu Items',
          fields: [
            { id: 'dish_name', name: 'Dish Name', type: 'text', required: true },
            { id: 'category', name: 'Category', type: 'select', required: true, options: ['Starters', 'Mains', 'Desserts', 'Drinks'] },
            { id: 'price', name: 'Price', type: 'number', required: true },
          ],
          records: [
            { id: 'dish_1', values: { dish_name: 'Truffle Pasta', category: 'Mains', price: 24 } },
          ],
        },
      ], []),
  },
  {
    id: 'ecommerce-starter',
    name: 'E-commerce Storefront',
    category: 'Commerce',
    description: 'Product catalog, shopping cart, customer checkout, and orders.',
    icon: 'shopping-cart',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Commerce', 'E-commerce online storefront', [
        {
          id: 'products',
          name: 'Products',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'price', name: 'Price', type: 'number', required: true },
            { id: 'inventory', name: 'Inventory', type: 'number', required: true },
          ],
          records: [
            { id: 'p1', values: { name: 'Wireless Headphones', price: 199, inventory: 80 } },
          ],
        },
      ], []),
  },
  {
    id: 'booking-starter',
    name: 'Appointment & Booking Service',
    category: 'Services',
    description: 'Schedule client consultations, manage staff calendars, and booking slots.',
    icon: 'calendar',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Services', 'Appointment and booking system', [
        {
          id: 'appointments',
          name: 'Appointments',
          fields: [
            { id: 'client_name', name: 'Client Name', type: 'text', required: true },
            { id: 'date_time', name: 'Date & Time', type: 'date', required: true },
            { id: 'service', name: 'Service', type: 'text', required: true },
          ],
          records: [
            { id: 'app_1', values: { client_name: 'Jane Doe', date_time: '2026-09-10T14:00:00Z', service: 'Consultation' } },
          ],
        },
      ], []),
  },
  {
    id: 'dashboard-starter',
    name: 'Executive Analytics Dashboard',
    category: 'Analytics',
    description: 'KPI scorecards, line charts, revenue breakdowns, and metric widgets.',
    icon: 'bar-chart-2',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Analytics', 'Executive metrics and analytics dashboard', [
        {
          id: 'kpis',
          name: 'KPI Metrics',
          fields: [
            { id: 'metric', name: 'Metric', type: 'text', required: true },
            { id: 'value', name: 'Value', type: 'number', required: true },
            { id: 'target', name: 'Target', type: 'number', required: true },
          ],
          records: [
            { id: 'm1', values: { metric: 'MRR', value: 85000, target: 100000 } },
          ],
        },
      ], []),
  },
  {
    id: 'portfolio-starter',
    name: 'Creative Agency Portfolio',
    category: 'Creative',
    description: 'Project showcases, interactive media gallery, and client inquiry forms.',
    icon: 'image',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Creative', 'Creative portfolio and case studies', [
        {
          id: 'projects',
          name: 'Projects',
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true },
            { id: 'client', name: 'Client', type: 'text', required: true },
            { id: 'year', name: 'Year', type: 'number', required: true },
          ],
          records: [
            { id: 'proj_1', values: { title: 'Brand Identity', client: 'Starlight Media', year: 2026 } },
          ],
        },
      ], []),
  },
  {
    id: 'blog-starter',
    name: 'Content & Publishing Platform',
    category: 'Publishing',
    description: 'Article authoring, categories, tags, and reader engagement.',
    icon: 'book-open',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Publishing', 'Content blog and article publisher', [
        {
          id: 'articles',
          name: 'Articles',
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true },
            { id: 'author', name: 'Author', type: 'text', required: true },
            { id: 'published_at', name: 'Published Date', type: 'date', required: true },
          ],
          records: [
            { id: 'art_1', values: { title: 'The Future of Visual Development', author: 'Staff', published_at: '2026-09-01' } },
          ],
        },
      ], []),
  },
  {
    id: 'community-starter',
    name: 'Community Forum & Portal',
    category: 'Community',
    description: 'Discussion channels, member directory, and community threads.',
    icon: 'message-square',
    createProject: (id, name) =>
      buildTemplateProject(id, name, 'Community', 'Community discussions and member directory', [
        {
          id: 'discussions',
          name: 'Discussions',
          fields: [
            { id: 'topic', name: 'Topic', type: 'text', required: true },
            { id: 'category', name: 'Category', type: 'text', required: true },
            { id: 'replies_count', name: 'Replies', type: 'number', required: true },
          ],
          records: [
            { id: 'disc_1', values: { topic: 'Welcome to the new community!', category: 'General', replies_count: 14 } },
          ],
        },
      ], []),
  },
];

export function getStarterTemplateById(id: string): StarterTemplateMeta | undefined {
  return STARTER_TEMPLATES.find(t => t.id === id);
}

export function instantiateStarterTemplate(templateId: string, projectId: string, projectName: string): AppProject {
  const template = getStarterTemplateById(templateId);
  if (!template) {
    throw new Error(`Starter template not found: ${templateId}`);
  }
  return template.createProject(projectId, projectName);
}
