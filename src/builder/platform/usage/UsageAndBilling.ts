import {
  UsageRecord,
  UsageMetricType,
  PricingPlanTier,
  PlanLimits,
  Subscription,
  Invoice,
} from '../../schema/platform';

// ─── 1. Usage Metering Provider ───────────────────────────────────────────────

export class UsageProvider {
  private records: UsageRecord[] = [];

  async recordUsage(params: {
    organizationId: string;
    metric: UsageMetricType;
    quantity: number;
    source: string;
    metadata?: Record<string, any>;
  }): Promise<UsageRecord> {
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    const record: UsageRecord = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: params.organizationId,
      metric: params.metric,
      quantity: params.quantity,
      period: currentPeriod,
      source: params.source,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    this.records.push(record);
    return record;
  }

  async getUsage(
    organizationId: string,
    metric: UsageMetricType,
    period?: string
  ): Promise<number> {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);
    return this.records
      .filter((r) => r.organizationId === organizationId && r.metric === metric && r.period === currentPeriod)
      .reduce((sum, r) => sum + r.quantity, 0);
  }

  async getAllUsage(organizationId: string, period?: string): Promise<Record<UsageMetricType, number>> {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);
    const metrics: UsageMetricType[] = [
      'ai_requests',
      'ai_tokens',
      'storage_bytes',
      'database_records',
      'api_requests',
      'workflow_executions',
      'deployments',
      'build_minutes',
      'active_collaborators',
      'projects',
      'custom_domains',
    ];

    const result: Record<string, number> = {};
    for (const m of metrics) {
      result[m] = await this.getUsage(organizationId, m, currentPeriod);
    }
    return result as Record<UsageMetricType, number>;
  }
}

export const defaultUsageProvider = new UsageProvider();

// ─── 2. Entitlement Provider ──────────────────────────────────────────────────

export const PLAN_LIMITS: Record<PricingPlanTier, PlanLimits> = {
  free: {
    tier: 'free',
    maxProjects: 3,
    maxCollaborators: 2,
    maxAITokensPerMonth: 50_000,
    maxStorageBytes: 500 * 1024 * 1024, // 500MB
    maxDatabaseRecords: 5_000,
    maxBuildMinutesPerMonth: 60,
    maxCustomDomains: 0,
    allowedFeatures: {
      realtimeCollaboration: true,
      customDomains: false,
      advancedWorkflows: false,
      auditLogs: false,
      marketplacePublishing: false,
      sandboxedPlugins: false,
      serviceAccounts: false,
      branchProtection: false,
      previewDeployments: false,
    },
  },
  pro: {
    tier: 'pro',
    maxProjects: 15,
    maxCollaborators: 5,
    maxAITokensPerMonth: 500_000,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
    maxDatabaseRecords: 50_000,
    maxBuildMinutesPerMonth: 300,
    maxCustomDomains: 3,
    allowedFeatures: {
      realtimeCollaboration: true,
      customDomains: true,
      advancedWorkflows: true,
      auditLogs: true,
      marketplacePublishing: true,
      sandboxedPlugins: true,
      serviceAccounts: true,
      branchProtection: true,
      previewDeployments: true,
    },
  },
  team: {
    tier: 'team',
    maxProjects: 50,
    maxCollaborators: 20,
    maxAITokensPerMonth: 2_000_000,
    maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50GB
    maxDatabaseRecords: 500_000,
    maxBuildMinutesPerMonth: 1_200,
    maxCustomDomains: 10,
    allowedFeatures: {
      realtimeCollaboration: true,
      customDomains: true,
      advancedWorkflows: true,
      auditLogs: true,
      marketplacePublishing: true,
      sandboxedPlugins: true,
      serviceAccounts: true,
      branchProtection: true,
      previewDeployments: true,
    },
  },
  business: {
    tier: 'business',
    maxProjects: 200,
    maxCollaborators: 100,
    maxAITokensPerMonth: 10_000_000,
    maxStorageBytes: 250 * 1024 * 1024 * 1024, // 250GB
    maxDatabaseRecords: 5_000_000,
    maxBuildMinutesPerMonth: 5_000,
    maxCustomDomains: 50,
    allowedFeatures: {
      realtimeCollaboration: true,
      customDomains: true,
      advancedWorkflows: true,
      auditLogs: true,
      marketplacePublishing: true,
      sandboxedPlugins: true,
      serviceAccounts: true,
      branchProtection: true,
      previewDeployments: true,
    },
  },
  enterprise: {
    tier: 'enterprise',
    maxProjects: 999_999,
    maxCollaborators: 999_999,
    maxAITokensPerMonth: 100_000_000,
    maxStorageBytes: 1024 * 1024 * 1024 * 1024, // 1TB
    maxDatabaseRecords: 100_000_000,
    maxBuildMinutesPerMonth: 999_999,
    maxCustomDomains: 999_999,
    allowedFeatures: {
      realtimeCollaboration: true,
      customDomains: true,
      advancedWorkflows: true,
      auditLogs: true,
      marketplacePublishing: true,
      sandboxedPlugins: true,
      serviceAccounts: true,
      branchProtection: true,
      previewDeployments: true,
    },
  },
};

export class EntitlementProvider {
  private orgTiers: Map<string, PricingPlanTier> = new Map();

  constructor() {
    this.orgTiers.set('org_default', 'pro');
  }

  setOrganizationTier(orgId: string, tier: PricingPlanTier) {
    this.orgTiers.set(orgId, tier);
  }

  getOrganizationTier(orgId: string): PricingPlanTier {
    return this.orgTiers.get(orgId) || 'free';
  }

  getPlanLimits(orgId: string): PlanLimits {
    const tier = this.getOrganizationTier(orgId);
    return PLAN_LIMITS[tier];
  }

  hasFeature(orgId: string, feature: keyof PlanLimits['allowedFeatures']): boolean {
    const limits = this.getPlanLimits(orgId);
    return limits.allowedFeatures[feature] === true;
  }

  async canConsume(orgId: string, metric: UsageMetricType, amountToConsume: number = 1): Promise<boolean> {
    const limits = this.getPlanLimits(orgId);
    const currentUsage = await defaultUsageProvider.getUsage(orgId, metric);

    switch (metric) {
      case 'projects':
        return currentUsage + amountToConsume <= limits.maxProjects;
      case 'active_collaborators':
        return currentUsage + amountToConsume <= limits.maxCollaborators;
      case 'ai_tokens':
        return currentUsage + amountToConsume <= limits.maxAITokensPerMonth;
      case 'storage_bytes':
        return currentUsage + amountToConsume <= limits.maxStorageBytes;
      case 'database_records':
        return currentUsage + amountToConsume <= limits.maxDatabaseRecords;
      case 'build_minutes':
        return currentUsage + amountToConsume <= limits.maxBuildMinutesPerMonth;
      case 'custom_domains':
        return currentUsage + amountToConsume <= limits.maxCustomDomains;
      default:
        return true;
    }
  }
}

export const defaultEntitlementProvider = new EntitlementProvider();

// ─── 3. Billing Provider ──────────────────────────────────────────────────────

export interface BillingProvider {
  getCustomer(orgId: string): Promise<{ id: string; email: string; paymentMethodValid: boolean }>;
  createCustomer(orgId: string, email: string): Promise<string>;
  getSubscription(orgId: string): Promise<Subscription>;
  createCheckout(orgId: string, planTier: PricingPlanTier): Promise<{ checkoutUrl: string }>;
  changePlan(orgId: string, newTier: PricingPlanTier): Promise<Subscription>;
  cancelSubscription(orgId: string): Promise<Subscription>;
  listInvoices(orgId: string): Promise<Invoice[]>;
  reportUsage(orgId: string, metric: string, quantity: number): Promise<boolean>;
}

export class LocalBillingProvider implements BillingProvider {
  private subscriptions: Map<string, Subscription> = new Map();
  private invoices: Map<string, Invoice[]> = new Map();

  constructor() {
    // Seed default org subscription
    this.subscriptions.set('org_default', {
      id: 'sub_default',
      organizationId: 'org_default',
      planTier: 'pro',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
    });
  }

  async getCustomer(orgId: string): Promise<{ id: string; email: string; paymentMethodValid: boolean }> {
    return {
      id: `cus_${orgId}`,
      email: `billing@${orgId}.local`,
      paymentMethodValid: true,
    };
  }

  async createCustomer(orgId: string, email: string): Promise<string> {
    return `cus_${orgId}`;
  }

  async getSubscription(orgId: string): Promise<Subscription> {
    let sub = this.subscriptions.get(orgId);
    if (!sub) {
      sub = {
        id: `sub_${orgId}`,
        organizationId: orgId,
        planTier: 'free',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
      };
      this.subscriptions.set(orgId, sub);
    }
    return sub;
  }

  async createCheckout(orgId: string, planTier: PricingPlanTier): Promise<{ checkoutUrl: string }> {
    return { checkoutUrl: `https://checkout.apexstudio.io/session_${orgId}_${planTier}` };
  }

  async changePlan(orgId: string, newTier: PricingPlanTier): Promise<Subscription> {
    const sub = await this.getSubscription(orgId);
    sub.planTier = newTier;
    sub.status = 'active';
    defaultEntitlementProvider.setOrganizationTier(orgId, newTier);
    return sub;
  }

  async cancelSubscription(orgId: string): Promise<Subscription> {
    const sub = await this.getSubscription(orgId);
    sub.cancelAtPeriodEnd = true;
    return sub;
  }

  async listInvoices(orgId: string): Promise<Invoice[]> {
    const list = this.invoices.get(orgId);
    if (list) return list;

    const sampleInvoices: Invoice[] = [
      {
        id: `inv_${orgId}_01`,
        organizationId: orgId,
        amountDue: 2900,
        amountPaid: 2900,
        currency: 'usd',
        status: 'paid',
        periodStart: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
        pdfUrl: `https://invoices.apexstudio.io/inv_${orgId}_01.pdf`,
        createdAt: new Date().toISOString(),
      },
    ];
    this.invoices.set(orgId, sampleInvoices);
    return sampleInvoices;
  }

  async reportUsage(orgId: string, metric: string, quantity: number): Promise<boolean> {
    await defaultUsageProvider.recordUsage({
      organizationId: orgId,
      metric: metric as UsageMetricType,
      quantity,
      source: 'billing_reporter',
    });
    return true;
  }
}

export const defaultBillingProvider = new LocalBillingProvider();
