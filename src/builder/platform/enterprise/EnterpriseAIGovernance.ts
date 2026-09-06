// Phase 9 Enterprise AI Governance & Large-Project Context Optimization
import { EnterpriseAIPolicy } from '../../schema/platform-v9';
import { AppProject } from '../../schema/project';
import { defaultAuditLogger } from '../security/EnterpriseSecurity';

export class EnterpriseAIGovernance {
  private policies: Map<string, EnterpriseAIPolicy> = new Map();
  private monthlyUsage: Map<string, number> = new Map(); // orgId -> tokens used

  async getPolicy(organizationId: string): Promise<EnterpriseAIPolicy> {
    let pol = this.policies.get(organizationId);
    if (!pol) {
      pol = {
        organizationId,
        allowedProviders: ['openai', 'gemini', 'anthropic', 'local_mock'],
        allowedModels: ['gpt-4o', 'gemini-1.5-pro', 'claude-3-5-sonnet', 'mock-ai'],
        maxMonthlyTokens: 1000000,
        maxAgentSteps: 20,
        requireApprovalForSensitiveOps: true,
        blockAccessToSensitiveCollections: true,
        redactPiiFromContext: true,
        auditAiPrompts: true,
        updatedAt: new Date().toISOString(),
      };
      this.policies.set(organizationId, pol);
    }
    return pol;
  }

  async updatePolicy(organizationId: string, updates: Partial<EnterpriseAIPolicy>, actorId: string): Promise<EnterpriseAIPolicy> {
    const current = await this.getPolicy(organizationId);
    const updated: EnterpriseAIPolicy = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.policies.set(organizationId, updated);

    await defaultAuditLogger.log({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'ai_governance_policy:update',
      resourceType: 'ai_policy',
      resourceId: organizationId,
      metadata: { changes: Object.keys(updates) },
      status: 'SUCCESS',
      ipHash: 'local',
    });

    return updated;
  }

  async validateAction(params: {
    organizationId: string;
    actorId?: string;
    userRole?: string;
    modelName: string;
    estimatedTokens: number;
    provider?: string;
    targetCollection?: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const policy = await this.getPolicy(params.organizationId);

    if (params.provider && !policy.allowedProviders.includes(params.provider as any)) {
      return { allowed: false, reason: `Provider '${params.provider}' is not permitted by enterprise AI policy` };
    }

    if (!policy.allowedModels.includes(params.modelName)) {
      return { allowed: false, reason: `UNAPPROVED_MODEL: Model '${params.modelName}' is not on the enterprise approved model list` };
    }

    const currentUsed = this.monthlyUsage.get(params.organizationId) || 0;
    if (currentUsed + params.estimatedTokens > policy.maxMonthlyTokens) {
      return { allowed: false, reason: `BUDGET_EXCEEDED: Monthly AI token quota exceeded (${currentUsed}/${policy.maxMonthlyTokens})` };
    }

    // Check sensitive collection protection
    if (policy.blockAccessToSensitiveCollections && params.targetCollection) {
      const sensitiveKeywords = ['users', 'passwords', 'payments', 'credentials', 'billing'];
      if (sensitiveKeywords.some((kw) => params.targetCollection!.toLowerCase().includes(kw))) {
        return { allowed: false, reason: `SENSITIVE_DATA_BLOCKED: AI access to sensitive collection '${params.targetCollection}' is blocked by policy` };
      }
    }

    // Increment usage
    this.monthlyUsage.set(params.organizationId, currentUsed + params.estimatedTokens);
    return { allowed: true };
  }

  async validateRequest(params: {
    organizationId: string;
    provider: string;
    model: string;
    estimatedTokens: number;
    targetCollection?: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    return this.validateAction({
      ...params,
      modelName: params.model,
    });
  }

  shieldSensitiveData<T extends { id: string; name: string; isSensitive?: boolean }>(collections: T[]): T[] {
    return collections.filter((c) => !c.isSensitive);
  }

  // Large-project context optimization & relevance ranking
  optimizeProjectContext(project: AppProject, activePageId?: string, maxTokens = 4000) {
    // 1. Prioritize active page
    const activePage = project.pages.find((p) => p.id === activePageId) || project.pages[0];

    // 2. High-level summaries of other pages rather than full AST
    const pageSummaries = project.pages.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      elementCount: p.root?.children?.length || 0,
      isActive: p.id === activePage?.id,
    }));

    // 3. Schema summaries (collection names & fields, without raw records)
    const collectionSummaries = (project.collections || []).map((c) => ({
      id: c.id,
      name: c.name,
      fields: c.fields.map((f) => ({ name: f.name, type: f.type })),
    }));

    return {
      projectId: project.id,
      version: project.version,
      theme: project.theme,
      activePage,
      pageSummaries,
      collectionSummaries,
      tokensCount: (project.tokens || []).length,
      workflowsCount: (project.workflows || []).length,
      estimatedContextTokens: Math.min(maxTokens, 1200),
    };
  }

  optimizeLargeProjectContext(project: AppProject, maxTokens = 4000) {
    const summary = this.optimizeProjectContext(project, undefined, maxTokens);
    return {
      ...summary,
      pagesCount: project.pages.length,
      estimatedTokens: Math.min(maxTokens, 1200),
    };
  }
}

export const defaultEnterpriseAIGovernance = new EnterpriseAIGovernance();
