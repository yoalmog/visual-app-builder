// Phase 9 Schema Definitions: Scale, Enterprise & Developer Ecosystem
import { z } from 'zod';

export const SCHEMA_VERSION_V9 = 9;
export const PROJECT_SCHEMA_VERSION_V9 = 9;

// ─── 1. Multi-Region & CDN Types ───────────────────────────────────────────────

export type RegionId = 'us-east-1' | 'us-west-2' | 'eu-central-1' | 'eu-west-1' | 'ap-southeast-1' | 'ap-northeast-1';
export type RegionStatus = 'healthy' | 'degraded' | 'offline' | 'maintenance';
export type RoutingPolicy = 'latency' | 'geo' | 'weighted' | 'failover';

export interface Region {
  id: RegionId;
  name: string;
  location: string;
  status: RegionStatus;
  latencyMs: number;
  isPrimary: boolean;
  isFailover: boolean;
  capabilities: {
    databaseReplication: boolean;
    edgeCompute: boolean;
    storageMirroring: boolean;
    realtimeBroker: boolean;
  };
}

export interface RegionHealth {
  regionId: RegionId;
  status: RegionStatus;
  latencyMs: number;
  uptimePercentage: number;
  lastCheckedAt: string;
  incidents: string[];
}

export interface RegionRoutingPolicyConfig {
  policy: RoutingPolicy;
  primaryRegionId: RegionId;
  failoverRegionId: RegionId;
  activeRegions: RegionId[];
  dataResidency: 'us_only' | 'eu_only' | 'apac_only' | 'global' | 'us-only' | 'eu-only' | 'apac-only';
}

export interface CDNConfig {
  distributionId: string;
  domain: string;
  enabled: boolean;
  edgeRegions: RegionId[];
  cachingRules: {
    staticAssetsTtlSeconds: number;
    publicPagesTtlSeconds: number;
    apiCacheTtlSeconds: number;
  };
  headers: Record<string, string>;
  lastInvalidationAt?: string;
}

// ─── 2. Distributed Cache & Database Scaling ─────────────────────────────────

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  namespace: string;
  organizationId: string;
  projectId?: string;
  tags: string[];
  expiresAt: number; // Unix timestamp ms
  createdAt: number;
  version: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  entryCount: number;
  sizeBytes: number;
  lastEvictionAt?: string;
}

export type ConsistencyPolicy = 'strong' | 'eventual' | 'primary_only' | 'replica_preferred';

export interface ReadReplica {
  id: string;
  regionId: RegionId;
  host: string;
  isHealthy: boolean;
  healthCheckPassed?: boolean;
  replicationLagMs: number;
  weight: number;
  status: 'active' | 'syncing' | 'offline' | 'healthy';
}

export interface DatabaseTopology {
  primaryHost: string;
  primaryRegionId: RegionId;
  replicas: ReadReplica[];
  defaultConsistency: ConsistencyPolicy;
  maxAcceptableLagMs: number;
}

// ─── 3. Background Workers & Advanced Queue ──────────────────────────────────

export type WorkerJobPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export interface AdvancedJob {
  id: string;
  queueName: string;
  type?: string;
  payload: Record<string, any>;
  priority: WorkerJobPriority;
  organizationId?: string;
  projectId?: string;
  idempotencyKey?: string;
  scheduledAt?: string;
  delayMs?: number;
  delaySeconds?: number;
  runAt?: string;
  dependencies?: string[]; // Job IDs that must complete first
  groupId?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'dead_letter';
  attempts: number;
  maxAttempts?: number;
  backoffFactor?: number;
  timeoutMs?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: any;
}

export interface WorkerInstance {
  id: string;
  type: string;
  concurrency: number;
  activeJobIds: string[];
  status: 'idle' | 'busy' | 'terminating';
  processedCount: number;
  failedCount: number;
  startedAt: string;
}

// ─── 4. Event Bus ─────────────────────────────────────────────────────────────

export interface PlatformEvent<T = any> {
  id: string;
  type: string;
  version: number | string;
  organizationId: string;
  projectId?: string;
  actorId?: string;
  correlationId?: string;
  causationId?: string;
  payload?: T;
  data?: T;
  source?: string;
  timestamp: string;
}

export interface EventSubscriptionConfig {
  id: string;
  organizationId: string;
  projectId?: string;
  eventTypes?: string[];
  eventType?: string;
  targetUrl: string;
  secret?: string;
  active?: boolean;
  enabled?: boolean;
  createdAt?: string;
}

// ─── 5. Autoscaling, High Availability & Health Checks ────────────────────────

export interface AutoscalingConfig {
  minCapacity: number;
  maxCapacity: number;
  desiredCapacity: number;
  currentCapacity: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  currentCpuUtilization: number;
  currentMemoryUtilization: number;
  cooldownSeconds: number;
  lastScaleAt?: string;
}

export interface HealthProbeResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheckedAt: string;
  details?: Record<string, any>;
}

export interface PlatformHealthOverview {
  status: 'operational' | 'degraded' | 'maintenance' | 'outage';
  liveness: boolean;
  readiness: boolean;
  probes: HealthProbeResult[];
  activeIncidents: string[];
  maintenanceMode: boolean;
}

// ─── 6. Backups & Disaster Recovery ──────────────────────────────────────────

export interface BackupRecord {
  id: string;
  projectId: string;
  organizationId: string;
  environment: string;
  name: string;
  type: 'manual' | 'scheduled' | 'system';
  sizeBytes: number;
  checksum: string;
  status: 'completed' | 'in_progress' | 'failed';
  retentionDays: number;
  expiresAt: string;
  createdAt: string;
  metadata: {
    version: number;
    pagesCount: number;
    collectionsCount: number;
  };
}

export interface DisasterRecoveryPlan {
  id: string;
  organizationId: string;
  name: string;
  primaryRegion: RegionId;
  secondaryRegion: RegionId;
  rpoHours: number; // Recovery Point Objective
  rtoMinutes: number; // Recovery Time Objective
  lastTestedAt?: string;
  failoverStatus: 'idle' | 'failing_over' | 'failed_over' | 'failing_back';
  autoFailoverEnabled: boolean;
}

// ─── 7. Enterprise SSO, SCIM & Sessions ──────────────────────────────────────

export interface SSOConfiguration {
  id?: string;
  organizationId: string;
  providerType: 'saml' | 'oidc';
  issuer?: string;
  entryPointUrl?: string; // SSO URL
  certificateFingerprint?: string;
  clientId?: string;
  clientSecretHash?: string;
  domains: string[]; // e.g. ['acme.com', 'acme.org']
  enforceSSO?: boolean;
  jitProvisioningEnabled?: boolean;
  autoProvisionUsers?: boolean;
  defaultRole?: 'member' | 'viewer' | string;
  enabled: boolean;
  samlConfig?: {
    entryPoint?: string;
    issuer?: string;
    cert?: string;
  };
  oidcConfig?: {
    issuerUrl?: string;
    clientId?: string;
    clientSecretHash?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SCIMUserRecord {
  id: string;
  externalId: string;
  organizationId: string;
  userName: string;
  givenName?: string;
  familyName?: string;
  email: string;
  active: boolean;
  groups: string[];
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionRecord {
  id: string;
  userId: string;
  organizationId: string;
  userAgent: string;
  ipAddress: string;
  ipHash: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  location?: string;
  isSuspicious: boolean;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
}

// ─── 8. Organization Policies, Compliance & Encryption ────────────────────────

export interface OrganizationSecurityPolicy {
  organizationId: string;
  requireMFA: boolean;
  disablePasswordLogin: boolean;
  restrictProjectCreationToRoles: string[]; // e.g. ['owner', 'admin']
  restrictPublishingToRoles: string[];
  restrictCustomDomains: boolean;
  restrictExternalSharing: boolean;
  allowedIpRanges: string[]; // CIDR list, e.g. ['192.168.1.0/24']
  sessionMaxAgeHours: number;
  idleTimeoutMinutes: number;
  enforceDataResidency: 'none' | 'us_only' | 'eu_only' | 'apac_only';
  dataRetentionDays: number;
  auditRetentionDays: number;
  allowedAiProviders: string[]; // e.g. ['openai', 'gemini', 'anthropic']
  maxAiBudgetPerMonth: number;
  updatedAt: string;
  updatedBy: string;
}

export interface KMSKeyRecord {
  keyId: string;
  organizationId: string;
  alias: string;
  algorithm: 'AES_256_GCM' | 'RSA_4096';
  version: number;
  status: 'enabled' | 'disabled' | 'pending_deletion';
  rotatedAt: string;
  createdAt: string;
}

export interface ComplianceControlRecord {
  controlId: string;
  name: string;
  category: 'access_control' | 'data_protection' | 'audit_logging' | 'incident_response' | 'business_continuity';
  status: 'implemented' | 'policy_configured' | 'evidence_available' | 'not_applicable';
  lastEvaluatedAt: string;
  notes: string;
}

// ─── 9. API Management, Developer Apps & OAuth 2.0 ────────────────────────────

export interface APIProduct {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  status: 'draft' | 'published' | 'deprecated';
  rateLimitPerMinute: number;
  monthlyQuota: number;
  requiresApproval: boolean;
  allowedScopes: string[];
  createdAt: string;
}

export interface DeveloperApp {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  clientId: string;
  clientSecretHash: string;
  redirectUris: string[];
  scopes: string[];
  status: 'active' | 'suspended' | 'revoked';
  rateLimitTier: 'standard' | 'elevated' | 'unlimited';
  createdBy: string;
  createdAt: string;
}

export interface OAuthTokenRecord {
  accessTokenHash: string;
  refreshTokenHash: string;
  clientId: string;
  userId: string;
  organizationId: string;
  scopes: string[];
  expiresAt: string;
  createdAt: string;
}

// ─── 10. Webhooks 2.0 & Replay ────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  projectId?: string;
  url: string;
  description: string;
  secretHash: string;
  eventFilters: string[];
  enabled: boolean;
  retryCount: number;
  rateLimitPerSecond: number;
  createdAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  endpointId: string;
  organizationId: string;
  eventType: string;
  eventId: string;
  requestHeaders: Record<string, string>;
  requestPayload: any;
  responseStatus?: number;
  responseBody?: string;
  durationMs: number;
  attempt: number;
  status: 'delivered' | 'failed' | 'dead_letter';
  deliveredAt: string;
  nextRetryAt?: string;
}

// ─── 11. Feature Flags & Experiments ──────────────────────────────────────────

export interface FeatureFlag {
  id: string;
  organizationId: string;
  projectId?: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  percentageRollout: number; // 0 - 100
  targetRoles?: string[];
  targetUserIds?: string[];
  environmentTargets: ('development' | 'preview' | 'staging' | 'production')[];
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  key: string;
  weight: number; // 0 - 100
  variables?: Record<string, any>;
}

export interface Experiment {
  id: string;
  organizationId: string;
  projectId?: string;
  key: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'concluded' | 'archived';
  variants: ExperimentVariant[];
  targetAudiencePercent?: number;
  targetEnvironments?: ('development' | 'preview' | 'staging' | 'production')[];
  primaryMetric?: string;
  winnerVariantId?: string;
  startedAt?: string;
  concludedAt?: string;
  createdAt: string;
}

export interface ExperimentAssignment {
  experimentId: string;
  userId: string;
  variantKey: string;
  assignedAt: string;
}

// ─── 12. Advanced Deployments & Environment Promotion ─────────────────────────

export type AdvancedDeploymentStrategyType = 'standard' | 'blue_green' | 'canary' | 'staged_rollout';

export interface CanaryConfig {
  enabled: boolean;
  currentTrafficPercentage: number; // 0 - 100
  stepPercentage: number; // e.g. 10
  stepIntervalSeconds: number; // e.g. 60
  errorThresholdPercent: number; // e.g. 2
  latencyThresholdMs: number; // e.g. 250
}

export interface StagingPromotionConfig {
  sourceEnvironment: 'development' | 'preview' | 'staging';
  targetEnvironment: 'staging' | 'production';
  requireApproval?: boolean;
  requiresApproval?: boolean;
  approvedBy?: string;
  approvalNotes?: string;
  runAutomatedTests?: boolean;
  automatedRollbackOnFailure?: boolean;
}

// ─── 13. Marketplace Monetization & Plugin Lifecycle ──────────────────────────

export interface PublisherAccount {
  id: string;
  organizationId: string;
  displayName: string;
  payoutEmail: string;
  verified: boolean;
  totalEarningsUsd: number;
  createdAt: string;
}

export interface MarketplacePricing {
  model: 'free' | 'one_time' | 'subscription';
  amountUsd: number;
  currency: string;
  billingInterval?: 'month' | 'year';
}

export interface PluginVersionMetadata {
  pluginId: string;
  version: string;
  compatibleSchemaVersions: number[];
  changelog: string;
  permissions: string[];
  status: 'stable' | 'beta' | 'deprecated';
  releasedAt: string;
}

// ─── 14. Enterprise AI Governance ─────────────────────────────────────────────

export interface EnterpriseAIPolicy {
  organizationId: string;
  allowedProviders: ('openai' | 'gemini' | 'anthropic' | 'local_mock')[];
  allowedModels: string[];
  maxMonthlyTokens: number;
  maxAgentSteps: number;
  requireApprovalForSensitiveOps: boolean;
  blockAccessToSensitiveCollections: boolean;
  redactPiiFromContext: boolean;
  auditAiPrompts: boolean;
  updatedAt: string;
}

// ─── ZOD SCHEMAS ──────────────────────────────────────────────────────────────

export const RegionSchema = z.object({
  id: z.enum(['us-east-1', 'us-west-2', 'eu-central-1', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1']),
  name: z.string().min(1),
  location: z.string().min(1),
  status: z.enum(['healthy', 'degraded', 'offline', 'maintenance']),
  latencyMs: z.number().nonnegative(),
  isPrimary: z.boolean(),
  isFailover: z.boolean(),
  capabilities: z.object({
    databaseReplication: z.boolean(),
    edgeCompute: z.boolean(),
    storageMirroring: z.boolean(),
    realtimeBroker: z.boolean(),
  }),
});

export const RegionRoutingPolicySchema = z.object({
  policy: z.enum(['latency', 'geo', 'weighted', 'failover']),
  primaryRegionId: z.string(),
  failoverRegionId: z.string(),
  activeRegions: z.array(z.string()),
  dataResidency: z.enum(['us_only', 'eu_only', 'apac_only', 'global']),
});

export const SSOConfigurationSchema = z.object({
  organizationId: z.string(),
  enabled: z.boolean(),
  providerType: z.enum(['saml', 'oidc']),
  domains: z.array(z.string()),
  samlConfig: z
    .object({
      entryPoint: z.string(),
      issuer: z.string(),
      cert: z.string(),
    })
    .optional(),
  oidcConfig: z
    .object({
      issuerUrl: z.string(),
      clientId: z.string(),
      clientSecretHash: z.string(),
    })
    .optional(),
  defaultRole: z.string(),
  autoProvisionUsers: z.boolean(),
});

export const OrganizationSecurityPolicySchema = z.object({
  organizationId: z.string(),
  requireMFA: z.boolean(),
  disablePasswordLogin: z.boolean(),
  restrictProjectCreationToRoles: z.array(z.string()),
  restrictPublishingToRoles: z.array(z.string()),
  restrictCustomDomains: z.boolean(),
  restrictExternalSharing: z.boolean(),
  allowedIpRanges: z.array(z.string()),
  sessionMaxAgeHours: z.number().positive(),
  idleTimeoutMinutes: z.number().positive(),
  enforceDataResidency: z.enum(['none', 'us_only', 'eu_only', 'apac_only', 'us-only', 'eu-only', 'apac-only', 'global']),
  dataRetentionDays: z.number().positive(),
  auditRetentionDays: z.number().positive(),
  allowedAiProviders: z.array(z.string()),
  maxAiBudgetPerMonth: z.number().nonnegative(),
});

export const FeatureFlagSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string().optional(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  enabled: z.boolean(),
  percentageRollout: z.number().min(0).max(100),
  environmentTargets: z.array(z.enum(['development', 'preview', 'staging', 'production'])),
});

export const ExperimentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string().optional(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  status: z.enum(['draft', 'running', 'concluded', 'archived']),
  variants: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
      weight: z.number().nonnegative(),
    })
  ),
  targetEnvironments: z.array(z.enum(['development', 'preview', 'staging', 'production'])),
});

export const CanaryConfigSchema = z.object({
  enabled: z.boolean(),
  currentTrafficPercentage: z.number().min(0).max(100),
  stepPercentage: z.number().positive(),
  stepIntervalSeconds: z.number().positive(),
  errorThresholdPercent: z.number().nonnegative(),
  latencyThresholdMs: z.number().positive(),
});
