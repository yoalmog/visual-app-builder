// Page Generator: Constructs valid page schemas and component trees using registered components
import { AIOperation } from '../operations/AIOperation';

export class PageGenerator {
  /**
   * Generates operations to construct a complete page with header, content area, and footer using registered components.
   */
  public static generatePage(params: {
    pageId: string;
    name: string;
    slug: string;
    description?: string;
    includeHeader?: boolean;
    includeFooter?: boolean;
  }): AIOperation[] {
    const ops: AIOperation[] = [];
    const rootId = `root_${params.pageId}`;

    // 1. Create page
    ops.push({
      id: `op_page_${params.pageId}`,
      type: 'create_page',
      description: `Create page "${params.name}" (${params.slug})`,
      risk: 'medium',
      reversible: true,
      pageId: params.pageId,
      name: params.name,
      slug: params.slug,
    });

    // 2. Add header navbar if requested
    if (params.includeHeader !== false) {
      const navId = `nav_${params.pageId}`;
      ops.push({
        id: `op_nav_${params.pageId}`,
        type: 'add_component',
        description: `Add navigation header to ${params.name}`,
        risk: 'low',
        dependencies: [`op_page_${params.pageId}`],
        reversible: true,
        pageId: params.pageId,
        parentId: rootId,
        node: {
          id: navId,
          type: 'navbar',
          name: 'Main Navigation',
          props: {
            title: params.name,
            links: [
              { label: 'Home', url: '/' },
              { label: 'Dashboard', url: '/dashboard' },
            ],
          },
          styles: {
            width: '100%',
            height: '64px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderRadius: '8px',
          },
        },
      });
    }

    // 3. Add main content section container
    const sectionId = `sec_${params.pageId}`;
    ops.push({
      id: `op_sec_${params.pageId}`,
      type: 'add_component',
      description: `Add content section to ${params.name}`,
      risk: 'low',
      dependencies: [`op_page_${params.pageId}`],
      reversible: true,
      pageId: params.pageId,
      parentId: rootId,
      node: {
        id: sectionId,
        type: 'section',
        name: `${params.name} Content`,
        props: {},
        styles: {
          flex: '1',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '16px 0',
        },
        children: [
          {
            id: `heading_${params.pageId}`,
            type: 'heading',
            name: 'Page Title',
            props: { text: params.name, level: 'h1' },
            styles: { fontSize: '28px', fontWeight: '700', color: '#0F172A', margin: '0' },
          },
          {
            id: `desc_${params.pageId}`,
            type: 'paragraph',
            name: 'Description',
            props: { text: params.description || `Welcome to the ${params.name} page.` },
            styles: { fontSize: '15px', color: '#64748B', margin: '0' },
          },
        ],
      },
    });

    return ops;
  }
}
