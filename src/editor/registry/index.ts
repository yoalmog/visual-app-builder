import { StyleProperties } from '@/types/schema';

export interface PropertyField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean' | 'color' | 'icon';
  options?: string[];
  category: 'Content' | 'Layout' | 'Appearance' | 'Data';
  placeholder?: string;
}

export interface ComponentDefinition {
  type: string;
  label: string;
  category: 'Layout' | 'Typography' | 'Buttons' | 'Media' | 'Forms' | 'Navigation' | 'Data' | 'Feedback' | 'Advanced';
  icon: string;
  isContainer: boolean;
  defaultProps: Record<string, any>;
  defaultStyles: StyleProperties;
  propertySchema: PropertyField[];
}

export const COMPONENT_REGISTRY: Record<string, ComponentDefinition> = {
  // Layout
  container: {
    type: 'container',
    label: 'Container',
    category: 'Layout',
    icon: 'Box',
    isContainer: true,
    defaultProps: {},
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '24px',
      paddingBottom: '24px',
      paddingLeft: '24px',
      paddingRight: '24px',
      gap: '16px',
      width: '100%',
      backgroundColor: 'transparent',
    },
    propertySchema: [
      { key: 'direction', label: 'Direction', type: 'select', options: ['column', 'row'], category: 'Layout' },
    ],
  },
  section: {
    type: 'section',
    label: 'Section',
    category: 'Layout',
    icon: 'LayoutGrid',
    isContainer: true,
    defaultProps: {},
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '48px',
      paddingBottom: '48px',
      paddingLeft: '32px',
      paddingRight: '32px',
      gap: '24px',
      width: '100%',
      backgroundColor: '#0F1117',
      borderRadius: '16px',
      borderWidth: '1px',
      borderColor: '#1E2230',
    },
    propertySchema: [],
  },
  row: {
    type: 'row',
    label: 'Row / Flex',
    category: 'Layout',
    icon: 'Columns',
    isContainer: true,
    defaultProps: {},
    defaultStyles: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      width: '100%',
      flexWrap: 'wrap',
    },
    propertySchema: [
      { key: 'justify', label: 'Justify', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between'], category: 'Layout' },
      { key: 'align', label: 'Align', type: 'select', options: ['flex-start', 'center', 'flex-end', 'stretch'], category: 'Layout' },
    ],
  },
  column: {
    type: 'column',
    label: 'Column',
    category: 'Layout',
    icon: 'Rows',
    isContainer: true,
    defaultProps: {},
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
    },
    propertySchema: [],
  },
  grid: {
    type: 'grid',
    label: 'Grid (2-Col)',
    category: 'Layout',
    icon: 'Grid3X3',
    isContainer: true,
    defaultProps: { columns: 'repeat(2, minmax(0, 1fr))' },
    defaultStyles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gridGap: '20px',
      width: '100%',
    },
    propertySchema: [
      { key: 'columns', label: 'Grid Columns', type: 'text', category: 'Layout', placeholder: 'repeat(3, minmax(0, 1fr))' },
    ],
  },
  spacer: {
    type: 'spacer',
    label: 'Spacer',
    category: 'Layout',
    icon: 'MoveVertical',
    isContainer: false,
    defaultProps: {},
    defaultStyles: {
      height: '32px',
      width: '100%',
    },
    propertySchema: [],
  },
  divider: {
    type: 'divider',
    label: 'Divider',
    category: 'Layout',
    icon: 'Minus',
    isContainer: false,
    defaultProps: {},
    defaultStyles: {
      height: '1px',
      width: '100%',
      backgroundColor: '#1E2230',
      marginTop: '16px',
      marginBottom: '16px',
    },
    propertySchema: [],
  },

  // Typography
  heading: {
    type: 'heading',
    label: 'Heading',
    category: 'Typography',
    icon: 'Heading',
    isContainer: false,
    defaultProps: {
      text: 'Build Exceptional Apps',
      level: 'h1',
    },
    defaultStyles: {
      fontSize: '36px',
      fontWeight: '700',
      color: '#FFFFFF',
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
    },
    propertySchema: [
      { key: 'text', label: 'Heading Text', type: 'text', category: 'Content' },
      { key: 'level', label: 'Tag Level', type: 'select', options: ['h1', 'h2', 'h3', 'h4'], category: 'Content' },
    ],
  },
  text: {
    type: 'text',
    label: 'Paragraph',
    category: 'Typography',
    icon: 'Type',
    isContainer: false,
    defaultProps: {
      text: 'Experience the next generation of visual application development with real data and workflows.',
    },
    defaultStyles: {
      fontSize: '16px',
      fontWeight: '400',
      color: '#94A3B8',
      lineHeight: '1.6',
    },
    propertySchema: [
      { key: 'text', label: 'Text Content', type: 'textarea', category: 'Content' },
    ],
  },
  badge: {
    type: 'badge',
    label: 'Badge / Tag',
    category: 'Typography',
    icon: 'Tag',
    isContainer: false,
    defaultProps: {
      text: 'NEW FEATURE',
    },
    defaultStyles: {
      display: 'inline-flex',
      fontSize: '12px',
      fontWeight: '600',
      color: '#818CF8',
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      paddingTop: '4px',
      paddingBottom: '4px',
      paddingLeft: '12px',
      paddingRight: '12px',
      borderRadius: '9999px',
      borderWidth: '1px',
      borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    propertySchema: [
      { key: 'text', label: 'Badge Label', type: 'text', category: 'Content' },
    ],
  },

  // Buttons
  button: {
    type: 'button',
    label: 'Button',
    category: 'Buttons',
    icon: 'MousePointerClick',
    isContainer: false,
    defaultProps: {
      text: 'Get Started',
      variant: 'primary',
      icon: 'ArrowRight',
    },
    defaultStyles: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      paddingTop: '12px',
      paddingBottom: '12px',
      paddingLeft: '24px',
      paddingRight: '24px',
      backgroundColor: '#4F46E5',
      color: '#FFFFFF',
      fontSize: '15px',
      fontWeight: '600',
      borderRadius: '10px',
      borderWidth: '0px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    propertySchema: [
      { key: 'text', label: 'Button Text', type: 'text', category: 'Content' },
      { key: 'variant', label: 'Style Variant', type: 'select', options: ['primary', 'secondary', 'outline', 'destructive'], category: 'Appearance' },
      { key: 'icon', label: 'Icon', type: 'icon', category: 'Content' },
    ],
  },
  link: {
    type: 'link',
    label: 'Link',
    category: 'Buttons',
    icon: 'ExternalLink',
    isContainer: false,
    defaultProps: {
      text: 'Explore Documentation →',
      href: '#',
    },
    defaultStyles: {
      color: '#6366F1',
      fontSize: '15px',
      fontWeight: '500',
      textDecoration: 'none',
      cursor: 'pointer',
    },
    propertySchema: [
      { key: 'text', label: 'Link Text', type: 'text', category: 'Content' },
      { key: 'href', label: 'URL / Route', type: 'text', category: 'Content' },
    ],
  },

  // Media
  image: {
    type: 'image',
    label: 'Image',
    category: 'Media',
    icon: 'Image',
    isContainer: false,
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      alt: 'Modern App Visual',
    },
    defaultStyles: {
      width: '100%',
      height: '240px',
      borderRadius: '12px',
      overflow: 'hidden',
    },
    propertySchema: [
      { key: 'src', label: 'Image URL', type: 'text', category: 'Content' },
      { key: 'alt', label: 'Alt Text', type: 'text', category: 'Content' },
    ],
  },
  avatar: {
    type: 'avatar',
    label: 'Avatar',
    category: 'Media',
    icon: 'User',
    isContainer: false,
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      name: 'Alex Rivera',
    },
    defaultStyles: {
      width: '44px',
      height: '44px',
      borderRadius: '9999px',
      borderWidth: '2px',
      borderColor: '#3730A3',
    },
    propertySchema: [
      { key: 'src', label: 'Avatar URL', type: 'text', category: 'Content' },
      { key: 'name', label: 'User Name', type: 'text', category: 'Content' },
    ],
  },

  // Forms
  input: {
    type: 'input',
    label: 'Input Field',
    category: 'Forms',
    icon: 'FormInput',
    isContainer: false,
    defaultProps: {
      placeholder: 'Enter your email...',
      label: 'Email Address',
      inputType: 'email',
    },
    defaultStyles: {
      width: '100%',
      paddingTop: '10px',
      paddingBottom: '10px',
      paddingLeft: '14px',
      paddingRight: '14px',
      backgroundColor: '#161922',
      borderWidth: '1px',
      borderColor: '#262C40',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '14px',
    },
    propertySchema: [
      { key: 'label', label: 'Field Label', type: 'text', category: 'Content' },
      { key: 'placeholder', label: 'Placeholder', type: 'text', category: 'Content' },
      { key: 'inputType', label: 'Input Type', type: 'select', options: ['text', 'email', 'password', 'number'], category: 'Content' },
    ],
  },
  textarea: {
    type: 'textarea',
    label: 'Textarea',
    category: 'Forms',
    icon: 'FileText',
    isContainer: false,
    defaultProps: {
      placeholder: 'Write your message...',
      label: 'Message',
      rows: 3,
    },
    defaultStyles: {
      width: '100%',
      paddingTop: '10px',
      paddingBottom: '10px',
      paddingLeft: '14px',
      paddingRight: '14px',
      backgroundColor: '#161922',
      borderWidth: '1px',
      borderColor: '#262C40',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '14px',
    },
    propertySchema: [
      { key: 'label', label: 'Field Label', type: 'text', category: 'Content' },
      { key: 'placeholder', label: 'Placeholder', type: 'text', category: 'Content' },
    ],
  },
  form: {
    type: 'form',
    label: 'Form Container',
    category: 'Forms',
    icon: 'CheckSquare',
    isContainer: true,
    defaultProps: {
      formName: 'Contact Form',
    },
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      paddingTop: '24px',
      paddingBottom: '24px',
      paddingLeft: '24px',
      paddingRight: '24px',
      backgroundColor: '#11131A',
      borderRadius: '12px',
      borderWidth: '1px',
      borderColor: '#1E2230',
      width: '100%',
    },
    propertySchema: [
      { key: 'formName', label: 'Form Name', type: 'text', category: 'Content' },
    ],
  },

  // Navigation
  navbar: {
    type: 'navbar',
    label: 'Navigation Bar',
    category: 'Navigation',
    icon: 'Menu',
    isContainer: true,
    defaultProps: {
      brandName: 'Apex Studio',
      links: ['Features', 'Pricing', 'Docs', 'About'],
    },
    defaultStyles: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: '16px',
      paddingBottom: '16px',
      paddingLeft: '28px',
      paddingRight: '28px',
      backgroundColor: '#0E1017',
      borderWidth: '1px',
      borderColor: '#1E2230',
      borderRadius: '14px',
      width: '100%',
    },
    propertySchema: [
      { key: 'brandName', label: 'Brand Name', type: 'text', category: 'Content' },
    ],
  },

  // Data
  card: {
    type: 'card',
    label: 'Content Card',
    category: 'Data',
    icon: 'CreditCard',
    isContainer: true,
    defaultProps: {},
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      paddingTop: '20px',
      paddingBottom: '20px',
      paddingLeft: '20px',
      paddingRight: '20px',
      backgroundColor: '#141721',
      borderRadius: '14px',
      borderWidth: '1px',
      borderColor: '#1F2433',
      width: '100%',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    },
    propertySchema: [],
  },
  statistic: {
    type: 'statistic',
    label: 'Stat / Metric',
    category: 'Data',
    icon: 'TrendingUp',
    isContainer: false,
    defaultProps: {
      title: 'Total Revenue',
      value: '$84,230',
      change: '+18.4%',
      isPositive: true,
    },
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      paddingTop: '16px',
      paddingBottom: '16px',
      paddingLeft: '20px',
      paddingRight: '20px',
      backgroundColor: '#13151D',
      borderRadius: '12px',
      borderWidth: '1px',
      borderColor: '#1F2433',
      width: '100%',
    },
    propertySchema: [
      { key: 'title', label: 'Metric Label', type: 'text', category: 'Content' },
      { key: 'value', label: 'Value', type: 'text', category: 'Content' },
      { key: 'change', label: 'Change Percentage', type: 'text', category: 'Content' },
    ],
  },
  repeater: {
    type: 'repeater',
    label: 'Data Repeater',
    category: 'Data',
    icon: 'Repeat',
    isContainer: true,
    defaultProps: {
      collectionKey: 'products',
      limit: 6,
    },
    defaultStyles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gridGap: '16px',
      width: '100%',
      paddingTop: '12px',
      paddingBottom: '12px',
    },
    propertySchema: [
      { key: 'collectionKey', label: 'Collection Key', type: 'text', category: 'Data', placeholder: 'products' },
      { key: 'limit', label: 'Max Items', type: 'number', category: 'Data' },
    ],
  },

  // Feedback
  alert: {
    type: 'alert',
    label: 'Alert Banner',
    category: 'Feedback',
    icon: 'AlertCircle',
    isContainer: false,
    defaultProps: {
      title: 'System Notice',
      message: 'Your production build was deployed successfully.',
      variant: 'info',
    },
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      paddingTop: '14px',
      paddingBottom: '14px',
      paddingLeft: '18px',
      paddingRight: '18px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: '1px',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderRadius: '10px',
      width: '100%',
    },
    propertySchema: [
      { key: 'title', label: 'Alert Title', type: 'text', category: 'Content' },
      { key: 'message', label: 'Message', type: 'textarea', category: 'Content' },
      { key: 'variant', label: 'Alert Type', type: 'select', options: ['info', 'success', 'warning', 'destructive'], category: 'Appearance' },
    ],
  },

  // Advanced
  embed: {
    type: 'embed',
    label: 'Custom HTML',
    category: 'Advanced',
    icon: 'Code',
    isContainer: false,
    defaultProps: {
      html: '<div style="padding:12px;background:#181B26;border-radius:8px;color:#38BDF8;font-family:monospace;font-size:13px;">&lt;Embedded Component /&gt;</div>',
    },
    defaultStyles: {
      width: '100%',
    },
    propertySchema: [
      { key: 'html', label: 'HTML Content', type: 'textarea', category: 'Content' },
    ],
  },
};
