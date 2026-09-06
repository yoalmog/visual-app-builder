// Phase 9 Marketplace Monetization, Publisher Accounts, and Plugin Lifecycle Management
import {
  PublisherAccount,
  MarketplacePricing,
  PluginVersionMetadata,
} from '../../schema/platform-v9';
import { defaultAuditLogger } from '../security/EnterpriseSecurity';

// ─── 1. Marketplace Monetization Service ──────────────────────────────────────

export interface PurchaseRecord {
  id: string;
  listingId: string;
  buyerOrganizationId: string;
  publisherId: string;
  pricing: MarketplacePricing;
  amountUsd: number;
  status: 'active' | 'completed' | 'refunded' | 'cancelled';
  purchasedAt: string;
}

export class MarketplaceMonetizationService {
  private publishers: Map<string, any> = new Map();
  private purchases: Map<string, PurchaseRecord> = new Map();

  async registerPublisher(
    arg1: string | { organizationId: string; displayName?: string; name?: string; payoutEmail: string },
    arg2?: string,
    arg3?: string
  ): Promise<any> {
    let organizationId: string;
    let displayName: string;
    let payoutEmail: string;

    if (typeof arg1 === 'object') {
      organizationId = arg1.organizationId;
      displayName = arg1.displayName || arg1.name || 'Publisher';
      payoutEmail = arg1.payoutEmail;
    } else {
      organizationId = arg1;
      displayName = arg2 || 'Publisher';
      payoutEmail = arg3 || 'payout@example.com';
    }

    const id = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const publisher = {
      id,
      organizationId,
      displayName,
      name: displayName,
      payoutEmail,
      verified: true,
      totalEarningsUsd: 0,
      createdAt: new Date().toISOString(),
    };
    this.publishers.set(id, publisher);
    return publisher;
  }

  async getPublisher(id: string): Promise<any | null> {
    return this.publishers.get(id) || null;
  }

  async purchaseItem(params: {
    buyerOrganizationId: string;
    listingId: string;
    publisherId: string;
    pricing: { model: 'free' | 'one_time' | 'subscription'; amountUsd: number; currency?: string };
  }): Promise<PurchaseRecord> {
    const purchaseId = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: PurchaseRecord = {
      id: purchaseId,
      listingId: params.listingId,
      buyerOrganizationId: params.buyerOrganizationId,
      publisherId: params.publisherId,
      pricing: params.pricing as any,
      amountUsd: params.pricing.amountUsd,
      status: 'completed',
      purchasedAt: new Date().toISOString(),
    };

    this.purchases.set(purchaseId, record);

    // Credit publisher with 85% revenue share
    const pub = this.publishers.get(params.publisherId);
    if (pub) {
      pub.totalEarningsUsd += params.pricing.amountUsd * 0.85;
    }

    await defaultAuditLogger.log({
      organizationId: params.buyerOrganizationId,
      actorId: 'buyer',
      actorType: 'user',
      action: 'marketplace:purchase',
      resourceType: 'marketplace_item',
      resourceId: params.listingId,
      metadata: { amountUsd: params.pricing.amountUsd, pricingModel: params.pricing.model },
      status: 'SUCCESS',
      ipHash: 'local',
    });

    return record;
  }

  async purchaseListing(params: {
    listingId: string;
    buyerOrganizationId: string;
    publisherId: string;
    pricing: MarketplacePricing;
  }): Promise<PurchaseRecord> {
    return this.purchaseItem(params);
  }

  async refundPurchase(purchaseId: string): Promise<PurchaseRecord> {
    const purchase = this.purchases.get(purchaseId);
    if (!purchase) throw new Error('Purchase record not found');
    purchase.status = 'refunded';

    const pub = this.publishers.get(purchase.publisherId);
    if (pub) {
      pub.totalEarningsUsd = Math.max(0, pub.totalEarningsUsd - purchase.amountUsd * 0.85);
    }

    return purchase;
  }

  async hasPurchased(listingId: string, organizationId: string): Promise<boolean> {
    return Array.from(this.purchases.values()).some(
      (p) => p.listingId === listingId && p.buyerOrganizationId === organizationId && p.status === 'completed'
    );
  }
}

// ─── 2. Plugin Lifecycle & Version Compatibility Manager ──────────────────────

export interface ManagedPlugin {
  id: string;
  projectId: string;
  pluginId: string;
  activeVersion: string;
  availableVersions: PluginVersionMetadata[];
  status: 'installed' | 'enabled' | 'disabled' | 'active';
  grantedPermissions: string[];
  installedAt: string;
}

export class PluginLifecycleManager {
  private plugins: Map<string, ManagedPlugin> = new Map();

  validateCompatibility(range: string, version: string): boolean {
    if (range.startsWith('^')) {
      const majorRange = parseInt(range.slice(1).split('.')[0], 10);
      const majorVersion = parseInt(version.split('.')[0], 10);
      return majorRange === majorVersion;
    }
    if (range === '*' || range === version) return true;
    return false;
  }

  async installPlugin(params: {
    organizationId?: string;
    projectId?: string;
    pluginId: string;
    version: string;
    requestedPermissions?: string[];
    permissions?: string[];
    compatibleSchemaVersions?: number[];
  }): Promise<ManagedPlugin> {
    const projectId = params.projectId || params.organizationId || 'default_proj';
    const permissions = params.requestedPermissions || params.permissions || [];
    const compatibleSchema = params.compatibleSchemaVersions || [9];

    if (params.compatibleSchemaVersions && !params.compatibleSchemaVersions.includes(9)) {
      throw new Error(`INCOMPATIBLE_PLUGIN_VERSION: Plugin ${params.pluginId} does not support Schema v9`);
    }

    const key = `${projectId}:${params.pluginId}`;
    const plugin: ManagedPlugin = {
      id: `mp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      pluginId: params.pluginId,
      activeVersion: params.version,
      availableVersions: [
        {
          pluginId: params.pluginId,
          version: params.version,
          compatibleSchemaVersions: compatibleSchema,
          changelog: 'Initial release',
          permissions,
          status: 'stable',
          releasedAt: new Date().toISOString(),
        },
      ],
      status: 'active',
      grantedPermissions: permissions,
      installedAt: new Date().toISOString(),
    };

    this.plugins.set(key, plugin);
    return plugin;
  }

  async upgradePlugin(projectId: string, pluginId: string, targetVersion: string, targetPermissions: string[]): Promise<ManagedPlugin> {
    const key = `${projectId}:${pluginId}`;
    const plugin = this.plugins.get(key);
    if (!plugin) throw new Error('Plugin not installed');

    plugin.activeVersion = targetVersion;
    plugin.grantedPermissions = targetPermissions;
    return plugin;
  }

  async downgradePlugin(projectId: string, pluginId: string, targetVersion: string): Promise<ManagedPlugin> {
    const key = `${projectId}:${pluginId}`;
    const plugin = this.plugins.get(key);
    if (!plugin) throw new Error('Plugin not installed');

    plugin.activeVersion = targetVersion;
    return plugin;
  }

  async disablePlugin(projectId: string, pluginId: string): Promise<boolean> {
    const key = `${projectId}:${pluginId}`;
    const plugin = this.plugins.get(key);
    if (!plugin) return false;
    plugin.status = 'disabled';
    return true;
  }

  async uninstallPlugin(projectId: string, pluginId: string): Promise<boolean> {
    const key = `${projectId}:${pluginId}`;
    return this.plugins.delete(key);
  }

  async getInstalledPlugins(projectId: string): Promise<ManagedPlugin[]> {
    return Array.from(this.plugins.values()).filter((p) => p.projectId === projectId);
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export const defaultMarketplaceMonetizationService = new MarketplaceMonetizationService();
export const defaultPluginLifecycleManager = new PluginLifecycleManager();
