// AI Transaction Manager: Atomic execution and 1-click rollback
import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { OperationValidator } from '../operations/OperationValidator';
import { OperationDependencyResolver } from '../operations/OperationDependencyResolver';
import { OperationExecutor } from '../operations/OperationExecutor';
import { AIDiff, ProjectDiffSummary } from './AIDiff';
import { AIGeneration } from '../../builder/schema/ai';

export interface TransactionResult {
  success: boolean;
  generationId: string;
  updatedProject: AppProject;
  diff: ProjectDiffSummary;
  appliedOperations: AIOperation[];
  errors?: string[];
}

export class AITransactionManager {
  private static rollbackSnapshots = new Map<string, AppProject>();

  /**
   * Executes an array of operations atomically against an AppProject.
   * If any error occurs, the original project state is preserved and restored.
   */
  public static executeTransaction(params: {
    project: AppProject;
    operations: AIOperation[];
    prompt: string;
    mode?: 'ask' | 'generate' | 'edit' | 'debug' | 'agent';
    generationId?: string;
  }): TransactionResult {
    const generationId = params.generationId || `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const snapshot: AppProject = JSON.parse(JSON.stringify(params.project));

    // Save snapshot for potential rollback
    this.rollbackSnapshots.set(generationId, snapshot);

    // 1. Validate operations
    const valResult = OperationValidator.validateAll(params.operations);
    if (!valResult.valid) {
      return {
        success: false,
        generationId,
        updatedProject: snapshot,
        diff: AIDiff.diff(snapshot, snapshot),
        appliedOperations: [],
        errors: valResult.errors,
      };
    }

    // 2. Resolve dependencies
    const depResult = OperationDependencyResolver.resolve(params.operations);
    if (depResult.hasCycle) {
      return {
        success: false,
        generationId,
        updatedProject: snapshot,
        diff: AIDiff.diff(snapshot, snapshot),
        appliedOperations: [],
        errors: [depResult.error || 'Cyclic dependency detected'],
      };
    }

    // 3. Execute operations
    const execResult = OperationExecutor.execute(snapshot, depResult.ordered);
    if (execResult.errors.length > 0) {
      // Rollback immediately
      return {
        success: false,
        generationId,
        updatedProject: snapshot,
        diff: AIDiff.diff(snapshot, snapshot),
        appliedOperations: [],
        errors: execResult.errors.map((e) => `Op ${e.opId}: ${e.error}`),
      };
    }

    const diff = AIDiff.diff(snapshot, execResult.updatedProject);

    // Record generation entry in project metadata
    if (!execResult.updatedProject.aiMetadata) {
      execResult.updatedProject.aiMetadata = {
        enabled: true,
        settings: {
          provider: 'mock',
          model: 'gpt-4o',
          temperature: 0.2,
          maxTokens: 4096,
          safetyMode: 'approval',
          autoApplyLowRisk: true,
          tokenBudget: 50000,
          agentMaxSteps: 15,
          maxRetries: 3,
        },
        generations: [],
        conversations: [],
        memory: { preferences: {}, conventions: [], preferredTerminology: {}, notes: [] },
      };
    }

    const generationRecord: AIGeneration = {
      id: generationId,
      prompt: params.prompt,
      timestamp: new Date().toISOString(),
      status: 'applied',
      mode: params.mode || 'generate',
      summary: {
        pagesCreated: diff.pagesAdded.length,
        pagesModified: diff.pagesModified.length,
        componentsAdded: diff.componentsAddedCount,
        componentsModified: 0,
        collectionsCreated: diff.collectionsAdded.length,
        workflowsCreated: diff.workflowsAdded.length,
        themesUpdated: diff.themeModified ? 1 : 0,
      },
      operationIds: params.operations.map((o) => o.id),
      projectVersionBefore: snapshot.version,
      projectVersionAfter: execResult.updatedProject.version,
      appliedAt: new Date().toISOString(),
    };

    execResult.updatedProject.aiMetadata.generations.push(generationRecord);

    return {
      success: true,
      generationId,
      updatedProject: execResult.updatedProject,
      diff,
      appliedOperations: depResult.ordered,
    };
  }

  /**
   * Reverts a generation by restoring the before-snapshot.
   */
  public static rollback(generationId: string): { success: boolean; restoredProject?: AppProject; error?: string } {
    const snapshot = this.rollbackSnapshots.get(generationId);
    if (!snapshot) {
      return { success: false, error: `No rollback snapshot found for generation ${generationId}` };
    }

    const restored: AppProject = JSON.parse(JSON.stringify(snapshot));

    // Mark generation as rolled back in metadata if present
    if (restored.aiMetadata?.generations) {
      const gen = restored.aiMetadata.generations.find((g) => g.id === generationId);
      if (gen) {
        gen.status = 'rolled_back';
        gen.rolledBackAt = new Date().toISOString();
      }
    }

    this.rollbackSnapshots.delete(generationId);
    return { success: true, restoredProject: restored };
  }
}
