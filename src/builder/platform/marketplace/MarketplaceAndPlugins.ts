import {
  MarketplaceResource,
  MarketplaceResourceType,
  MarketplaceResourceStatus,
  PluginManifest,
  PluginPermission,
  InstalledPlugin,
} from '../../schema/platform';

export class MarketplaceProvider {
  private resources: Map<string, MarketplaceResource> = new Map();
  private installedPlugins: Map<string, InstalledPlugin> = new Map(); // key: `${orgId}:${pluginId}`

  constructor() {
    this.seedMarketplace();
  }

  private seedMarketplace() {
    const starterTemplate: MarketplaceResource = {
      id: 'res_template_saas',
      authorId: 'user_apex',
      authorName: 'Apex Team',
      type: 'template',
      name: 'Modern SaaS Dashboard Template',
      slug: 'modern-saas-dashboard',
      description: 'Production-ready SaaS dashboard with analytics, customer lists, and billing portal',
      version: '1.2.0',
      compatibility: '>=7.0.0',
      package: {
        theme: { primaryColor: '#6366F1' },
        pagesCount: 5,
      },
      metadata: {
        downloads: 1420,
        rating: 4.9,
        tags: ['saas', 'dashboard', 'analytics', 'modern'],
      },
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.resources.set(starterTemplate.id, starterTemplate);

    const analyticsPlugin: MarketplaceResource = {
      id: 'res_plugin_analytics',
      authorId: 'user_apex',
      authorName: 'Apex Team',
      type: 'plugin',
      name: 'Real-Time Event Tracker Plugin',
      slug: 'realtime-event-tracker',
      description: 'Capture telemetry and user interaction analytics directly from canvas elements',
      version: '1.0.0',
      compatibility: '>=8.0.0',
      manifest: {
        id: 'plugin_event_tracker',
        name: 'Real-Time Event Tracker Plugin',
        version: '1.0.0',
        author: 'Apex Team',
        description: 'Track clicks and form events',
        permissions: ['read_project', 'notifications'],
        capabilities: ['telemetry', 'event_logging'],
        compatibleSchemaVersions: [8],
        entrypoints: {
          sidebarTab: 'tab-telemetry',
        },
      },
      package: {},
      metadata: {
        downloads: 850,
        rating: 4.8,
        tags: ['analytics', 'telemetry', 'events'],
      },
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.resources.set(analyticsPlugin.id, analyticsPlugin);
  }

  async listResources(filter?: {
    type?: MarketplaceResourceType;
    status?: MarketplaceResourceStatus;
    tag?: string;
    search?: string;
  }): Promise<MarketplaceResource[]> {
    let list = Array.from(this.resources.values());

    if (filter?.type) {
      list = list.filter((r) => r.type === filter.type);
    }
    if (filter?.status) {
      list = list.filter((r) => r.status === filter.status);
    } else {
      list = list.filter((r) => r.status === 'published');
    }
    if (filter?.tag) {
      list = list.filter((r) => r.metadata.tags.includes(filter.tag!));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.metadata.downloads - a.metadata.downloads);
  }

  async getResource(id: string): Promise<MarketplaceResource | null> {
    return this.resources.get(id) || null;
  }

  async submitResource(resourceData: Omit<MarketplaceResource, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<MarketplaceResource> {
    // Validate manifest if resource is a plugin
    if (resourceData.type === 'plugin' && !resourceData.manifest) {
      throw new Error('VALIDATION_ERROR: Plugins must provide a valid manifest');
    }

    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const resource: MarketplaceResource = {
      ...resourceData,
      id,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.resources.set(id, resource);
    return resource;
  }

  async reviewResource(id: string, status: 'published' | 'rejected'): Promise<MarketplaceResource> {
    const res = this.resources.get(id);
    if (!res) throw new Error(`Resource ${id} not found`);

    res.status = status;
    res.updatedAt = new Date().toISOString();
    return res;
  }

  // ─── Plugin Installation & Sandboxing ───────────────────────────────────────

  async installPlugin(params: {
    organizationId: string;
    projectId?: string;
    pluginResourceId: string;
    grantedPermissions: PluginPermission[];
    installedBy: string;
  }): Promise<InstalledPlugin> {
    const resource = this.resources.get(params.pluginResourceId);
    if (!resource || resource.type !== 'plugin' || !resource.manifest) {
      throw new Error('INVALID_PLUGIN: Resource is not a valid published plugin');
    }

    const manifest = resource.manifest;

    // Validate that requested permissions are declared in the plugin's manifest
    for (const perm of params.grantedPermissions) {
      if (!manifest.permissions.includes(perm)) {
        throw new Error(`PERMISSION_ERROR: Plugin did not declare permission '${perm}' in its manifest`);
      }
    }

    const installedId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const installed: InstalledPlugin = {
      id: installedId,
      organizationId: params.organizationId,
      projectId: params.projectId,
      pluginId: manifest.id,
      version: manifest.version,
      enabled: true,
      grantedPermissions: params.grantedPermissions,
      settings: {},
      installedAt: new Date().toISOString(),
      installedBy: params.installedBy,
    };

    const key = `${params.organizationId}:${manifest.id}`;
    this.installedPlugins.set(key, installed);
    resource.metadata.downloads += 1;

    return installed;
  }

  async uninstallPlugin(orgId: string, pluginId: string): Promise<boolean> {
    const key = `${orgId}:${pluginId}`;
    return this.installedPlugins.delete(key);
  }

  async listInstalledPlugins(orgId: string): Promise<InstalledPlugin[]> {
    return Array.from(this.installedPlugins.values()).filter((p) => p.organizationId === orgId);
  }

  // Controlled execution sandbox proxy
  createSandboxContext(plugin: InstalledPlugin, project: any) {
    const permissions = new Set(plugin.grantedPermissions);

    return {
      getProjectInfo: () => {
        if (!permissions.has('read_project')) {
          throw new Error('SECURITY_VIOLATION: Missing read_project permission');
        }
        return {
          id: project.id,
          name: project.name,
          pagesCount: project.pages?.length || 0,
        };
      },
      readData: (collectionId: string) => {
        if (!permissions.has('read_data')) {
          throw new Error('SECURITY_VIOLATION: Missing read_data permission');
        }
        const collection = project.collections?.find((c: any) => c.id === collectionId);
        return collection?.records || [];
      },
      writeData: (collectionId: string, record: any) => {
        if (!permissions.has('write_data')) {
          throw new Error('SECURITY_VIOLATION: Missing write_data permission');
        }
        const collection = project.collections?.find((c: any) => c.id === collectionId);
        if (collection) {
          collection.records.push(record);
        }
        return true;
      },
    };
  }
}

export const defaultMarketplaceProvider = new MarketplaceProvider();
