import { NextRequest, NextResponse } from 'next/server';
import { defaultOrganizationProvider } from '@/builder/platform/organization/OrganizationProvider';
import { defaultCollaborationProvider } from '@/builder/platform/collaboration/CollaborationProvider';
import { defaultVersionControlProvider } from '@/builder/platform/version-control/VersionControlProvider';
import { defaultDeploymentPipeline, defaultDomainProvider } from '@/builder/platform/deployments/DeploymentPipeline';
import { defaultUsageProvider, defaultEntitlementProvider, defaultBillingProvider } from '@/builder/platform/usage/UsageAndBilling';
import { defaultApiKeyManager, defaultAuditLogger, defaultRateLimiter } from '@/builder/platform/security/EnterpriseSecurity';
import {
  defaultRegionProvider,
  defaultCacheProvider,
  defaultHealthCheckProvider,
  defaultBackupProvider,
  defaultDisasterRecoveryProvider,
  defaultSSOProvider,
  defaultSCIMProvider,
  defaultOrganizationPolicyEngine,
  defaultSessionManager,
  defaultDeveloperAppProvider,
  defaultOAuthProvider,
  defaultWebhookManager2,
  defaultOpenApiDocGenerator,
  defaultFeatureFlagProvider,
  defaultExperimentProvider,
  defaultAdvancedDeploymentEngine,
} from '@/builder/platform/enterprise';

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug.join('/');
  const { searchParams } = new URL(request.url);

  // Rate limit check
  const ip = request.headers.get('x-forwarded-for') || 'local';
  const rl = defaultRateLimiter.checkLimit(ip, 120, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED' }, { status: 429 });
  }

  try {
    switch (path) {
      case 'orgs': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const org = await defaultOrganizationProvider.getOrganization(orgId);
        const members = await defaultOrganizationProvider.listMembers(orgId);
        const teams = await defaultOrganizationProvider.listTeams(orgId);
        return NextResponse.json({ org, members, teams });
      }

      case 'collab': {
        const presences = defaultCollaborationProvider.getPresences();
        const version = defaultCollaborationProvider.getProjectVersion();
        const history = defaultCollaborationProvider.getTransactionHistory();
        return NextResponse.json({ presences, version, history });
      }

      case 'vcs': {
        const projectId = searchParams.get('projectId') || 'default';
        const branches = await defaultVersionControlProvider.listBranches(projectId);
        const commits = await defaultVersionControlProvider.listCommits(projectId);
        const reviews = await defaultVersionControlProvider.listReviews(projectId);
        return NextResponse.json({ branches, commits, reviews });
      }

      case 'deployments': {
        const projectId = searchParams.get('projectId') || 'default';
        const env = searchParams.get('env') as any;
        const releases = await defaultVersionControlProvider.listReleases(projectId, env);
        const jobs = defaultDeploymentPipeline.listBuildJobs(projectId);
        const domains = await defaultDomainProvider.listDomains(projectId);
        return NextResponse.json({ releases, jobs, domains });
      }

      case 'usage': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const usage = await defaultUsageProvider.getAllUsage(orgId);
        const limits = defaultEntitlementProvider.getPlanLimits(orgId);
        const subscription = await defaultBillingProvider.getSubscription(orgId);
        return NextResponse.json({ usage, limits, subscription });
      }

      case 'security': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const logs = await defaultAuditLogger.query({ organizationId: orgId });
        const keys = await defaultApiKeyManager.listApiKeys(orgId);
        return NextResponse.json({ logs, keys });
      }

      // Phase 9: Scale Endpoints
      case 'scale/regions': {
        const regions = await defaultRegionProvider.listRegions();
        const primary = await defaultRegionProvider.getPrimaryRegion();
        return NextResponse.json({ regions, primary });
      }

      case 'scale/cache': {
        const stats = await defaultCacheProvider.getStats();
        return NextResponse.json({ stats });
      }

      case 'scale/health': {
        const overview = await defaultHealthCheckProvider.getOverview();
        return NextResponse.json({ overview });
      }

      // Phase 9: Enterprise Endpoints
      case 'enterprise/sso': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const config = await defaultSSOProvider.getConfig(orgId);
        return NextResponse.json({ config });
      }

      case 'enterprise/policies': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const policy = await defaultOrganizationPolicyEngine.getPolicy(orgId);
        return NextResponse.json({ policy });
      }

      case 'enterprise/sessions': {
        const userId = searchParams.get('userId') || 'u_admin';
        const sessions = defaultSessionManager.listUserSessions(userId);
        return NextResponse.json({ sessions });
      }

      // Phase 9: Developer Platform Endpoints
      case 'developer/apps': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const apps = await defaultOAuthProvider.listApps(orgId);
        return NextResponse.json({ apps });
      }

      case 'developer/openapi': {
        const spec = defaultOpenApiDocGenerator.generateSpec();
        return NextResponse.json(spec);
      }

      case 'developer/webhooks': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const endpoints = await defaultWebhookManager2.listEndpoints(orgId);
        return NextResponse.json({ endpoints });
      }

      // Phase 9: Experimentation & Rollout Endpoints
      case 'experiments/flags': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const flags = await defaultFeatureFlagProvider.listFlags(orgId);
        return NextResponse.json({ flags });
      }

      case 'experiments/experiments': {
        const orgId = searchParams.get('orgId') || 'org_default';
        const experiments = await defaultExperimentProvider.listExperiments(orgId);
        return NextResponse.json({ experiments });
      }

      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug.join('/');
  const ip = request.headers.get('x-forwarded-for') || 'local';

  // Rate limit check
  const rl = defaultRateLimiter.checkLimit(ip, 60, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED' }, { status: 429 });
  }

  try {
    const body = await request.json();

    switch (path) {
      case 'orgs': {
        const { name, slug, ownerId } = body;
        const org = await defaultOrganizationProvider.createOrganization(name, slug, ownerId);
        return NextResponse.json({ org });
      }

      case 'collab/operation': {
        const res = await defaultCollaborationProvider.submitOperation(body);
        return NextResponse.json(res);
      }

      case 'collab/transaction': {
        const { operations, description } = body;
        const res = await defaultCollaborationProvider.submitTransaction(operations, description);
        return NextResponse.json(res);
      }

      case 'vcs/branch': {
        const branch = await defaultVersionControlProvider.createBranch(body);
        return NextResponse.json({ branch });
      }

      case 'vcs/commit': {
        const commit = await defaultVersionControlProvider.commit(body);
        return NextResponse.json({ commit });
      }

      case 'vcs/merge': {
        const result = await defaultVersionControlProvider.merge(body);
        return NextResponse.json(result);
      }

      case 'deployments/deploy': {
        const result = await defaultDeploymentPipeline.executePipeline(body);
        return NextResponse.json(result);
      }

      case 'deployments/rollback': {
        const result = await defaultDeploymentPipeline.rollback(body);
        return NextResponse.json(result);
      }

      case 'security/apikey': {
        const result = await defaultApiKeyManager.createApiKey(body);
        return NextResponse.json(result);
      }

      // Phase 9: Scale POST Endpoints
      case 'scale/cache/invalidate': {
        const { key, tag } = body;
        if (tag) {
          await defaultCacheProvider.invalidateByTag(tag);
        } else if (key) {
          await defaultCacheProvider.delete(key);
        }
        return NextResponse.json({ success: true });
      }

      case 'scale/backup/create': {
        const { projectId, organizationId, environment, name, type } = body;
        const backup = await defaultBackupProvider.createBackup({
          projectId: projectId || 'default',
          organizationId: organizationId || 'org_default',
          environment: environment || 'production',
          name: name || `Backup ${Date.now()}`,
          type: type || 'manual',
        });
        return NextResponse.json({ backup });
      }

      case 'scale/backup/restore': {
        const { backupId } = body;
        const restoreJob = await defaultBackupProvider.restoreFromBackup(backupId);
        return NextResponse.json({ restoreJob });
      }

      case 'scale/dr/failover': {
        const { organizationId } = body;
        const res = await defaultDisasterRecoveryProvider.initiateFailover(organizationId || 'org_default');
        return NextResponse.json(res);
      }

      // Phase 9: Enterprise POST Endpoints
      case 'enterprise/sso/config': {
        const { config } = body;
        const updated = await defaultSSOProvider.saveConfig(config);
        return NextResponse.json({ config: updated });
      }

      case 'enterprise/scim/users': {
        const { orgId, user } = body;
        const created = await defaultSCIMProvider.createUser(orgId || 'org_default', user);
        return NextResponse.json({ user: created });
      }

      case 'enterprise/policies': {
        const { orgId, policy, actorId } = body;
        const updated = await defaultOrganizationPolicyEngine.updatePolicy(orgId || 'org_default', policy, actorId || 'admin');
        return NextResponse.json({ policy: updated });
      }

      // Phase 9: Developer Ecosystem POST Endpoints
      case 'developer/apps': {
        const created = await defaultOAuthProvider.createApp(body);
        return NextResponse.json({ app: created.app, rawClientSecret: created.rawClientSecret });
      }

      case 'developer/oauth/token': {
        const { code, clientId, clientSecret, redirectUri } = body;
        const token = await defaultOAuthProvider.exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
        return NextResponse.json({ token });
      }

      case 'developer/webhooks': {
        const created = await defaultWebhookManager2.registerEndpoint(body);
        return NextResponse.json({ endpoint: created.endpoint, rawSecret: created.rawSecret });
      }

      case 'developer/webhooks/deliver': {
        const { endpointId, eventType, eventId, payload } = body;
        const delivery = await defaultWebhookManager2.deliverEvent(endpointId, eventType, eventId, payload);
        return NextResponse.json({ delivery });
      }

      // Phase 9: Experimentation & Rollouts POST Endpoints
      case 'experiments/flags': {
        const flag = await defaultFeatureFlagProvider.createFlag(body);
        return NextResponse.json({ flag });
      }

      case 'experiments/flags/evaluate': {
        const { flagKey, context } = body;
        const value = await defaultFeatureFlagProvider.evaluateFlag(flagKey, context);
        return NextResponse.json({ value });
      }

      case 'experiments/experiments': {
        const exp = await defaultExperimentProvider.createExperiment(body);
        return NextResponse.json({ experiment: exp });
      }

      case 'deployments/rollouts': {
        const canary = await defaultAdvancedDeploymentEngine.deployCanary(body);
        return NextResponse.json(canary);
      }

      case 'deployments/rollouts/promote': {
        const { projectId, increment } = body;
        const res = await defaultAdvancedDeploymentEngine.advanceCanaryTraffic(projectId, increment);
        return NextResponse.json(res);
      }

      case 'deployments/rollouts/rollback': {
        const { projectId, environment, targetReleaseId, reason } = body;
        const res = await defaultDeploymentPipeline.rollback({
          projectId,
          environment: environment || 'production',
          targetReleaseId,
          actorId: 'admin',
          reason,
        });
        return NextResponse.json(res);
      }

      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
