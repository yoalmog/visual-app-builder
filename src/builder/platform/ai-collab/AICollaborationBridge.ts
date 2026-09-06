import { AICollaborationProposal, ProjectOperation } from '../../schema/platform';
import { AppProject } from '../../schema/project';
import { AIOperation } from '../../../ai/operations/AIOperation';
import { OperationExecutor } from '../../../ai/operations/OperationExecutor';
import { defaultCollaborationProvider } from '../collaboration/CollaborationProvider';

export class AICollaborationBridge {
  private proposals: Map<string, AICollaborationProposal> = new Map();

  createCollaborationAwareContext(
    project: AppProject,
    currentUserId: string
  ): Record<string, any> {
    const activePresences = defaultCollaborationProvider.getPresences();
    const currentVersion = defaultCollaborationProvider.getProjectVersion();
    const otherCollaborators = activePresences
      .filter((p) => p.userId !== currentUserId)
      .map((p) => ({
        id: p.userId,
        name: p.userName,
        page: p.activePageId,
        selectedNodes: p.selectedNodeIds,
      }));

    return {
      projectId: project.id,
      projectName: project.name,
      branch: project.branch || 'main',
      projectVersion: currentVersion,
      collaboratorsCount: activePresences.length,
      activeCollaborators: otherCollaborators,
      recentCommentsCount: project.comments?.length || 0,
    };
  }

  createProposal(params: {
    baseVersion: number;
    branch: string;
    operations: AIOperation[] | ProjectOperation[];
    explanation: string;
    risk?: 'low' | 'medium' | 'high' | 'critical';
    affectedResources?: string[];
  }): AICollaborationProposal {
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const proposal: AICollaborationProposal = {
      proposalId,
      author: 'AI',
      baseVersion: params.baseVersion,
      branch: params.branch,
      operations: params.operations,
      explanation: params.explanation,
      risk: params.risk || 'low',
      affectedResources: params.affectedResources || [],
      status: 'proposed',
      createdAt: new Date().toISOString(),
    };

    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  async applyProposal(
    proposalId: string,
    currentProject: AppProject,
    currentServerVersion: number
  ): Promise<{
    success: boolean;
    updatedProject?: AppProject;
    proposal: AICollaborationProposal;
    conflict?: boolean;
    error?: string;
  }> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    // Stale State Protection: Verify current version matches proposal base version
    if (currentServerVersion !== proposal.baseVersion) {
      proposal.status = 'conflict_stale';
      return {
        success: false,
        conflict: true,
        proposal,
        error: `STALE_AI_PROPOSAL: Project version has advanced from ${proposal.baseVersion} to ${currentServerVersion} due to concurrent edits. Rebase or review needed.`,
      };
    }

    try {
      let workingProject = JSON.parse(JSON.stringify(currentProject));

      // Execute typed AIOperations batch
      const aiOps = (proposal.operations as AIOperation[]).filter((op) => 'type' in op && typeof op.type === 'string');
      if (aiOps.length > 0) {
        const res = OperationExecutor.execute(workingProject, aiOps);
        if (res.errors.length > 0) {
          throw new Error(`AI operation failed: ${res.errors[0].error}`);
        }
        workingProject = res.updatedProject;
      }

      proposal.status = 'accepted';
      return {
        success: true,
        updatedProject: workingProject,
        proposal,
      };
    } catch (err: any) {
      proposal.status = 'rejected';
      return {
        success: false,
        proposal,
        error: err.message,
      };
    }
  }

  getProposal(proposalId: string): AICollaborationProposal | null {
    return this.proposals.get(proposalId) || null;
  }

  listProposals(): AICollaborationProposal[] {
    return Array.from(this.proposals.values());
  }
}

export const defaultAICollaborationBridge = new AICollaborationBridge();
