import {
  AppProject,
  Asset,
  DesignToken,
  PROJECT_SCHEMA_VERSION,
  SCHEMA_VERSION,
  PROJECT_SCHEMA_VERSION_V8,
  SCHEMA_VERSION_V9,
  PROJECT_SCHEMA_VERSION_V9,
  AuthConfig,
  EnvironmentConfig,
  CloudConfig,
  DeploymentConfig,
} from '../schema/project';
import { ComponentNode } from '../schema/component';
import { AppProjectSchema } from '../schema/validation';

export {
  PROJECT_SCHEMA_VERSION,
  SCHEMA_VERSION,
  PROJECT_SCHEMA_VERSION_V8,
  SCHEMA_VERSION_V9,
  PROJECT_SCHEMA_VERSION_V9,
};

export function getStorageKey(projectId: string): string {
  return `visual-builder-project-${projectId}`;
}

export function getDefaultDesignTokens(): DesignToken[] {
  return [
    // Color tokens
    { id: 'token_color_primary', name: 'Primary', category: 'color', value: '#4F46E5', description: 'Primary brand color' },
    { id: 'token_color_secondary', name: 'Secondary', category: 'color', value: '#06B6D4', description: 'Secondary accent color' },
    { id: 'token_color_accent', name: 'Accent', category: 'color', value: '#8B5CF6', description: 'Accent highlight color' },
    { id: 'token_color_background', name: 'Background', category: 'color', value: '#FFFFFF', description: 'Default canvas background' },
    { id: 'token_color_surface', name: 'Surface', category: 'color', value: '#F8FAFC', description: 'Card surface color' },
    { id: 'token_color_text', name: 'Text', category: 'color', value: '#0F172A', description: 'Primary text color' },
    { id: 'token_color_muted', name: 'Muted', category: 'color', value: '#64748B', description: 'Muted text and subtle borders' },
    { id: 'token_color_border', name: 'Border', category: 'color', value: '#E2E8F0', description: 'Default border stroke color' },
    { id: 'token_color_success', name: 'Success', category: 'color', value: '#10B981', description: 'Success alert color' },
    { id: 'token_color_warning', name: 'Warning', category: 'color', value: '#F59E0B', description: 'Warning alert color' },
    { id: 'token_color_danger', name: 'Danger', category: 'color', value: '#EF4444', description: 'Destructive / error color' },

    // Spacing scale tokens
    { id: 'token_space_1', name: 'Spacing 1 (4px)', category: 'spacing', value: '4px' },
    { id: 'token_space_2', name: 'Spacing 2 (8px)', category: 'spacing', value: '8px' },
    { id: 'token_space_3', name: 'Spacing 3 (12px)', category: 'spacing', value: '12px' },
    { id: 'token_space_4', name: 'Spacing 4 (16px)', category: 'spacing', value: '16px' },
    { id: 'token_space_5', name: 'Spacing 5 (20px)', category: 'spacing', value: '20px' },
    { id: 'token_space_6', name: 'Spacing 6 (24px)', category: 'spacing', value: '24px' },
    { id: 'token_space_8', name: 'Spacing 8 (32px)', category: 'spacing', value: '32px' },
    { id: 'token_space_10', name: 'Spacing 10 (40px)', category: 'spacing', value: '40px' },
    { id: 'token_space_12', name: 'Spacing 12 (48px)', category: 'spacing', value: '48px' },
    { id: 'token_space_16', name: 'Spacing 16 (64px)', category: 'spacing', value: '64px' },

    // Typography scale tokens
    { id: 'token_typo_display', name: 'Display', category: 'typography', value: '48px', description: 'Display title size' },
    { id: 'token_typo_h1', name: 'H1', category: 'typography', value: '36px', description: 'Heading 1 size' },
    { id: 'token_typo_h2', name: 'H2', category: 'typography', value: '30px', description: 'Heading 2 size' },
    { id: 'token_typo_h3', name: 'H3', category: 'typography', value: '24px', description: 'Heading 3 size' },
    { id: 'token_typo_body', name: 'Body', category: 'typography', value: '16px', description: 'Body text size' },
    { id: 'token_typo_small', name: 'Small', category: 'typography', value: '14px', description: 'Small body text' },
    { id: 'token_typo_caption', name: 'Caption', category: 'typography', value: '12px', description: 'Caption / label text' },
    { id: 'token_typo_button', name: 'Button', category: 'typography', value: '15px', description: 'Button text size' },

    // Radius tokens
    { id: 'token_radius_none', name: 'None', category: 'radius', value: '0px' },
    { id: 'token_radius_sm', name: 'Small', category: 'radius', value: '4px' },
    { id: 'token_radius_md', name: 'Medium', category: 'radius', value: '8px' },
    { id: 'token_radius_lg', name: 'Large', category: 'radius', value: '16px' },
    { id: 'token_radius_full', name: 'Full', category: 'radius', value: '9999px' },

    // Shadow tokens
    { id: 'token_shadow_none', name: 'None', category: 'shadow', value: 'none' },
    { id: 'token_shadow_sm', name: 'Small', category: 'shadow', value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
    { id: 'token_shadow_md', name: 'Medium', category: 'shadow', value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' },
    { id: 'token_shadow_lg', name: 'Large', category: 'shadow', value: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)' },
  ];
}

function migrateNode(node: any): ComponentNode {
  if (!node || typeof node !== 'object') {
    return {
      id: `node_${Date.now()}`,
      type: 'container',
      name: 'Container',
      props: {},
      styles: {},
      children: [],
    };
  }

  const migratedChildren = Array.isArray(node.children)
    ? node.children.map((c: any) => migrateNode(c))
    : [];

  return {
    ...node,
    locked: typeof node.locked === 'boolean' ? node.locked : false,
    states: node.states && typeof node.states === 'object' ? node.states : {},
    interactions: Array.isArray(node.interactions) ? node.interactions : [],
    tokenReferences: node.tokenReferences && typeof node.tokenReferences === 'object' ? node.tokenReferences : {},
    bindings: node.bindings && typeof node.bindings === 'object' ? node.bindings : {},
    logicRules: Array.isArray(node.logicRules) ? node.logicRules : [],
    conditionalVisibility: node.conditionalVisibility && typeof node.conditionalVisibility === 'object' ? node.conditionalVisibility : undefined,
    requiredRoles: Array.isArray(node.requiredRoles) ? node.requiredRoles : undefined,
    requiredPermissions: Array.isArray(node.requiredPermissions) ? node.requiredPermissions : undefined,
    authExpression: typeof node.authExpression === 'string' ? node.authExpression : undefined,
    unauthorizedBehavior: node.unauthorizedBehavior || undefined,
    children: migratedChildren,
  };
}

export function getDefaultAuthConfig(): AuthConfig {
  return {
    provider: 'mock',
    enabled: false,
    allowUserRegistration: true,
    persistSession: true,
  };
}

export function getDefaultEnvironmentConfig(): EnvironmentConfig {
  return {
    activeEnvironment: 'development',
    environments: {
      development: {
        name: 'Development',
        isProduction: false,
        apiVariables: {},
        features: {},
      },
      preview: {
        name: 'Preview',
        isProduction: false,
        apiVariables: {},
        features: {},
      },
      production: {
        name: 'Production',
        isProduction: true,
        apiVariables: {},
        features: {},
      },
    },
  };
}

export function getDefaultCloudConfig(): CloudConfig {
  return {
    provider: 'mock',
    projectUrl: '',
    anonKey: '',
    status: 'disconnected',
  };
}

export function getDefaultDeploymentConfig(): DeploymentConfig {
  return {
    deployments: [],
  };
}

export function getDefaultRoles(): any[] {
  return [
    { id: 'admin', name: 'Admin', description: 'Full administrative access to manage users, data, and workflows', permissions: ['*.*'], isSystem: true },
    { id: 'role_owner', name: 'Owner', description: 'Full administrative access to project and all data', permissions: ['*.*'], isSystem: true },
    { id: 'role_admin', name: 'Admin', description: 'Administrative access to manage users, data, and workflows', permissions: ['users.*', 'records.*', 'workflows.*', 'export.*'], isSystem: true },
    { id: 'role_editor', name: 'Editor', description: 'Can view and modify collections and execute workflows', permissions: ['records.create', 'records.read', 'records.update', 'workflows.execute'], isSystem: true },
    { id: 'role_viewer', name: 'Viewer', description: 'Read-only access to records', permissions: ['records.read'], isSystem: true },
    { id: 'role_user', name: 'User', description: 'Standard authenticated application user', permissions: ['records.read', 'records.create'], isSystem: true },
  ];
}

export function getDefaultPermissions(): any[] {
  return [
    { id: 'perm_users_all', resource: 'users', action: '*', description: 'All user management operations' },
    { id: 'perm_records_read', resource: 'records', action: 'read', description: 'Read collection records' },
    { id: 'perm_records_create', resource: 'records', action: 'create', description: 'Create new records' },
    { id: 'perm_records_update', resource: 'records', action: 'update', description: 'Update existing records' },
    { id: 'perm_records_delete', resource: 'records', action: 'delete', description: 'Delete records' },
    { id: 'perm_workflows_exec', resource: 'workflows', action: 'execute', description: 'Trigger and execute workflows' },
    { id: 'perm_export_data', resource: 'export', action: 'data', description: 'Export records to CSV/JSON' },
  ];
}

export function getDefaultLocalization(): any {
  return {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de', 'ar', 'he'],
    direction: { en: 'ltr', es: 'ltr', fr: 'ltr', de: 'ltr', ar: 'rtl', he: 'rtl' },
    translations: {
      en: { welcome: 'Welcome', submit: 'Submit', cancel: 'Cancel', delete: 'Delete' },
      es: { welcome: 'Bienvenido', submit: 'Enviar', cancel: 'Cancelar', delete: 'Eliminar' },
      fr: { welcome: 'Bienvenue', submit: 'Soumettre', cancel: 'Annuler', delete: 'Supprimer' },
      de: { welcome: 'Willkommen', submit: 'Einreichen', cancel: 'Abbrechen', delete: 'Löschen' },
      ar: { welcome: 'أهلاً بك', submit: 'إرسال', cancel: 'إلغاء', delete: 'حذف' },
      he: { welcome: 'ברוכים הבאים', submit: 'שלח', cancel: 'ביטול', delete: 'מחק' },
    },
  };
}

export function getDefaultWebhooks(): any {
  return {
    incoming: [],
    outgoing: [],
  };
}

export function getDefaultAIMetadata(): import('../schema/ai').AIProjectMetadata {
  return {
    enabled: true,
    settings: {
      provider: 'mock',
      model: 'gpt-4o',
      temperature: 0.2,
      maxTokens: 4096,
      safetyMode: 'approval',
      autoApplyLowRisk: true,
      tokenBudget: 50000,
      agentMaxSteps: 15,
      maxRetries: 3,
    },
    generations: [],
    conversations: [],
    memory: {
      preferences: {},
      conventions: [],
      preferredTerminology: {},
      notes: [],
    },
  };
}

export function migrateProject(raw: any): AppProject {

  if (!raw || typeof raw !== 'object') {
    return createInitialProject(raw?.id || 'default');
  }

  const project: any = { ...raw };

  // Upgrade version to 6
  project.version = PROJECT_SCHEMA_VERSION;

  // Ensure collections array exists
  if (!Array.isArray(project.collections)) {
    project.collections = [];
  } else {
    project.collections = project.collections.map((col: any) => ({
      ...col,
      dataSource: col.dataSource || 'local',
      rlsPolicy: col.rlsPolicy || 'public',
      primaryKey: col.primaryKey || 'id',
      relationships: Array.isArray(col.relationships) ? col.relationships : [],
      indexes: Array.isArray(col.indexes) ? col.indexes : [],
      uniqueFields: Array.isArray(col.uniqueFields) ? col.uniqueFields : [],
    }));
  }

  // Ensure variables array exists
  if (!Array.isArray(project.variables)) {
    project.variables = [];
  }

  // Ensure tokens array exists with defaults
  if (!Array.isArray(project.tokens) || project.tokens.length === 0) {
    project.tokens = getDefaultDesignTokens();
  }

  // Phase 5 additions
  if (!Array.isArray(project.apiConnectors)) {
    project.apiConnectors = [];
  }

  if (!Array.isArray(project.dataSources)) {
    project.dataSources = [];
  }

  if (!project.authConfig || typeof project.authConfig !== 'object') {
    project.authConfig = getDefaultAuthConfig();
  }

  if (!project.environments || typeof project.environments !== 'object') {
    project.environments = getDefaultEnvironmentConfig();
  }

  if (!project.cloudConfig || typeof project.cloudConfig !== 'object') {
    project.cloudConfig = getDefaultCloudConfig();
  }

  if (!project.deploymentConfig || typeof project.deploymentConfig !== 'object') {
    project.deploymentConfig = getDefaultDeploymentConfig();
  }

  // Phase 6 additions
  if (!Array.isArray(project.roles) || project.roles.length === 0) {
    project.roles = getDefaultRoles();
  }

  if (!Array.isArray(project.permissions) || project.permissions.length === 0) {
    project.permissions = getDefaultPermissions();
  }

  if (!Array.isArray(project.workflows)) {
    project.workflows = [];
  }

  if (!project.webhooks || typeof project.webhooks !== 'object') {
    project.webhooks = getDefaultWebhooks();
  }

  if (!Array.isArray(project.queries)) {
    project.queries = [];
  }

  if (!Array.isArray(project.dashboards)) {
    project.dashboards = [];
  }

  if (!project.localization || typeof project.localization !== 'object') {
    project.localization = getDefaultLocalization();
  }

  if (!Array.isArray(project.auditLogs)) {
    project.auditLogs = [];
  }

  if (!Array.isArray(project.templates)) {
    project.templates = [];
  }

  // Phase 7: AI Application Generation & Agent Builder
  if (!project.aiMetadata || typeof project.aiMetadata !== 'object') {
    project.aiMetadata = getDefaultAIMetadata();
  }


  // Ensure reusable components library array exists
  if (!Array.isArray(project.components)) {
    project.components = [];
  } else {
    project.components = project.components.map((comp: any) => ({
      ...comp,
      root: migrateNode(comp.root),
    }));
  }

  // Ensure assets array exists and normalizes url / src
  if (Array.isArray(project.assets)) {
    project.assets = project.assets.map((asset: any) => {
      const src = asset.src || asset.url || '';
      return {
        id: asset.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: asset.name || 'Untitled Asset',
        type: 'image',
        src,
        url: src,
        width: asset.width,
        height: asset.height,
        alt: asset.alt || asset.name || 'Image',
      } as Asset;
    });
  } else {
    project.assets = [];
  }

  // Ensure theme is populated
  if (!project.theme) {
    project.theme = {
      primaryColor: '#4F46E5',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      borderRadius: '8px',
    };
  }

  // Ensure pages array exists and each page has a valid normalized slug
  if (!Array.isArray(project.pages) || project.pages.length === 0) {
    const init = createInitialProject(project.id || 'default');
    project.pages = init.pages;
  }

  project.pages = project.pages.map((p: any, idx: number) => {
    let slug = p.slug;
    if (!slug || typeof slug !== 'string') {
      slug = idx === 0 ? '/' : `/${p.name?.toLowerCase().replace(/\s+/g, '-') || 'page-' + idx}`;
    }
    if (!slug.startsWith('/')) {
      slug = '/' + slug;
    }
    return {
      id: p.id || `page_${idx}`,
      name: p.name || (idx === 0 ? 'Home' : `Page ${idx + 1}`),
      slug,
      root: migrateNode(p.root),
      authProtection: p.authProtection,
    };
  });

  return project as AppProject;
}

export function migrateProjectToV8(raw: any): AppProject {
  const base = migrateProject(raw);
  const project: any = { ...raw, ...base };
  project.version = SCHEMA_VERSION;

  if (!project.organizationId) project.organizationId = raw?.organizationId || 'org_default';
  if (!project.workspaceId) project.workspaceId = raw?.workspaceId || 'ws_default';
  if (!project.branch) project.branch = raw?.branch || 'main';
  if (typeof project.projectVersion !== 'number') project.projectVersion = raw?.projectVersion || 1;
  if (!Array.isArray(project.comments)) project.comments = Array.isArray(raw?.comments) ? raw.comments : [];
  if (!Array.isArray(project.branches) || project.branches.length === 0) {
    project.branches = Array.isArray(raw?.branches) && raw.branches.length > 0 ? raw.branches : [
      {
        id: `branch_main_${project.id}`,
        projectId: project.id,
        name: 'main',
        headCommitId: `commit_init_${project.id}`,
        protected: false,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  if (!Array.isArray(project.reviews)) project.reviews = Array.isArray(raw?.reviews) ? raw.reviews : [];
  if (!Array.isArray(project.plugins)) project.plugins = Array.isArray(raw?.plugins) ? raw.plugins : [];
  if (!Array.isArray(project.releases)) project.releases = Array.isArray(raw?.releases) ? raw.releases : [];

  return project as AppProject;
}

export function migrateProjectToV9(raw: any): AppProject {
  const v8 = migrateProjectToV8(raw);
  const project: any = { ...raw, ...v8 };
  project.id = project.id || raw?.id || 'default';
  project.version = SCHEMA_VERSION_V9;
  project.schemaVersion = SCHEMA_VERSION_V9;

  if (!project.regionId) project.regionId = raw?.regionId || 'us-east-1';
  if (!Array.isArray(project.featureFlags)) project.featureFlags = Array.isArray(raw?.featureFlags) ? raw.featureFlags : [];
  if (!Array.isArray(project.experiments)) project.experiments = Array.isArray(raw?.experiments) ? raw.experiments : [];
  if (!project.cdnConfig) {
    project.cdnConfig = raw?.cdnConfig || {
      distributionId: `dist_${project.id}`,
      domain: `${project.id}.cdn.apexstudio.io`,
      enabled: true,
      edgeRegions: ['us-east-1', 'eu-central-1', 'ap-southeast-1'],
      cachingRules: {
        staticAssetsTtlSeconds: 3600,
        publicPagesTtlSeconds: 60,
        apiCacheTtlSeconds: 10,
      },
      headers: {},
    };
  }
  if (!project.enterprisePolicies && raw?.enterprisePolicies) project.enterprisePolicies = raw.enterprisePolicies;

  return project as AppProject;
}

export function saveProjectToStorage(project: AppProject): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = getStorageKey(project.id);
    localStorage.setItem(key, JSON.stringify(project));
    return true;
  } catch (error) {
    console.error('Failed to save project to localStorage:', error);
    return false;
  }
}

export function loadProjectFromStorage(projectId: string): AppProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getStorageKey(projectId);
    const data = localStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data);
    const migrated = migrateProject(parsed);
    const validated = AppProjectSchema.safeParse(migrated);
    if (validated.success) {
      return validated.data as AppProject;
    } else {
      console.warn('Project failed schema validation after migration:', validated.error);
      return migrated as AppProject;
    }
  } catch (error) {
    console.error('Failed to load project from localStorage:', error);
    return null;
  }
}

export function createInitialProject(
  projectId = 'default',
  schemaVersion: number = PROJECT_SCHEMA_VERSION
): AppProject {
  const rootId = `root_${Date.now()}`;
  const textId = `text_${Date.now() + 1}`;
  const btnId = `btn_${Date.now() + 2}`;

  const isV8 = schemaVersion >= 8;
  const isV9 = schemaVersion >= 9;

  const project: AppProject = {
    id: projectId,
    name: 'My App',
    version: schemaVersion,
    theme: {
      primaryColor: '#4F46E5',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      borderRadius: '8px',
      colors: {
        primary: '#4F46E5',
        secondary: '#06B6D4',
        background: '#FFFFFF',
        foreground: '#0F172A',
        muted: '#64748B',
        border: '#E2E8F0',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
      },
      radius: {
        sm: 4,
        md: 8,
        lg: 12,
      },
    },
    tokens: getDefaultDesignTokens(),
    assets: [
      {
        id: 'asset_default_sample',
        name: 'Abstract Landscape',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        width: 600,
        height: 400,
        alt: 'Sample abstract landscape',
      },
    ],
    components: [],
    collections: [],
    variables: [],
    dataSources: [],
    apiConnectors: [],
    authConfig: getDefaultAuthConfig(),
    environments: getDefaultEnvironmentConfig(),
    cloudConfig: getDefaultCloudConfig(),
    deploymentConfig: getDefaultDeploymentConfig(),
    roles: getDefaultRoles(),
    permissions: getDefaultPermissions(),
    workflows: [],
    webhooks: getDefaultWebhooks(),
    queries: [],
    dashboards: [],
    localization: getDefaultLocalization(),
    auditLogs: [],
    templates: [],
    pages: [
      {
        id: 'page_home',
        name: 'Home',
        slug: '/',
        root: {
          id: rootId,
          type: 'container',
          name: 'Container',
          props: {},
          styles: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '400px',
            padding: '48px 32px',
            gap: '20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
          },
          locked: false,
          states: {},
          interactions: [],
          children: [
            {
              id: textId,
              type: 'text',
              name: 'Text',
              props: {
                text: 'Welcome to your app',
              },
              styles: {
                fontSize: '24px',
                fontWeight: '600',
                color: '#0F172A',
                textAlign: 'center',
                margin: '0 0 8px 0',
              },
              locked: false,
              states: {},
              interactions: [],
              children: [],
              parentId: rootId,
            },
            {
              id: btnId,
              type: 'button',
              name: 'Button',
              props: {
                text: 'Click me',
              },
              styles: {
                display: 'inline-flex',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
              },
              locked: false,
              states: {},
              interactions: [],
              children: [],
              parentId: rootId,
            },
          ],
        },
      },
    ],
    aiMetadata: getDefaultAIMetadata(),
  };

  if (isV8) {
    project.organizationId = 'org_default';
    project.workspaceId = 'ws_default';
    project.branch = 'main';
    project.projectVersion = 1;
    project.comments = [];
    project.branches = [
      {
        id: `branch_main_${projectId}`,
        projectId: projectId,
        name: 'main',
        headCommitId: `commit_init_${projectId}`,
        protected: false,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    project.reviews = [];
    project.plugins = [];
    project.releases = [];
  }

  if (isV9) {
    (project as any).schemaVersion = schemaVersion;
    project.regionId = 'us-east-1';
    project.featureFlags = [];
    project.experiments = [];
    project.cdnConfig = {
      distributionId: `dist_${projectId}`,
      domain: `${projectId}.cdn.apexstudio.io`,
      enabled: true,
      edgeRegions: ['us-east-1', 'eu-central-1', 'ap-southeast-1'],
      cachingRules: {
        staticAssetsTtlSeconds: 3600,
        publicPagesTtlSeconds: 60,
        apiCacheTtlSeconds: 10,
      },
      headers: {},
    };
  }

  return project;
}

