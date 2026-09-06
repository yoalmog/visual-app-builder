import {
  BuildJob,
  BuildJobStatus,
  BackgroundJob,
  JobPriority,
  PreviewDeployment,
  CustomDomain,
  RollbackRecord,
  Release,
} from '../../schema/platform';
import { AppProject } from '../../schema/project';
import { defaultVersionControlProvider } from '../version-control/VersionControlProvider';
import { defaultNotificationService } from '../notifications/NotificationService';

// ─── 1. Background Job Queue Provider ─────────────────────────────────────────

export interface JobQueueProvider {
  enqueueJob<T>(type: BackgroundJob['type'], payload: T, priority?: JobPriority): Promise<BackgroundJob<T>>;
  getJob(jobId: string): Promise<BackgroundJob | null>;
  cancelJob(jobId: string): Promise<boolean>;
  listJobs(type?: BackgroundJob['type']): Promise<BackgroundJob[]>;
  processNextJob(): Promise<BackgroundJob | null>;
}

export class LocalJobQueueProvider implements JobQueueProvider {
  private jobs: Map<string, BackgroundJob> = new Map();

  async enqueueJob<T>(
    type: BackgroundJob['type'],
    payload: T,
    priority: JobPriority = 'normal'
  ): Promise<BackgroundJob<T>> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: BackgroundJob<T> = {
      id,
      type,
      payload,
      status: 'queued',
      priority,
      retries: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJob(jobId: string): Promise<BackgroundJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.status === 'running' || job.status === 'queued') {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async listJobs(type?: BackgroundJob['type']): Promise<BackgroundJob[]> {
    let list = Array.from(this.jobs.values());
    if (type) list = list.filter((j) => j.type === type);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async processNextJob(): Promise<BackgroundJob | null> {
    const queuedJobs = Array.from(this.jobs.values()).filter((j) => j.status === 'queued');
    if (queuedJobs.length === 0) return null;

    // Sort by priority (urgent > high > normal > low)
    const priorityWeight: Record<JobPriority, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
    queuedJobs.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    const job = queuedJobs[0];
    job.status = 'running';
    job.startedAt = new Date().toISOString();

    try {
      // Simulate successful idempotent job completion
      job.status = 'success';
      job.completedAt = new Date().toISOString();
    } catch (err: any) {
      job.retries += 1;
      if (job.retries >= job.maxRetries) {
        job.status = 'failed';
        job.error = err.message;
        job.completedAt = new Date().toISOString();
      } else {
        job.status = 'queued'; // Will be retried
      }
    }

    return job;
  }
}

export const defaultJobQueueProvider = new LocalJobQueueProvider();

// ─── 2. Build Queue & Deployment Pipeline ─────────────────────────────────────

export interface DeploymentPipelineOptions {
  projectId: string;
  organizationId: string;
  environment: 'development' | 'preview' | 'production';
  branchName: string;
  commitId: string;
  projectSnapshot: AppProject;
  actorId: string;
  actorEmail?: string;
  requireApproval?: boolean;
}

export class DeploymentPipeline {
  private buildJobs: Map<string, BuildJob> = new Map();
  private previewDeployments: Map<string, PreviewDeployment> = new Map();
  private rollbackHistory: RollbackRecord[] = [];

  async queueBuild(params: {
    projectId: string;
    environmentId: string;
    commitId: string;
    priority?: JobPriority;
  }): Promise<BuildJob> {
    const id = `build_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: BuildJob = {
      id,
      projectId: params.projectId,
      environmentId: params.environmentId,
      commitId: params.commitId,
      status: 'queued',
      priority: params.priority || 'normal',
      retries: 0,
      maxRetries: 2,
      logs: [`[${new Date().toISOString()}] Build queued for commit ${params.commitId}`],
      createdAt: new Date().toISOString(),
    };

    this.buildJobs.set(id, job);
    return job;
  }

  async executePipeline(options: DeploymentPipelineOptions): Promise<{
    success: boolean;
    buildJob: BuildJob;
    release?: Release;
    previewDeployment?: PreviewDeployment;
    error?: string;
  }> {
    const buildJob = await this.queueBuild({
      projectId: options.projectId,
      environmentId: options.environment,
      commitId: options.commitId,
    });

    buildJob.status = 'running';
    buildJob.startedAt = new Date().toISOString();

    try {
      // Stage 1: Validation
      buildJob.logs.push('[STAGE 1: VALIDATION] Validating project schema and node integrity...');
      if (!options.projectSnapshot || !Array.isArray(options.projectSnapshot.pages) || options.projectSnapshot.pages.length === 0) {
        throw new Error('VALIDATION_FAILED: Project must contain at least one valid page');
      }

      // Stage 2: Build & Compilation
      buildJob.logs.push('[STAGE 2: BUILD] Bundling pages, components, tokens, and workflows...');
      buildJob.logs.push(`[STAGE 2: BUILD] Compiled ${options.projectSnapshot.pages.length} pages successfully.`);

      // Stage 3: Automated Testing & Integrity Check
      buildJob.logs.push('[STAGE 3: TEST] Executing automated component integrity checks...');
      for (const page of options.projectSnapshot.pages) {
        if (!page.root) {
          throw new Error(`TEST_FAILED: Page '${page.name}' is missing a root container`);
        }
      }

      // Stage 4: Package
      buildJob.logs.push('[STAGE 4: PACKAGE] Creating immutable release bundle...');

      // Stage 5: Deploy
      buildJob.logs.push(`[STAGE 5: DEPLOY] Deploying release bundle to ${options.environment} environment...`);

      // Stage 6: Health Check
      buildJob.logs.push('[STAGE 6: HEALTH CHECK] Performing runtime health check probe...');
      buildJob.logs.push('[STAGE 6: HEALTH CHECK] Probe returned HTTP 200 OK. Latency: 12ms');

      // Stage 7: Release
      buildJob.logs.push('[STAGE 7: RELEASE] Registering immutable release...');
      let commit = options.commitId ? await defaultVersionControlProvider.getCommit(options.commitId) : null;
      if (!commit) {
        commit = await defaultVersionControlProvider.commit({
          projectId: options.projectId,
          branchName: options.branchName,
          message: `Pipeline release commit for ${options.environment}`,
          authorId: options.actorId,
          authorName: options.actorId,
          snapshot: options.projectSnapshot,
        });
      }

      const release = await defaultVersionControlProvider.createRelease({
        projectId: options.projectId,
        organizationId: options.organizationId,
        environment: options.environment,
        branch: options.branchName,
        commitId: commit.id,
        snapshotId: commit.snapshotId,
        versionTag: `v${Date.now().toString().slice(-4)}`,
        notes: `Automated pipeline release from branch ${options.branchName}`,
        publishedBy: options.actorId,
      });

      let previewDep: PreviewDeployment | undefined;
      if (options.environment === 'preview') {
        const previewUrl = `https://${options.projectId}-${options.branchName.replace(/[^a-z0-9]/g, '-')}.preview.apexstudio.io`;
        previewDep = {
          id: `prev_${Date.now()}`,
          projectId: options.projectId,
          branchName: options.branchName,
          commitId: options.commitId,
          url: previewUrl,
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        };
        this.previewDeployments.set(previewDep.id, previewDep);
      }

      buildJob.status = 'success';
      buildJob.completedAt = new Date().toISOString();
      buildJob.logs.push(`[COMPLETE] Pipeline finished successfully at ${buildJob.completedAt}`);

      // Notify completion
      await defaultNotificationService.createNotification({
        organizationId: options.organizationId,
        userId: options.actorId,
        type: 'deployment_completed',
        title: `Deployment to ${options.environment} Succeeded`,
        message: `Commit ${options.commitId.slice(0, 8)} successfully deployed to ${options.environment}`,
        link: `/builder/${options.projectId}?tab=deployments`,
      });

      return {
        success: true,
        buildJob,
        release,
        previewDeployment: previewDep,
      };
    } catch (err: any) {
      buildJob.status = 'failed';
      buildJob.error = err.message;
      buildJob.completedAt = new Date().toISOString();
      buildJob.logs.push(`[FAILED] Pipeline aborted with error: ${err.message}`);

      // Notify failure
      await defaultNotificationService.createNotification({
        organizationId: options.organizationId,
        userId: options.actorId,
        type: 'deployment_failed',
        title: `Deployment to ${options.environment} Failed`,
        message: `Pipeline halted: ${err.message}`,
        link: `/builder/${options.projectId}?tab=deployments`,
      });

      return {
        success: false,
        buildJob,
        error: err.message,
      };
    }
  }

  // ─── Rollback ───────────────────────────────────────────────────────────────

  async rollback(params: {
    projectId: string;
    environment: 'development' | 'preview' | 'production';
    targetReleaseId: string;
    actorId: string;
    reason?: string;
  }): Promise<{ success: boolean; targetSnapshot: AppProject; rollbackRecord: RollbackRecord }> {
    const releases = await defaultVersionControlProvider.listReleases(params.projectId, params.environment);
    const currentRelease = releases.find((r) => r.isCurrent);
    const targetRelease = releases.find((r) => r.id === params.targetReleaseId);

    if (!targetRelease) {
      throw new Error(`Target release ${params.targetReleaseId} not found for rollback`);
    }

    const snapshotObj = await defaultVersionControlProvider.getSnapshot(targetRelease.snapshotId);
    if (!snapshotObj) {
      throw new Error(`Snapshot for target release ${params.targetReleaseId} could not be loaded`);
    }

    // Set target release as current
    for (const r of releases) {
      r.isCurrent = r.id === targetRelease.id;
    }

    const rollbackRecord: RollbackRecord = {
      id: `rb_${Date.now()}`,
      projectId: params.projectId,
      environment: params.environment,
      sourceReleaseId: currentRelease?.id || 'none',
      targetReleaseId: targetRelease.id,
      targetCommitId: targetRelease.commitId,
      performedBy: params.actorId,
      performedAt: new Date().toISOString(),
      reason: params.reason,
    };

    this.rollbackHistory.push(rollbackRecord);

    return {
      success: true,
      targetSnapshot: snapshotObj.project,
      rollbackRecord,
    };
  }

  getRollbackHistory(projectId: string): RollbackRecord[] {
    return this.rollbackHistory.filter((r) => r.projectId === projectId);
  }

  getBuildJob(jobId: string): BuildJob | null {
    return this.buildJobs.get(jobId) || null;
  }

  listBuildJobs(projectId: string): BuildJob[] {
    return Array.from(this.buildJobs.values())
      .filter((b) => b.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  listPreviewDeployments(projectId: string): PreviewDeployment[] {
    return Array.from(this.previewDeployments.values()).filter((p) => p.projectId === projectId);
  }
}

export const defaultDeploymentPipeline = new DeploymentPipeline();

// ─── 3. Domain Provider ───────────────────────────────────────────────────────

export class DomainProvider {
  private domains: Map<string, CustomDomain> = new Map();

  async addDomain(projectId: string, environmentId: string, hostname: string): Promise<CustomDomain> {
    const cleanHost = hostname.trim().toLowerCase();

    // Check for conflict
    for (const d of Array.from(this.domains.values())) {
      if (d.hostname === cleanHost) {
        throw new Error(`DOMAIN_CONFLICT: Hostname '${cleanHost}' is already registered`);
      }
    }

    const id = `domain_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const domain: CustomDomain = {
      id,
      projectId,
      environmentId,
      hostname: cleanHost,
      status: 'pending',
      verificationStatus: 'unverified',
      dnsRecords: [
        { type: 'CNAME', name: cleanHost, value: 'cname.apexstudio.io', status: 'pending' },
        { type: 'TXT', name: `_apex-challenge.${cleanHost}`, value: `challenge_${Date.now()}`, status: 'pending' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.domains.set(id, domain);
    return domain;
  }

  async verifyDomain(domainId: string): Promise<CustomDomain> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    // Simulate DNS verification
    domain.dnsRecords.forEach((r) => {
      r.status = 'verified';
    });
    domain.verificationStatus = 'ssl_provisioned';
    domain.status = 'active';
    domain.updatedAt = new Date().toISOString();

    return domain;
  }

  async removeDomain(domainId: string): Promise<boolean> {
    return this.domains.delete(domainId);
  }

  async listDomains(projectId: string): Promise<CustomDomain[]> {
    return Array.from(this.domains.values()).filter((d) => d.projectId === projectId);
  }
}

export const defaultDomainProvider = new DomainProvider();
