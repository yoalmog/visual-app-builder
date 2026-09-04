export type ViewportMode = 'desktop' | 'tablet' | 'mobile' | 'custom';
export type EditorMode = 'design' | 'data' | 'logic' | 'code';

export interface StyleProperties {
  // Layout
  display?: string;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: string;
  gridTemplateColumns?: string;
  gridGap?: string;

  // Sizing & Position
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  zIndex?: number;

  // Spacing
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;

  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  textDecoration?: string;
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';

  // Appearance
  backgroundColor?: string;
  opacity?: number;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderTopWidth?: string;
  borderTopColor?: string;
  borderRadius?: string;
  boxShadow?: string;

  // Effects
  backdropFilter?: string;
  filter?: string;
  transition?: string;
  cursor?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' | string;
}

export interface ResponsiveStyles {
  desktop?: Partial<StyleProperties>;
  tablet?: Partial<StyleProperties>;
  mobile?: Partial<StyleProperties>;
}

export interface ComponentEvent {
  id: string;
  trigger: 'click' | 'submit' | 'change' | 'hover';
  actionType: 'navigate' | 'toast' | 'set-variable' | 'api-request' | 'workflow';
  payload?: any;
  workflowId?: string;
}

export interface ComponentNode {
  id: string;
  type: string;
  name: string;
  props: Record<string, any>;
  styles: StyleProperties;
  responsive?: ResponsiveStyles;
  children: string[];
  parentId: string | null;
  events?: ComponentEvent[];
  isLocked?: boolean;
  isHidden?: boolean;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  rootNodeId: string;
  isHome?: boolean;
  meta?: {
    title?: string;
    description?: string;
  };
}

export interface CollectionField {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'number' | 'image' | 'boolean' | 'date' | 'badge';
}

export interface Collection {
  id: string;
  name: string;
  key: string;
  fields: CollectionField[];
  records: Array<Record<string, any>>;
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  responseField?: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'toast' | 'navigate' | 'variable' | 'api';
  label: string;
  config: Record<string, any>;
  x?: number;
  y?: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  triggerEvent: string;
  nodes: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'icon' | 'video';
  size?: string;
}

export interface ThemeTokens {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  fontFamily: string;
  borderRadius: string;
}

export interface ProjectSettings {
  title: string;
  description: string;
  favicon?: string;
  customCss?: string;
  authEnabled?: boolean;
  publishedUrl?: string;
  isPublished?: boolean;
}

export interface AppProject {
  id: string;
  name: string;
  version: string;
  activePageId: string;
  pages: Page[];
  nodes: Record<string, ComponentNode>;
  collections: Collection[];
  dataSources: DataSource[];
  workflows: Workflow[];
  assets: Asset[];
  theme: ThemeTokens;
  variables: Record<string, any>;
  settings: ProjectSettings;
}

export interface HistorySnapshot {
  nodes: Record<string, ComponentNode>;
  pages: Page[];
  activePageId: string;
  selectedNodeId: string | null;
}
