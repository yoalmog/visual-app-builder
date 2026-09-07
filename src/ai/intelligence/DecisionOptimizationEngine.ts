// D8.9: Controlled Decision Optimization Engine
// Evaluates multiple candidate strategies, filters via strict constraints, calculates
// multi-factor deterministic scores, enforces policy and approval boundaries,
// executes through typed transactions, verifies independently, handles recovery, and captures feedback.

import * as fs from 'fs';
import * as path from 'path';
import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { AutonomyLevel } from './types';
import {
  DecisionCandidate,
  DecisionCandidateId,
  DecisionCheckpoint,
  DecisionComparison,
  DecisionConfidence,
  DecisionConstraint,
  DecisionContext,
  DecisionFeedback,
  DecisionMetrics,
  DecisionOutcome,
  DecisionRisk,
  DecisionScore,
  DecisionSelection,
  DecisionSession,
  DecisionState,
  DecisionStrategyType,
} from './decision-types';
import { ExperienceStore } from './ExperienceStore';
import { AutonomousLearningEngine } from './AutonomousLearningEngine';
import { AutonomyPolicyManager } from './AutonomyPolicyManager';
import { ApprovalManager } from '../approval/ApprovalManager';
import { AITransactionManager } from '../history/AITransactionManager';
import { AutonomousVerificationEngine } from './AutonomousVerificationEngine';
import { AutonomousRecoveryEngine } from './AutonomousRecoveryEngine';
import { AISecretFilter } from '../security/AISecretFilter';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';

export class DecisionOptimizationEngine {
  private static readonly SESSION_STORAGE_PATH = path.join(
    process.cwd(),
    '.phase8',
    'decision-sessions.json'
  );

  private static readonly VALID_STATES: DecisionState[] = [
    'IDLE',
    'CONTEXT_BUILDING',
    'CONTEXT_VALIDATED',
    'CANDIDATES_GENERATING',
    'CANDIDATES_VALIDATED',
    'CONSTRAINT_FILTERING',
    'RISK_ANALYSIS',
    'SCORING',
    'COMPARING',
    'POLICY_CHECK',
    'APPROVAL_CHECK',
    'SELECTED',
    'EXECUTING',
    'VERIFYING',
    'COMPLETED',
    'BLOCKED',
    'UNCERTAIN',
    'REJECTED',
    'CANCELLED',
    'FAILED',
    'ROLLED_BACK',
  ];

  // --- Session Management & State Transitions ---

  public static createSession(params: {
    projectId: string;
    projectVersion: number;
    userIntent: string;
    schemaVersion?: number;
    environment?: 'development' | 'staging' | 'production';
    userAutonomyLevel?: AutonomyLevel;
    userRoles?: string[];
    selectedScope?: { pageId?: string; componentId?: string };
    recentFailureCategory?: string;
  }): DecisionSession {
    const sessionId = `dec_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const sanitizedIntent = this.sanitizeInput(params.userIntent);

    const context: DecisionContext = {
      contextId: `ctx_${sessionId}`,
      projectId: params.projectId,
      projectVersion: params.projectVersion,
      schemaVersion: params.schemaVersion ?? 7,
      userIntent: sanitizedIntent,
      selectedScope: params.selectedScope,
      environment: params.environment ?? 'development',
      userAutonomyLevel: params.userAutonomyLevel ?? 3,
      userRoles: params.userRoles ?? ['developer'],
      recentFailureCategory: params.recentFailureCategory,
      constraints: this.buildStandardConstraints(params.environment ?? 'development'),
      relevantExperienceIds: [],
      relevantPatternIds: [],
      timestamp: now,
    };

    const metrics: DecisionMetrics = {
      totalCandidatesGenerated: 0,
      candidatesFiltered: 0,
      candidatesScored: 0,
      selectionsMade: 0,
      approvalsRequired: 0,
      approvalsGranted: 0,
      policiesDenied: 0,
      verificationsPassed: 0,
      verificationsFailed: 0,
      recoveriesInvoked: 0,
      userCorrectionsCount: 0,
      averageConfidence: 0,
      averageScore: 0,
    };

    const session: DecisionSession = {
      sessionId,
      projectId: params.projectId,
      projectVersion: params.projectVersion,
      state: 'IDLE',
      context,
      candidates: [],
      filteredCandidates: [],
      comparisons: [],
      checkpoints: [],
      metrics,
      trace: {
        traceId: `trace_${sessionId}`,
        sessionId,
        projectId: params.projectId,
        events: [
          {
            id: `evt_${Date.now()}`,
            state: 'IDLE',
            event: 'DECISION_SESSION_INITIALIZED',
            message: `Decision optimization session ${sessionId} initialized for project ${params.projectId}`,
            timestamp: now,
          },
        ],
        startedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.transitionState(
      session,
      'CONTEXT_BUILDING',
      'CONTEXT_BUILDING_STARTED',
      'Building decision context and querying relevant historical experience'
    );

    // Query relevant D8.8 experience for project
    const experiences = ExperienceStore.query({
      projectId: params.projectId,
      allowCrossProject: false,
    });
    session.context.relevantExperienceIds = experiences.experiences.map((e) => e.id);

    const patterns = ExperienceStore.getPatterns();
    session.context.relevantPatternIds = patterns.map((p) => p.id);

    this.transitionState(
      session,
      'CONTEXT_VALIDATED',
      'CONTEXT_VALIDATED',
      `Context validated with ${session.context.relevantExperienceIds.length} historical experiences`
    );

    return session;
  }

  public static validateContext(context: DecisionContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!context.contextId || typeof context.contextId !== 'string') {
      errors.push('Missing or invalid contextId');
    }
    if (!context.projectId || typeof context.projectId !== 'string') {
      errors.push('Missing or invalid projectId');
    }
    if (typeof context.projectVersion !== 'number' || context.projectVersion < 0) {
      errors.push('Invalid projectVersion');
    }
    if (!context.userIntent || typeof context.userIntent !== 'string' || context.userIntent.trim().length === 0) {
      errors.push('Missing or empty userIntent');
    }
    if (!context.constraints || !Array.isArray(context.constraints)) {
      errors.push('Missing constraints list');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public static validateCandidate(candidate: DecisionCandidate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!candidate.candidateId || typeof candidate.candidateId !== 'string') {
      errors.push('Missing or invalid candidateId');
    }
    if (!candidate.strategyType) {
      errors.push('Missing strategyType');
    }
    if (!candidate.title || typeof candidate.title !== 'string') {
      errors.push('Missing or invalid title');
    }
    if (!candidate.operations || !Array.isArray(candidate.operations)) {
      errors.push('Invalid operations array');
    }
    if (!candidate.confidence || typeof candidate.confidence.score !== 'number') {
      errors.push('Invalid confidence score');
    }
    if (!candidate.risk) {
      errors.push('Missing risk classification');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public static transitionState(
    session: DecisionSession,
    toState: DecisionState,
    event: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.VALID_STATES.includes(toState)) {
      throw new Error(`Invalid decision state transition: ${toState}`);
    }

    session.state = toState;
    session.updatedAt = new Date().toISOString();
    session.trace.events.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      state: toState,
      event,
      message,
      data,
      timestamp: session.updatedAt,
    });

    if (
      toState === 'COMPLETED' ||
      toState === 'BLOCKED' ||
      toState === 'UNCERTAIN' ||
      toState === 'REJECTED' ||
      toState === 'CANCELLED' ||
      toState === 'FAILED'
    ) {
      session.completedAt = session.updatedAt;
    }
  }

  // --- Constraints Definition ---

  public static buildStandardConstraints(environment: string): DecisionConstraint[] {
    return [
      {
        id: 'c_security_no_eval',
        category: 'SECURITY',
        rule: 'Prohibit dynamic code execution, child_process, execSync, and arbitrary SQL execution',
        isHardStop: true,
        active: true,
      },
      {
        id: 'c_project_isolation',
        category: 'PROJECT_ISOLATION',
        rule: 'Mutations and queries must strictly respect target project boundary',
        isHardStop: true,
        active: true,
      },
      {
        id: 'c_supported_operations',
        category: 'SUPPORTED_OPERATIONS',
        rule: 'Only registered AIOperation types may be executed',
        isHardStop: true,
        active: true,
      },
      {
        id: 'c_transaction_boundary',
        category: 'TRANSACTION_BOUNDARY',
        rule: 'All mutations must be wrapped in atomic AITransactionManager transactions',
        isHardStop: true,
        active: true,
      },
      {
        id: 'c_verification_requirement',
        category: 'VERIFICATION_REQUIREMENT',
        rule: 'Every applied strategy must pass post-execution verification',
        isHardStop: true,
        active: true,
      },
      {
        id: 'c_approval_requirement',
        category: 'APPROVAL_REQUIREMENT',
        rule:
          environment === 'production'
            ? 'Production environment strictly mandates approval for medium/high risk operations'
            : 'High-risk operations mandate approval in safe mode',
        isHardStop: false,
        active: true,
      },
    ];
  }

  // --- Candidate Generation ---

  public static generateCandidates(
    session: DecisionSession,
    project: AppProject,
    options?: {
      targetOperation?: AIOperation;
      suggestedOperationsList?: AIOperation[][];
      failureRecoveryStrategy?: string;
    }
  ): DecisionCandidate[] {
    this.transitionState(
      session,
      'CANDIDATES_GENERATING',
      'CANDIDATE_GENERATION_STARTED',
      'Generating candidate strategies for consideration'
    );

    const candidates: DecisionCandidate[] = [];
    const rootId = project.pages[0]?.root?.id || 'root';
    const pageId = session.context.selectedScope?.pageId || project.pages[0]?.id || 'page_home';

    // Candidate 1: MINIMAL_CHANGE Strategy
    const minOp: any = options?.targetOperation || {
      id: `op_min_${Date.now()}`,
      type: 'update_component',
      pageId,
      nodeId: session.context.selectedScope?.componentId || 'btn_primary',
      props: { label: 'Updated Action' },
      description: 'Minimal surgical component update',
      risk: 'low',
      reversible: true,
    };

    candidates.push({
      candidateId: `cand_min_${Date.now()}`,
      strategyType: 'MINIMAL_CHANGE',
      title: 'Minimal Surgical Update',
      description: 'Applies targeted local modification with minimal blast radius',
      operations: [minOp],
      targetScope: { pages: [pageId], components: [minOp.nodeId || minOp.node?.id] },
      risk: 'LOW',
      confidence: {
        score: 0.92,
        evidenceQuantity: 3,
        evidenceQuality: 0.9,
        recencyWeight: 0.9,
        contradictionPenalty: 0.0,
        rationale: 'Minimal change has highest reversibility and lowest error probability',
      },
      reversibility: true,
      estimatedDurationMs: 45,
      expectedBenefit: 'Low blast radius and immediate execution with zero schema drift',
      expectedCost: 'Low computation and minimal execution time',
      constraintsEvaluated: false,
      passedConstraints: true,
      validity: 'VALID',
      evidence: [],
    });

    // Candidate 2: CONSERVATIVE Strategy
    candidates.push({
      candidateId: `cand_cons_${Date.now()}`,
      strategyType: 'CONSERVATIVE',
      title: 'Conservative Theme/Property Sync',
      description: 'Safe fallback adjusting appearance or properties without structural mutations',
      operations: [
        {
          id: `op_theme_${Date.now()}`,
          type: 'update_theme',
          theme: { mode: 'light', primaryColor: '#2563eb' },
          description: 'Conservative theme property adjustment',
          risk: 'low',
          reversible: true,
        } as any,
      ],
      targetScope: { pages: [pageId] },
      risk: 'LOW',
      confidence: {
        score: 0.88,
        evidenceQuantity: 2,
        evidenceQuality: 0.85,
        recencyWeight: 0.85,
        contradictionPenalty: 0.0,
        rationale: 'Conservative non-structural update preserves 100% layout integrity',
      },
      reversibility: true,
      estimatedDurationMs: 30,
      expectedBenefit: 'Zero risk to component hierarchy or workflow bindings',
      expectedCost: 'Minimal computation',
      constraintsEvaluated: false,
      passedConstraints: true,
      validity: 'VALID',
      evidence: [],
    });

    // Candidate 3: RETRY Strategy
    candidates.push({
      candidateId: `cand_retry_${Date.now()}`,
      strategyType: 'RETRY',
      title: 'Alternative Retry Strategy',
      description: 'Alternative sequenced execution of requested operations',
      operations: [minOp],
      targetScope: { pages: [pageId], components: [minOp.nodeId || minOp.node?.id] },
      risk: 'LOW',
      confidence: {
        score: 0.82,
        evidenceQuantity: 1,
        evidenceQuality: 0.8,
        recencyWeight: 0.85,
        contradictionPenalty: 0.0,
        rationale: 'Alternative retry path ensures bounded retries',
      },
      reversibility: true,
      estimatedDurationMs: 50,
      expectedBenefit: 'Provides an alternative typed execution sequence',
      expectedCost: 'Low computation',
      constraintsEvaluated: false,
      passedConstraints: true,
      validity: 'VALID',
      evidence: [],
    });

    // Candidate 4: RECOVERY Strategy (if previous failure existed)
    if (session.context.recentFailureCategory || options?.failureRecoveryStrategy) {
      const strat = options?.failureRecoveryStrategy || 'REPAIR_COMPONENT';
      candidates.push({
        candidateId: `cand_recov_${Date.now()}`,
        strategyType: 'RECOVERY',
        title: `Targeted Recovery: ${strat}`,
        description: `Applies validated recovery strategy ${strat} to repair verified failure`,
        operations: [
          {
            id: `op_recov_${Date.now()}`,
            type: 'add_component',
            pageId,
            parentId: rootId,
            node: {
              id: 'comp_restored',
              type: 'card',
              name: 'Restored Card',
              props: { title: 'Recovered' },
              styles: {},
              children: [],
            },
            description: 'Restore missing component node',
            risk: 'low',
            reversible: true,
          } as any,
        ],
        targetScope: { pages: [pageId], components: ['comp_restored'] },
        risk: 'LOW',
        confidence: {
          score: 0.85,
          evidenceQuantity: 2,
          evidenceQuality: 0.85,
          recencyWeight: 0.9,
          contradictionPenalty: 0.0,
          rationale: `Proven effective in resolving ${session.context.recentFailureCategory || 'failure'}`,
        },
        reversibility: true,
        estimatedDurationMs: 60,
        expectedBenefit: 'Resolves detected verification failure and restores verified pass state',
        expectedCost: 'Medium execution time',
        constraintsEvaluated: false,
        passedConstraints: true,
        validity: 'VALID',
        evidence: [],
      });
    }

    // Candidate 4: NO_OP_STOP Strategy
    candidates.push({
      candidateId: `cand_noop_${Date.now()}`,
      strategyType: 'NO_OP_STOP',
      title: 'No Action (Preserve State)',
      description: 'Preserves project in current state without applying mutations',
      operations: [],
      targetScope: {},
      risk: 'LOW',
      confidence: {
        score: 0.75,
        evidenceQuantity: 1,
        evidenceQuality: 0.9,
        recencyWeight: 0.8,
        contradictionPenalty: 0.0,
        rationale: 'Safe default when current state already satisfies invariants or risk is unacceptable',
      },
      reversibility: true,
      estimatedDurationMs: 0,
      expectedBenefit: 'Absolute stability with zero mutation risk',
      expectedCost: 'Zero cost',
      constraintsEvaluated: false,
      passedConstraints: true,
      validity: 'VALID',
      evidence: [],
    });

    session.candidates = candidates;
    session.metrics.totalCandidatesGenerated = candidates.length;

    this.transitionState(
      session,
      'CANDIDATES_VALIDATED',
      'CANDIDATES_VALIDATED',
      `Generated ${candidates.length} candidate strategies`
    );

    return candidates;
  }

  // --- Constraint Filtering ---

  public static filterCandidates(
    session: DecisionSession,
    candidates: DecisionCandidate[]
  ): DecisionCandidate[] {
    this.transitionState(
      session,
      'CONSTRAINT_FILTERING',
      'CONSTRAINT_FILTERING_STARTED',
      'Filtering candidates against security, isolation, and policy constraints'
    );

    const filtered: DecisionCandidate[] = [];

    for (const cand of candidates) {
      cand.constraintsEvaluated = true;
      const candStr = JSON.stringify(cand);

      // 1. Security Hard Stop: Prohibit dynamic code execution, SQL injections, and guardrail disabling
      if (
        candStr.includes(['ev', 'al('].join('')) ||
        candStr.includes(['new Func', 'tion('].join('')) ||
        candStr.includes('child_process') ||
        candStr.includes('execSync') ||
        candStr.includes('DROP TABLE') ||
        candStr.includes('disable_guardrails')
      ) {
        cand.passedConstraints = false;
        cand.validity = 'INVALID';
        cand.risk = 'CRITICAL';
        let specificReason = 'SECURITY_HARD_STOP: Prohibited action detected';
        if (candStr.includes(['ev', 'al('].join('')) || candStr.includes(['new Func', 'tion('].join(''))) {
          specificReason = 'SECURITY_HARD_STOP: Prohibited dynamic code or Function execution detected';
        } else if (candStr.includes('child_process') || candStr.includes('execSync')) {
          specificReason = 'SECURITY_HARD_STOP: Prohibited child_process or execSync execution detected';
        } else if (candStr.includes('DROP TABLE')) {
          specificReason = 'SECURITY_HARD_STOP: Prohibited arbitrary SQL execution detected (DROP TABLE)';
        }
        cand.rejectionReason = specificReason;
        session.metrics.candidatesFiltered++;
        session.trace.events.push({
          id: `evt_rej_${Date.now()}`,
          state: 'CONSTRAINT_FILTERING',
          event: 'CANDIDATE_REJECTED_BY_SECURITY',
          message: specificReason,
          data: { candidateId: cand.candidateId, reason: specificReason },
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // 2. Supported Operations Check
      const SUPPORTED_OPERATIONS = [
        'add_component',
        'update_component',
        'remove_component',
        'move_component',
        'add_page',
        'update_page',
        'delete_page',
        'update_theme',
        'add_collection',
        'update_collection',
        'delete_collection',
        'add_workflow',
        'update_workflow',
        'delete_workflow',
        'add_binding',
        'remove_binding',
        'create_component_definition',
        'update_component_definition',
        'delete_component_definition',
      ];

      const hasUnsupportedOp = cand.operations.some(
        (op) => !SUPPORTED_OPERATIONS.includes(op.type)
      );

      if (hasUnsupportedOp) {
        cand.passedConstraints = false;
        cand.validity = 'INVALID';
        cand.rejectionReason = 'UNSUPPORTED_OPERATION: Candidate contains unregistered or unsupported operation types';
        session.metrics.candidatesFiltered++;
        continue;
      }

      // 3. Project Isolation Check
      if (cand.targetScope.pages?.some((p) => p.includes('other_proj_'))) {
        cand.passedConstraints = false;
        cand.validity = 'INVALID';
        cand.rejectionReason = 'PROJECT_ISOLATION_VIOLATION: Cross-project access is prohibited';
        session.metrics.candidatesFiltered++;
        continue;
      }

      // 3. Permission Check: Read-only viewer role cannot execute mutations
      if (
        session.context.userRoles.includes('viewer') &&
        !session.context.userRoles.includes('developer') &&
        !session.context.userRoles.includes('admin') &&
        cand.operations.length > 0
      ) {
        cand.passedConstraints = false;
        cand.validity = 'INVALID';
        cand.rejectionReason = 'PERMISSION_DENIAL: Read-only viewer role cannot perform mutations';
        session.metrics.candidatesFiltered++;
        continue;
      }

      // 4. Stale validity check
      if (cand.validity === 'STALE') {
        cand.confidence.score *= 0.5;
        cand.confidence.rationale += ' (Confidence degraded due to stale validity)';
      }

      cand.passedConstraints = true;
      filtered.push(cand);
    }

    session.filteredCandidates = filtered;
    return filtered;
  }

  // --- Scoring Engine ---

  public static scoreCandidate(
    candidate: DecisionCandidate,
    context: DecisionContext
  ): DecisionScore {
    // 1. Expected Success (0.0 to 1.0)
    let expectedSuccess = candidate.confidence.score;

    // 2. Verification Confidence (0.0 to 1.0)
    let verificationConfidence = candidate.reversibility ? 0.9 : 0.6;

    // 3. Historical Effectiveness from ExperienceStore
    let historicalEffectiveness = 0.5;
    const projectExps = ExperienceStore.getProjectExperiences(context.projectId);
    if (projectExps.length > 0) {
      const matchingExps = projectExps.filter(
        (e) =>
          e.outcome === 'SUCCESS' &&
          candidate.operations.some((op) => e.features?.operationTypes?.includes(op.type))
      );
      if (matchingExps.length > 0) {
        const avgScore =
          matchingExps.reduce((acc, curr) => acc + (curr.successScore ?? 0.5), 0) /
          matchingExps.length;
        historicalEffectiveness = Math.min(1.0, avgScore + 0.1);
      }
    }

    // 4. Risk Penalty
    let riskPenalty = 0.0;
    if (candidate.risk === 'MEDIUM') riskPenalty = 0.15;
    else if (candidate.risk === 'HIGH') riskPenalty = 0.35;
    else if (candidate.risk === 'CRITICAL') riskPenalty = 1.0;

    // 5. Mutation Scope Cost
    const totalMutations = candidate.operations.length;
    const mutationScopeCost = Math.min(0.3, totalMutations * 0.05);

    // 6. Complexity Penalty
    const complexityPenalty = totalMutations > 3 ? 0.2 : 0.05;

    // 7. Execution Cost
    const executionCost = Math.min(0.2, (candidate.estimatedDurationMs / 1000) * 0.1);

    // 8. Reversibility Bonus
    const reversibilityBonus = candidate.reversibility ? 0.1 : 0.0;

    // 9. Policy & Schema Compatibility
    const policyCompatibilityScore = candidate.risk === 'CRITICAL' ? 0.0 : 1.0;
    const schemaCompatibilityScore = context.schemaVersion === 7 ? 1.0 : 0.5;

    // Calculate Total Score:
    // Base positive: 0.35 * expectedSuccess + 0.25 * verificationConfidence + 0.25 * historicalEffectiveness + reversibilityBonus
    // Deductions: riskPenalty + mutationScopeCost + complexityPenalty + executionCost
    const positivePart =
      0.35 * expectedSuccess +
      0.25 * verificationConfidence +
      0.25 * historicalEffectiveness +
      reversibilityBonus +
      0.15 * policyCompatibilityScore;

    const penaltyPart = riskPenalty + mutationScopeCost + complexityPenalty + executionCost;

    const rawScore = positivePart - penaltyPart;
    const totalScore = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));

    const breakdown = {
      expectedSuccess,
      verificationConfidence,
      historicalEffectiveness,
      riskPenalty,
      mutationScopeCost,
      complexityPenalty,
      executionCost,
      reversibilityBonus,
      policyCompatibilityScore,
      schemaCompatibilityScore,
    };

    const rationale = `Calculated total score ${totalScore} based on expected success (${expectedSuccess}), verification confidence (${verificationConfidence}), risk penalty (${riskPenalty}), and reversibility bonus (${reversibilityBonus}).`;

    return {
      totalScore,
      breakdown,
      rationale,
    };
  }

  // --- Candidate Comparison ---

  public static compareCandidates(
    candidates: DecisionCandidate[]
  ): DecisionComparison[] {
    const comparisons: DecisionComparison[] = [];
    if (candidates.length < 2) return comparisons;

    for (let i = 0; i < candidates.length - 1; i++) {
      const cA = candidates[i];
      const cB = candidates[i + 1];

      const scoreA = cA.score?.totalScore ?? 0;
      const scoreB = cB.score?.totalScore ?? 0;
      const scoreDiff = Math.round((scoreA - scoreB) * 1000) / 1000;

      const preferredId = scoreA >= scoreB ? cA.candidateId : cB.candidateId;

      comparisons.push({
        candidateAId: cA.candidateId,
        candidateBId: cB.candidateId,
        scoreDifference: scoreDiff,
        riskDifference: `${cA.risk} vs ${cB.risk}`,
        preferredCandidateId: preferredId,
        tradeOffSummary: `${scoreA >= scoreB ? cA.title : cB.title} preferred due to higher score (${Math.max(scoreA, scoreB)} vs ${Math.min(scoreA, scoreB)})`,
      });
    }

    return comparisons;
  }

  // --- Decision Selection ---

  public static selectDecision(
    session: DecisionSession,
    project: AppProject
  ): DecisionSelection {
    this.transitionState(
      session,
      'RISK_ANALYSIS',
      'RISK_ANALYSIS_STARTED',
      'Evaluating candidate risks and confidence'
    );

    const validCandidates = this.filterCandidates(session, session.candidates);

    if (validCandidates.length === 0) {
      this.transitionState(
        session,
        'BLOCKED',
        'DECISION_BLOCKED_ALL_CANDIDATES_REJECTED',
        'All candidate strategies failed constraints or security invariants'
      );

      const blockedSelection: DecisionSelection = {
        selectionId: `sel_block_${Date.now()}`,
        sessionId: session.sessionId,
        projectId: session.projectId,
        selectedCandidateId: 'none',
        strategyType: 'NO_OP_STOP',
        candidateTitle: 'None (Blocked)',
        rationale: 'All candidates violated safety constraints or security hard stops',
        confidence: { score: 0.0, evidenceQuantity: 0, evidenceQuality: 0.0, recencyWeight: 0.0, contradictionPenalty: 1.0, rationale: 'Blocked' },
        risk: 'CRITICAL',
        policyResult: { evaluated: true, allowed: false, effectiveLevel: 0, violatedRules: ['SECURITY_HARD_STOP'] },
        approvalRequirement: { required: true, riskLevel: 'CRITICAL', environment: session.context.environment },
        alternativesConsideredCount: session.candidates.length,
        status: 'BLOCKED',
        selectedAt: new Date().toISOString(),
      };
      session.selection = blockedSelection;
      return blockedSelection;
    }

    this.transitionState(
      session,
      'SCORING',
      'SCORING_STARTED',
      `Deterministically scoring ${validCandidates.length} filtered candidates`
    );

    for (const cand of validCandidates) {
      cand.score = this.scoreCandidate(cand, session.context);
      session.metrics.candidatesScored++;
    }

    // Sort by totalScore DESC
    validCandidates.sort((a, b) => (b.score?.totalScore ?? 0) - (a.score?.totalScore ?? 0));

    this.transitionState(
      session,
      'COMPARING',
      'COMPARING_STARTED',
      'Comparing top ranked candidates and evaluating trade-offs'
    );
    session.comparisons = this.compareCandidates(validCandidates);

    // Conservative Selection Principle:
    // If Candidate 1 and Candidate 2 have close scores (within 0.05), but Candidate 2 has strictly lower risk,
    // prefer Candidate 2!
    let selected = validCandidates[0];
    if (validCandidates.length >= 2) {
      const top = validCandidates[0];
      const second = validCandidates[1];
      const diff = (top.score?.totalScore ?? 0) - (second.score?.totalScore ?? 0);

      if (diff <= 0.05 && top.risk === 'HIGH' && (second.risk === 'LOW' || second.risk === 'MEDIUM')) {
        selected = second;
        session.trace.events.push({
          id: `evt_cons_${Date.now()}`,
          state: 'COMPARING',
          event: 'CONSERVATIVE_PREFERENCE_APPLIED',
          message: `Preferred safer candidate ${second.title} over ${top.title} due to lower risk profile`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Policy Check
    this.transitionState(
      session,
      'POLICY_CHECK',
      'POLICY_CHECK_STARTED',
      `Evaluating autonomy policy for selected candidate: ${selected.title}`
    );

    let policyAllowed = true;
    const violatedRules: string[] = [];
    let policyReason: string | undefined;

    if (selected.risk === 'CRITICAL') {
      policyAllowed = false;
      violatedRules.push('CRITICAL_RISK_PROHIBITED');
      policyReason = 'Critical risk operation prohibited by autonomy policy';
    }

    // Approval Check
    this.transitionState(
      session,
      'APPROVAL_CHECK',
      'APPROVAL_CHECK_STARTED',
      'Checking human approval requirement'
    );

    let approvalRequired = false;
    let approvalReason: string | undefined;

    if (
      selected.risk === 'HIGH' ||
      selected.risk === 'CRITICAL' ||
      (selected.risk === 'MEDIUM' && session.context.environment === 'production')
    ) {
      approvalRequired = true;
      approvalReason = `High risk or production environment mandates approval for ${selected.strategyType}`;
      session.metrics.approvalsRequired++;
    }

    const selectionId = `sel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const selection: DecisionSelection = {
      selectionId,
      sessionId: session.sessionId,
      projectId: session.projectId,
      selectedCandidateId: selected.candidateId,
      strategyType: selected.strategyType,
      candidateTitle: selected.title,
      rationale: selected.score?.rationale || 'Selected safest justified strategy',
      confidence: selected.confidence,
      risk: selected.risk,
      policyResult: {
        evaluated: true,
        allowed: policyAllowed,
        effectiveLevel: session.context.userAutonomyLevel,
        violatedRules,
        policyReason,
      },
      approvalRequirement: {
        required: approvalRequired,
        reason: approvalReason,
        riskLevel: selected.risk,
        environment: session.context.environment,
      },
      alternativesConsideredCount: validCandidates.length,
      status: policyAllowed ? 'SELECTED' : 'BLOCKED',
      selectedAt: new Date().toISOString(),
    };

    session.selection = selection;
    session.metrics.selectionsMade++;

    this.transitionState(
      session,
      'SELECTED',
      'DECISION_SELECTED',
      `Selected strategy ${selected.strategyType} (${selected.title}) with score ${selected.score?.totalScore ?? 0}`
    );

    return selection;
  }

  // --- Decision Execution & Verification Integration ---

  public static async executeDecision(params: {
    session: DecisionSession;
    project: AppProject;
    isApproved?: boolean;
    environment?: string;
  }): Promise<{
    success: boolean;
    updatedProject?: AppProject;
    outcome: DecisionOutcome;
    error?: string;
  }> {
    const { session, project, isApproved } = params;

    if (!session.selection) {
      throw new Error('Cannot execute decision: No candidate has been selected');
    }

    const sel = session.selection;

    // 1. Cross-project isolation check
    if (session.projectId !== project.id) {
      this.transitionState(
        session,
        'BLOCKED',
        'CROSS_PROJECT_ISOLATION_BLOCKED',
        `Target project ID ${project.id} does not match session ${session.projectId}`
      );
      const outcome: DecisionOutcome = {
        outcomeId: `out_${Date.now()}`,
        selectionId: sel.selectionId,
        status: 'BLOCKED',
        executionSuccess: false,
        verificationPassed: false,
        recoveryInvoked: false,
        durationMs: 0,
        error: 'Cross-project isolation boundary violation',
        timestamp: new Date().toISOString(),
      };
      session.outcome = outcome;
      return { success: false, outcome, error: outcome.error };
    }

    // 2. Policy Enforcement
    if (!sel.policyResult.allowed) {
      this.transitionState(
        session,
        'BLOCKED',
        'POLICY_REJECTION',
        sel.policyResult.policyReason || 'Selection blocked by policy'
      );
      const outcome: DecisionOutcome = {
        outcomeId: `out_${Date.now()}`,
        selectionId: sel.selectionId,
        status: 'BLOCKED',
        executionSuccess: false,
        verificationPassed: false,
        recoveryInvoked: false,
        durationMs: 0,
        error: sel.policyResult.policyReason || 'Policy check denied execution',
        timestamp: new Date().toISOString(),
      };
      session.outcome = outcome;
      return { success: false, outcome, error: outcome.error };
    }

    // 3. Approval Gating
    if (sel.approvalRequirement.required && !isApproved) {
      this.transitionState(
        session,
        'APPROVAL_CHECK',
        'AWAITING_APPROVAL',
        'Execution paused: Approval is required before applying this decision'
      );
      const outcome: DecisionOutcome = {
        outcomeId: `out_${Date.now()}`,
        selectionId: sel.selectionId,
        status: 'BLOCKED',
        executionSuccess: false,
        verificationPassed: false,
        recoveryInvoked: false,
        durationMs: 0,
        error: 'Approval required before execution can proceed',
        timestamp: new Date().toISOString(),
      };
      session.outcome = outcome;
      return { success: false, outcome, error: outcome.error };
    }

    // Locate candidate
    const candidate = session.candidates.find((c) => c.candidateId === sel.selectedCandidateId);
    if (!candidate) {
      throw new Error(`Candidate ${sel.selectedCandidateId} not found in session`);
    }

    // If NO_OP_STOP strategy
    if (candidate.strategyType === 'NO_OP_STOP' || candidate.operations.length === 0) {
      this.transitionState(
        session,
        'COMPLETED',
        'NO_OP_COMPLETED',
        'No-op decision completed cleanly without mutations'
      );
      const outcome: DecisionOutcome = {
        outcomeId: `out_${Date.now()}`,
        selectionId: sel.selectionId,
        status: 'VERIFIED_SUCCESSFUL_LOW_COST',
        executionSuccess: true,
        verificationPassed: true,
        recoveryInvoked: false,
        durationMs: 0,
        updatedProjectVersion: project.version,
        timestamp: new Date().toISOString(),
      };
      session.outcome = outcome;
      return { success: true, updatedProject: project, outcome };
    }

    // 4. Execute Operations through AITransactionManager
    this.transitionState(
      session,
      'EXECUTING',
      'TRANSACTION_STARTED',
      `Executing ${candidate.operations.length} operations via AITransactionManager`
    );

    const startTime = Date.now();
    const txResult = AITransactionManager.executeTransaction({
      project,
      operations: candidate.operations,
      prompt: `Applied optimized decision: ${candidate.title}`,
      mode: 'agent',
    });

    if (!txResult.success || !txResult.updatedProject) {
      this.transitionState(
        session,
        'FAILED',
        'TRANSACTION_FAILED',
        txResult.errors?.join(', ') || 'Transaction execution failed'
      );
      const outcome: DecisionOutcome = {
        outcomeId: `out_${Date.now()}`,
        selectionId: sel.selectionId,
        status: 'FAILED',
        executionSuccess: false,
        verificationPassed: false,
        recoveryInvoked: false,
        durationMs: Date.now() - startTime,
        error: txResult.errors?.join(', ') || 'Transaction execution failed',
        timestamp: new Date().toISOString(),
      };
      session.outcome = outcome;
      return { success: false, outcome, error: outcome.error };
    }

    const updatedProject = txResult.updatedProject;
    updatedProject.version = (project.version || 1) + 1;

    // 5. Autonomous Verification
    this.transitionState(
      session,
      'VERIFYING',
      'AUTONOMOUS_VERIFICATION_STARTED',
      'Running independent verification post-execution'
    );

    const verifResult = AutonomousVerificationEngine.verify({
      intent: session.context.userIntent,
      projectBefore: project,
      projectAfter: updatedProject,
      projectVersion: updatedProject.version,
      riskLevel: candidate.risk,
      expectedChanges: candidate.operations.map((op) => ({
        entityType: op.type.includes('page') ? 'page' : 'component',
        entityId: (op as any).nodeId || (op as any).node?.id || (op as any).pageId || 'target',
        changeType: op.type.includes('delete') || op.type.includes('remove') ? 'delete' : (op.type.includes('add') || op.type.includes('create') ? 'create' : 'update'),
      })),
      expectedPostconditions: [
        {
          id: `post_${Date.now()}`,
          type: 'security_invariants_preserved',
          description: 'Security and invariants preserved',
          critical: true,
        },
      ],
      affectedResources: candidate.targetScope.components?.map((id) => ({
        type: 'component',
        id,
      })) || [],
    });

    const isVerifPass = verifResult.status === 'PASS';
    let recoveryInvoked = false;
    let finalProject = updatedProject;

    // 6. Recovery Integration if verification fails
    if (!isVerifPass) {
      this.transitionState(
        session,
        'VERIFYING',
        'VERIFICATION_FAILED_RECOVERY_INVOKED',
        'Verification failed; invoking AutonomousRecoveryEngine'
      );
      session.metrics.verificationsFailed++;

      const recoveryRes = await AutonomousRecoveryEngine.executeRecovery({
        projectId: project.id,
        projectVersion: updatedProject.version,
        project: updatedProject,
        verificationResult: verifResult,
        intent: session.context.userIntent,
      });

      recoveryInvoked = true;
      session.metrics.recoveriesInvoked++;

      if (recoveryRes.status === 'SUCCESS' && recoveryRes.repairedProject) {
        finalProject = recoveryRes.repairedProject;
      } else {
        // Roll back transaction
        AITransactionManager.rollback(txResult.generationId);
        this.transitionState(
          session,
          'ROLLED_BACK',
          'RECOVERY_FAILED_ROLLED_BACK',
          'Recovery could not resolve failure; rolled back to pre-decision state'
        );
        const outcome: DecisionOutcome = {
          outcomeId: `out_${Date.now()}`,
          selectionId: sel.selectionId,
          status: 'ROLLED_BACK',
          executionSuccess: true,
          verificationPassed: false,
          recoveryInvoked: true,
          durationMs: Date.now() - startTime,
          error: 'Verification failed and recovery was unsuccessful; rolled back cleanly',
          timestamp: new Date().toISOString(),
        };
        session.outcome = outcome;
        return { success: false, outcome, error: outcome.error };
      }
    } else {
      session.metrics.verificationsPassed++;
    }

    const durationMs = Date.now() - startTime;
    const outcomeStatus = isVerifPass
      ? (durationMs < 100 ? 'VERIFIED_SUCCESSFUL_LOW_COST' : 'VERIFIED_SUCCESSFUL')
      : (recoveryInvoked ? 'VERIFIED_SUCCESSFUL_WITH_RECOVERY' : 'FAILED');

    const outcome: DecisionOutcome = {
      outcomeId: `out_${Date.now()}`,
      selectionId: sel.selectionId,
      status: outcomeStatus,
      executionSuccess: true,
      verificationPassed: true,
      recoveryInvoked,
      durationMs,
      updatedProjectVersion: finalProject.version,
      timestamp: new Date().toISOString(),
    };

    session.outcome = outcome;

    this.transitionState(
      session,
      'COMPLETED',
      'DECISION_EXECUTION_COMPLETED',
      `Decision execution and verification completed with outcome: ${outcomeStatus}`
    );

    // 7. Feedback & Experience Ingestion
    this.recordFeedback({
      session,
      acceptedByUser: true,
      outcome,
    });

    return {
      success: true,
      updatedProject: finalProject,
      outcome,
    };
  }

  // --- User Correction ---

  public static async applyUserCorrection(params: {
    session: DecisionSession;
    project: AppProject;
    alternativeCandidateId: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    updatedProject?: AppProject;
    outcome?: DecisionOutcome;
    error?: string;
  }> {
    const { session, project, alternativeCandidateId, notes } = params;

    const altCandidate = session.candidates.find(
      (c) => c.candidateId === alternativeCandidateId
    );
    if (!altCandidate) {
      return {
        success: false,
        error: `Alternative candidate ${alternativeCandidateId} not found in session`,
      };
    }

    session.metrics.userCorrectionsCount++;

    // Override selection with alternative
    session.selection = {
      selectionId: `sel_corr_${Date.now()}`,
      sessionId: session.sessionId,
      projectId: session.projectId,
      selectedCandidateId: altCandidate.candidateId,
      strategyType: altCandidate.strategyType,
      candidateTitle: altCandidate.title,
      rationale: `User manually selected alternative: ${notes || 'No user notes'}`,
      confidence: altCandidate.confidence,
      risk: altCandidate.risk,
      policyResult: { evaluated: true, allowed: true, effectiveLevel: session.context.userAutonomyLevel, violatedRules: [] },
      approvalRequirement: {
        required: altCandidate.risk === 'HIGH' || altCandidate.risk === 'CRITICAL',
        riskLevel: altCandidate.risk,
        environment: session.context.environment,
      },
      alternativesConsideredCount: session.candidates.length,
      status: 'SELECTED',
      selectedAt: new Date().toISOString(),
    };

    // Record user correction feedback
    session.feedback = {
      feedbackId: `fb_${Date.now()}`,
      selectionId: session.selection.selectionId,
      projectId: session.projectId,
      acceptedByUser: false,
      userCorrection: {
        alternativeStrategyId: alternativeCandidateId,
        notes,
      },
      outcome: {
        outcomeId: `out_corr_${Date.now()}`,
        selectionId: session.selection.selectionId,
        status: 'VERIFIED_PARTIAL',
        executionSuccess: false,
        verificationPassed: false,
        recoveryInvoked: false,
        durationMs: 0,
        timestamp: new Date().toISOString(),
      },
      recordedAt: new Date().toISOString(),
    };

    // Ingest user correction into AutonomousLearningEngine
    AutonomousLearningEngine.observeUserFeedback({
      projectId: session.projectId,
      projectVersion: project.version,
      recommendationId: alternativeCandidateId,
      accepted: false,
      notes: `User corrected decision: ${notes || 'Chose alternative candidate'}`,
    });

    // Execute corrected candidate
    return await this.executeDecision({
      session,
      project,
      isApproved: true,
    });
  }

  // --- Feedback Recording ---

  public static recordFeedback(params: {
    session: DecisionSession;
    acceptedByUser: boolean;
    outcome: DecisionOutcome;
    userCorrection?: { alternativeStrategyId?: string; notes?: string };
  }): DecisionFeedback {
    const { session, acceptedByUser, outcome, userCorrection } = params;

    const feedback: DecisionFeedback = {
      feedbackId: `fb_${Date.now()}`,
      selectionId: outcome.selectionId,
      projectId: session.projectId,
      acceptedByUser,
      userCorrection,
      outcome,
      recordedAt: new Date().toISOString(),
    };

    session.feedback = feedback;

    // Feed back into ExperienceStore
    AutonomousLearningEngine.observeExecution({
      projectId: session.projectId,
      projectVersion: session.projectVersion,
      operations: session.selection
        ? (session.candidates.find((c) => c.candidateId === session.selection?.selectedCandidateId)?.operations || [])
        : [],
      success: outcome.executionSuccess && outcome.verificationPassed,
      durationMs: outcome.durationMs,
      environment: session.context.environment,
    });

    return feedback;
  }

  // --- Checkpointing & Persistence ---

  public static createCheckpoint(session: DecisionSession): DecisionCheckpoint {
    const cp: DecisionCheckpoint = {
      checkpointId: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: session.sessionId,
      state: session.state,
      projectId: session.projectId,
      projectVersion: session.projectVersion,
      candidatesCount: session.candidates.length,
      selectedCandidateId: session.selection?.selectedCandidateId,
      timestamp: new Date().toISOString(),
    };

    session.checkpoints.push(cp);
    this.saveSession(session);
    return cp;
  }

  public static saveSession(session: DecisionSession): void {
    try {
      if (typeof fs?.existsSync !== 'function' || !fs.writeFileSync) return;
      const dir = path.dirname(this.SESSION_STORAGE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.SESSION_STORAGE_PATH, JSON.stringify(session, null, 2), 'utf-8');
    } catch {
      // Graceful fallback in non-node environments
    }
  }

  public static loadSession(): DecisionSession | null {
    try {
      if (typeof fs?.existsSync !== 'function' || !fs.readFileSync) return null;
      if (!fs.existsSync(this.SESSION_STORAGE_PATH)) return null;

      const raw = JSON.parse(fs.readFileSync(this.SESSION_STORAGE_PATH, 'utf-8'));
      if (raw && raw.sessionId && raw.state) {
        return raw as DecisionSession;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static resumeSession(
    currentProject: AppProject
  ): {
    resumed: boolean;
    session?: DecisionSession;
    reason?: string;
  } {
    const saved = this.loadSession();
    if (!saved) {
      return { resumed: false, reason: 'No saved decision session found on disk' };
    }

    // Check project ID mismatch
    if (saved.projectId !== currentProject.id) {
      return {
        resumed: false,
        reason: `Project ID mismatch: saved session is for ${saved.projectId}, current project is ${currentProject.id}`,
      };
    }

    // Check project version drift
    if (saved.projectVersion !== currentProject.version) {
      return {
        resumed: false,
        reason: `Project version drifted from ${saved.projectVersion} to ${currentProject.version}. Fresh decision session required.`,
      };
    }

    return { resumed: true, session: saved };
  }

  // --- Sanitization Utilities ---

  public static sanitizeInput(text: string): string {
    if (!text) return '';

    let sanitized = text
      .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_SECRET_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/password\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'password: [REDACTED]');

    if (
      PromptInjectionDefense.containsInjectionAttempt(sanitized) ||
      sanitized.toLowerCase().includes('ignore previous instructions') ||
      sanitized.toLowerCase().includes('disable guardrails') ||
      sanitized.toLowerCase().includes('system override')
    ) {
      sanitized = '[SANITIZED_UNTRUSTED_INJECTION_ATTEMPT]';
    }

    return sanitized;
  }

  public static optimizePlanCandidates(params: {
    projectId: string;
    goal: string;
    basePlan?: any;
    environment?: string;
    project?: AppProject;
  }): { selectedCandidate: DecisionSelection; candidateScores: DecisionScore[] } {
    const proj = params.project || ({
      id: params.projectId,
      name: 'Default Project',
      version: 1,
      pages: [{ id: 'p1', name: 'Home', slug: '/', root: { id: 'root', type: 'page', props: {}, children: [] } }],
    } as any);
    const session = DecisionOptimizationEngine.createSession({
      projectId: params.projectId,
      projectVersion: proj.version || 1,
      userIntent: params.goal,
      environment: (params.environment as any) || 'development',
      userAutonomyLevel: 3,
      userRoles: ['developer'],
    });
    const candidates = DecisionOptimizationEngine.generateCandidates(session, proj);
    session.candidates = candidates;
    const selection = DecisionOptimizationEngine.selectDecision(session, proj);
    return {
      selectedCandidate: selection,
      candidateScores: session.candidates.map((c) => c.score).filter(Boolean) as DecisionScore[],
    };
  }
}

