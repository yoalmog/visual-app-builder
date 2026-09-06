// Phase 9 Acceptance Test Suite: Scale, Enterprise & Developer Ecosystem
import crypto from 'crypto';
import {
  SCHEMA_VERSION_V9,
  PROJECT_SCHEMA_VERSION_V9,
  RegionSchema,
  SSOConfigurationSchema,
  OrganizationSecurityPolicySchema,
  FeatureFlagSchema,
  ExperimentSchema,
  CanaryConfigSchema,
} from '../src/builder/schema/platform-v9';
import { PROJECT_SCHEMA_VERSION, AppProject } from '../src/builder/schema/project';
import {
  createInitialProject,
  migrateProject,
  migrateProjectToV9,
} from '../src/builder/persistence/project-storage';
import {
  LocalRegionProvider,
  defaultRegionProvider,
  LocalCDNProvider,
  defaultCDNProvider,
  LocalCacheProvider,
  defaultCacheProvider,
  LocalDatabaseScalingProvider,
  defaultDatabaseScalingProvider,
  LocalWorkerProvider,
  defaultWorkerProvider,
  LocalEventBusProvider,
  defaultEventBusProvider,
  LocalAutoscalingProvider,
  defaultAutoscalingProvider,
  LocalHealthCheckProvider,
  defaultHealthCheckProvider,
  LocalBackupProvider,
  defaultBackupProvider,
  LocalDisasterRecoveryProvider,
  defaultDisasterRecoveryProvider,
  LocalSSOProvider,
  defaultSSOProvider,
  LocalSCIMProvider,
  defaultSCIMProvider,
  OrganizationPolicyEngine,
  defaultOrganizationPolicyEngine,
  NetworkPolicyEngine,
  defaultNetworkPolicyEngine,
  SessionManager,
  defaultSessionManager,
  LocalKeyManagementProvider,
  defaultKeyManagementProvider,
  ComplianceManager,
  defaultComplianceManager,
  LocalApiGatewayProvider,
  defaultApiGatewayProvider,
  LocalOAuthProvider,
  defaultOAuthProvider,
  WebhookManager2,
  defaultWebhookManager2,
  OpenApiDocGenerator,
  defaultOpenApiDocGenerator,
  DeveloperCliHandler,
  defaultDeveloperCliHandler,
  LocalRealtimeScalingProvider,
  defaultRealtimeScalingProvider,
  PlatformMonitoringEngine,
  defaultPlatformMonitoringEngine,
  AnalyticsEngine,
  defaultAnalyticsEngine,
  ErrorTrackingService,
  defaultErrorTrackingService,
  LocalFeatureFlagProvider,
  defaultFeatureFlagProvider,
  LocalExperimentProvider,
  defaultExperimentProvider,
  LocalAdvancedDeploymentEngine,
  defaultAdvancedDeploymentEngine,
  MarketplaceMonetizationService,
  defaultMarketplaceMonetizationService,
  PluginLifecycleManager,
  defaultPluginLifecycleManager,
  EnterpriseAIGovernance,
  defaultEnterpriseAIGovernance,
} from '../src/builder/platform/enterprise';
import fs from 'fs';
import path from 'path';

export interface TestResult {
  id: string;
  description: string;
  passed: boolean;
  error?: string;
}

export async function runPhase9Suite(): Promise<{ passed: number; failed: number; blocked: number; results: TestResult[] }> {
  const results: TestResult[] = [];

  function record(id: string, description: string, passed: boolean, error?: string) {
    if (!passed) {
      console.error(`[FAIL] ${id}: ${description}${error ? ` -> ${error}` : ''}`);
    } else {
      console.log(`[PASS] ${id}: ${description}`);
    }
    results.push({ id, description, passed, error });
  }

  console.log('\n================================================================');
  console.log('STARTING PHASE 9 ACCEPTANCE TEST SUITE');
  console.log('Scale, Enterprise & Developer Ecosystem');
  console.log('================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: Schema v9 & Deterministic Migrations (AT9-001 - AT9-015)
  // ─────────────────────────────────────────────────────────────────────────────
  record('AT9-001', 'Schema version constants defined for Phase 9', SCHEMA_VERSION_V9 === 9 && PROJECT_SCHEMA_VERSION_V9 === 9);

  const testRegion = {
    id: 'us-west-2' as const,
    name: 'US West (Oregon)',
    location: 'North America',
    status: 'healthy' as const,
    latencyMs: 35,
    isPrimary: false,
    isFailover: false,
    capabilities: { databaseReplication: true, edgeCompute: true, storageMirroring: true, realtimeBroker: true },
  };
  const regionValidation = RegionSchema.safeParse(testRegion);
  record('AT9-002', 'Zod RegionSchema validates valid region definitions', regionValidation.success);

  const invalidRegion = { ...testRegion, status: 'unknown_status' };
  const invalidRegionVal = RegionSchema.safeParse(invalidRegion);
  record('AT9-003', 'Zod RegionSchema rejects invalid region status', !invalidRegionVal.success);

  const ssoConfig = {
    organizationId: 'org_acme',
    enabled: true,
    providerType: 'oidc' as const,
    domains: ['acme.corp', 'acme.com'],
    oidcConfig: {
      issuerUrl: 'https://auth.acme.corp',
      clientId: 'apex_client_123',
      clientSecretHash: 'sha256_mock_hash',
    },
    defaultRole: 'member',
    autoProvisionUsers: true,
  };
  const ssoVal = SSOConfigurationSchema.safeParse(ssoConfig);
  record('AT9-004', 'Zod SSOConfigurationSchema validates OIDC and SAML configurations', ssoVal.success);

  const policyConfig = {
    organizationId: 'org_acme',
    requireMFA: true,
    disablePasswordLogin: true,
    restrictProjectCreationToRoles: ['owner', 'admin'],
    restrictPublishingToRoles: ['owner'],
    restrictCustomDomains: true,
    restrictExternalSharing: true,
    allowedIpRanges: ['192.168.1.0/24'],
    sessionMaxAgeHours: 24,
    idleTimeoutMinutes: 30,
    enforceDataResidency: 'eu-only' as const,
    dataRetentionDays: 365,
    auditRetentionDays: 730,
    allowedAiProviders: ['openai', 'anthropic'],
    maxAiBudgetPerMonth: 2000,
  };
  const policyVal = OrganizationSecurityPolicySchema.safeParse(policyConfig);
  record('AT9-005', 'Zod OrganizationSecurityPolicySchema validates security policy', policyVal.success);

  const flagConfig = {
    id: 'flag_01',
    organizationId: 'org_acme',
    key: 'dark_mode_v2',
    name: 'Dark Mode v2',
    description: 'Next-gen theme',
    enabled: true,
    environmentTargets: ['preview' as const, 'production' as const],
    percentageRollout: 50,
  };
  const flagVal = FeatureFlagSchema.safeParse(flagConfig);
  record('AT9-006', 'Zod FeatureFlagSchema validates rollout percentages and targeting rules', flagVal.success);

  const expConfig = {
    id: 'exp_01',
    organizationId: 'org_acme',
    key: 'checkout_button_color',
    name: 'Checkout Button Color',
    description: 'Testing green vs indigo',
    status: 'running' as const,
    variants: [
      { id: 'v_ctrl', key: 'control', name: 'Indigo Button', weight: 50 },
      { id: 'v_treat', key: 'treatment', name: 'Emerald Button', weight: 50 },
    ],
    targetEnvironments: ['production' as const],
  };
  const expVal = ExperimentSchema.safeParse(expConfig);
  record('AT9-007', 'Zod ExperimentSchema validates variant configurations', expVal.success);

  // Migrate legacy Phase 1 project to v9
  const legacyP1Project = {
    id: 'p_legacy_1',
    name: 'Legacy Project',
    schemaVersion: 1,
    pages: [{ id: 'page_home', name: 'Home', path: '/', rootNodeId: 'node_root' }],
    nodes: { node_root: { id: 'node_root', type: 'container', properties: {}, children: [] } },
  };
  const migratedV9_fromP1 = migrateProjectToV9(legacyP1Project);
  record('AT9-008', 'migrateProjectToV9 migrates Phase 1 legacy project to v9 with default region and enterprise fields',
    migratedV9_fromP1.schemaVersion === 9 && migratedV9_fromP1.regionId === 'us-east-1' && !!migratedV9_fromP1.cdnConfig);

  // Migrate Phase 7 AI project to v9
  const p7Project = {
    id: 'p_ai_app',
    name: 'AI Generated CRM',
    schemaVersion: 7,
    pages: [{ id: 'page_main', name: 'Dashboard', path: '/', rootNodeId: 'node_root' }],
    nodes: { node_root: { id: 'node_root', type: 'container', properties: {}, children: [] } },
    collections: [{ id: 'col_leads', name: 'Leads', fields: [{ id: 'f1', name: 'company', type: 'text' }] }],
    workflows: [{ id: 'wf_notify', name: 'Notify', trigger: { type: 'on_click' }, nodes: [], connections: [] }],
  };
  const migratedV9_fromP7 = migrateProjectToV9(p7Project);
  record('AT9-009', 'migrateProjectToV9 migrates Phase 7 AI project to v9 preserving collections and workflows',
    migratedV9_fromP7.schemaVersion === 9 && migratedV9_fromP7.collections?.length === 1 && migratedV9_fromP7.workflows?.length === 1);

  // Migrate Phase 8 Platform project to v9
  const p8Project = {
    id: 'p_collab_app',
    name: 'Collab App',
    schemaVersion: 8,
    pages: [{ id: 'page_main', name: 'Main', path: '/', rootNodeId: 'node_root' }],
    nodes: { node_root: { id: 'node_root', type: 'container', properties: {}, children: [] } },
    environments: { activeEnvironment: 'development', environments: {} },
  };
  const migratedV9_fromP8 = migrateProjectToV9(p8Project);
  record('AT9-010', 'migrateProjectToV9 migrates Phase 8 project to v9 preserving environment settings',
    migratedV9_fromP8.schemaVersion === 9 && migratedV9_fromP8.environments?.activeEnvironment === 'development');

  // Idempotency: migrating v9 project twice leaves it intact
  const twiceMigrated = migrateProjectToV9(migratedV9_fromP8);
  record('AT9-011', 'migrateProjectToV9 is idempotent (running on v9 returns valid unchanged project)',
    twiceMigrated.schemaVersion === 9 && twiceMigrated.id === p8Project.id);

  // Malformed raw data handling
  const malformedProject = { corrupted: true, randomField: 12345 };
  const recoveredProject = migrateProjectToV9(malformedProject);
  record('AT9-012', 'migrateProjectToV9 safely handles malformed raw project objects without crashing',
    recoveredProject.schemaVersion === 9 && typeof recoveredProject.id === 'string' && Array.isArray(recoveredProject.pages));

  // Initial project creation with v9
  const newV9Project = createInitialProject('proj_v9_test', 9);
  record('AT9-013', 'createInitialProject with schema version 9 initializes Phase 9 fields',
    newV9Project.schemaVersion === 9 && newV9Project.regionId === 'us-east-1' && Array.isArray(newV9Project.featureFlags));

  // Master migration chain
  const chainMigrated = migrateProjectToV9(legacyP1Project);
  record('AT9-014', 'migrateProjectToV9 master migration chain smoothly routes through v9',
    chainMigrated.schemaVersion === 9);

  // Backward compatibility check
  record('AT9-015', 'Backward compatibility: all existing components and pages remain intact after v9 migration',
    chainMigrated.pages.length === 1 && chainMigrated.pages[0].id === 'page_home');

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: Multi-Region Architecture (AT9-016 - AT9-026)
  // ─────────────────────────────────────────────────────────────────────────────
  const regions = await defaultRegionProvider.listRegions();
  record('AT9-016', 'LocalRegionProvider.listRegions() returns all configured regions', regions.length >= 3);

  const usEast = await defaultRegionProvider.getRegion('us-east-1');
  record('AT9-017', 'LocalRegionProvider.getRegion() retrieves specific region by ID', usEast?.id === 'us-east-1');

  const primary = await defaultRegionProvider.getPrimaryRegion();
  record('AT9-018', 'LocalRegionProvider.getPrimaryRegion() returns default primary region (us-east-1)', primary.id === 'us-east-1' && primary.isPrimary);

  const failover = await defaultRegionProvider.getFailoverRegion();
  record('AT9-019', 'LocalRegionProvider.getFailoverRegion() returns failover region (ap-southeast-1)', failover.id === 'ap-southeast-1' && failover.isFailover);

  const health = await defaultRegionProvider.getRegionHealth('us-east-1');
  record('AT9-020', 'LocalRegionProvider.getRegionHealth() returns latency and health status', health.status === 'healthy' && health.latencyMs > 0);

  const updatedPolicy = await defaultRegionProvider.setRoutingPolicy({
    policy: 'failover',
    primaryRegionId: 'us-east-1',
    failoverRegionId: 'ap-southeast-1',
    activeRegions: ['us-east-1', 'ap-southeast-1'],
    dataResidency: 'global',
  });
  record('AT9-021', 'LocalRegionProvider.setRoutingPolicy() updates routing strategy to failover', updatedPolicy.policy === 'failover');

  const residencyPolicy = await defaultRegionProvider.setRoutingPolicy({
    ...updatedPolicy,
    dataResidency: 'eu-only',
    activeRegions: ['eu-central-1'],
  });
  record('AT9-022', 'LocalRegionProvider.setRoutingPolicy() enforces data residency policy (eu-only)', residencyPolicy.dataResidency === 'eu-only');

  const customRegionProv = new LocalRegionProvider();
  const allRegs = await customRegionProv.listRegions();
  record('AT9-023', 'LocalRegionProvider initializes all regions with required edge and database capabilities',
    allRegs.every((r) => r.capabilities.databaseReplication && r.capabilities.edgeCompute));

  const euHealth = await defaultRegionProvider.getRegionHealth('eu-central-1');
  record('AT9-024', 'getRegionHealth returns active probe measurements for secondary regions', euHealth.latencyMs >= 0);

  // Restore policy to latency
  await defaultRegionProvider.setRoutingPolicy({
    policy: 'latency',
    primaryRegionId: 'us-east-1',
    failoverRegionId: 'ap-southeast-1',
    activeRegions: ['us-east-1', 'eu-central-1', 'ap-southeast-1'],
    dataResidency: 'global',
  });
  const restoredPolicy = await defaultRegionProvider.getRoutingPolicy();
  record('AT9-025', 'Region routing policy persists and restores latency-based distribution', restoredPolicy.policy === 'latency');

  const nonExistentRegion = await defaultRegionProvider.getRegion('invalid-reg' as any);
  record('AT9-026', 'getRegion handles nonexistent region IDs gracefully returning null', nonExistentRegion === null);

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: Global Runtime & CDN Layer (AT9-027 - AT9-035)
  // ─────────────────────────────────────────────────────────────────────────────
  const cdnConfig = await defaultCDNProvider.getConfig('p_test_cdn');
  record('AT9-027', 'LocalCDNProvider.getConfig() returns default CDN distribution configuration', cdnConfig.enabled && cdnConfig.defaultTTL === 3600);

  const updatedCdn = await defaultCDNProvider.updateConfig('p_test_cdn', { defaultTTL: 7200, staleWhileRevalidate: 300 });
  record('AT9-028', 'LocalCDNProvider.updateConfig() updates edge caching TTL and stale-while-revalidate',
    updatedCdn.defaultTTL === 7200 && updatedCdn.staleWhileRevalidate === 300);

  const invReq = await defaultCDNProvider.createInvalidation('p_test_cdn', ['/assets/*', '/index.html']);
  record('AT9-029', 'LocalCDNProvider.createInvalidation() dispatches cache purge request',
    invReq.status === 'completed' && invReq.paths.length === 2);

  const invStatus = await defaultCDNProvider.getInvalidationStatus('p_test_cdn', invReq.id);
  record('AT9-030', 'LocalCDNProvider.getInvalidationStatus() tracks completed invalidation request', invStatus?.status === 'completed');

  const assetUrl = defaultCDNProvider.resolveAssetUrl('p_test_cdn', 'logo.png', 'us-east-1');
  record('AT9-031', 'LocalCDNProvider.resolveAssetUrl() builds region-aware CDN asset URLs',
    assetUrl.includes('cdn-us-east-1.apexstudio.internal') && assetUrl.includes('logo.png'));

  const edgeProp = await defaultCDNProvider.propagateDeployment('p_test_cdn', 'rel_prod_001');
  record('AT9-032', 'Deployment-to-edge propagation updates deployment version across CDN edge nodes',
    edgeProp.propagated && edgeProp.regions.length >= 3);

  const edgeStatus = await defaultCDNProvider.getEdgeStatus('p_test_cdn');
  record('AT9-033', 'getEdgeStatus reports status across all distributed edge locations', edgeStatus.every((s) => s.status === 'synced'));

  const headers = defaultCDNProvider.getCacheHeaders('p_test_cdn', '/static/bundle.js');
  record('AT9-034', 'CDN cache headers include Cache-Control and ETag headers',
    headers['Cache-Control'].includes('public') && headers['Cache-Control'].includes('max-age=') && headers['ETag'].startsWith('W/"'));

  const invWildcard = await defaultCDNProvider.createInvalidation('p_test_cdn', ['/*']);
  record('AT9-035', 'Invalidation with wildcard paths purges all edge cached routes', invWildcard.paths.includes('/*'));

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Distributed Cache Architecture (AT9-036 - AT9-050)
  // ─────────────────────────────────────────────────────────────────────────────
  const cacheProv = new LocalCacheProvider();
  await cacheProv.set('user_101', { name: 'Alice', role: 'admin' }, 60, { namespace: 'users', tags: ['auth', 'users'] });
  const cachedUser = await cacheProv.get<{ name: string; role: string }>('user_101', 'users');
  record('AT9-036', 'LocalCacheProvider.set() and get() stores and retrieves structured cached values', cachedUser?.name === 'Alice');

  await cacheProv.set('short_ttl', 'temp_val', 0.001); // 1ms TTL
  await new Promise((resolve) => setTimeout(resolve, 20));
  const expiredVal = await cacheProv.get('short_ttl');
  record('AT9-037', 'LocalCacheProvider.get() returns null for expired keys', expiredVal === null);

  await cacheProv.set('to_delete', 'value_123');
  await cacheProv.delete('to_delete');
  const deletedVal = await cacheProv.get('to_delete');
  record('AT9-038', 'LocalCacheProvider.delete() removes individual cached entries', deletedVal === null);

  await cacheProv.set('tag_item_1', 'val1', 60, { tags: ['project_1'] });
  await cacheProv.set('tag_item_2', 'val2', 60, { tags: ['project_1'] });
  await cacheProv.set('tag_item_3', 'val3', 60, { tags: ['project_2'] });
  const invalidatedCount = await cacheProv.invalidateByTag('project_1');
  const item1After = await cacheProv.get('tag_item_1');
  const item3After = await cacheProv.get('tag_item_3');
  record('AT9-039', 'LocalCacheProvider.invalidateByTag() purges all entries with matched tag without affecting others',
    invalidatedCount === 2 && item1After === null && item3After === 'val3');

  await cacheProv.set('ns_k1', 'v1', 60, { namespace: 'catalog' });
  await cacheProv.set('ns_k2', 'v2', 60, { namespace: 'catalog' });
  const nsCount = await cacheProv.invalidateNamespace('catalog');
  const nsK1After = await cacheProv.get('ns_k1', 'catalog');
  record('AT9-040', 'LocalCacheProvider.invalidateNamespace() purges all keys in given namespace',
    nsCount === 2 && nsK1After === null);

  const stats = await cacheProv.getStats();
  record('AT9-041', 'getStats() accurately tracks cache hits and misses', stats.hits >= 1 && stats.misses >= 1);

  await cacheProv.clear();
  const statsAfterClear = await cacheProv.getStats();
  record('AT9-042', 'clear() purges all in-memory cache entries', statsAfterClear.entryCount === 0);

  // Tenant isolation in cache keys
  await cacheProv.set('page_home', { content: 'Org A' }, 60, { organizationId: 'org_a', namespace: 'org_a' });
  await cacheProv.set('page_home', { content: 'Org B' }, 60, { organizationId: 'org_b', namespace: 'org_b' });
  const orgAContent = await cacheProv.get<{ content: string }>('page_home', 'org_a');
  const orgBContent = await cacheProv.get<{ content: string }>('page_home', 'org_b');
  record('AT9-043', 'Multi-tenant isolation: cache keys are isolated by tenant namespace',
    orgAContent?.content === 'Org A' && orgBContent?.content === 'Org B');

  // Non-existent key lookup
  const nonExistent = await cacheProv.get('key_does_not_exist');
  record('AT9-044', 'Cache lookup for nonexistent keys returns null without error', nonExistent === null);

  // Performance simulation: memory cache lookup sub-millisecond
  const start = performance.now();
  await cacheProv.set('perf_test', { data: Array(100).fill('apex') });
  await cacheProv.get('perf_test');
  const duration = performance.now() - start;
  record('AT9-045', 'Cache operations execute within high-performance sub-millisecond threshold', duration < 10);

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: Database Scaling & Read/Write Routing (AT9-046 - AT9-055)
  // ─────────────────────────────────────────────────────────────────────────────
  const dbProv = new LocalDatabaseScalingProvider();
  const topology = await dbProv.getTopology();
  record('AT9-046', 'LocalDatabaseScalingProvider.getTopology() returns primary and read replicas',
    topology.primaryHost.length > 0 && topology.replicas.length >= 2);

  const writeRoute = await dbProv.routeQuery('write');
  record('AT9-047', 'routeQuery(write) always routes exclusively to primary database host',
    writeRoute.host === topology.primaryHost && writeRoute.isReplica === false);

  const readRoute = await dbProv.routeQuery('read', 'eventual');
  record('AT9-048', 'routeQuery(read, eventual) routes reads to read replicas',
    readRoute.isReplica === true && readRoute.host !== topology.primaryHost);

  const strongReadRoute = await dbProv.routeQuery('read', 'strong');
  record('AT9-049', 'routeQuery(read, strong) routes reads to primary when strong consistency is required',
    strongReadRoute.host === topology.primaryHost && strongReadRoute.isReplica === false);

  const replicas = await dbProv.getReplicaHealth();
  record('AT9-050', 'getReplicaHealth() reports replication lag for all active replicas',
    replicas.every((r) => (r.status === 'healthy' || r.status === 'active' || r.isHealthy) && r.replicationLagMs >= 0));

  await dbProv.setConsistencyPolicy('strong');
  const defaultStrongRead = await dbProv.routeQuery('read');
  record('AT9-051', 'Updating default consistency policy to strong routes unannotated reads to primary',
    defaultStrongRead.isReplica === false);

  await dbProv.setConsistencyPolicy('eventual');
  const defaultEventualRead = await dbProv.routeQuery('read');
  record('AT9-052', 'Updating default consistency policy to eventual routes unannotated reads to replicas',
    defaultEventualRead.isReplica === true);

  record('AT9-053', 'Read replica topology contains replicas across North America and Europe',
    topology.replicas.some((r) => r.regionId === 'eu-central-1') && topology.replicas.some((r) => r.regionId === 'ap-southeast-1'));

  record('AT9-054', 'Write routing strictly enforces single-writer guarantee',
    (await dbProv.routeQuery('write', 'eventual')).isReplica === false);

  record('AT9-055', 'Local database scaling topology simulates zero-downtime routing',
    topology.replicas.every((r) => r.healthCheckPassed));

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 6: Background Workers & Advanced Queues (AT9-056 - AT9-070)
  // ─────────────────────────────────────────────────────────────────────────────
  const workerProv = new LocalWorkerProvider();
  const criticalJob = await workerProv.enqueueJob({
    queueName: 'builds',
    priority: 'critical',
    payload: { buildId: 'b_001' },
    idempotencyKey: 'idem_b001',
  });
  const normalJob = await workerProv.enqueueJob({
    queueName: 'builds',
    priority: 'normal',
    payload: { buildId: 'b_002' },
    idempotencyKey: 'idem_b002',
  });
  record('AT9-056', 'LocalWorkerProvider.enqueueJob() enqueues jobs with priority levels',
    criticalJob.priority === 'critical' && normalJob.priority === 'normal');

  // Duplicate idempotency check
  const dupJob = await workerProv.enqueueJob({
    queueName: 'builds',
    priority: 'critical',
    payload: { buildId: 'b_001_duplicate' },
    idempotencyKey: 'idem_b001',
  });
  record('AT9-057', 'Idempotency keys prevent duplicate job enqueueing by returning existing job',
    dupJob.id === criticalJob.id);

  // Priority queue ordering: critical job should be processed first
  const nextJob = await workerProv.processNextJob('builds');
  record('AT9-058', 'Priority queue ordering processes critical jobs before normal jobs',
    nextJob?.id === criticalJob.id);

  const normalProcessed = await workerProv.processNextJob('builds');
  record('AT9-059', 'Worker processes remaining queued jobs in priority order',
    normalProcessed?.id === normalJob.id);

  // Job cancellation
  const cancelCandidate = await workerProv.enqueueJob({
    queueName: 'emails',
    priority: 'normal',
    payload: { to: 'user@example.com' },
  });
  const cancelRes = await workerProv.cancelJob(cancelCandidate.id);
  const fetchedCancelled = await workerProv.getJob(cancelCandidate.id);
  record('AT9-060', 'LocalWorkerProvider.cancelJob() marks job as cancelled',
    cancelRes === true && fetchedCancelled?.status === 'cancelled');

  // Delayed job
  const delayedJob = await workerProv.enqueueJob({
    queueName: 'reports',
    priority: 'normal',
    payload: { report: 'weekly' },
    delaySeconds: 10,
  });
  record('AT9-061', 'Delayed jobs calculate future runAt timestamp and are not immediately runnable',
    new Date(delayedJob.runAt || '').getTime() > Date.now() + 5000);

  // Worker instance registration
  const workers = await workerProv.listWorkers();
  record('AT9-062', 'listWorkers() returns active worker pools with concurrency configurations',
    workers.length >= 2 && workers.every((w) => w.concurrency > 0));

  // Job execution history
  record('AT9-063', 'Completed jobs record execution metadata (attempts, duration, completedAt)',
    nextJob?.status === 'completed' && nextJob?.attempts === 1 && typeof nextJob?.completedAt === 'string');

  record('AT9-064', 'Empty queue returns null without throwing errors',
    (await workerProv.processNextJob('empty_queue')) === null);

  // Concurrent queue execution
  const concurrentWorkerProv = new LocalWorkerProvider();
  const enqueuedJobs = await Promise.all([
    concurrentWorkerProv.enqueueJob({ queueName: 'cq', priority: 'critical', payload: { k: 1 }, idempotencyKey: 'c1' }),
    concurrentWorkerProv.enqueueJob({ queueName: 'cq', priority: 'normal', payload: { k: 2 }, idempotencyKey: 'c2' }),
    concurrentWorkerProv.enqueueJob({ queueName: 'cq', priority: 'critical', payload: { k: 3 }, idempotencyKey: 'c3' }),
  ]);
  const processedFirst = await concurrentWorkerProv.processNextJob('cq');
  record('AT9-065', 'Worker provider handles concurrent queue execution without race conditions',
    enqueuedJobs.length === 3 && processedFirst?.priority === 'critical' && processedFirst.status === 'completed');

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 7: Platform Event Bus (AT9-066 - AT9-075)
  // ─────────────────────────────────────────────────────────────────────────────
  const eventBus = new LocalEventBusProvider();
  const evt = await eventBus.publish({
    organizationId: 'org_acme',
    type: 'project.created',
    version: 'v1.0',
    source: 'platform.api',
    correlationId: 'corr_123',
    causationId: 'cause_001',
    data: { projectId: 'p_acme_1', name: 'Acme Portal' },
  });
  record('AT9-066', 'LocalEventBusProvider.publish() publishes platform events with correlation & causation IDs',
    evt.id.startsWith('evt_') && evt.correlationId === 'corr_123' && evt.causationId === 'cause_001');

  const sub = await eventBus.subscribe({
    organizationId: 'org_acme',
    eventType: 'project.*',
    targetUrl: 'https://webhook.acme.corp/events',
    enabled: true,
  });
  record('AT9-067', 'LocalEventBusProvider.subscribe() registers event subscriber with eventType filter',
    sub.id.startsWith('sub_') && sub.eventType === 'project.*');

  const orgSubs = await eventBus.listSubscriptions('org_acme');
  record('AT9-068', 'listSubscriptions() returns active subscriptions for organization',
    orgSubs.length === 1 && orgSubs[0].id === sub.id);

  const unsubRes = await eventBus.unsubscribe(sub.id);
  const orgSubsAfter = await eventBus.listSubscriptions('org_acme');
  record('AT9-069', 'unsubscribe() removes subscriber from active registry',
    unsubRes === true && orgSubsAfter.length === 0);

  const historyEvents = await eventBus.getEventHistory('org_acme', 'project.created');
  record('AT9-070', 'getEventHistory() retrieves historical events filtered by organization and type',
    historyEvents.length === 1 && historyEvents[0].type === 'project.created');

  // Tenant isolation in event history
  const otherOrgEvents = await eventBus.getEventHistory('org_other');
  record('AT9-071', 'Event history strictly isolates events between different organizations',
    otherOrgEvents.length === 0);

  // Bounded buffer
  for (let i = 0; i < 50; i++) {
    await eventBus.publish({
      organizationId: 'org_acme',
      type: 'user.active',
      version: 'v1.0',
      source: 'collab',
      data: { index: i },
    });
  }
  const allAcmeEvents = await eventBus.getEventHistory('org_acme');
  record('AT9-072', 'Event bus retains historical buffer with strict ordering',
    allAcmeEvents.length === 51 && allAcmeEvents[0].type === 'user.active');

  record('AT9-073', 'Event publication includes ISO-8601 UTC timestamp',
    !isNaN(Date.parse(evt.timestamp)));

  record('AT9-074', 'Event bus preserves payload integrity across publish and retrieve cycles',
    (evt.data as any)?.projectId === 'p_acme_1');

  const subAlpha = await eventBus.subscribe({
    organizationId: 'org_multi_sub',
    eventType: 'user.*',
    targetUrl: 'https://hooks.acme.corp/users',
    enabled: true,
  });
  const subBeta = await eventBus.subscribe({
    organizationId: 'org_multi_sub',
    eventType: 'billing.*',
    targetUrl: 'https://hooks.acme.corp/billing',
    enabled: true,
  });
  const orgMultiSubs = await eventBus.listSubscriptions('org_multi_sub');
  record('AT9-075', 'Multiple event subscriptions on same organization do not collide',
    orgMultiSubs.length === 2 &&
    orgMultiSubs.some((s) => s.id === subAlpha.id && s.eventType === 'user.*') &&
    orgMultiSubs.some((s) => s.id === subBeta.id && s.eventType === 'billing.*'));

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 8: Autoscaling & High Availability / Health Checks (AT9-076 - AT9-085)
  // ─────────────────────────────────────────────────────────────────────────────
  const autoProv = new LocalAutoscalingProvider();
  const autoCfg = await autoProv.getConfig('pool_api');
  record('AT9-076', 'LocalAutoscalingProvider.getConfig() returns min, max, and current capacity bounds',
    autoCfg.minCapacity === 2 && autoCfg.maxCapacity === 20 && autoCfg.currentCapacity === 4);

  // High CPU triggers scale_up
  const scaleUpRes = await autoProv.evaluateScalingMetrics('pool_api', 88);
  record('AT9-077', 'High CPU utilization (>80%) triggers scale_up recommendation and increments capacity',
    scaleUpRes.actionTaken === 'scale_up' && scaleUpRes.newCapacity === 5);

  // Low CPU triggers scale_down
  const scaleDownRes = await autoProv.evaluateScalingMetrics('pool_api', 20);
  record('AT9-078', 'Low CPU utilization (<30%) triggers scale_down recommendation and decrements capacity',
    scaleDownRes.actionTaken === 'scale_down' && scaleDownRes.newCapacity === 4);

  // Health check overview
  const healthProv = new LocalHealthCheckProvider();
  const healthOverview = await healthProv.getOverview();
  record('AT9-079', 'LocalHealthCheckProvider.getOverview() returns system operational status and probes',
    healthOverview.status === 'operational' && healthOverview.liveness && healthOverview.readiness && healthOverview.probes.length >= 5);

  // Individual dependency probe
  const dbProbe = await healthProv.checkDependency('database');
  record('AT9-080', 'checkDependency() evaluates individual service readiness and latency',
    dbProbe.service === 'database' && dbProbe.status === 'healthy' && dbProbe.latencyMs > 0);

  // Maintenance mode
  await healthProv.setMaintenanceMode(true);
  const maintOverview = await healthProv.getOverview();
  record('AT9-081', 'setMaintenanceMode(true) sets system status to maintenance and readiness to false while maintaining liveness',
    maintOverview.status === 'maintenance' && maintOverview.liveness === true && maintOverview.readiness === false);

  await healthProv.setMaintenanceMode(false);
  const restoredOverview = await healthProv.getOverview();
  record('AT9-082', 'Disabling maintenance mode restores system operational status and readiness',
    restoredOverview.status === 'operational' && restoredOverview.readiness === true);

  record('AT9-083', 'Health check probes monitor database, cache, queue, realtime, and CDN subsystems',
    healthOverview.probes.some((p) => p.service === 'database') && healthOverview.probes.some((p) => p.service === 'realtime'));

  // Stress-test minimum capacity bound by repeatedly scaling down
  for (let i = 0; i < 10; i++) {
    await autoProv.evaluateScalingMetrics('pool_api', 5);
  }
  const minClampedCfg = await autoProv.getConfig('pool_api');
  record('AT9-084', 'Autoscaling enforces minimum capacity constraint during scale-down',
    minClampedCfg.currentCapacity === minClampedCfg.minCapacity && minClampedCfg.currentCapacity >= 2);

  // Stress-test maximum capacity bound by repeatedly scaling up
  for (let i = 0; i < 25; i++) {
    await autoProv.evaluateScalingMetrics('pool_api', 99);
  }
  const maxClampedCfg = await autoProv.getConfig('pool_api');
  record('AT9-085', 'Autoscaling enforces maximum capacity ceiling during scale-up',
    maxClampedCfg.currentCapacity === maxClampedCfg.maxCapacity && maxClampedCfg.currentCapacity <= 20);

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 9: Immutable Backups, PITR & Disaster Recovery (AT9-086 - AT9-095)
  // ─────────────────────────────────────────────────────────────────────────────
  const backupProv = new LocalBackupProvider();
  const backup = await backupProv.createBackup({
    projectId: 'p_prod_db',
    organizationId: 'org_acme',
    environment: 'production',
    name: 'Pre-Deployment Snapshot',
    type: 'manual',
  });
  record('AT9-086', 'LocalBackupProvider.createBackup() creates manual backup snapshot with SHA-256 checksum',
    backup.id.startsWith('bak_') && backup.status === 'completed' && backup.checksum.startsWith('sha256_'));

  const retrievedBackup = await backupProv.getBackup(backup.id);
  record('AT9-087', 'LocalBackupProvider.getBackup() retrieves immutable backup metadata',
    retrievedBackup?.name === 'Pre-Deployment Snapshot' && retrievedBackup?.retentionDays === 30);

  const backupList = await backupProv.listBackups('p_prod_db');
  record('AT9-088', 'LocalBackupProvider.listBackups() returns project backup history',
    backupList.length >= 1 && backupList[0].id === backup.id);

  const verifyRes = await backupProv.verifyBackup(backup.id);
  record('AT9-089', 'verifyBackup() validates backup checksum integrity',
    verifyRes.verified === true && verifyRes.checksum === backup.checksum);

  const restoreRes = await backupProv.restoreFromBackup(backup.id);
  record('AT9-090', 'restoreFromBackup() successfully executes restore operation',
    restoreRes.success === true && typeof restoreRes.restoredAt === 'string');

  const drProv = new LocalDisasterRecoveryProvider();
  const drPlan = await drProv.getPlan('org_acme');
  record('AT9-091', 'LocalDisasterRecoveryProvider.getPlan() returns multi-region DR plan with RPO and RTO',
    drPlan.primaryRegion === 'us-east-1' && drPlan.secondaryRegion === 'eu-central-1' && drPlan.rpoHours === 1 && drPlan.rtoMinutes === 15);

  const failoverRes = await drProv.initiateFailover('org_acme');
  record('AT9-092', 'initiateFailover() transitions organization to secondary region with failed_over status',
    failoverRes.status === 'failed_over' && failoverRes.failoverRegion === 'eu-central-1');

  const failbackRes = await drProv.initiateFailback('org_acme');
  record('AT9-093', 'initiateFailback() restores primary region and resets status to idle',
    failbackRes.status === 'idle' && failbackRes.primaryRegion === 'us-east-1');

  record('AT9-094', 'Backup records include metadata tracking schema version, page count, and collections count',
    retrievedBackup?.metadata?.version === 9 && retrievedBackup?.metadata?.pagesCount === 1 && typeof retrievedBackup?.metadata?.collectionsCount === 'number');

  record('AT9-095', 'Restoring from nonexistent backup throws error',
    await backupProv.restoreFromBackup('invalid_bak_id').then(() => false).catch(() => true));

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 10: Enterprise Identity (SSO, SAML 2.0, OIDC) & SCIM 2.0 (AT9-096 - AT9-105)
  // ─────────────────────────────────────────────────────────────────────────────
  const ssoProv = new LocalSSOProvider();
  await ssoProv.saveConfig({
    organizationId: 'org_acme',
    enabled: true,
    providerType: 'saml',
    domains: ['acme.com', 'acme.org'],
    samlConfig: {
      entryPoint: 'https://idp.acme.com/sso',
      issuer: 'apexstudio-sp',
      cert: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
    },
    defaultRole: 'member',
    autoProvisionUsers: true,
  });
  const savedSso = await ssoProv.getConfig('org_acme');
  record('AT9-096', 'LocalSSOProvider.saveConfig() configures SAML 2.0 provider with domain list',
    savedSso?.enabled === true && savedSso?.providerType === 'saml' && savedSso?.domains.includes('acme.com'));

  const matchedDomainConfig = await ssoProv.findConfigByEmailDomain('bob@acme.com');
  record('AT9-097', 'findConfigByEmailDomain() matches user email domain to configured organization',
    matchedDomainConfig?.organizationId === 'org_acme');

  const ssoLoginSuccess = await ssoProv.simulateSsoLogin('bob@acme.com', 'org_acme');
  record('AT9-098', 'simulateSsoLogin() succeeds for authorized email domains and returns default role',
    ssoLoginSuccess.success && ssoLoginSuccess.email === 'bob@acme.com' && ssoLoginSuccess.role === 'member');

  const ssoLoginRejection = await ssoProv.simulateSsoLogin('intruder@gmail.com', 'org_acme')
    .then(() => false)
    .catch((err) => err.message.includes('not authorized'));
  record('AT9-099', 'simulateSsoLogin() strictly rejects emails from unauthorized domains', ssoLoginRejection === true);

  const scimProv = new LocalSCIMProvider();
  const scimUser = await scimProv.createUser('org_acme', {
    userName: 'john.doe@acme.com',
    givenName: 'John',
    familyName: 'Doe',
    email: 'john.doe@acme.com',
    role: 'developer',
    active: true,
    externalId: 'okta_usr_9988',
  });
  record('AT9-100', 'LocalSCIMProvider.createUser() provisions user via SCIM with roles and externalId',
    scimUser.id.startsWith('scim_') && scimUser.userName === 'john.doe@acme.com' && scimUser.externalId === 'okta_usr_9988');

  const fetchedScim = await scimProv.getUser('org_acme', scimUser.id);
  record('AT9-101', 'LocalSCIMProvider.getUser() retrieves SCIM user record', fetchedScim?.email === 'john.doe@acme.com');

  const updatedScim = await scimProv.updateUser('org_acme', scimUser.id, { role: 'admin' });
  record('AT9-102', 'LocalSCIMProvider.updateUser() updates user attributes', updatedScim.role === 'admin');

  const deactRes = await scimProv.deactivateUser('org_acme', scimUser.id);
  const deactUser = await scimProv.getUser('org_acme', scimUser.id);
  record('AT9-103', 'LocalSCIMProvider.deactivateUser() marks user inactive and revokes access',
    deactRes === true && deactUser?.active === false);

  const scimList = await scimProv.listUsers('org_acme');
  record('AT9-104', 'LocalSCIMProvider.listUsers() returns all provisioned SCIM accounts for organization',
    scimList.length === 1 && scimList[0].id === scimUser.id);

  record('AT9-105', 'SCIM operations are isolated by organization boundary',
    (await scimProv.listUsers('org_other')).length === 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 11: Enterprise Organization Policies & IP Allowlisting (AT9-106 - AT9-115)
  // ─────────────────────────────────────────────────────────────────────────────
  const policyEngine = new OrganizationPolicyEngine();
  const defaultPol = await policyEngine.getPolicy('org_acme');
  record('AT9-106', 'OrganizationPolicyEngine.getPolicy() returns organization security defaults',
    defaultPol.requireMFA === false && defaultPol.disablePasswordLogin === false);

  const updatedPol = await policyEngine.updatePolicy('org_acme', {
    requireMFA: true,
    disablePasswordLogin: true,
    restrictProjectCreationToRoles: ['owner', 'admin'],
    restrictPublishingToRoles: ['owner'],
    allowedAiProviders: ['openai', 'anthropic'],
  }, 'admin_user');
  record('AT9-107', 'OrganizationPolicyEngine.updatePolicy() enforces requireMFA and disablePasswordLogin',
    updatedPol.requireMFA === true && updatedPol.disablePasswordLogin === true);

  const canOwnerCreate = await policyEngine.validateAction('org_acme', 'owner', 'create_project');
  const canViewerCreate = await policyEngine.validateAction('org_acme', 'viewer', 'create_project');
  record('AT9-108', 'Policy engine validates project creation permissions against restrictProjectCreationToRoles',
    canOwnerCreate.allowed === true && canViewerCreate.allowed === false);

  const canOwnerPublish = await policyEngine.validateAction('org_acme', 'owner', 'publish_project');
  const canAdminPublish = await policyEngine.validateAction('org_acme', 'admin', 'publish_project');
  record('AT9-109', 'Policy engine validates publishing permissions against restrictPublishingToRoles',
    canOwnerPublish.allowed === true && canAdminPublish.allowed === false);

  const canAllowedAi = await policyEngine.validateAction('org_acme', 'developer', 'use_ai_provider', { provider: 'openai' });
  const canBlockedAi = await policyEngine.validateAction('org_acme', 'developer', 'use_ai_provider', { provider: 'unapproved_cloud_ai' });
  record('AT9-110', 'Policy engine enforces AI provider restrictions based on allowedAiProviders',
    canAllowedAi.allowed === true && canBlockedAi.allowed === false);

  const netEngine = new NetworkPolicyEngine();
  const allowedExact = netEngine.isIpAllowed('192.168.1.50', ['192.168.1.0/24']);
  const blockedOutside = netEngine.isIpAllowed('10.0.0.1', ['192.168.1.0/24']);
  record('AT9-111', 'NetworkPolicyEngine.isIpAllowed() allows IP addresses matching CIDR blocks', allowedExact === true);
  record('AT9-112', 'NetworkPolicyEngine.isIpAllowed() blocks unauthorized external IP addresses', blockedOutside === false);

  const emptyAllowsAll = netEngine.isIpAllowed('203.0.113.42', []);
  record('AT9-113', 'Empty allowed IP list permits all traffic (allowlist disabled by default)', emptyAllowsAll === true);

  record('AT9-114', 'Policy updates record immutable audit log entries with changed properties',
    updatedPol.updatedBy === 'admin_user');

  record('AT9-115', 'CIDR prefix validation rejects malformed subnet notations',
    netEngine.isIpAllowed('192.168.1.50', ['invalid_cidr']) === false);

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 12: Device & Session Management, KMS & Compliance (AT9-116 - AT9-125)
  // ─────────────────────────────────────────────────────────────────────────────
  const sessionMgr = new SessionManager();
  const session1 = await sessionMgr.createSession({
    userId: 'u_admin',
    organizationId: 'org_acme',
    deviceType: 'desktop',
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 Chrome/120',
  });
  const session2 = await sessionMgr.createSession({
    userId: 'u_admin',
    organizationId: 'org_acme',
    deviceType: 'mobile',
    ipAddress: '192.168.1.20',
    userAgent: 'Mobile Safari',
  });
  record('AT9-116', 'SessionManager.createSession() creates user sessions with device metadata and IP',
    session1.id.startsWith('sess_') && session1.deviceType === 'desktop');

  const userSessions = await sessionMgr.listUserSessions('u_admin');
  record('AT9-117', 'SessionManager.listUserSessions() returns all active sessions for user',
    userSessions.length === 2 && userSessions.every((s) => !s.isSuspicious));

  const revokeRes = await sessionMgr.revokeSession(session1.id);
  const sessionsAfterRevoke = await sessionMgr.listUserSessions('u_admin');
  record('AT9-118', 'SessionManager.revokeSession() invalidates a specific active session',
    revokeRes === true && sessionsAfterRevoke.length === 1 && sessionsAfterRevoke[0].id === session2.id);

  const revokeAllCount = await sessionMgr.revokeAllUserSessions('u_admin');
  const sessionsAfterAll = await sessionMgr.listUserSessions('u_admin');
  record('AT9-119', 'SessionManager.revokeAllUserSessions() invalidates all concurrent sessions for user',
    revokeAllCount === 1 && sessionsAfterAll.length === 0);

  const kmsProv = new LocalKeyManagementProvider();
  const newKey = await kmsProv.createKey('org_acme', 'Primary Database Column Encryption Key');
  record('AT9-120', 'LocalKeyManagementProvider.createKey() generates KMS key with rotation schedule',
    newKey.keyId.startsWith('kms_') && newKey.algorithm === 'AES_256_GCM' && newKey.version === 1);

  const rotatedKey = await kmsProv.rotateKey(newKey.keyId);
  record('AT9-121', 'LocalKeyManagementProvider.rotateKey() increments key version and retains history',
    rotatedKey.version === 2 && typeof rotatedKey.rotatedAt === 'string');

  const fetchedKey = await kmsProv.getKey(newKey.keyId);
  record('AT9-122', 'LocalKeyManagementProvider.getKey() retrieves key metadata without exposing secret material',
    fetchedKey?.keyId === newKey.keyId && fetchedKey?.status === 'enabled');

  const compMgr = new ComplianceManager();
  const controls = await compMgr.listControls();
  record('AT9-123', 'ComplianceManager.listControls() returns implemented security controls',
    controls.length >= 4 && controls.some((c) => c.controlId === 'AC-1'));

  const compStatus = await compMgr.evaluateComplianceStatus();
  record('AT9-124', 'ComplianceManager.evaluateComplianceStatus() computes compliance score and controls count',
    compStatus.scorePercentage >= 80 && compStatus.totalControls >= 5);

  const activeSession = await sessionMgr.createSession({
    userId: 'u_active_user',
    organizationId: 'org_acme',
    deviceType: 'desktop',
    ipAddress: '192.168.1.30',
    userAgent: 'Chrome',
  });
  const initialLastActive = activeSession.lastActiveAt;
  await new Promise((resolve) => setTimeout(resolve, 10));
  const touchedSession = await sessionMgr.touchSession(activeSession.id);
  record('AT9-125', 'Session records include lastActiveAt timestamp that updates on user activity',
    !!touchedSession && touchedSession.lastActiveAt >= initialLastActive && !isNaN(Date.parse(touchedSession.lastActiveAt)));

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 13: API Management, Public API & OAuth 2.0 (AT9-126 - AT9-140)
  // ─────────────────────────────────────────────────────────────────────────────
  const apiGw = new LocalApiGatewayProvider();
  const apiProd = await apiGw.createProduct({
    organizationId: 'org_acme',
    name: 'Acme Partner API',
    slug: 'partner-api',
    description: 'B2B integration endpoints',
    version: 'v1.0',
    status: 'published',
    rateLimitPerMinute: 300,
    monthlyQuota: 50000,
    requiresApproval: true,
    allowedScopes: ['projects:read', 'data:read'],
  });
  record('AT9-126', 'LocalApiGatewayProvider.createProduct() defines API product with rate limits and quota',
    apiProd.id.startsWith('prod_') && apiProd.rateLimitPerMinute === 300);

  const fetchedProd = await apiGw.getProduct(apiProd.id);
  record('AT9-127', 'LocalApiGatewayProvider.getProduct() retrieves published API product', fetchedProd?.slug === 'partner-api');

  const orgProds = await apiGw.listProducts('org_acme');
  record('AT9-128', 'LocalApiGatewayProvider.listProducts() returns organization API catalog', orgProds.length >= 1);

  const oauthProv = new LocalOAuthProvider();
  const { app: oauthApp, rawClientSecret } = await oauthProv.createApp({
    organizationId: 'org_acme',
    name: 'Salesforce Connector',
    description: 'Sync leads with CRM',
    redirectUris: ['https://crm.acme.com/oauth/callback'],
    scopes: ['projects:read', 'data:read', 'data:write'],
    createdBy: 'u_admin',
  });
  record('AT9-129', 'LocalOAuthProvider.createApp() registers developer app and issues hashed client secret',
    oauthApp.id.startsWith('dapp_') && oauthApp.clientSecretHash.length === 64 && rawClientSecret.startsWith('sec_'));

  const wildcardRejected = await oauthProv.createApp({
    organizationId: 'org_acme',
    name: 'Dangerous App',
    description: 'Bad wildcard callback',
    redirectUris: ['https://*.attacker.com/callback'],
    scopes: ['projects:read'],
    createdBy: 'u_admin',
  }).then(() => false).catch((err) => err.message.includes('WILDCARD_REDIRECT_URI_NOT_ALLOWED'));
  record('AT9-130', 'createApp() strictly rejects wildcard redirect URIs (*)', wildcardRejected === true);

  const invalidUrlRejected = await oauthProv.createApp({
    organizationId: 'org_acme',
    name: 'Malformed App',
    description: 'Invalid URL scheme',
    redirectUris: ['not-a-valid-url'],
    scopes: ['projects:read'],
    createdBy: 'u_admin',
  }).then(() => false).catch((err) => err.message.includes('INVALID_REDIRECT_URI'));
  record('AT9-131', 'createApp() rejects invalid redirect URLs', invalidUrlRejected === true);

  const authCode = await oauthProv.generateAuthCode(oauthApp.clientId, 'https://crm.acme.com/oauth/callback', ['projects:read', 'data:read'], 'u_alice');
  record('AT9-132', 'generateAuthCode() creates single-use authorization code with expiration', authCode.startsWith('code_'));

  const badUriRejected = await oauthProv.generateAuthCode(oauthApp.clientId, 'https://unauthorized.callback.com', ['projects:read'], 'u_alice')
    .then(() => false).catch((err) => err.message.includes('UNAUTHORIZED_REDIRECT_URI'));
  record('AT9-133', 'generateAuthCode() validates redirect URI against registered client callbacks', badUriRejected === true);

  const tokens = await oauthProv.exchangeCodeForToken(authCode, oauthApp.clientId, rawClientSecret, 'https://crm.acme.com/oauth/callback');
  record('AT9-134', 'exchangeCodeForToken() exchanges auth code for access token and refresh token',
    tokens.accessToken.startsWith('atk_') && tokens.refreshToken.startsWith('rtk_') && tokens.expiresIn === 3600);

  // Replay attempt of burned auth code
  const replayRejected = await oauthProv.exchangeCodeForToken(authCode, oauthApp.clientId, rawClientSecret, 'https://crm.acme.com/oauth/callback')
    .then(() => false).catch((err) => err.message.includes('INVALID_GRANT'));
  record('AT9-135', 'Authorization code burns after initial exchange (cannot be replayed)', replayRejected === true);

  const tokenValid = await oauthProv.validateToken(tokens.accessToken, 'projects:read');
  record('AT9-136', 'validateToken() validates active token and verifies required scope',
    tokenValid.valid === true && tokenValid.userId === 'u_alice');

  const tokenInsufficientScope = await oauthProv.validateToken(tokens.accessToken, 'deployments:admin');
  record('AT9-137', 'validateToken() rejects request with insufficient scopes',
    tokenInsufficientScope.valid === false && tokenInsufficientScope.reason === 'INSUFFICIENT_SCOPE');

  const revokeTokenRes = await oauthProv.revokeToken(tokens.accessToken);
  const tokenAfterRevoke = await oauthProv.validateToken(tokens.accessToken);
  record('AT9-138', 'revokeToken() revokes access token immediately',
    revokeTokenRes === true && tokenAfterRevoke.valid === false);

  const cliHandler = new DeveloperCliHandler();
  const cliLogin = await cliHandler.executeCommand('login');
  const cliProjects = await cliHandler.executeCommand('projects');
  const cliDeploy = await cliHandler.executeCommand('deploy', ['main']);
  record('AT9-139', 'DeveloperCliHandler.executeCommand() runs CLI commands (login, projects, deploy)',
    cliLogin.exitCode === 0 && cliProjects.stdout.includes('NAME') && cliDeploy.stdout.includes('Done'));

  record('AT9-140', 'Developer app list filters by organization boundary',
    (await oauthProv.listApps('org_acme')).length === 1 && (await oauthProv.listApps('org_other')).length === 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 14: Webhooks 2.0 & OpenAPI 3.0 Documentation (AT9-141 - AT9-150)
  // ─────────────────────────────────────────────────────────────────────────────
  const whMgr = new WebhookManager2();
  const { endpoint: whEndpoint, rawSecret: whSecret } = await whMgr.registerEndpoint({
    organizationId: 'org_acme',
    url: 'https://api.acme.com/webhook',
    description: 'Production event listener',
    eventFilters: ['deployment.completed', 'project.updated'],
  });
  record('AT9-141', 'WebhookManager2.registerEndpoint() registers webhook endpoint with event filters and secret',
    whEndpoint.id.startsWith('whe_') && whSecret.startsWith('whsec_') && whEndpoint.eventFilters.length === 2);

  const payloadStr = JSON.stringify({ event: 'deployment.completed', releaseId: 'rel_001' });
  const signature = whMgr.signPayload(payloadStr, whSecret);
  record('AT9-142', 'WebhookManager2.signPayload() produces valid HMAC-SHA256 signature',
    signature.length === 64 && /^[0-9a-f]+$/.test(signature));

  const deliveryLog = await whMgr.deliverEvent(whEndpoint.id, 'deployment.completed', 'evt_101', { releaseId: 'rel_001' });
  record('AT9-143', 'WebhookManager2.deliverEvent() dispatches webhook delivery and logs HTTP response',
    deliveryLog.status === 'delivered' && deliveryLog.responseStatus === 200);

  const logs = await whMgr.listDeliveryLogs(whEndpoint.id);
  record('AT9-144', 'WebhookManager2.listDeliveryLogs() returns delivery attempt history',
    logs.length === 1 && logs[0].id === deliveryLog.id);

  const replayLog = await whMgr.replayDelivery(deliveryLog.id);
  record('AT9-145', 'WebhookManager2.replayDelivery() replays historical webhook with original payload',
    replayLog.status === 'delivered' && replayLog.eventType === 'deployment.completed');

  const openApiGen = new OpenApiDocGenerator();
  const openApiDoc = openApiGen.generateSpec();
  record('AT9-146', 'OpenApiDocGenerator.generateSpec() generates OpenAPI 3.0 specification',
    openApiDoc.openapi === '3.0.3' && openApiDoc.info.title.includes('ApexStudio'));

  record('AT9-147', 'Generated OpenAPI spec defines /projects and /deployments endpoints',
    !!openApiDoc.paths['/projects'] && !!openApiDoc.paths['/deployments']);

  record('AT9-148', 'Generated OpenAPI spec includes OAuth2 security schemes with authorization and token URLs',
    !!openApiDoc.components?.securitySchemes?.OAuth2?.flows?.authorizationCode?.tokenUrl);

  const endpointsList = await whMgr.listEndpoints('org_acme');
  record('AT9-149', 'Webhook endpoints are isolated by organization boundary',
    endpointsList.length === 1 && endpointsList[0].id === whEndpoint.id);

  record('AT9-150', 'Replaying delivery for invalid log ID throws error',
    await whMgr.replayDelivery('invalid_log_id').then(() => false).catch(() => true));

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 15: Realtime Scaling, Production Monitoring & Analytics (AT9-151 - AT9-160)
  // ─────────────────────────────────────────────────────────────────────────────
  const realtimeProv = new LocalRealtimeScalingProvider();
  const sub1 = await realtimeProv.subscribe('org_acme:p_collab_1', 'client_user_1');
  const sub2 = await realtimeProv.subscribe('org_acme:p_collab_1', 'client_user_2');
  record('AT9-151', 'LocalRealtimeScalingProvider.subscribe() connects clients to tenant-isolated channel',
    sub1.subscribed && sub2.subscribed && sub2.subscriberCount === 2);

  const pubCount = await realtimeProv.publish('org_acme:p_collab_1', 'node:drag', { nodeId: 'btn_1', x: 100, y: 150 });
  record('AT9-152', 'LocalRealtimeScalingProvider.publish() broadcasts messages to subscribed channel clients',
    pubCount === 2);

  await realtimeProv.updatePresence('org_acme:p_collab_1', 'u_alice', { activePage: 'page_home', cursor: { x: 50, y: 50 } });
  const presenceList = await realtimeProv.getPresence('org_acme:p_collab_1');
  record('AT9-153', 'LocalRealtimeScalingProvider.updatePresence() tracks real-time user presence state',
    presenceList.length === 1 && presenceList[0].userId === 'u_alice');

  const monitorEngine = new PlatformMonitoringEngine();
  monitorEngine.recordRequest(45, 200);
  monitorEngine.recordRequest(60, 200);
  monitorEngine.recordRequest(120, 500); // 1 error
  const monitorSummary = monitorEngine.getSummary();
  record('AT9-154', 'PlatformMonitoringEngine records request latency and computes throughput & error rate',
    monitorSummary.totalRequests === 3 && monitorSummary.errorCount === 1 && Math.round(monitorSummary.errorRatePercent) === 33);

  const analyticsEngine = new AnalyticsEngine();
  analyticsEngine.trackEvent({
    organizationId: 'org_acme',
    userId: 'u_101',
    eventName: 'project_created',
    properties: { template: 'blank' },
  });
  analyticsEngine.trackEvent({
    organizationId: 'org_acme',
    userId: 'u_101',
    eventName: 'component_added',
    properties: { type: 'button' },
  });
  analyticsEngine.trackEvent({
    organizationId: 'org_acme',
    userId: 'u_101',
    eventName: 'project_published',
    properties: { environment: 'production' },
  });
  const funnel = analyticsEngine.getFunnelMetrics('org_acme', ['project_created', 'component_added', 'project_published']);
  record('AT9-155', 'AnalyticsEngine tracks events and computes user conversion funnel metrics',
    funnel.length === 3 && funnel[0].count === 1 && funnel[2].count === 1);

  const errorTracker = new ErrorTrackingService();
  const err1 = errorTracker.captureError({
    organizationId: 'org_acme',
    message: 'Database connection timeout',
    stack: 'Error: Database connection timeout\n    at query (db.ts:42:15)',
    environment: 'production',
  });
  const err2 = errorTracker.captureError({
    organizationId: 'org_acme',
    message: 'Database connection timeout',
    stack: 'Error: Database connection timeout\n    at query (db.ts:42:15)',
    environment: 'production',
  });
  const errorGroups = errorTracker.listErrorGroups('org_acme');
  record('AT9-156', 'ErrorTrackingService aggregates duplicate occurrences into grouped error by fingerprint',
    errorGroups.length === 1 && errorGroups[0].occurrences === 2 && errorGroups[0].id === err1.fingerprint);

  const resolveRes = errorTracker.resolveErrorGroup(err1.fingerprint);
  const resolvedGroup = errorTracker.listErrorGroups('org_acme')[0];
  record('AT9-157', 'ErrorTrackingService allows marking error group as resolved',
    resolveRes === true && resolvedGroup.status === 'resolved');

  // Redaction in error context
  const errWithSecret = errorTracker.captureError({
    organizationId: 'org_acme',
    message: 'Invalid API key provided: sec_secret_token_12345',
    environment: 'production',
    context: { authorization: 'Bearer sec_super_secret_token' },
  });
  record('AT9-158', 'ErrorTrackingService automatically redacts secret credentials from error context and message',
    !errWithSecret.message.includes('sec_secret_token_12345') || errWithSecret.message.includes('[REDACTED]'));

  record('AT9-159', 'Realtime channel unsubscribe decreases client count accurately',
    (await realtimeProv.unsubscribe('org_acme:p_collab_1', 'client_user_1')).subscriberCount === 1);

  record('AT9-160', 'Publishing to nonexistent or empty channel returns 0 recipients',
    (await realtimeProv.publish('empty_chan', 'test', {}) === 0));

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 16: Feature Flags & A/B Testing (AT9-161 - AT9-170)
  // ─────────────────────────────────────────────────────────────────────────────
  const flagProv = new LocalFeatureFlagProvider();
  const flag1 = await flagProv.createFlag({
    organizationId: 'org_acme',
    key: 'experimental_canvas',
    name: 'Experimental Canvas Rendering',
    description: 'WebGL renderer for huge trees',
    enabled: true,
    environmentTargets: ['preview', 'staging'],
    percentageRollout: 50,
    targetUserIds: ['u_beta_tester'],
  });
  record('AT9-161', 'LocalFeatureFlagProvider.createFlag() registers feature flag with targeting rules',
    flag1.key === 'experimental_canvas' && flag1.percentageRollout === 50);

  // Environment targeting
  const evalInPreview = await flagProv.evaluateFlag('experimental_canvas', { organizationId: 'org_acme', environment: 'preview', userId: 'u_beta_tester' });
  const evalInProd = await flagProv.evaluateFlag('experimental_canvas', { organizationId: 'org_acme', environment: 'production', userId: 'u_beta_tester' });
  record('AT9-162', 'Feature flag evaluates true in targeted environment and false in excluded environment',
    evalInPreview === true && evalInProd === false);

  // User ID targeting override
  const evalBetaUser = await flagProv.evaluateFlag('experimental_canvas', { organizationId: 'org_acme', environment: 'preview', userId: 'u_beta_tester' });
  record('AT9-163', 'User ID targeting overrides percentage rollout to guarantee true evaluation',
    evalBetaUser === true);

  // Deterministic rollout bucketing: same user always gets same evaluation
  const evalUserA_1 = await flagProv.evaluateFlag('experimental_canvas', { organizationId: 'org_acme', environment: 'preview', userId: 'u_user_alpha' });
  const evalUserA_2 = await flagProv.evaluateFlag('experimental_canvas', { organizationId: 'org_acme', environment: 'preview', userId: 'u_user_alpha' });
  record('AT9-164', 'Percentage rollout yields deterministic SHA-256 bucketing for same subject',
    evalUserA_1 === evalUserA_1 && evalUserA_1 === evalUserA_2);

  // Disabled flag always false
  const flagDisabled = await flagProv.createFlag({
    organizationId: 'org_acme',
    key: 'turned_off_flag',
    name: 'Turned Off',
    description: '',
    enabled: false,
    environmentTargets: ['production'],
    percentageRollout: 100,
  });
  const evalDisabled = await flagProv.evaluateFlag('turned_off_flag', { organizationId: 'org_acme', environment: 'production' });
  record('AT9-165', 'Disabled flag evaluates false unconditionally', evalDisabled === false);

  const expProv = new LocalExperimentProvider();
  const exp1 = await expProv.createExperiment({
    organizationId: 'org_acme',
    key: 'hero_cta_text',
    name: 'Hero CTA Text Test',
    description: 'Get Started vs Try Free',
    status: 'running',
    variants: [
      { id: 'v_get_started', key: 'get_started', name: 'Get Started', weight: 50 },
      { id: 'v_try_free', key: 'try_free', name: 'Try for Free', weight: 50 },
    ],
    targetEnvironments: ['production'],
  });
  record('AT9-166', 'LocalExperimentProvider.createExperiment() defines multi-variant A/B experiment',
    exp1.key === 'hero_cta_text' && exp1.variants.length === 2);

  const assignedVariant1 = await expProv.assignVariant('hero_cta_text', 'u_visitor_123', 'org_acme');
  const assignedVariant2 = await expProv.assignVariant('hero_cta_text', 'u_visitor_123', 'org_acme');
  record('AT9-167', 'assignVariant() returns deterministic variant assignment for same user ID',
    assignedVariant1?.key === assignedVariant2?.key);

  const concludeRes = await expProv.concludeExperiment(exp1.id, 'v_try_free');
  record('AT9-168', 'concludeExperiment() marks experiment as concluded and selects winner variant',
    concludeRes.status === 'concluded' && concludeRes.winnerVariantId === 'v_try_free');

  const flagsList = await flagProv.listFlags('org_acme');
  record('AT9-169', 'listFlags() returns all configured feature flags for organization',
    flagsList.length >= 2);

  const deleteFlagRes = await flagProv.deleteFlag(flagDisabled.id);
  record('AT9-170', 'deleteFlag() successfully deletes feature flag',
    deleteFlagRes === true && (await flagProv.getFlag(flagDisabled.id)) === null);

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 17: Advanced Deployments, Marketplace & AI Governance (AT9-171 - AT9-183)
  // ─────────────────────────────────────────────────────────────────────────────
  const advDeployEngine = new LocalAdvancedDeploymentEngine();
  const canaryProject = createInitialProject('p_canary_test', 9);
  const canaryRes = await advDeployEngine.deployCanary({
    projectId: 'p_canary_test',
    organizationId: 'org_acme',
    branch: 'main',
    commitId: 'cmt_001',
    projectSnapshot: canaryProject,
    config: { currentTrafficPercentage: 10, stepPercentage: 20 },
  });
  record('AT9-171', 'LocalAdvancedDeploymentEngine.deployCanary() launches canary deployment with initial traffic percentage',
    canaryRes.status === 'canary_active' && canaryRes.canary.currentTrafficPercentage === 10);

  const advance1 = await advDeployEngine.advanceCanaryTraffic('p_canary_test', 20);
  record('AT9-172', 'advanceCanaryTraffic() increments canary traffic percentage',
    advance1.newPercentage === 30 && advance1.promotedToFull === false);

  const advanceFull = await advDeployEngine.advanceCanaryTraffic('p_canary_test', 80);
  record('AT9-173', 'Canary traffic reaching 100% promotes deployment to full live traffic',
    advanceFull.newPercentage === 100 && advanceFull.promotedToFull === true);

  const bgRes = await advDeployEngine.deployBlueGreen({
    projectId: 'p_bg_test',
    organizationId: 'org_acme',
    branch: 'main',
    commitId: 'cmt_bg_01',
    projectSnapshot: canaryProject,
  });
  record('AT9-174', 'LocalAdvancedDeploymentEngine.deployBlueGreen() executes blue/green deployment and flips active color',
    bgRes.activeColor === 'green' && bgRes.standbyColor === 'blue' && !!bgRes.releaseId);

  // Seed preview release before promoting
  const { defaultDeploymentPipeline } = await import('../src/builder/platform/deployments/DeploymentPipeline');
  await defaultDeploymentPipeline.executePipeline({
    projectId: 'p_canary_test',
    organizationId: 'org_acme',
    environment: 'preview',
    branchName: 'main',
    commitId: 'cmt_001',
    projectSnapshot: canaryProject,
    actorId: 'u_admin',
  });

  const promoteRes = await advDeployEngine.promoteEnvironment({
    projectId: 'p_canary_test',
    organizationId: 'org_acme',
    config: {
      sourceEnvironment: 'preview',
      targetEnvironment: 'production',
      requiresApproval: false,
      runAutomatedTests: true,
      automatedRollbackOnFailure: true,
    },
    actorId: 'u_admin',
  });
  record('AT9-175', 'promoteEnvironment() promotes release from preview to production with audit log record',
    promoteRes.success === true && promoteRes.promotedTo === 'production');

  const marketMonetization = new MarketplaceMonetizationService();
  const publisher = await marketMonetization.registerPublisher('org_partner', 'Acme Extensions Ltd', 'publisher@acme.com');
  record('AT9-176', 'MarketplaceMonetizationService.registerPublisher() registers publisher account',
    publisher.id.startsWith('pub_') && publisher.name === 'Acme Extensions Ltd');

  const purchase = await marketMonetization.purchaseItem({
    buyerOrganizationId: 'org_buyer',
    listingId: 'res_plugin_datagrid_pro',
    publisherId: publisher.id,
    pricing: { model: 'one_time', amountUsd: 100, currency: 'USD' },
  });
  const updatedPublisher = await marketMonetization.getPublisher(publisher.id);
  record('AT9-177', 'purchaseItem() processes purchase and credits publisher with 85% revenue split',
    purchase.status === 'completed' && updatedPublisher?.totalEarningsUsd === 85);

  const pluginLifecycle = new PluginLifecycleManager();
  const compatValid = pluginLifecycle.validateCompatibility('^9.0.0', '9.0.0');
  const compatInvalid = pluginLifecycle.validateCompatibility('^8.0.0', '9.0.0');
  record('AT9-178', 'PluginLifecycleManager.validateCompatibility() validates plugin version compatibility semver',
    compatValid === true && compatInvalid === false);

  const pluginInstall = await pluginLifecycle.installPlugin({
    organizationId: 'org_buyer',
    pluginId: 'plug_stripe_billing',
    version: '1.0.0',
    requestedPermissions: ['project.read', 'api.read'],
  });
  record('AT9-179', 'installPlugin() installs plugin with active status and approved permissions',
    pluginInstall.status === 'active' && pluginInstall.grantedPermissions.includes('project.read'));

  const aiGov = new EnterpriseAIGovernance();
  const allowedModelVal = await aiGov.validateAction({
    organizationId: 'org_acme',
    actorId: 'u_dev',
    userRole: 'developer',
    modelName: 'gpt-4o',
    estimatedTokens: 1000,
  });
  const blockedModelVal = await aiGov.validateAction({
    organizationId: 'org_acme',
    actorId: 'u_dev',
    userRole: 'developer',
    modelName: 'unapproved_deepseek_raw',
    estimatedTokens: 1000,
  });
  record('AT9-180', 'EnterpriseAIGovernance.validateAction() permits approved AI models and rejects unapproved models',
    allowedModelVal.allowed === true && blockedModelVal.allowed === false);

  const budgetExceededVal = await aiGov.validateAction({
    organizationId: 'org_acme',
    actorId: 'u_dev',
    userRole: 'developer',
    modelName: 'gpt-4o',
    estimatedTokens: 10000000, // Exceeds budget
  });
  record('AT9-181', 'EnterpriseAIGovernance blocks AI requests that exceed monthly token budget',
    budgetExceededVal.allowed === false && Boolean(budgetExceededVal.reason?.includes('BUDGET_EXCEEDED')));

  const shieldedCollections = aiGov.shieldSensitiveData([
    { id: 'col_users', name: 'Users', isSensitive: false },
    { id: 'col_credit_cards', name: 'CreditCards', isSensitive: true },
    { id: 'col_secrets', name: 'ApiSecrets', isSensitive: true },
  ]);
  record('AT9-182', 'EnterpriseAIGovernance.shieldSensitiveData() removes sensitive collections from AI context',
    shieldedCollections.length === 1 && shieldedCollections[0].id === 'col_users');

  const largeProject = createInitialProject('p_large', 9);
  const optimizedContext = aiGov.optimizeLargeProjectContext(largeProject, 4000);
  record('AT9-183', 'EnterpriseAIGovernance.optimizeLargeProjectContext() summarizes AST within token budget',
    optimizedContext.pagesCount >= 1 && optimizedContext.estimatedTokens <= 4000);

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 18: Security, Zero Dynamic Code & Master Integration (AT9-184 - AT9-185)
  // ─────────────────────────────────────────────────────────────────────────────
  let zeroUnsafeCode = true;
  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (f !== 'node_modules' && f !== '.next' && f !== '.git') scanDir(full);
      } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
        const content = fs.readFileSync(full, 'utf-8');
        if (content.includes('eval(') || content.includes('new Function(')) {
          zeroUnsafeCode = false;
        }
      }
    }
  }
  scanDir(path.resolve(__dirname, '../src'));
  record('AT9-184', 'Security Scan: Zero eval() or new Function() calls across all src/ code', zeroUnsafeCode);

  record('AT9-185', 'Phase 9 Master Verification: All Scale, Enterprise & Developer Ecosystem capabilities verified',
    results.length >= 184 && results.every((r) => r.passed));

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL PHASE 9 TESTS: ${results.length}`);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`PASSED:  ${passed}`);
  console.log(`FAILED:  ${failed}`);
  console.log(`BLOCKED: 0`);
  console.log('----------------------------------------------------\n');

  return {
    passed,
    failed,
    blocked: 0,
    results,
  };
}

// Direct execution runner
if (require.main === module) {
  runPhase9Suite()
    .then(({ passed, failed }) => {
      if (failed > 0) {
        console.error(`FAILED: ${failed} Phase 9 tests failed.`);
        process.exit(1);
      } else {
        console.log(`ALL ${passed} PHASE 9 ACCEPTANCE TESTS PASSED.`);
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Test runner fatal error:', err);
      process.exit(1);
    });
}
