import { ComponentType } from '../schema/component';

export type InspectorSectionName =
  | 'Content'
  | 'Layout'
  | 'Flex Child'
  | 'Spacing'
  | 'Typography'
  | 'Appearance'
  | 'Border'
  | 'Effects'
  | 'Position'
  | 'Responsive';

export interface PropertyFieldDef {
  key: string; // e.g. 'props.text', 'styles.fontSize'
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'slider';
  options?: string[];
  placeholder?: string;
  section: InspectorSectionName;
  min?: number;
  max?: number;
  step?: number;
}

// Common field presets to compose definitions
const commonSpacingFields: PropertyFieldDef[] = [
  { key: 'styles.padding', label: 'Padding (All)', type: 'text', section: 'Spacing', placeholder: '16px' },
  { key: 'styles.paddingTop', label: 'Padding Top', type: 'text', section: 'Spacing', placeholder: '0px' },
  { key: 'styles.paddingRight', label: 'Padding Right', type: 'text', section: 'Spacing', placeholder: '0px' },
  { key: 'styles.paddingBottom', label: 'Padding Bottom', type: 'text', section: 'Spacing', placeholder: '0px' },
  { key: 'styles.paddingLeft', label: 'Padding Left', type: 'text', section: 'Spacing', placeholder: '0px' },
  { key: 'styles.margin', label: 'Margin (All)', type: 'text', section: 'Spacing', placeholder: '0px' },
  { key: 'styles.marginTop', label: 'Margin Top', type: 'text', section: 'Spacing', placeholder: '0px' },
  { key: 'styles.marginRight', label: 'Margin Right', type: 'text', section: 'Spacing', placeholder: '0px' },
  { key: 'styles.marginBottom', label: 'Margin Bottom', type: 'text', section: 'Spacing', placeholder: '0px' },
  { key: 'styles.marginLeft', label: 'Margin Left', type: 'text', section: 'Spacing', placeholder: '0px' },
];

const commonBorderFields: PropertyFieldDef[] = [
  { key: 'styles.border', label: 'Border', type: 'text', section: 'Border', placeholder: '1px solid #CBD5E1' },
  { key: 'styles.borderWidth', label: 'Border Width', type: 'text', section: 'Border', placeholder: '1px' },
  { key: 'styles.borderStyle', label: 'Border Style', type: 'select', options: ['solid', 'dashed', 'dotted', 'none'], section: 'Border' },
  { key: 'styles.borderColor', label: 'Border Color', type: 'color', section: 'Border' },
  { key: 'styles.borderRadius', label: 'Radius (All)', type: 'text', section: 'Border', placeholder: '8px' },
  { key: 'styles.borderTopLeftRadius', label: 'Radius Top-Left', type: 'text', section: 'Border', placeholder: '8px' },
  { key: 'styles.borderTopRightRadius', label: 'Radius Top-Right', type: 'text', section: 'Border', placeholder: '8px' },
  { key: 'styles.borderBottomRightRadius', label: 'Radius Bottom-Right', type: 'text', section: 'Border', placeholder: '8px' },
  { key: 'styles.borderBottomLeftRadius', label: 'Radius Bottom-Left', type: 'text', section: 'Border', placeholder: '8px' },
];

const commonFlexChildFields: PropertyFieldDef[] = [
  { key: 'styles.flexGrow', label: 'Flex Grow', type: 'number', section: 'Flex Child', min: 0, max: 10, step: 1 },
  { key: 'styles.flexShrink', label: 'Flex Shrink', type: 'number', section: 'Flex Child', min: 0, max: 10, step: 1 },
  { key: 'styles.flexBasis', label: 'Flex Basis', type: 'text', section: 'Flex Child', placeholder: 'auto' },
  { key: 'styles.alignSelf', label: 'Align Self', type: 'select', options: ['auto', 'flex-start', 'center', 'flex-end', 'stretch', 'baseline'], section: 'Flex Child' },
  { key: 'styles.order', label: 'Order', type: 'number', section: 'Flex Child', step: 1 },
];

const commonEffectsFields: PropertyFieldDef[] = [
  { key: 'styles.opacity', label: 'Opacity (0 - 1)', type: 'slider', min: 0, max: 1, step: 0.05, section: 'Effects' },
  { key: 'styles.shadowPreset', label: 'Shadow Preset', type: 'select', options: ['none', 'subtle', 'medium', 'strong', 'custom'], section: 'Effects' },
  { key: 'styles.boxShadow', label: 'Custom Box Shadow', type: 'text', section: 'Effects', placeholder: '0 4px 6px -1px rgba(0,0,0,0.1)' },
];

const commonPositionFields: PropertyFieldDef[] = [
  { key: 'styles.position', label: 'Position', type: 'select', options: ['static', 'relative', 'absolute', 'sticky'], section: 'Position' },
  { key: 'styles.top', label: 'Top', type: 'text', section: 'Position', placeholder: '0px' },
  { key: 'styles.right', label: 'Right', type: 'text', section: 'Position', placeholder: '0px' },
  { key: 'styles.bottom', label: 'Bottom', type: 'text', section: 'Position', placeholder: '0px' },
  { key: 'styles.left', label: 'Left', type: 'text', section: 'Position', placeholder: '0px' },
  { key: 'styles.zIndex', label: 'Z-Index', type: 'number', section: 'Position', step: 1 },
];

const commonResponsiveFields: PropertyFieldDef[] = [
  { key: 'styles.visibility', label: 'Visibility', type: 'select', options: ['visible', 'hidden'], section: 'Responsive' },
];

const commonTypographyFields: PropertyFieldDef[] = [
  { key: 'styles.fontFamily', label: 'Font Family', type: 'select', options: ['Inter, sans-serif', 'Roboto, sans-serif', 'Outfit, sans-serif', 'monospace'], section: 'Typography' },
  { key: 'styles.fontSize', label: 'Font Size', type: 'text', section: 'Typography', placeholder: '16px' },
  { key: 'styles.fontWeight', label: 'Font Weight', type: 'select', options: ['300', '400', '500', '600', '700', '800'], section: 'Typography' },
  { key: 'styles.lineHeight', label: 'Line Height', type: 'text', section: 'Typography', placeholder: '1.5' },
  { key: 'styles.letterSpacing', label: 'Letter Spacing', type: 'text', section: 'Typography', placeholder: '0px' },
  { key: 'styles.textAlign', label: 'Text Align', type: 'select', options: ['left', 'center', 'right', 'justify'], section: 'Typography' },
  { key: 'styles.textTransform', label: 'Transform', type: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'], section: 'Typography' },
  { key: 'styles.textDecoration', label: 'Decoration', type: 'select', options: ['none', 'underline', 'line-through'], section: 'Typography' },
  { key: 'styles.color', label: 'Text Color', type: 'color', section: 'Typography' },
];

export const INSPECTOR_DEFINITIONS: Record<ComponentType, PropertyFieldDef[]> = {
  container: [
    { key: 'styles.display', label: 'Display', type: 'select', options: ['flex', 'block'], section: 'Layout' },
    { key: 'styles.flexDirection', label: 'Direction', type: 'select', options: ['column', 'row', 'column-reverse', 'row-reverse'], section: 'Layout' },
    { key: 'styles.justifyContent', label: 'Justify Content', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'], section: 'Layout' },
    { key: 'styles.alignItems', label: 'Align Items', type: 'select', options: ['stretch', 'center', 'flex-start', 'flex-end', 'baseline'], section: 'Layout' },
    { key: 'styles.flexWrap', label: 'Wrap', type: 'select', options: ['nowrap', 'wrap', 'wrap-reverse'], section: 'Layout' },
    { key: 'styles.gap', label: 'Gap', type: 'text', section: 'Layout', placeholder: '16px' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    { key: 'styles.minWidth', label: 'Min Width', type: 'text', section: 'Layout', placeholder: '0px' },
    { key: 'styles.maxWidth', label: 'Max Width', type: 'text', section: 'Layout', placeholder: 'none' },
    { key: 'styles.height', label: 'Height', type: 'text', section: 'Layout', placeholder: 'auto' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '100px' },
    { key: 'styles.maxHeight', label: 'Max Height', type: 'text', section: 'Layout', placeholder: 'none' },
    ...commonFlexChildFields,
    ...commonSpacingFields,
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonBorderFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  row: [
    { key: 'styles.flexDirection', label: 'Direction', type: 'select', options: ['row', 'column', 'row-reverse', 'column-reverse'], section: 'Layout' },
    { key: 'styles.justifyContent', label: 'Justify Content', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'], section: 'Layout' },
    { key: 'styles.alignItems', label: 'Align Items', type: 'select', options: ['center', 'flex-start', 'flex-end', 'stretch', 'baseline'], section: 'Layout' },
    { key: 'styles.flexWrap', label: 'Wrap', type: 'select', options: ['nowrap', 'wrap', 'wrap-reverse'], section: 'Layout' },
    { key: 'styles.gap', label: 'Gap', type: 'text', section: 'Layout', placeholder: '16px' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    { key: 'styles.height', label: 'Height', type: 'text', section: 'Layout', placeholder: 'auto' },
    ...commonFlexChildFields,
    ...commonSpacingFields,
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonBorderFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  column: [
    { key: 'styles.flexDirection', label: 'Direction', type: 'select', options: ['column', 'row', 'column-reverse', 'row-reverse'], section: 'Layout' },
    { key: 'styles.justifyContent', label: 'Justify Content', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'], section: 'Layout' },
    { key: 'styles.alignItems', label: 'Align Items', type: 'select', options: ['stretch', 'flex-start', 'center', 'flex-end'], section: 'Layout' },
    { key: 'styles.flexWrap', label: 'Wrap', type: 'select', options: ['nowrap', 'wrap'], section: 'Layout' },
    { key: 'styles.gap', label: 'Gap', type: 'text', section: 'Layout', placeholder: '16px' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonFlexChildFields,
    ...commonSpacingFields,
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonBorderFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  stack: [
    { key: 'styles.flexDirection', label: 'Direction', type: 'select', options: ['column', 'row'], section: 'Layout' },
    { key: 'styles.gap', label: 'Gap', type: 'text', section: 'Layout', placeholder: '8px' },
    { key: 'styles.alignItems', label: 'Align Items', type: 'select', options: ['stretch', 'center', 'flex-start', 'flex-end'], section: 'Layout' },
    { key: 'styles.justifyContent', label: 'Justify Content', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between'], section: 'Layout' },
    ...commonFlexChildFields,
    ...commonSpacingFields,
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  spacer: [
    { key: 'styles.height', label: 'Height', type: 'text', section: 'Layout', placeholder: '32px' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonFlexChildFields,
    ...commonResponsiveFields,
  ],

  divider: [
    { key: 'styles.height', label: 'Thickness', type: 'text', section: 'Appearance', placeholder: '1px' },
    { key: 'styles.backgroundColor', label: 'Line Color', type: 'color', section: 'Appearance' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],

  text: [
    { key: 'props.text', label: 'Content', type: 'text', section: 'Content' },
    ...commonTypographyFields,
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  heading: [
    { key: 'props.text', label: 'Heading Text', type: 'text', section: 'Content' },
    { key: 'props.level', label: 'Heading Level', type: 'select', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], section: 'Content' },
    ...commonTypographyFields,
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  paragraph: [
    { key: 'props.text', label: 'Paragraph Content', type: 'text', section: 'Content' },
    ...commonTypographyFields,
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  button: [
    { key: 'props.text', label: 'Button Text', type: 'text', section: 'Content' },
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonTypographyFields,
    ...commonBorderFields,
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  link: [
    { key: 'props.text', label: 'Link Text', type: 'text', section: 'Content' },
    { key: 'props.href', label: 'Destination URL', type: 'text', section: 'Content', placeholder: 'https://...' },
    { key: 'props.targetPageId', label: 'Target Page ID', type: 'text', section: 'Content', placeholder: 'page_...' },
    ...commonTypographyFields,
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],

  image: [
    { key: 'props.src', label: 'Image URL', type: 'text', section: 'Content' },
    { key: 'props.alt', label: 'Alt Text', type: 'text', section: 'Content' },
    { key: 'props.assetId', label: 'Asset Reference ID', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '300px' },
    { key: 'styles.height', label: 'Height', type: 'text', section: 'Layout', placeholder: '200px' },
    { key: 'styles.minWidth', label: 'Min Width', type: 'text', section: 'Layout', placeholder: '50px' },
    { key: 'styles.maxWidth', label: 'Max Width', type: 'text', section: 'Layout', placeholder: 'none' },
    { key: 'styles.objectFit', label: 'Object Fit', type: 'select', options: ['cover', 'contain', 'fill', 'none'], section: 'Appearance' },
    ...commonBorderFields,
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  icon: [
    { key: 'props.iconName', label: 'Icon Name', type: 'select', options: ['Star', 'Heart', 'ArrowRight', 'Check', 'AlertCircle', 'Sparkles', 'Layers', 'Box'], section: 'Content' },
    { key: 'styles.color', label: 'Icon Color', type: 'color', section: 'Appearance' },
    { key: 'styles.width', label: 'Size (Width)', type: 'text', section: 'Layout', placeholder: '24px' },
    { key: 'styles.height', label: 'Size (Height)', type: 'text', section: 'Layout', placeholder: '24px' },
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],

  input: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonTypographyFields,
    ...commonBorderFields,
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],

  textarea: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '80px' },
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonTypographyFields,
    ...commonBorderFields,
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],

  repeater: [
    { key: 'props.collectionId', label: 'Collection ID', type: 'text', section: 'Content', placeholder: 'e.g. users' },
    { key: 'props.itemVariable', label: 'Item Variable Name', type: 'text', section: 'Content', placeholder: 'item' },
    { key: 'props.emptyText', label: 'Empty State Text', type: 'text', section: 'Content', placeholder: 'No records found' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    { key: 'styles.gap', label: 'Gap', type: 'text', section: 'Layout', placeholder: '12px' },
    ...commonFlexChildFields,
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonEffectsFields,
    ...commonPositionFields,
    ...commonResponsiveFields,
  ],

  // ─── Phase 6: Layout Components ───────────────────────────────────────────────
  grid: [
    { key: 'props.columns', label: 'Columns Count', type: 'number', section: 'Layout', min: 1, max: 12, step: 1 },
    { key: 'styles.gap', label: 'Gap', type: 'text', section: 'Layout', placeholder: '16px' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonEffectsFields,
    ...commonResponsiveFields,
  ],
  split_pane: [
    { key: 'props.orientation', label: 'Orientation', type: 'select', options: ['horizontal', 'vertical'], section: 'Layout' },
    { key: 'props.split', label: 'Split Percentage', type: 'text', section: 'Layout', placeholder: '50%' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  sidebar: [
    { key: 'props.width', label: 'Sidebar Width', type: 'text', section: 'Layout', placeholder: '260px' },
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  sticky_container: [
    { key: 'styles.top', label: 'Top Offset', type: 'text', section: 'Position', placeholder: '0px' },
    { key: 'styles.zIndex', label: 'Z-Index', type: 'number', section: 'Position', step: 1 },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  scroll_container: [
    { key: 'styles.maxHeight', label: 'Max Height', type: 'text', section: 'Layout', placeholder: '400px' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  aspect_ratio_container: [
    { key: 'props.ratio', label: 'Aspect Ratio', type: 'text', section: 'Layout', placeholder: '16/9' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  header: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  footer: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  section: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],

  // ─── Phase 6: Form Components ─────────────────────────────────────────────────
  select: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonTypographyFields,
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  multi_select: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonTypographyFields,
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  checkbox: [
    { key: 'props.label', label: 'Label', type: 'text', section: 'Content' },
    ...commonTypographyFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  checkbox_group: [
    { key: 'props.label', label: 'Group Label', type: 'text', section: 'Content' },
    ...commonTypographyFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  radio_group: [
    { key: 'props.label', label: 'Group Label', type: 'text', section: 'Content' },
    ...commonTypographyFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  switch: [
    { key: 'props.label', label: 'Label', type: 'text', section: 'Content' },
    ...commonTypographyFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  slider: [
    { key: 'props.min', label: 'Minimum', type: 'number', section: 'Content' },
    { key: 'props.max', label: 'Maximum', type: 'number', section: 'Content' },
    { key: 'props.step', label: 'Step', type: 'number', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  range_slider: [
    { key: 'props.min', label: 'Minimum', type: 'number', section: 'Content' },
    { key: 'props.max', label: 'Maximum', type: 'number', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  date_picker: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  time_picker: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  datetime_picker: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  file_upload: [
    { key: 'props.label', label: 'Upload Label', type: 'text', section: 'Content' },
    { key: 'props.accept', label: 'Accepted Formats', type: 'text', section: 'Content', placeholder: 'image/*,.pdf' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  combobox: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  rich_text: [
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '120px' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  number_input: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'props.min', label: 'Minimum', type: 'number', section: 'Content' },
    { key: 'props.max', label: 'Maximum', type: 'number', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  currency_input: [
    { key: 'props.currency', label: 'Currency Code', type: 'text', section: 'Content', placeholder: 'USD' },
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],

  // ─── Phase 6: Navigation & Menus ──────────────────────────────────────────────
  navbar: [
    { key: 'props.brandTitle', label: 'Brand Name', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    { key: 'styles.backgroundColor', label: 'Background', type: 'color', section: 'Appearance' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  sidebar_nav: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  tabs: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  accordion: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  dropdown: [
    { key: 'props.label', label: 'Button Label', type: 'text', section: 'Content' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  breadcrumbs: [
    { key: 'styles.fontSize', label: 'Font Size', type: 'text', section: 'Typography' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  stepper: [
    { key: 'props.currentStep', label: 'Current Step', type: 'number', section: 'Content', min: 1 },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  pagination: [
    { key: 'props.page', label: 'Current Page', type: 'number', section: 'Content', min: 1 },
    { key: 'props.totalPages', label: 'Total Pages', type: 'number', section: 'Content', min: 1 },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  menu: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  command_menu: [
    { key: 'props.placeholder', label: 'Placeholder', type: 'text', section: 'Content' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],

  // ─── Phase 6: Overlays ────────────────────────────────────────────────────────
  modal: [
    { key: 'props.title', label: 'Modal Title', type: 'text', section: 'Content' },
    { key: 'styles.maxWidth', label: 'Max Width', type: 'text', section: 'Layout', placeholder: '500px' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  dialog: [
    { key: 'props.title', label: 'Dialog Title', type: 'text', section: 'Content' },
    { key: 'props.message', label: 'Message', type: 'text', section: 'Content' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  drawer: [
    { key: 'props.side', label: 'Drawer Side', type: 'select', options: ['left', 'right', 'top', 'bottom'], section: 'Layout' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '320px' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  popover: [
    { key: 'props.triggerText', label: 'Trigger Text', type: 'text', section: 'Content' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  tooltip: [
    { key: 'props.content', label: 'Tooltip Hint', type: 'text', section: 'Content' },
    ...commonResponsiveFields,
  ],
  toast: [
    { key: 'props.message', label: 'Toast Message', type: 'text', section: 'Content' },
    { key: 'props.type', label: 'Type', type: 'select', options: ['info', 'success', 'warning', 'error'], section: 'Content' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  alert: [
    { key: 'props.title', label: 'Alert Title', type: 'text', section: 'Content' },
    { key: 'props.message', label: 'Message', type: 'text', section: 'Content' },
    { key: 'props.severity', label: 'Severity', type: 'select', options: ['info', 'success', 'warning', 'error'], section: 'Content' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],
  notification: [
    { key: 'props.title', label: 'Title', type: 'text', section: 'Content' },
    ...commonSpacingFields,
    ...commonBorderFields,
    ...commonResponsiveFields,
  ],

  // ─── Phase 6: Data Display & Analytics ────────────────────────────────────────
  data_table: [
    { key: 'props.collectionId', label: 'Collection ID', type: 'text', section: 'Content', placeholder: 'e.g. users' },
    { key: 'props.pageSize', label: 'Page Size', type: 'number', section: 'Content', min: 1, max: 100 },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  card: [
    { key: 'props.title', label: 'Card Title', type: 'text', section: 'Content' },
    { key: 'props.subtitle', label: 'Subtitle', type: 'text', section: 'Content' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  card_grid: [
    { key: 'props.columns', label: 'Columns', type: 'number', section: 'Layout', min: 1, max: 6 },
    { key: 'styles.gap', label: 'Gap', type: 'text', section: 'Layout', placeholder: '20px' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  tree: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  list: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  timeline: [
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  badge: [
    { key: 'props.text', label: 'Badge Text', type: 'text', section: 'Content' },
    { key: 'props.variant', label: 'Variant', type: 'select', options: ['primary', 'secondary', 'success', 'warning', 'danger'], section: 'Content' },
    ...commonTypographyFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  avatar: [
    { key: 'props.name', label: 'User Name', type: 'text', section: 'Content' },
    { key: 'props.src', label: 'Image URL', type: 'text', section: 'Content' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  status: [
    { key: 'props.label', label: 'Status Label', type: 'text', section: 'Content' },
    { key: 'props.status', label: 'Status Key', type: 'select', options: ['active', 'inactive', 'pending', 'error'], section: 'Content' },
    ...commonTypographyFields,
    ...commonResponsiveFields,
  ],
  progress: [
    { key: 'props.value', label: 'Value', type: 'number', section: 'Content', min: 0, max: 100 },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  statistic_kpi: [
    { key: 'props.title', label: 'Title', type: 'text', section: 'Content' },
    { key: 'props.value', label: 'Value', type: 'text', section: 'Content' },
    { key: 'props.change', label: 'Change Percentage', type: 'text', section: 'Content' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  empty_state: [
    { key: 'props.title', label: 'Title', type: 'text', section: 'Content' },
    { key: 'props.description', label: 'Description', type: 'text', section: 'Content' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  skeleton: [
    { key: 'styles.height', label: 'Height', type: 'text', section: 'Layout', placeholder: '20px' },
    { key: 'styles.width', label: 'Width', type: 'text', section: 'Layout', placeholder: '100%' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  chart: [
    { key: 'props.title', label: 'Chart Title', type: 'text', section: 'Content' },
    { key: 'props.chartType', label: 'Chart Type', type: 'select', options: ['line', 'bar', 'area', 'pie', 'donut', 'kpi', 'sparkline'], section: 'Content' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '300px' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  map: [
    { key: 'props.zoom', label: 'Zoom Level', type: 'number', section: 'Content', min: 1, max: 20 },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '350px' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  chart_line: [
    { key: 'props.title', label: 'Chart Title', type: 'text', section: 'Content' },
    { key: 'props.chartType', label: 'Chart Type', type: 'select', options: ['line', 'bar', 'area', 'pie', 'donut', 'kpi', 'sparkline'], section: 'Content' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '300px' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  chart_bar: [
    { key: 'props.title', label: 'Chart Title', type: 'text', section: 'Content' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '300px' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  chart_area: [
    { key: 'props.title', label: 'Chart Title', type: 'text', section: 'Content' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '300px' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  chart_pie: [
    { key: 'props.title', label: 'Chart Title', type: 'text', section: 'Content' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '300px' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  chart_donut: [
    { key: 'props.title', label: 'Chart Title', type: 'text', section: 'Content' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '300px' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  chart_sparkline: [
    { key: 'props.title', label: 'Chart Title', type: 'text', section: 'Content' },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '60px' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  map_container: [
    { key: 'props.zoom', label: 'Zoom Level', type: 'number', section: 'Content', min: 1, max: 20 },
    { key: 'styles.minHeight', label: 'Min Height', type: 'text', section: 'Layout', placeholder: '350px' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  alert_banner: [
    { key: 'props.title', label: 'Alert Title', type: 'text', section: 'Content' },
    { key: 'props.message', label: 'Alert Message', type: 'text', section: 'Content' },
    ...commonBorderFields,
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
  reusable_instance: [
    { key: 'props.componentDefinitionId', label: 'Component ID', type: 'text', section: 'Content' },
    ...commonSpacingFields,
    ...commonResponsiveFields,
  ],
};

export const COMPONENT_PROPERTY_DEFINITIONS = INSPECTOR_DEFINITIONS;


