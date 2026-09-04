export type ComponentType =
  | 'container'
  | 'text'
  | 'button'
  | 'image'
  | 'input'
  | 'row'
  | 'column'
  | 'stack'
  | 'divider'
  | 'textarea'
  | 'heading'
  | 'paragraph'
  | 'link'
  | 'icon'
  | 'spacer'
  | 'repeater'
  // Phase 6: Advanced Layout
  | 'grid'
  | 'split_pane'
  | 'sidebar'
  | 'sticky_container'
  | 'scroll_container'
  | 'aspect_ratio_container'
  | 'header'
  | 'footer'
  | 'section'
  // Phase 6: Advanced Forms
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'checkbox_group'
  | 'radio_group'
  | 'switch'
  | 'slider'
  | 'range_slider'
  | 'date_picker'
  | 'time_picker'
  | 'datetime_picker'
  | 'file_upload'
  | 'combobox'
  | 'rich_text'
  | 'number_input'
  | 'currency_input'
  // Phase 6: Navigation & Menus
  | 'navbar'
  | 'sidebar_nav'
  | 'tabs'
  | 'accordion'
  | 'dropdown'
  | 'breadcrumbs'
  | 'stepper'
  | 'pagination'
  | 'menu'
  | 'command_menu'
  // Phase 6: Overlays & Feedback
  | 'modal'
  | 'dialog'
  | 'drawer'
  | 'popover'
  | 'tooltip'
  | 'toast'
  | 'alert'
  | 'notification'
  // Phase 6: Data Display & Analytics
  | 'data_table'
  | 'card'
  | 'card_grid'
  | 'tree'
  | 'list'
  | 'timeline'
  | 'badge'
  | 'avatar'
  | 'status'
  | 'progress'
  | 'statistic_kpi'
  | 'empty_state'
  | 'skeleton'
  | 'chart'
  | 'chart_line'
  | 'chart_bar'
  | 'chart_area'
  | 'chart_pie'
  | 'chart_donut'
  | 'chart_sparkline'
  | 'map'
  | 'map_container'
  | 'alert_banner'
  | 'reusable_instance';


export type ComponentStyles = {
  // Layout (Flex container / Block)
  display?: string;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  alignContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'stretch';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: string;
  rowGap?: string;
  columnGap?: string;

  // Flex Child Controls
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  order?: number;

  // Sizing & Dimensions
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;

  // Spacing (Unified and Independent)
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;

  // Colors & Background
  backgroundColor?: string;
  color?: string;

  // Borders & Radius
  border?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: string;
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomRightRadius?: string;
  borderBottomLeftRadius?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  aspectRatio?: string;

  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through';

  // Effects & Appearance
  opacity?: number;
  boxShadow?: string;
  shadowPreset?: 'none' | 'subtle' | 'medium' | 'strong' | 'custom';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  cursor?: string;

  // Positioning
  position?: 'static' | 'relative' | 'absolute' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;

  // Visibility
  visibility?: 'visible' | 'hidden';
};

export type ResponsiveStyles = {
  large_desktop?: Partial<ComponentStyles>;
  desktop?: Partial<ComponentStyles>;
  tablet?: Partial<ComponentStyles>;
  mobile?: Partial<ComponentStyles>;
};

export type ComponentStateMode = 'default' | 'hover' | 'focus' | 'active' | 'disabled';

export type ComponentStates = {
  default?: Partial<ComponentStyles>;
  hover?: Partial<ComponentStyles>;
  focus?: Partial<ComponentStyles>;
  active?: Partial<ComponentStyles>;
  disabled?: Partial<ComponentStyles>;
};

export type ComponentAction =
  | { type: 'navigate'; targetPageId?: string; pageId?: string }
  | { type: 'open_url'; url: string; target?: '_self' | '_blank' }
  | { type: 'show_element'; targetNodeId: string }
  | { type: 'hide_element'; targetNodeId: string }
  | { type: 'toggle_element'; targetNodeId: string }
  | { type: 'scroll_to'; targetNodeId: string };

export type ComponentInteraction = {
  id: string;
  event: 'click' | 'double_click' | 'double-click' | 'hover';
  actions: ComponentAction[];
};

// Phase 4: Dynamic Data Bindings
export type ComponentBinding = {
  property: string; // e.g. 'props.text', 'props.src', 'props.disabled', 'styles.color'
  type: 'expression' | 'variable' | 'field';
  expression: string; // e.g. '{{userName}}', '{{item.name}}', '{{count + 1}}'
};

// Phase 4: Conditions & Logic Rules
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false';

export type Condition = {
  id: string;
  left: string; // variable name, expression, or field name
  operator: ConditionOperator;
  right?: any; // value or expression
};

export type ConditionGroup = {
  type: 'all' | 'any';
  conditions: Condition[];
};

export type ActionType =
  | 'set_variable'
  | 'navigate'
  | 'open_url'
  | 'show_element'
  | 'hide_element'
  | 'toggle_element'
  | 'create_record'
  | 'update_record'
  | 'delete_record'
  | 'submit_form'
  | 'reset_form'
  | 'delay'
  | 'call_api'
  | 'create_cloud_record'
  | 'update_cloud_record'
  | 'delete_cloud_record'
  | 'refresh_data_source'
  | 'auth_login'
  | 'auth_signup'
  | 'auth_logout'
  | 'upload_file';

export type ActionDefinition = {
  id?: string;
  type: ActionType;
  variableName?: string;
  valueExpression?: any;
  targetPageId?: string;
  pageId?: string;
  url?: string;
  target?: '_self' | '_blank';
  targetNodeId?: string;
  collectionId?: string;
  recordId?: string;
  recordValues?: Record<string, any>;
  formNodeId?: string;
  delayMs?: number;
  abortOnError?: boolean;
  // Phase 5: API, Cloud, Auth, Storage
  connectorId?: string;        // used by call_api
  method?: string;             // used by call_api
  path?: string;               // used by call_api
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  onSuccess?: ActionDefinition[];  // chained actions on API success
  onError?: ActionDefinition[];    // chained actions on API error
  apiConnectorId?: string;
  apiParameters?: Record<string, any>;
  apiBody?: any;
  onSuccessActions?: ActionDefinition[];
  onErrorActions?: ActionDefinition[];
  retryCount?: number;
  optimistic?: boolean;
  email?: string;              // used by auth_login / auth_signup
  password?: string;           // used by auth_login
  authEmail?: string;
  authPassword?: string;
  authName?: string;
  targetVariable?: string;     // used by upload_file
  storagePath?: string;
  isPublicAsset?: boolean;
};

export type LogicRuleEvent =
  | 'click'
  | 'submit'
  | 'change'
  | 'page_load'
  | 'page_enter'
  | 'login'
  | 'signup'
  | 'logout'
  | 'auth_state_change';

export type LogicRule = {
  id: string;
  event: LogicRuleEvent;
  conditionGroup?: ConditionGroup;
  actions: ActionDefinition[];
};

export type ConditionalVisibility = {
  expression: string; // e.g. '{{isLoggedIn}}'
};

export type ComponentNode = {
  id: string;
  type: ComponentType;
  name: string;
  props: Record<string, any>;
  styles: ComponentStyles;
  responsiveStyles?: ResponsiveStyles;
  children: ComponentNode[];
  parentId?: string;
  componentInstanceId?: string;
  variantId?: string;
  locked?: boolean;
  states?: ComponentStates;
  interactions?: ComponentInteraction[];
  tokenReferences?: Record<string, string>; // e.g. { 'styles.backgroundColor': 'token_primary' }
  bindings?: Record<string, ComponentBinding>;
  logicRules?: LogicRule[];
  conditionalVisibility?: ConditionalVisibility;
  // Phase 6: Permissions & Accessibility
  requiredRoles?: string[];
  requiredPermissions?: string[];
  authExpression?: string;
  unauthorizedBehavior?: 'hide' | 'disable' | 'access_denied';
  ariaLabel?: string;
  roleAttribute?: string;
};

