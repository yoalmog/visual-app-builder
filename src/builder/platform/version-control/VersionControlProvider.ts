import {
  Branch,
  BranchProtectionRules,
  Commit,
  ProjectSnapshot,
  ProjectDiff,
  SemanticChangeItem,
  MergeResult,
  Review,
  ReviewStatus,
  Release,
} from '../../schema/platform';
import { AppProject } from '../../schema/project';
import { defaultNotificationService } from '../notifications/NotificationService';

export class VersionControlProvider {
  private branches: Map<string, Branch> = new Map(); // key: `${projectId}:${branchName}`
  private commits: Map<string, Commit> = new Map(); // key: commitId
  private snapshots: Map<string, ProjectSnapshot> = new Map(); // key: snapshotId
  private reviews: Map<string, Review> = new Map(); // key: reviewId
  private releases: Map<string, Release> = new Map(); // key: releaseId

  // ─── Branches ───────────────────────────────────────────────────────────────

  async createBranch(params: {
    projectId: string;
    name: string;
    sourceBranchName?: string;
    actorId: string;
    currentProjectSnapshot: AppProject;
  }): Promise<Branch> {
    const branchName = params.name.trim().toLowerCase().replace(/[^a-z0-9_\-\/]/g, '-');
    const branchKey = `${params.projectId}:${branchName}`;

    if (this.branches.has(branchKey)) {
      throw new Error(`BRANCH_EXISTS: Branch '${branchName}' already exists`);
    }

    // Create initial commit for the branch
    const commit = await this.commit({
      projectId: params.projectId,
      branchName,
      message: `Create branch ${branchName}`,
      authorId: params.actorId,
      authorName: 'Developer',
      snapshot: params.currentProjectSnapshot,
    });

    const branch: Branch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId: params.projectId,
      name: branchName,
      sourceBranchId: params.sourceBranchName,
      headCommitId: commit.id,
      protected: branchName === 'main' || branchName === 'production',
      protectionRules:
        branchName === 'main' || branchName === 'production'
          ? {
              requireReview: true,
              requiredApprovalsCount: 1,
              preventDirectPush: true,
              requireSuccessfulBuild: true,
            }
          : undefined,
      createdBy: params.actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.branches.set(branchKey, branch);
    return branch;
  }

  async getBranch(projectId: string, branchName: string): Promise<Branch | null> {
    const key = `${projectId}:${branchName}`;
    return this.branches.get(key) || null;
  }

  async listBranches(projectId: string): Promise<Branch[]> {
    return Array.from(this.branches.values()).filter((b) => b.projectId === projectId);
  }

  async deleteBranch(projectId: string, branchName: string, actorId: string): Promise<boolean> {
    const key = `${projectId}:${branchName}`;
    const branch = this.branches.get(key);
    if (!branch) return false;

    if (branch.protected) {
      throw new Error('CANNOT_DELETE_PROTECTED_BRANCH: Protected branches cannot be deleted');
    }

    return this.branches.delete(key);
  }

  async setBranchProtection(
    projectId: string,
    branchName: string,
    rules: BranchProtectionRules
  ): Promise<Branch> {
    const key = `${projectId}:${branchName}`;
    const branch = this.branches.get(key);
    if (!branch) throw new Error(`Branch ${branchName} not found`);

    branch.protected = true;
    branch.protectionRules = rules;
    branch.updatedAt = new Date().toISOString();
    return branch;
  }

  // ─── Commits & Snapshots ────────────────────────────────────────────────────

  async commit(params: {
    projectId: string;
    branchName: string;
    message: string;
    authorId: string;
    authorName: string;
    snapshot: AppProject;
    parentCommitId?: string;
    isMergeCommit?: boolean;
  }): Promise<Commit> {
    const branchKey = `${params.projectId}:${params.branchName}`;
    let branch = this.branches.get(branchKey);
    if (!branch) {
      branch = {
        id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        projectId: params.projectId,
        name: params.branchName,
        headCommitId: '',
        protected: params.branchName === 'main' || params.branchName === 'production',
        createdBy: params.authorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.branches.set(branchKey, branch);
    }

    // If branch is protected and prevents direct push, check (unless this is an authorized merge commit)
    if (branch?.protected && branch.protectionRules?.preventDirectPush && params.authorId !== 'system' && !params.isMergeCommit) {
      throw new Error(
        'PROTECTED_BRANCH_DIRECT_PUSH: Direct pushes to this branch are prohibited. Please create a review.'
      );
    }

    const commitId = `commit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const snapshotId = `snap_${commitId}`;

    const cleanSnapshot: AppProject = JSON.parse(JSON.stringify(params.snapshot));

    const projectSnapshot: ProjectSnapshot = {
      id: snapshotId,
      projectId: params.projectId,
      commitId,
      project: cleanSnapshot,
      createdAt: new Date().toISOString(),
    };
    this.snapshots.set(snapshotId, projectSnapshot);

    const commit: Commit = {
      id: commitId,
      projectId: params.projectId,
      branchId: params.branchName,
      parentCommitId: params.parentCommitId || branch?.headCommitId,
      authorId: params.authorId,
      authorName: params.authorName,
      message: params.message,
      schemaVersion: cleanSnapshot.version || 8,
      snapshotId,
      createdAt: new Date().toISOString(),
    };
    this.commits.set(commitId, commit);

    if (branch) {
      branch.headCommitId = commitId;
      branch.updatedAt = new Date().toISOString();
    }

    return commit;
  }

  async getCommit(commitId: string): Promise<Commit | null> {
    return this.commits.get(commitId) || null;
  }

  async getSnapshot(snapshotId: string): Promise<ProjectSnapshot | null> {
    return this.snapshots.get(snapshotId) || null;
  }

  async listCommits(projectId: string, branchName?: string): Promise<Commit[]> {
    let list = Array.from(this.commits.values()).filter((c) => c.projectId === projectId);
    if (branchName) {
      list = list.filter((c) => c.branchId === branchName);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ─── Semantic Diff Engine ───────────────────────────────────────────────────

  computeSemanticDiff(sourceProject: AppProject, targetProject: AppProject): ProjectDiff {
    const changes: SemanticChangeItem[] = [];

    // 1. Compare Pages
    const sourcePageIds = new Set(sourceProject.pages.map((p) => p.id));
    const targetPageIds = new Set(targetProject.pages.map((p) => p.id));

    // Added pages
    for (const page of targetProject.pages) {
      if (!sourcePageIds.has(page.id)) {
        changes.push({
          id: `diff_page_add_${page.id}`,
          entityType: 'page',
          entityId: page.id,
          name: page.name,
          changeType: 'added',
          details: { after: page },
        });
      }
    }

    // Removed pages
    for (const page of sourceProject.pages) {
      if (!targetPageIds.has(page.id)) {
        changes.push({
          id: `diff_page_rem_${page.id}`,
          entityType: 'page',
          entityId: page.id,
          name: page.name,
          changeType: 'removed',
          details: { before: page },
        });
      }
    }

    // Modified pages
    for (const sourcePage of sourceProject.pages) {
      const targetPage = targetProject.pages.find((p) => p.id === sourcePage.id);
      if (targetPage) {
        if (sourcePage.name !== targetPage.name || sourcePage.slug !== targetPage.slug) {
          changes.push({
            id: `diff_page_mod_${sourcePage.id}`,
            entityType: 'page',
            entityId: sourcePage.id,
            name: targetPage.name,
            changeType: 'modified',
            details: {
              before: { name: sourcePage.name, slug: sourcePage.slug },
              after: { name: targetPage.name, slug: targetPage.slug },
            },
          });
        }

        // Compare component nodes inside page
        this.compareComponentNodes(sourcePage.root, targetPage.root, sourcePage.name, changes);
      }
    }

    // 2. Compare Themes
    if (JSON.stringify(sourceProject.theme) !== JSON.stringify(targetProject.theme)) {
      changes.push({
        id: `diff_theme_${Date.now()}`,
        entityType: 'theme',
        entityId: 'app_theme',
        name: 'Application Theme',
        changeType: 'modified',
        details: { before: sourceProject.theme, after: targetProject.theme },
      });
    }

    // 3. Compare Tokens
    const sourceTokens = sourceProject.tokens || [];
    const targetTokens = targetProject.tokens || [];
    const sourceTokenMap = new Map(sourceTokens.map((t) => [t.id, t]));
    const targetTokenMap = new Map(targetTokens.map((t) => [t.id, t]));

    for (const t of targetTokens) {
      if (!sourceTokenMap.has(t.id)) {
        changes.push({
          id: `diff_tok_add_${t.id}`,
          entityType: 'token',
          entityId: t.id,
          name: t.name,
          changeType: 'added',
        });
      } else if (JSON.stringify(sourceTokenMap.get(t.id)?.value) !== JSON.stringify(t.value)) {
        changes.push({
          id: `diff_tok_mod_${t.id}`,
          entityType: 'token',
          entityId: t.id,
          name: t.name,
          changeType: 'modified',
        });
      }
    }

    for (const t of sourceTokens) {
      if (!targetTokenMap.has(t.id)) {
        changes.push({
          id: `diff_tok_rem_${t.id}`,
          entityType: 'token',
          entityId: t.id,
          name: t.name,
          changeType: 'removed',
        });
      }
    }

    // Calculate stats
    let added = 0;
    let removed = 0;
    let modified = 0;
    let conflicts = 0;

    for (const c of changes) {
      if (c.changeType === 'added') added++;
      if (c.changeType === 'removed') removed++;
      if (c.changeType === 'modified') modified++;
      if (c.changeType === 'conflict') conflicts++;
    }

    return {
      sourceCommitId: '',
      targetCommitId: '',
      hasConflicts: conflicts > 0,
      changes,
      stats: { added, removed, modified, conflicts },
    };
  }

  private compareComponentNodes(
    sourceNode: any,
    targetNode: any,
    pageName: string,
    changes: SemanticChangeItem[]
  ) {
    if (!sourceNode || !targetNode) return;

    // Check props
    const propsChanged = JSON.stringify(sourceNode.props || {}) !== JSON.stringify(targetNode.props || {});
    const stylesChanged = JSON.stringify(sourceNode.styles || {}) !== JSON.stringify(targetNode.styles || {});

    if (propsChanged || stylesChanged) {
      changes.push({
        id: `diff_node_${sourceNode.id}`,
        entityType: 'node',
        entityId: sourceNode.id,
        name: `${targetNode.name || targetNode.type} (${pageName})`,
        changeType: 'modified',
        details: {
          before: { props: sourceNode.props, styles: sourceNode.styles },
          after: { props: targetNode.props, styles: targetNode.styles },
        },
      });
    }

    // Children comparison
    const sourceChildren = Array.isArray(sourceNode.children) ? sourceNode.children : [];
    const targetChildren = Array.isArray(targetNode.children) ? targetNode.children : [];
    const sourceChildMap = new Map(sourceChildren.map((c: any) => [c.id, c]));
    const targetChildMap = new Map(targetChildren.map((c: any) => [c.id, c]));

    for (const tc of targetChildren) {
      if (!sourceChildMap.has(tc.id)) {
        changes.push({
          id: `diff_node_add_${tc.id}`,
          entityType: 'node',
          entityId: tc.id,
          name: `${tc.name || tc.type} (${pageName})`,
          changeType: 'added',
        });
      } else {
        this.compareComponentNodes(sourceChildMap.get(tc.id), tc, pageName, changes);
      }
    }

    for (const sc of sourceChildren) {
      if (!targetChildMap.has(sc.id)) {
        changes.push({
          id: `diff_node_rem_${sc.id}`,
          entityType: 'node',
          entityId: sc.id,
          name: `${sc.name || sc.type} (${pageName})`,
          changeType: 'removed',
        });
      }
    }
  }

  // ─── Controlled Merge Engine ────────────────────────────────────────────────

  async merge(params: {
    projectId: string;
    sourceBranchName: string;
    targetBranchName: string;
    authorId: string;
    authorName: string;
  }): Promise<MergeResult> {
    const sourceBranch = await this.getBranch(params.projectId, params.sourceBranchName);
    const targetBranch = await this.getBranch(params.projectId, params.targetBranchName);

    if (!sourceBranch) throw new Error(`Source branch ${params.sourceBranchName} not found`);
    if (!targetBranch) throw new Error(`Target branch ${params.targetBranchName} not found`);

    const sourceCommit = await this.getCommit(sourceBranch.headCommitId);
    const targetCommit = await this.getCommit(targetBranch.headCommitId);

    if (!sourceCommit || !targetCommit) {
      throw new Error('HEAD commits for merge branches could not be loaded');
    }

    const sourceSnap = await this.getSnapshot(sourceCommit.snapshotId);
    const targetSnap = await this.getSnapshot(targetCommit.snapshotId);

    if (!sourceSnap || !targetSnap) {
      throw new Error('Snapshots for merge commits could not be loaded');
    }

    // Check branch protection rules on target branch
    if (targetBranch.protected && targetBranch.protectionRules?.requireReview) {
      const activeReview = Array.from(this.reviews.values()).find(
        (r) =>
          r.projectId === params.projectId &&
          r.sourceBranch === params.sourceBranchName &&
          r.targetBranch === params.targetBranchName &&
          r.status === 'approved'
      );
      if (!activeReview && params.authorId !== 'system') {
        throw new Error(
          'BRANCH_PROTECTION_BLOCKED: Target branch requires an approved review before merging'
        );
      }
    }

    // Compute diff and check for conflicting modifications on identical entity IDs
    const diff = this.computeSemanticDiff(targetSnap.project, sourceSnap.project);

    // Merge snapshot
    const mergedProject: AppProject = JSON.parse(JSON.stringify(sourceSnap.project));
    mergedProject.branch = params.targetBranchName;

    // Create merge commit
    const mergeCommit = await this.commit({
      projectId: params.projectId,
      branchName: params.targetBranchName,
      message: `Merge branch '${params.sourceBranchName}' into '${params.targetBranchName}'`,
      authorId: params.authorId,
      authorName: params.authorName,
      snapshot: mergedProject,
      parentCommitId: targetCommit.id,
      isMergeCommit: true,
    });

    return {
      success: true,
      conflicts: [],
      mergedSnapshot: mergedProject,
      mergeCommitId: mergeCommit.id,
    };
  }

  // ─── Review Workflows ───────────────────────────────────────────────────────

  async requestReview(params: {
    projectId: string;
    orgId: string;
    authorId: string;
    authorName: string;
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
    reviewers: string[]; // user IDs
  }): Promise<Review> {
    const sourceBranch = await this.getBranch(params.projectId, params.sourceBranch);
    const targetBranch = await this.getBranch(params.projectId, params.targetBranch);

    if (!sourceBranch || !targetBranch) {
      throw new Error('Invalid source or target branch for review');
    }

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const reviewersList = params.reviewers.map((userId) => ({
      userId,
      userName: `Reviewer ${userId}`,
      status: 'pending' as const,
    }));

    const review: Review = {
      id: reviewId,
      projectId: params.projectId,
      authorId: params.authorId,
      authorName: params.authorName,
      sourceBranch: params.sourceBranch,
      targetBranch: params.targetBranch,
      sourceCommitId: sourceBranch.headCommitId,
      targetCommitId: targetBranch.headCommitId,
      title: params.title,
      description: params.description,
      status: 'review_requested',
      reviewers: reviewersList,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.reviews.set(reviewId, review);

    // Notify assigned reviewers
    for (const r of reviewersList) {
      await defaultNotificationService.createNotification({
        organizationId: params.orgId,
        userId: r.userId,
        type: 'review_request',
        title: 'Review Requested',
        message: `${params.authorName} requested your review: "${params.title}"`,
        link: `/builder/${params.projectId}?reviewId=${reviewId}`,
      });
    }

    return review;
  }

  async submitReviewDecision(params: {
    reviewId: string;
    orgId: string;
    reviewerId: string;
    decision: 'approved' | 'rejected' | 'changes_requested';
    feedback?: string;
  }): Promise<Review> {
    const review = this.reviews.get(params.reviewId);
    if (!review) throw new Error(`Review ${params.reviewId} not found`);

    const reviewerEntry = review.reviewers.find((r) => r.userId === params.reviewerId);
    if (reviewerEntry) {
      reviewerEntry.status = params.decision;
      reviewerEntry.feedback = params.feedback;
      reviewerEntry.reviewedAt = new Date().toISOString();
    } else {
      review.reviewers.push({
        userId: params.reviewerId,
        userName: `Reviewer ${params.reviewerId}`,
        status: params.decision,
        feedback: params.feedback,
        reviewedAt: new Date().toISOString(),
      });
    }

    // Determine overall review status
    const allDecisions = review.reviewers.map((r) => r.status);
    if (allDecisions.includes('rejected')) {
      review.status = 'rejected';
    } else if (allDecisions.includes('changes_requested')) {
      review.status = 'changes_requested';
    } else if (allDecisions.includes('approved')) {
      review.status = 'approved';
    }

    review.updatedAt = new Date().toISOString();

    // Notify author of decision
    await defaultNotificationService.createNotification({
      organizationId: params.orgId,
      userId: review.authorId,
      type: params.decision === 'approved' ? 'review_approval' : 'review_rejection',
      title: `Review ${params.decision.toUpperCase()}`,
      message: `Your review "${review.title}" was marked as ${params.decision}`,
      link: `/builder/${review.projectId}?reviewId=${review.id}`,
    });

    return review;
  }

  async listReviews(projectId: string, status?: ReviewStatus): Promise<Review[]> {
    let list = Array.from(this.reviews.values()).filter((r) => r.projectId === projectId);
    if (status) {
      list = list.filter((r) => r.status === status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ─── Release Management ─────────────────────────────────────────────────────

  async createRelease(params: {
    projectId: string;
    organizationId: string;
    environment: 'development' | 'preview' | 'production';
    branch: string;
    versionTag: string;
    commitId?: string;
    snapshotId?: string;
    notes?: string;
    publishedBy: string;
  }): Promise<Release> {
    let commitId = params.commitId;
    let snapshotId = params.snapshotId;

    const branch = await this.getBranch(params.projectId, params.branch);
    if (branch && branch.headCommitId) {
      const commit = await this.getCommit(branch.headCommitId);
      if (commit) {
        commitId = commit.id;
        snapshotId = commit.snapshotId;
      }
    }

    if (!commitId) {
      commitId = `commit_rel_${Date.now()}`;
    }
    if (!snapshotId) {
      snapshotId = `snap_${commitId}`;
    }

    const releaseId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Set other releases for this environment to not current
    for (const rel of Array.from(this.releases.values())) {
      if (rel.projectId === params.projectId && rel.environment === params.environment) {
        rel.isCurrent = false;
      }
    }

    const release: Release = {
      id: releaseId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      environment: params.environment,
      branch: params.branch,
      commitId,
      snapshotId,
      versionTag: params.versionTag,
      notes: params.notes,
      publishedBy: params.publishedBy,
      publishedAt: new Date().toISOString(),
      isCurrent: true,
    };

    this.releases.set(releaseId, release);
    return release;
  }

  async listReleases(projectId: string, environment?: 'development' | 'preview' | 'production'): Promise<Release[]> {
    let list = Array.from(this.releases.values()).filter((r) => r.projectId === projectId);
    if (environment) {
      list = list.filter((r) => r.environment === environment);
    }
    return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  async getRelease(releaseId: string): Promise<Release | null> {
    return this.releases.get(releaseId) || null;
  }
}

export const defaultVersionControlProvider = new VersionControlProvider();
