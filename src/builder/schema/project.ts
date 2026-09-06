import { AppPage } from './page';
import { ComponentNode, ComponentStyles } from './component';
import {
  ApiConnector,
  AuthConfig,
  EnvironmentConfig,
  CloudConfig,
  DeploymentConfig,
  CollectionDataSourceMode,
  RlsPolicyType,
} from './cloud';

export * from './cloud';
export * from './workflow';
export * from './rbac';
export * from './query';
export * from './webhook';
export * from './ai';
export * from './platform';
export * from './platform-v9';

export const PROJECT_SCHEMA_VERSION = 7;
export { SCHEMA_VERSION, PROJECT_SCHEMA_VERSION_V8 } from './platform';
export { SCHEMA_VERSION_V9, PROJECT_SCHEMA_VERSION_V9 } from './platform-v9';

export type DesignTokenCategory = 'color' | 'spacing' | 'typography' | 'radius' | 'shadow';

export type DesignToken = {
  id: string;
  name: string;
  category: DesignTokenCategory;
  value: string | Record<string, any>;
  description?: string;
};

// Phase 4 & Phase 5: Data Collections
export type DataFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'email'
  | 'url'
  | 'image'
  | 'select'
  | 'JSON';

export type DataField = {
  id: string;
  name: string;
  type: DataFieldType;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // for 'select' field type
  // Phase 6: Advanced Data Modeling
  unique?: boolean;
  nullable?: boolean;
  computedExpression?: string;
};

export type DataRecord = {
  id: string;
  values: Record<string, any>;
};

// Phase 6: Data Relationships
export type RelationshipType = 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
export type DeleteBehavior = 'cascade' | 'set_null' | 'restrict';

export interface DataRelationship {
  id: string;
  name?: string;
  sourceCollectionId: string;
  sourceField: string;
  targetCollectionId: string;
  targetField: string;
  type: RelationshipType;
  onDelete?: DeleteBehavior;
  displayField?: string;
}

export type DataCollection = {
  id: string;
  name: string;
  fields: DataField[];
  records: DataRecord[];
  // Phase 5: Cloud & API Data Source Extensions
  dataSource?: CollectionDataSourceMode;
  tableName?: string;
  apiConnectorId?: string;
  rlsPolicy?: RlsPolicyType;
  // Phase 6: Advanced Data Modeling
  primaryKey?: string;
  relationships?: DataRelationship[];
  indexes?: string[];
  uniqueFields?: string[];
};

// Phase 4: Scoped Runtime Variables
export type VariableType = 'text' | 'number' | 'boolean' | 'object' | 'array';

export type Variable = {
  id: string;
  name: string;
  type: VariableType;
  defaultValue: any;
  scope?: 'app' | 'page' | 'local';
};

export type AppTheme = {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    foreground?: string;
    muted?: string;
    border?: string;
  };
  typography?: {
    fontFamily?: string;
  };
  radius?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
};

export type Asset = {
  id: string;
  name: string;
  type?: 'image';
  src: string;
  url?: string; // backwards compatibility
  width?: number;
  height?: number;
  alt?: string;
};

export type ComponentVariant = {
  id: string;
  name: string;
  props?: Record<string, any>;
  styles?: Partial<ComponentStyles>;
};

export type ComponentDefinition = {
  id: string;
  name: string;
  root: ComponentNode;
  variants?: ComponentVariant[];
};

export interface LocalizationConfig {
  defaultLocale: string;
  locales: string[];
  currentLocale?: string;
  supportedLocales?: Array<{ code: string; name: string; isRTL?: boolean }>;
  direction?: Record<string, 'ltr' | 'rtl'>;
  translations: Record<string, Record<string, string>>; // locale -> key -> string
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'filter' | 'summary' | 'recent_records';
  title: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  queryId?: string;
  collectionId?: string;
  config?: Record<string, any>;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  sharedFilters?: Array<{
    id: string;
    type: 'date' | 'select' | 'multi_select' | 'search';
    label: string;
    field: string;
    targetWidgetIds: string[];
  }>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  actorId?: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  status: 'SUCCESS' | 'FAILURE';
}

export type AppProject = {
  id: string;
  name: string;
  pages: AppPage[];
  theme: AppTheme;
  assets: Asset[];
  components?: ComponentDefinition[];
  tokens?: DesignToken[];
  collections?: DataCollection[];
  variables?: Variable[];
  // Phase 5: Cloud, Authentication, APIs, Environments, Deployments
  dataSources?: any[];
  apiConnectors?: ApiConnector[];
  authConfig?: AuthConfig;
  environments?: EnvironmentConfig;
  cloudConfig?: CloudConfig;
  deploymentConfig?: DeploymentConfig;
  // Phase 6: Advanced App Platform
  roles?: import('./rbac').Role[];
  permissions?: import('./rbac').Permission[];
  workflows?: import('./workflow').WorkflowDefinition[];
  webhooks?: {
    incoming: import('./webhook').IncomingWebhookConfig[];
    outgoing: import('./webhook').OutgoingWebhookConfig[];
  };
  queries?: import('./query').QueryDefinition[];
  dashboards?: DashboardConfig[];
  localization?: LocalizationConfig;
  auditLogs?: AuditLogEntry[];
  templates?: any[];
  // Phase 7: AI Application Generation & Agent Builder
  aiMetadata?: import('./ai').AIProjectMetadata;
  // Phase 8: Platform, Collaboration & Production Scale
  organizationId?: string;
  workspaceId?: string;
  branch?: string;
  projectVersion?: number;
  comments?: import('./platform').Comment[];
  branches?: import('./platform').Branch[];
  reviews?: import('./platform').Review[];
  plugins?: import('./platform').InstalledPlugin[];
  releases?: import('./platform').Release[];
  // Phase 9: Scale, Enterprise & Developer Ecosystem
  regionId?: string;
  cdnConfig?: import('./platform-v9').CDNConfig;
  featureFlags?: import('./platform-v9').FeatureFlag[];
  experiments?: import('./platform-v9').Experiment[];
  enterprisePolicies?: import('./platform-v9').OrganizationSecurityPolicy;
  version: number;
  schemaVersion?: number;
};

