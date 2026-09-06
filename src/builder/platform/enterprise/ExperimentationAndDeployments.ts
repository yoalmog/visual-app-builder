// Phase 9 Feature Flags, A/B Testing, Canary Rollouts, Blue/Green & Staging Promotion
import crypto from 'crypto';
import {
  FeatureFlag,
  Experiment,
  ExperimentVariant,
  ExperimentAssignment,
  CanaryConfig,
  StagingPromotionConfig,
} from '../../schema/platform-v9';
import { AppProject } from '../../schema/project';
import { defaultVersionControlProvider } from '../version-control/VersionControlProvider';
import { defaultDeploymentPipeline } from '../deployments/DeploymentPipeline';
import { defaultAuditLogger } from '../security/EnterpriseSecurity';

// ─── 1. Feature Flag Provider ─────────────────────────────────────────────────

export interface FeatureFlagProvider {
  createFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;
  getFlag(id: string): Promise<FeatureFlag | null>;
  getFlagByKey(key: string, organizationId: string): Promise<FeatureFlag | null>;
  listFlags(organizationId: string): Promise<FeatureFlag[]>;
  evaluateFlag(key: string, context: { organizationId: string; userId?: string; userRole?: string; environment?: 'development' | 'preview' | 'staging' | 'production' }): Promise<boolean>;
  deleteFlag(id: string): Promise<boolean>;
}

export class LocalFeatureFlagProvider implements FeatureFlagProvider {
  private flags: Map<string, FeatureFlag> = new Map();

  async createFlag(params: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const id = `flag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const flag: FeatureFlag = {
      ...params,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.flags.set(id, flag);
    return flag;
  }

  async getFlag(id: string): Promise<FeatureFlag | null> {
    return this.flags.get(id) || null;
  }

  async getFlagByKey(key: string, organizationId: string): Promise<FeatureFlag | null> {
    for (const f of Array.from(this.flags.values())) {
      if (f.key === key && f.organizationId === organizationId) return f;
    }
    return null;
  }

  async listFlags(organizationId: string): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values()).filter((f) => f.organizationId === organizationId);
  }

  async evaluateFlag(
    key: string,
    context: { organizationId: string; userId?: string; userRole?: string; environment?: 'development' | 'preview' | 'staging' | 'production' }
  ): Promise<boolean> {
    const flag = await this.getFlagByKey(key, context.organizationId);
    if (!flag || !flag.enabled) return false;

    // Check environment targets
    if (context.environment && !flag.environmentTargets.includes(context.environment)) {
      return false;
    }

    // Check user ID targeting override
    if (context.userId && flag.targetUserIds?.includes(context.userId)) {
      return true;
    }

    // Check role targeting override
    if (context.userRole && flag.targetRoles?.includes(context.userRole)) {
      return true;
    }

    // Percentage rollout evaluation with deterministic SHA-256 bucketing
    if (flag.percentageRollout >= 100) return true;
    if (flag.percentageRollout <= 0) return false;

    const subject = context.userId || 'anonymous';
    const hash = crypto.createHash('sha256').update(`${flag.key}:${subject}`).digest('hex');
    const bucket = parseInt(hash.substring(0, 8), 16) % 100;
    return bucket < flag.percentageRollout;
  }

  async deleteFlag(id: string): Promise<boolean> {
    return this.flags.delete(id);
  }
}

// ─── 2. Experimentation & A/B Testing Provider ────────────────────────────────

export interface ExperimentProvider {
  createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt'>): Promise<Experiment>;
  getExperiment(id: string): Promise<Experiment | null>;
  listExperiments(organizationId: string): Promise<Experiment[]>;
  assignVariant(experimentKey: string, userId: string, organizationId: string): Promise<ExperimentVariant | null>;
  concludeExperiment(id: string, winnerVariantId: string): Promise<Experiment>;
}

export class LocalExperimentProvider implements ExperimentProvider {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, ExperimentAssignment> = new Map(); // `expKey:userId` -> assignment

  async createExperiment(params: Omit<Experiment, 'id' | 'createdAt'>): Promise<Experiment> {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const experiment: Experiment = {
      ...params,
      id,
      status: params.status || 'draft',
      createdAt: new Date().toISOString(),
    };
    this.experiments.set(id, experiment);
    return experiment;
  }

  async getExperiment(id: string): Promise<Experiment | null> {
    return this.experiments.get(id) || null;
  }

  async listExperiments(organizationId: string): Promise<Experiment[]> {
    return Array.from(this.experiments.values()).filter((e) => e.organizationId === organizationId);
  }

  async assignVariant(experimentKey: string, userId: string, organizationId: string): Promise<ExperimentVariant | null> {
    const exp = Array.from(this.experiments.values()).find((e) => e.key === experimentKey && e.organizationId === organizationId);
    if (!exp || exp.status !== 'running' || exp.variants.length === 0) return null;

    const assignmentKey = `${exp.key}:${userId}`;
    const cached = this.assignments.get(assignmentKey);
    if (cached) {
      return exp.variants.find((v) => v.key === cached.variantKey) || null;
    }

    // Deterministic assignment using hash mod 100
    const hash = crypto.createHash('sha256').update(`${exp.key}:${userId}`).digest('hex');
    const bucket = parseInt(hash.substring(0, 8), 16) % 100;

    let cumulative = 0;
    let selectedVariant = exp.variants[0];
    for (const v of exp.variants) {
      cumulative += v.weight;
      if (bucket < cumulative) {
        selectedVariant = v;
        break;
      }
    }

    this.assignments.set(assignmentKey, {
      experimentId: exp.id,
      userId,
      variantKey: selectedVariant.key,
      assignedAt: new Date().toISOString(),
    });

    return selectedVariant;
  }

  async concludeExperiment(id: string, winnerVariantId: string): Promise<Experiment> {
    const exp = this.experiments.get(id);
    if (!exp) throw new Error('Experiment not found');
    exp.status = 'concluded';
    exp.winnerVariantId = winnerVariantId;
    exp.concludedAt = new Date().toISOString();
    return exp;
  }
}

// ─── 3. Advanced Deployment Strategies & Staging Promotion ─────────────────────

export interface AdvancedDeploymentEngine {
  deployCanary(params: { projectId: string; organizationId: string; branch: string; commitId: string; projectSnapshot: AppProject; config?: Partial<CanaryConfig> }): Promise<{ releaseId: string; canary: CanaryConfig; status: 'canary_active' }>;
  advanceCanaryTraffic(projectId: string, increment?: number): Promise<{ newPercentage: number; promotedToFull: boolean }>;
  deployBlueGreen(params: { projectId: string; organizationId: string; branch: string; commitId: string; projectSnapshot: AppProject }): Promise<{ activeColor: 'blue' | 'green'; standbyColor: 'blue' | 'green'; releaseId: string }>;
  promoteEnvironment(params: { projectId: string; organizationId: string; config: StagingPromotionConfig; actorId: string }): Promise<{ success: boolean; releaseId: string; promotedTo: string }>;
}

export class LocalAdvancedDeploymentEngine implements AdvancedDeploymentEngine {
  private canaryStates: Map<string, CanaryConfig> = new Map(); // projectId -> CanaryConfig
  private blueGreenStates: Map<string, 'blue' | 'green'> = new Map(); // projectId -> activeColor

  async deployCanary(params: {
    projectId: string;
    organizationId: string;
    branch: string;
    commitId: string;
    projectSnapshot: AppProject;
    config?: Partial<CanaryConfig>;
  }) {
    const canaryConfig: CanaryConfig = {
      enabled: true,
      currentTrafficPercentage: 10,
      stepPercentage: params.config?.stepPercentage || 20,
      stepIntervalSeconds: params.config?.stepIntervalSeconds || 60,
      errorThresholdPercent: params.config?.errorThresholdPercent || 2,
      latencyThresholdMs: params.config?.latencyThresholdMs || 250,
      ...params.config,
    };

    this.canaryStates.set(params.projectId, canaryConfig);

    const pipeRes = await defaultDeploymentPipeline.executePipeline({
      projectId: params.projectId,
      organizationId: params.organizationId,
      environment: 'production',
      branchName: params.branch,
      commitId: params.commitId,
      projectSnapshot: params.projectSnapshot,
      actorId: 'canary_orchestrator',
    });

    if (!pipeRes.success || !pipeRes.release) {
      throw new Error('Canary deployment pipeline failed');
    }

    return {
      releaseId: pipeRes.release.id,
      canary: canaryConfig,
      status: 'canary_active' as const,
    };
  }

  async advanceCanaryTraffic(projectId: string, increment = 20) {
    const config = this.canaryStates.get(projectId);
    if (!config || !config.enabled) throw new Error('No active canary for project');

    config.currentTrafficPercentage = Math.min(100, config.currentTrafficPercentage + increment);
    const promotedToFull = config.currentTrafficPercentage >= 100;
    if (promotedToFull) {
      config.enabled = false;
    }

    return {
      newPercentage: config.currentTrafficPercentage,
      promotedToFull,
    };
  }

  async deployBlueGreen(params: {
    projectId: string;
    organizationId: string;
    branch: string;
    commitId: string;
    projectSnapshot: AppProject;
  }) {
    const currentColor: 'blue' | 'green' = this.blueGreenStates.get(params.projectId) || 'blue';
    const targetColor: 'blue' | 'green' = currentColor === 'blue' ? 'green' : 'blue';

    const pipeRes = await defaultDeploymentPipeline.executePipeline({
      projectId: params.projectId,
      organizationId: params.organizationId,
      environment: 'production',
      branchName: params.branch,
      commitId: params.commitId,
      projectSnapshot: params.projectSnapshot,
      actorId: 'blue_green_orchestrator',
    });

    if (!pipeRes.success || !pipeRes.release) {
      throw new Error('Blue/Green deployment pipeline failed');
    }

    // Health checks passed -> Flip live traffic to new environment
    this.blueGreenStates.set(params.projectId, targetColor);

    return {
      activeColor: targetColor,
      standbyColor: currentColor,
      releaseId: pipeRes.release.id,
    };
  }

  async promoteEnvironment(params: {
    projectId: string;
    organizationId: string;
    config: StagingPromotionConfig;
    actorId: string;
  }) {
    const releases = await defaultVersionControlProvider.listReleases(params.projectId, params.config.sourceEnvironment as any);
    const latestRelease = releases[0];
    if (!latestRelease) {
      throw new Error(`No releases found in ${params.config.sourceEnvironment} to promote`);
    }

    const snapshot = await defaultVersionControlProvider.getSnapshot(latestRelease.snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot for release not found');
    }

    // Pipeline to target environment
    const pipeRes = await defaultDeploymentPipeline.executePipeline({
      projectId: params.projectId,
      organizationId: params.organizationId,
      environment: params.config.targetEnvironment as any,
      branchName: latestRelease.branch,
      commitId: latestRelease.commitId,
      projectSnapshot: snapshot.project,
      actorId: params.actorId,
    });

    if (!pipeRes.success || !pipeRes.release) {
      if (params.config.automatedRollbackOnFailure) {
        // Trigger automated rollback
        const priorReleases = await defaultVersionControlProvider.listReleases(params.projectId, params.config.targetEnvironment as any);
        if (priorReleases.length > 0) {
          await defaultDeploymentPipeline.rollback({
            projectId: params.projectId,
            environment: params.config.targetEnvironment as any,
            targetReleaseId: priorReleases[0].id,
            actorId: 'auto_rollback_guardian',
            reason: 'Automated rollback triggered by failed environment promotion health checks',
          });
        }
      }
      throw new Error(`Environment promotion to ${params.config.targetEnvironment} failed`);
    }

    await defaultAuditLogger.log({
      organizationId: params.organizationId,
      actorId: params.actorId,
      actorType: 'user',
      action: 'environment:promote',
      resourceType: 'environment',
      resourceId: params.config.targetEnvironment,
      metadata: {
        sourceEnv: params.config.sourceEnvironment,
        targetEnv: params.config.targetEnvironment,
        releaseId: pipeRes.release.id,
      },
      status: 'SUCCESS',
      ipHash: 'local',
    });

    return {
      success: true,
      releaseId: pipeRes.release.id,
      promotedTo: params.config.targetEnvironment,
    };
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export const defaultFeatureFlagProvider = new LocalFeatureFlagProvider();
export const defaultExperimentProvider = new LocalExperimentProvider();
export const defaultAdvancedDeploymentEngine = new LocalAdvancedDeploymentEngine();
