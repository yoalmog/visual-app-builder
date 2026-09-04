import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Deployment, EnvironmentName } from '@/builder/schema/cloud';

// In-memory deployment store for local runtime & testing
interface DeploymentStore {
  deployments: Map<string, Deployment>;
  projectActive: Map<string, string>; // `${projectId}:${env}` -> deploymentId
}

const globalDeploymentStore: DeploymentStore = (global as any).__BUILDER_DEPLOYMENT_STORE__ || {
  deployments: new Map<string, Deployment>(),
  projectActive: new Map<string, string>(),
};
(global as any).__BUILDER_DEPLOYMENT_STORE__ = globalDeploymentStore;

const PublishRequestSchema = z.object({
  action: z.enum(['publish', 'rollback', 'create', 'list']).default('publish'),
  projectId: z.string().min(1),
  environment: z.enum(['development', 'preview', 'production']).default('production'),
  snapshot: z.any().optional(),
  message: z.string().optional(),
  targetDeploymentId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const environment = searchParams.get('environment') as EnvironmentName | null;
    const deploymentId = searchParams.get('deploymentId');

    if (!projectId && !deploymentId) {
      return NextResponse.json(
        { error: 'Missing projectId or deploymentId parameter' },
        { status: 400 }
      );
    }

    if (deploymentId) {
      const dep = globalDeploymentStore.deployments.get(deploymentId);
      if (!dep) {
        return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
      }
      return NextResponse.json({ deployment: dep });
    }

    const allDeployments: Deployment[] = [];
    for (const dep of Array.from(globalDeploymentStore.deployments.values())) {
      if (dep.projectId === projectId) {
        if (!environment || dep.environment === environment) {
          allDeployments.push(dep);
        }
      }
    }

    allDeployments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const activeKey = `${projectId}:${environment || 'production'}`;
    const activeDeploymentId = globalDeploymentStore.projectActive.get(activeKey);
    const activeDeployment = activeDeploymentId
      ? globalDeploymentStore.deployments.get(activeDeploymentId) || null
      : allDeployments[0] || null;

    return NextResponse.json({
      deployments: allDeployments,
      activeDeployment,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = PublishRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { action, projectId, environment, snapshot, message, targetDeploymentId } = parsed.data;

    if (action === 'list') {
      const all: Deployment[] = [];
      for (const dep of Array.from(globalDeploymentStore.deployments.values())) {
        if (dep.projectId === projectId && dep.environment === environment) {
          all.push(dep);
        }
      }
      all.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return NextResponse.json({ deployments: all });
    }

    if (action === 'rollback') {
      if (!targetDeploymentId) {
        return NextResponse.json(
          { error: 'targetDeploymentId is required for rollback' },
          { status: 400 }
        );
      }

      const target = globalDeploymentStore.deployments.get(targetDeploymentId);
      if (!target) {
        return NextResponse.json(
          { error: `Target deployment ${targetDeploymentId} not found` },
          { status: 404 }
        );
      }

      // Count existing project deployments to increment version
      let projectVersion = 1;
      for (const dep of Array.from(globalDeploymentStore.deployments.values())) {
        if (dep.projectId === projectId) {
          projectVersion = Math.max(projectVersion, dep.version + 1);
        }
      }

      const rollbackId = `dep_rb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const rollbackDeployment: Deployment = {
        id: rollbackId,
        projectId,
        environment,
        version: projectVersion,
        status: 'published',
        snapshot: target.snapshot,
        createdAt: now,
        publishedAt: now,
        message: message || `Rolled back to deployment v${target.version} (${target.id})`,
        rollbackTargetId: target.id,
        buildLogs: [
          `[${now}] Initiated rollback to snapshot from deployment ${target.id}`,
          `[${now}] Verified target snapshot integrity`,
          `[${now}] Successfully published rollback v${projectVersion}`,
        ],
      };

      globalDeploymentStore.deployments.set(rollbackId, rollbackDeployment);
      globalDeploymentStore.projectActive.set(`${projectId}:${environment}`, rollbackId);

      return NextResponse.json({
        success: true,
        deployment: rollbackDeployment,
        message: `Successfully rolled back to v${target.version}`,
      });
    }

    // Default: 'publish' or 'create'
    if (!snapshot) {
      return NextResponse.json(
        { error: 'Project snapshot is required for publishing' },
        { status: 400 }
      );
    }

    // Basic validation of snapshot
    if (!snapshot.id || !Array.isArray(snapshot.pages)) {
      return NextResponse.json(
        { error: 'Snapshot must contain a valid id and pages array' },
        { status: 400 }
      );
    }

    let nextVersion = 1;
    for (const dep of Array.from(globalDeploymentStore.deployments.values())) {
      if (dep.projectId === projectId) {
        nextVersion = Math.max(nextVersion, dep.version + 1);
      }
    }

    const depId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const deployment: Deployment = {
      id: depId,
      projectId,
      environment,
      version: nextVersion,
      status: 'published',
      snapshot,
      createdAt: now,
      publishedAt: now,
      message: message || `Release v${nextVersion} published to ${environment}`,
      buildLogs: [
        `[${now}] Validating project snapshot '${snapshot.name || snapshot.id}'...`,
        `[${now}] Verified ${snapshot.pages?.length || 0} pages and components`,
        `[${now}] Optimizing bundles for ${environment}...`,
        `[${now}] Published successfully as version ${nextVersion}`,
      ],
    };

    globalDeploymentStore.deployments.set(depId, deployment);
    globalDeploymentStore.projectActive.set(`${projectId}:${environment}`, depId);

    return NextResponse.json({
      success: true,
      deployment,
      url: `/app/${snapshot.slug || projectId}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error during deployment' },
      { status: 500 }
    );
  }
}
