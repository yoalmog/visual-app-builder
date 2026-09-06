import { z } from 'zod';

export const ComponentStylesSchema = z.object({
  display: z.string().optional(),
  flexDirection: z.enum(['row', 'column', 'row-reverse', 'column-reverse']).optional(),
  justifyContent: z.enum(['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']).optional(),
  alignItems: z.enum(['flex-start', 'center', 'flex-end', 'stretch', 'baseline']).optional(),
  alignContent: z.enum(['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'stretch']).optional(),
  flexWrap: z.enum(['nowrap', 'wrap', 'wrap-reverse']).optional(),
  gap: z.string().optional(),
  rowGap: z.string().optional(),
  columnGap: z.string().optional(),

  flexGrow: z.number().optional(),
  flexShrink: z.number().optional(),
  flexBasis: z.string().optional(),
  alignSelf: z.enum(['auto', 'flex-start', 'center', 'flex-end', 'stretch', 'baseline']).optional(),
  order: z.number().optional(),

  width: z.string().optional(),
  height: z.string().optional(),
  minWidth: z.string().optional(),
  maxWidth: z.string().optional(),
  minHeight: z.string().optional(),
  maxHeight: z.string().optional(),

  padding: z.string().optional(),
  paddingTop: z.string().optional(),
  paddingRight: z.string().optional(),
  paddingBottom: z.string().optional(),
  paddingLeft: z.string().optional(),

  margin: z.string().optional(),
  marginTop: z.string().optional(),
  marginRight: z.string().optional(),
  marginBottom: z.string().optional(),
  marginLeft: z.string().optional(),

  backgroundColor: z.string().optional(),
  color: z.string().optional(),

  border: z.string().optional(),
  borderWidth: z.string().optional(),
  borderColor: z.string().optional(),
  borderStyle: z.enum(['solid', 'dashed', 'dotted', 'none']).optional(),
  borderRadius: z.string().optional(),
  borderTopLeftRadius: z.string().optional(),
  borderTopRightRadius: z.string().optional(),
  borderBottomRightRadius: z.string().optional(),
  borderBottomLeftRadius: z.string().optional(),

  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  lineHeight: z.union([z.string(), z.number()]).optional(),
  letterSpacing: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through']).optional(),

  opacity: z.number().optional(),
  boxShadow: z.string().optional(),
  shadowPreset: z.enum(['none', 'subtle', 'medium', 'strong', 'custom']).optional(),
  objectFit: z.enum(['cover', 'contain', 'fill', 'none']).optional(),
  cursor: z.string().optional(),

  position: z.enum(['static', 'relative', 'absolute', 'sticky']).optional(),
  top: z.string().optional(),
  right: z.string().optional(),
  bottom: z.string().optional(),
  left: z.string().optional(),
  zIndex: z.number().optional(),

  visibility: z.enum(['visible', 'hidden']).optional(),
}).passthrough();

export const ResponsiveStylesSchema = z.object({
  desktop: ComponentStylesSchema.partial().optional(),
  tablet: ComponentStylesSchema.partial().optional(),
  mobile: ComponentStylesSchema.partial().optional(),
});

export const ComponentStatesSchema = z.object({
  hover: ComponentStylesSchema.partial().optional(),
  focus: ComponentStylesSchema.partial().optional(),
  active: ComponentStylesSchema.partial().optional(),
  disabled: ComponentStylesSchema.partial().optional(),
});

export const ComponentActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('navigate'), targetPageId: z.string().optional(), pageId: z.string().optional() }),
  z.object({ type: z.literal('open_url'), url: z.string(), target: z.enum(['_self', '_blank']).optional() }),
  z.object({ type: z.literal('show_element'), targetNodeId: z.string() }),
  z.object({ type: z.literal('hide_element'), targetNodeId: z.string() }),
  z.object({ type: z.literal('toggle_element'), targetNodeId: z.string() }),
  z.object({ type: z.literal('scroll_to'), targetNodeId: z.string() }),
]);

export const ComponentInteractionSchema = z.object({
  id: z.string(),
  event: z.enum(['click', 'double_click', 'double-click', 'hover']),
  actions: z.array(ComponentActionSchema),
});

// Phase 4: Dynamic Data Bindings
export const ComponentBindingSchema = z.object({
  property: z.string(),
  type: z.enum(['expression', 'variable', 'field']),
  expression: z.string(),
});

// Phase 4: Conditions & Logic Rules
export const ConditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'greater_than',
  'less_than',
  'greater_equal',
  'less_equal',
  'is_empty',
  'is_not_empty',
  'is_true',
  'is_false',
]);

export const ConditionSchema = z.object({
  id: z.string(),
  left: z.string(),
  operator: ConditionOperatorSchema,
  right: z.any().optional(),
});

export const ConditionGroupSchema = z.object({
  type: z.enum(['all', 'any']),
  conditions: z.array(ConditionSchema),
});

export const ActionDefinitionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
      'set_variable',
      'navigate',
      'open_url',
      'show_element',
      'hide_element',
      'toggle_element',
      'create_record',
      'update_record',
      'delete_record',
      'submit_form',
      'reset_form',
      'delay',
      // Phase 5 Actions
      'call_api',
      'create_cloud_record',
      'update_cloud_record',
      'delete_cloud_record',
      'refresh_data_source',
      'auth_login',
      'auth_signup',
      'auth_logout',
      'upload_file',
    ]),
    variableName: z.string().optional(),
    valueExpression: z.any().optional(),
    targetPageId: z.string().optional(),
    pageId: z.string().optional(),
    url: z.string().optional(),
    target: z.enum(['_self', '_blank']).optional(),
    targetNodeId: z.string().optional(),
    collectionId: z.string().optional(),
    recordId: z.string().optional(),
    recordValues: z.record(z.string(), z.any()).optional(),
    formNodeId: z.string().optional(),
    delayMs: z.number().optional(),
    abortOnError: z.boolean().optional(),
    // Phase 5 Action Properties
    connectorId: z.string().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
    path: z.string().optional(),
    requestHeaders: z.record(z.string(), z.string()).optional(),
    requestBody: z.any().optional(),
    onSuccess: z.array(z.lazy(() => ActionDefinitionSchema)).optional(),
    onError: z.array(z.lazy(() => ActionDefinitionSchema)).optional(),
    email: z.string().optional(),
    password: z.string().optional(),
    targetVariable: z.string().optional(),
  })
);

export const LogicRuleSchema = z.object({
  id: z.string(),
  event: z.enum(['click', 'submit', 'change', 'page_load', 'page_enter', 'login', 'signup', 'logout', 'auth_state_change']),
  conditionGroup: ConditionGroupSchema.optional(),
  actions: z.array(ActionDefinitionSchema),
});

export const ConditionalVisibilitySchema = z.object({
  expression: z.string(),
});

export const ComponentNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
      'container',
      'text',
      'button',
      'image',
      'input',
      'row',
      'column',
      'stack',
      'divider',
      'textarea',
      'heading',
      'paragraph',
      'link',
      'icon',
      'spacer',
      'repeater',
      // Phase 6
      'grid',
      'split_pane',
      'sidebar',
      'sticky_container',
      'scroll_container',
      'aspect_ratio_container',
      'header',
      'footer',
      'section',
      'select',
      'multi_select',
      'checkbox',
      'checkbox_group',
      'radio_group',
      'switch',
      'slider',
      'range_slider',
      'date_picker',
      'time_picker',
      'datetime_picker',
      'file_upload',
      'combobox',
      'rich_text',
      'number_input',
      'currency_input',
      'navbar',
      'sidebar_nav',
      'tabs',
      'accordion',
      'dropdown',
      'breadcrumbs',
      'stepper',
      'pagination',
      'menu',
      'command_menu',
      'modal',
      'dialog',
      'drawer',
      'popover',
      'tooltip',
      'toast',
      'alert',
      'notification',
      'data_table',
      'card',
      'card_grid',
      'tree',
      'list',
      'timeline',
      'badge',
      'avatar',
      'status',
      'progress',
      'statistic_kpi',
      'empty_state',
      'skeleton',
      'chart',
      'map',
      'reusable_instance',
    ]),
    name: z.string(),
    props: z.record(z.string(), z.any()),
    styles: ComponentStylesSchema,
    responsiveStyles: ResponsiveStylesSchema.optional(),
    children: z.array(ComponentNodeSchema),
    parentId: z.string().optional(),
    componentInstanceId: z.string().optional(),
    variantId: z.string().optional(),
    locked: z.boolean().optional(),
    states: ComponentStatesSchema.optional(),
    interactions: z.array(ComponentInteractionSchema).optional(),
    tokenReferences: z.record(z.string(), z.string()).optional(),
    bindings: z.record(z.string(), ComponentBindingSchema).optional(),
    logicRules: z.array(LogicRuleSchema).optional(),
    conditionalVisibility: ConditionalVisibilitySchema.optional(),
    requiredRoles: z.array(z.string()).optional(),
    requiredPermissions: z.array(z.string()).optional(),
    authExpression: z.string().optional(),
    unauthorizedBehavior: z.enum(['hide', 'disable', 'access_denied']).optional(),
    ariaLabel: z.string().optional(),
    roleAttribute: z.string().optional(),
  })
);

export const AppPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  root: ComponentNodeSchema,
  authProtection: z.object({
    requireAuth: z.boolean(),
    allowedRoles: z.array(z.string()).optional(),
    redirectTo: z.string().optional(),
  }).optional(),
});

export const AppThemeSchema = z.object({
  primaryColor: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  borderRadius: z.string(),
  colors: z.record(z.string(), z.string()).optional(),
  typography: z.object({ fontFamily: z.string().optional() }).optional(),
  radius: z.object({
    sm: z.number().optional(),
    md: z.number().optional(),
    lg: z.number().optional(),
  }).optional(),
}).passthrough();

export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('image').optional(),
  src: z.string().optional(),
  url: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  alt: z.string().optional(),
});

export const ComponentVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  props: z.record(z.string(), z.any()).optional(),
  styles: ComponentStylesSchema.partial().optional(),
});

export const ComponentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  root: ComponentNodeSchema,
  variants: z.array(ComponentVariantSchema).optional(),
});

export const DesignTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['color', 'spacing', 'typography', 'radius', 'shadow']),
  value: z.union([z.string(), z.record(z.string(), z.any())]),
  description: z.string().optional(),
});

// Phase 4 & Phase 6: Data Collections & Variables Schemas
export const DataFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'boolean', 'date', 'email', 'url', 'image', 'select', 'JSON']),
  required: z.boolean(),
  defaultValue: z.any().optional(),
  options: z.array(z.string()).optional(),
  unique: z.boolean().optional(),
  nullable: z.boolean().optional(),
  computedExpression: z.string().optional(),
});

export const DataRecordSchema = z.object({
  id: z.string(),
  values: z.record(z.string(), z.any()),
});

export const DataRelationshipSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  sourceCollectionId: z.string(),
  sourceField: z.string(),
  targetCollectionId: z.string(),
  targetField: z.string(),
  type: z.enum(['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many']),
  onDelete: z.enum(['cascade', 'set_null', 'restrict']).optional(),
  displayField: z.string().optional(),
});

export const DataCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(DataFieldSchema),
  records: z.array(DataRecordSchema),
  dataSource: z.enum(['local', 'cloud', 'api']).optional(),
  tableName: z.string().optional(),
  apiConnectorId: z.string().optional(),
  rlsPolicy: z.enum([
    'public',
    'authenticated',
    'user_owned',
    'admin',
    'public_read',
    'authenticated_read',
    'user_isolated',
    'admin_only',
  ]).optional(),
  primaryKey: z.string().optional(),
  relationships: z.array(DataRelationshipSchema).optional(),
  indexes: z.array(z.string()).optional(),
  uniqueFields: z.array(z.string()).optional(),
});

export const VariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'boolean', 'object', 'array']),
  defaultValue: z.any(),
  scope: z.enum(['app', 'page', 'local']).optional(),
});

export const AppProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  pages: z.array(AppPageSchema),
  theme: AppThemeSchema,
  assets: z.array(AssetSchema),
  components: z.array(ComponentDefinitionSchema).optional(),
  tokens: z.array(DesignTokenSchema).optional(),
  collections: z.array(DataCollectionSchema).optional(),
  variables: z.array(VariableSchema).optional(),
  // Phase 5 additions
  dataSources: z.array(z.any()).optional(),
  apiConnectors: z.array(z.any()).optional(),
  authConfig: z.any().optional(),
  environments: z.any().optional(),
  cloudConfig: z.any().optional(),
  deploymentConfig: z.any().optional(),
  // Phase 6 additions
  roles: z.array(z.any()).optional(),
  permissions: z.array(z.any()).optional(),
  workflows: z.array(z.any()).optional(),
  webhooks: z.any().optional(),
  queries: z.array(z.any()).optional(),
  dashboards: z.array(z.any()).optional(),
  localization: z.any().optional(),
  auditLogs: z.array(z.any()).optional(),
  templates: z.array(z.any()).optional(),
  // Phase 7: AI Application Generation & Agent Builder
  aiMetadata: z.any().optional(),
  // Phase 8: Platform, Collaboration & Production Scale
  organizationId: z.string().optional(),
  workspaceId: z.string().optional(),
  branch: z.string().optional(),
  projectVersion: z.number().optional(),
  comments: z.array(z.any()).optional(),
  branches: z.array(z.any()).optional(),
  reviews: z.array(z.any()).optional(),
  plugins: z.array(z.any()).optional(),
  releases: z.array(z.any()).optional(),
  version: z.number(),
});


