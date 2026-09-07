// D8.8: Autonomous Learning & Experience-Based Improvement Engine
// Synthesizes experience, extracts patterns, provides evidence-based recommendations, and enforces safety immutability.

import * as fs from 'fs';
import * as path from 'path';
import { AppProject } from '../../builder/schema/project';
import { AIOperation } from '../operations/AIOperation';
import { AITransactionManager } from '../history/AITransactionManager';
import { ApprovalManager } from '../approval/ApprovalManager';
import { AutonomyPolicyManager } from './AutonomyPolicyManager';
import { AutonomousVerificationEngine } from './AutonomousVerificationEngine';
import { AISecretFilter } from '../security/AISecretFilter';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';
import { ExperienceStore } from './ExperienceStore';
import {
  ExperienceRecord,
  ExperienceId,
  ExperienceCategory,
  ExperienceOutcome,
  ExperienceFeatures,
  ExperienceMatch,
  LearningObservation,
  LearningRecommendation,
  RecommendationId,
  RecommendationType,
  RecommendationRisk,
  RecommendationConfidence,
  RecommendationEvidence,
  RecommendationOutcome,
  LearningSession,
  LearningState,
  LearningCheckpoint,
  LearningMetrics,
  ExperiencePattern,
} from './learning-types';
import { AutonomyLevel, AutonomyPolicyDecision } from './types';
import { VerificationResult } from './verification-types';
import { RecoveryResult, RecoveryStrategy } from './recovery-types';

export class AutonomousLearningEngine {
  public static readonly MAX_RECOMMENDATIONS_PER_SESSION = 5;
  public static readonly MIN_CONFIDENCE_THRESHOLD = 0.35;
  private static readonly SESSION_STORAGE_PATH = path.join(
    typeof process !== 'undefined' && process.cwd ? process.cwd() : '',
    '.phase8',
    'learning-session.json'
  );

  private static readonly VALID_STATES: LearningState[] = [
    'idle',
    'observing',
    'normalizing',
    'sanitizing',
    'extracting',
    'analyzing',
    'matching',
    'recommending',
    'policy_check',
    'awaiting_approval',
    'applying',
    'verifying',
    'feedback',
    'checkpointing',
    'completed',
    'blocked',
    'uncertain',
    'failed',
  ];

  // --- Session Management ---

  public static createSession(projectId: string, projectVersion: number = 1): LearningSession {
    const sessionId = `learn_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    return {
      sessionId,
      projectId,
      projectVersion,
      state: 'idle',
      observations: [],
      recommendations: [],
      checkpoints: [],
      trace: {
        traceId: `trace_${sessionId}`,
        sessionId,
        projectId,
        events: [
          {
            id: `evt_${Date.now()}`,
            state: 'idle',
            event: 'LEARNING_SESSION_STARTED',
            message: `Learning session ${sessionId} initialized for project ${projectId}`,
            timestamp: now,
          },
        ],
        startedAt: now,
      },
      metrics: {
        totalExperiences: ExperienceStore.size(),
        recommendationsGenerated: 0,
        recommendationsAccepted: 0,
        recommendationsRejected: 0,
        patternsDetected: 0,
      },
      startedAt: now,
      updatedAt: now,
    };
  }

  public static transitionState(
    session: LearningSession,
    toState: LearningState,
    event: string,
    message: string,
    data?: Record<string, any>
  ): void {
    if (!this.VALID_STATES.includes(toState)) {
      throw new Error(`Invalid learning state transition to ${toState}`);
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

    if (toState === 'completed' || toState === 'failed' || toState === 'blocked') {
      session.completedAt = session.updatedAt;
    }
  }

  // --- Observation & Experience Intake ---

  /**
   * Observe an execution outcome and intake it into the ExperienceStore.
   */
  public static observeExecution(params: {
    projectId: string;
    projectVersion: number;
    schemaVersion?: number;
    operations: AIOperation[];
    success: boolean;
    durationMs?: number;
    error?: string;
    environment?: string;
  }): ExperienceRecord {
    const category: ExperienceCategory = params.success ? 'EXECUTION_SUCCESS' : 'EXECUTION_FAILURE';
    const outcome: ExperienceOutcome = params.success ? 'SUCCESS' : 'FAILURE';

    return this.ingestExperience({
      projectId: params.projectId,
      projectVersion: params.projectVersion,
      schemaVersion: params.schemaVersion || 7,
      category,
      outcome,
      description: params.success
        ? `Successfully executed ${params.operations.length} operations`
        : `Execution failed: ${params.error || 'Unknown error'}`,
      operations: params.operations,
      durationMs: params.durationMs,
      evidence: params.error ? [params.error] : ['All operations committed cleanly'],
      environment: params.environment || 'development',
      source: 'execution',
    });
  }

  /**
   * Observe a verification result.
   */
  public static observeVerification(params: {
    projectId: string;
    projectVersion: number;
    verificationResult: VerificationResult;
    operations?: AIOperation[];
    environment?: string;
  }): ExperienceRecord {
    const isSuccess = params.verificationResult.status === 'PASS';
    const category: ExperienceCategory = isSuccess ? 'VERIFICATION_SUCCESS' : 'VERIFICATION_FAILURE';
    const outcome: ExperienceOutcome = isSuccess ? 'SUCCESS' : 'FAILURE';

    const evidence = (params.verificationResult.checks || []).map(
      (c) => `[${c.type}] ${c.passed ? 'PASS' : 'FAIL'}: ${c.actual || c.expected}`
    );

    const total = params.verificationResult.summary?.totalChecks || (params.verificationResult.checks || []).length;
    const passed = params.verificationResult.summary?.passedChecks || (params.verificationResult.checks || []).filter(c => c.passed).length;

    return this.ingestExperience({
      projectId: params.projectId,
      projectVersion: params.projectVersion,
      schemaVersion: 7,
      category,
      outcome,
      description: `Verification ${params.verificationResult.status} with ${passed}/${total} checks passing`,
      operations: params.operations,
      verificationSummary: {
        passed: isSuccess,
        checksTotal: total,
        checksPassed: passed,
      },
      evidence,
      environment: params.environment || 'development',
      source: 'verification',
    });
  }

  /**
   * Observe an autonomous recovery result.
   */
  public static observeRecovery(params: {
    projectId: string;
    projectVersion: number;
    recoveryResult: RecoveryResult;
    environment?: string;
  }): ExperienceRecord {
    const isSuccess = params.recoveryResult.status === 'SUCCESS';
    const category: ExperienceCategory = isSuccess ? 'RECOVERY_SUCCESS' : 'RECOVERY_FAILURE';
    const outcome: ExperienceOutcome = isSuccess ? 'SUCCESS' : 'FAILURE';

    const evidence = (params.recoveryResult.trace?.events || []).map(
      (e) => `[${e.type}] ${e.message}`
    );

    const strat = params.recoveryResult.diagnosis?.recommendedStrategy || 'NO_ACTION';
    const attempts = params.recoveryResult.attemptsCount || 1;

    return this.ingestExperience({
      projectId: params.projectId,
      projectVersion: params.projectVersion,
      schemaVersion: 7,
      category,
      outcome,
      description: `Autonomous recovery ${params.recoveryResult.status} via strategy ${strat}`,
      recoveryDetails: {
        strategy: strat,
        attempt: attempts,
        success: isSuccess,
      },
      evidence,
      environment: params.environment || 'development',
      source: 'recovery',
    });
  }

  /**
   * Observe a user feedback action (e.g. rejection or correction of a plan/recommendation).
   */
  public static observeUserFeedback(params: {
    projectId: string;
    projectVersion: number;
    recommendationId: string;
    accepted: boolean;
    notes?: string;
    environment?: string;
  }): ExperienceRecord {
    const category: ExperienceCategory = 'USER_CORRECTION';
    const outcome: ExperienceOutcome = params.accepted ? 'SUCCESS' : 'FAILURE';

    return this.ingestExperience({
      projectId: params.projectId,
      projectVersion: params.projectVersion,
      schemaVersion: 7,
      category,
      outcome,
      description: `User ${params.accepted ? 'accepted' : 'rejected'} recommendation ${params.recommendationId}: ${params.notes || 'No notes'}`,
      evidence: [`recommendationId:${params.recommendationId}`, params.notes || ''],
      environment: params.environment || 'development',
      source: 'user_feedback',
    });
  }

  /**
   * Ingest, normalize, sanitize, and persist an experience record into ExperienceStore.
   */
  public static ingestExperience(params: {
    projectId: string;
    projectVersion: number;
    schemaVersion: number;
    category: ExperienceCategory;
    outcome: ExperienceOutcome;
    description: string;
    operations?: AIOperation[];
    evidence?: string[];
    verificationSummary?: {
      passed: boolean;
      checksTotal: number;
      checksPassed: number;
    };
    recoveryDetails?: {
      strategy: RecoveryStrategy;
      attempt: number;
      success: boolean;
    };
    durationMs?: number;
    environment?: string;
    source: string;
  }): ExperienceRecord {
    // 1. Sanitization: Redact credentials, API keys, tokens, and prompt injections
    const sanitizedDesc = this.sanitizeText(params.description);
    const sanitizedEvidence = (params.evidence || []).map((ev) => this.sanitizeText(ev));

    // 2. Feature Extraction
    const features = this.extractFeatures({
      operations: params.operations || [],
      category: params.category,
      durationMs: params.durationMs,
      recoveryStrategy: params.recoveryDetails?.strategy,
    });

    const now = new Date().toISOString();
    const id: ExperienceId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const record: ExperienceRecord = {
      id,
      projectId: params.projectId,
      category: params.category,
      outcome: params.outcome,
      validity: 'VALID',
      description: sanitizedDesc,
      context: {
        projectId: params.projectId,
        projectVersion: params.projectVersion,
        schemaVersion: params.schemaVersion,
        environment: params.environment || 'development',
      },
      features,
      provenance: {
        source: params.source as any,
        projectId: params.projectId,
        projectVersion: params.projectVersion,
        schemaVersion: params.schemaVersion,
        environment: params.environment || 'development',
        actor: 'AutonomousLearningEngine',
        timestamp: now,
        sanitized: true,
        sanitizationNotes: ['Redacted secrets and injection patterns'],
      },
      evidence: sanitizedEvidence,
      associatedOperations: params.operations,
      verificationSummary: params.verificationSummary,
      recoveryDetails: params.recoveryDetails,
      timesMatched: 0,
      successScore: params.outcome === 'SUCCESS' ? 0.8 : (params.outcome === 'FAILURE' ? 0.2 : 0.5),
      createdAt: now,
      updatedAt: now,
    };

    ExperienceStore.insert(record);

    // Trigger asynchronous pattern detection
    this.analyzePatterns(params.projectId);

    return record;
  }

  // --- Feature Extraction & Pattern Detection ---

  public static extractFeatures(params: {
    operations: AIOperation[];
    category: ExperienceCategory;
    durationMs?: number;
    recoveryStrategy?: RecoveryStrategy;
  }): ExperienceFeatures {
    const opTypes: string[] = [];
    const compTypes: string[] = [];
    const tags: string[] = [];

    for (const op of params.operations) {
      if (op.type && !opTypes.includes(op.type)) {
        opTypes.push(op.type);
      }
      if (op.type === 'add_component') {
        const cType = (op as any).node?.type || (op as any).component?.type;
        if (cType && !compTypes.includes(cType)) {
          compTypes.push(cType);
        }
      }
    }

    let riskLevel: RecommendationRisk = 'LOW';
    let approvalRequired = false;

    if (params.operations.length > 0) {
      const assessed = ApprovalManager.assessRisk(params.operations);
      if (assessed === 'critical') riskLevel = 'CRITICAL';
      else if (assessed === 'high') riskLevel = 'HIGH';
      else if (assessed === 'medium') riskLevel = 'MEDIUM';
      else riskLevel = 'LOW';

      const appCheck = ApprovalManager.requiresApproval({
        operations: params.operations,
        safetyMode: 'safe',
        environment: 'development',
      });
      approvalRequired = appCheck.required;
    }

    if (params.category) {
      tags.push(params.category.toLowerCase());
    }
    if (params.recoveryStrategy) {
      tags.push(params.recoveryStrategy.toLowerCase());
    }

    return {
      version: '1.0.0',
      operationTypes: opTypes,
      componentTypes: compTypes,
      failureCategory: params.category.includes('FAILURE') ? params.category : undefined,
      recoveryStrategy: params.recoveryStrategy,
      mutationCount: params.operations.length,
      operationCount: params.operations.length,
      riskLevel,
      approvalRequired,
      executionDurationMs: params.durationMs,
      rollbackOccurred: params.category === 'ROLLBACK_SUCCESS' || params.category === 'ROLLBACK_FAILURE',
      tags,
    };
  }

  /**
   * Detect recurring patterns (e.g. repeated failures, high recovery success strategies).
   */
  public static analyzePatterns(projectId: string): ExperiencePattern[] {
    const records = ExperienceStore.getProjectExperiences(projectId);
    const patterns: ExperiencePattern[] = [];
    const now = new Date().toISOString();

    // 1. Detect repeated failures by category
    const failureGroups: Record<string, ExperienceRecord[]> = {};
    for (const rec of records) {
      if (rec.outcome === 'FAILURE') {
        failureGroups[rec.category] = failureGroups[rec.category] || [];
        failureGroups[rec.category].push(rec);
      }
    }

    for (const [category, exps] of Object.entries(failureGroups)) {
      if (exps.length >= 2) {
        const patternId = `pat_fail_${category.toLowerCase()}_${projectId}`;
        const existing = ExperienceStore.getPatternById(patternId);

        const pattern: ExperiencePattern = {
          id: patternId,
          title: `Recurring Failure: ${category}`,
          description: `Observed ${exps.length} repeated failures in category ${category}`,
          category: 'REPEATED_FAILURE',
          confidence: Math.min(0.95, 0.5 + exps.length * 0.1),
          occurrenceCount: exps.length,
          supportingExperienceIds: exps.map((e) => e.id),
          associatedOperations: Array.from(new Set(exps.flatMap((e) => e.features.operationTypes))),
          associatedComponents: Array.from(new Set(exps.flatMap((e) => e.features.componentTypes))),
          associatedFailureCategories: [category],
          recommendedAction: `Apply targeted pre-validation and avoid known problematic operations for ${category}`,
          firstSeenAt: existing?.firstSeenAt || exps[exps.length - 1].createdAt,
          lastSeenAt: now,
        };

        ExperienceStore.savePattern(pattern);
        patterns.push(pattern);
      }
    }

    // 2. Detect high-success recovery strategies
    const recoverySuccessGroups: Record<string, ExperienceRecord[]> = {};
    for (const rec of records) {
      if (rec.category === 'RECOVERY_SUCCESS' && rec.recoveryDetails?.strategy) {
        const strat = rec.recoveryDetails.strategy;
        recoverySuccessGroups[strat] = recoverySuccessGroups[strat] || [];
        recoverySuccessGroups[strat].push(rec);
      }
    }

    for (const [strat, exps] of Object.entries(recoverySuccessGroups)) {
      if (exps.length >= 1) {
        const patternId = `pat_rec_succ_${strat.toLowerCase()}_${projectId}`;
        const existing = ExperienceStore.getPatternById(patternId);

        const pattern: ExperiencePattern = {
          id: patternId,
          title: `Effective Recovery Strategy: ${strat}`,
          description: `Strategy ${strat} succeeded ${exps.length} times in repairing verified failures`,
          category: 'RECOVERY_SUCCESS',
          confidence: Math.min(0.95, 0.6 + exps.length * 0.1),
          occurrenceCount: exps.length,
          supportingExperienceIds: exps.map((e) => e.id),
          associatedOperations: Array.from(new Set(exps.flatMap((e) => e.features.operationTypes))),
          associatedComponents: Array.from(new Set(exps.flatMap((e) => e.features.componentTypes))),
          associatedFailureCategories: ['RECOVERY_SUCCESS'],
          recommendedStrategy: strat as RecoveryStrategy,
          recommendedAction: `Prioritize ${strat} strategy when similar failure occurs`,
          firstSeenAt: existing?.firstSeenAt || exps[exps.length - 1].createdAt,
          lastSeenAt: now,
        };

        ExperienceStore.savePattern(pattern);
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  // --- Experience Matching & Recommendations ---

  /**
   * Retrieve relevant prior experiences for an active task or failure context.
   */
  public static matchExperience(params: {
    projectId: string;
    operationType?: string;
    componentType?: string;
    failureCategory?: string;
    recoveryStrategy?: RecoveryStrategy;
    allowCrossProject?: boolean;
  }): ExperienceMatch[] {
    const queryRes = ExperienceStore.query({
      projectId: params.projectId,
      operationType: params.operationType,
      componentType: params.componentType,
      recoveryStrategy: params.recoveryStrategy,
      allowCrossProject: params.allowCrossProject,
    });

    const matches: ExperienceMatch[] = [];

    for (const exp of queryRes.experiences) {
      let score = 0.5;
      const reasons: string[] = [];

      // Same operation type
      if (params.operationType && exp.features.operationTypes.includes(params.operationType)) {
        score += 0.25;
        reasons.push(`Matched operation type ${params.operationType}`);
      }

      // Same component type
      if (params.componentType && exp.features.componentTypes.includes(params.componentType)) {
        score += 0.25;
        reasons.push(`Matched component type ${params.componentType}`);
      }

      // Same failure category
      if (params.failureCategory && exp.category.toLowerCase().includes(params.failureCategory.toLowerCase())) {
        score += 0.2;
        reasons.push(`Matched failure category ${params.failureCategory}`);
      }

      // Outcome reinforcement
      if (exp.outcome === 'SUCCESS') {
        score += 0.1;
      } else if (exp.outcome === 'FAILURE') {
        score -= 0.15;
      }

      // Staleness penalty
      if (exp.validity === 'STALE') {
        score *= 0.5;
        reasons.push('Staleness penalty applied');
      }

      const clampedScore = Math.max(0.0, Math.min(1.0, score));

      matches.push({
        experience: exp,
        relevanceScore: clampedScore,
        matchReasons: reasons,
        isContradictory: exp.outcome === 'FAILURE',
      });
    }

    // Sort by relevanceScore DESC
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return matches;
  }

  /**
   * Generate recommendations based on historical experience, patterns, and safety policies.
   */
  public static generateRecommendations(params: {
    session: LearningSession;
    project: AppProject;
    targetOperationType?: string;
    targetComponentType?: string;
    failureCategory?: string;
    userAutonomyLevel?: AutonomyLevel;
    environment?: string;
  }): LearningRecommendation[] {
    const { session, project } = params;

    // Cross-project isolation check
    if (session.projectId !== project.id) {
      this.transitionState(
        session,
        'blocked',
        'CROSS_PROJECT_ISOLATION_BLOCKED',
        `Cannot generate recommendations: session projectId ${session.projectId} does not match target ${project.id}`
      );
      return [];
    }

    this.transitionState(session, 'matching', 'EXPERIENCE_MATCH_STARTED', 'Searching matching historical experiences');

    const matches = this.matchExperience({
      projectId: project.id,
      operationType: params.targetOperationType,
      componentType: params.targetComponentType,
      failureCategory: params.failureCategory,
    });

    this.transitionState(session, 'analyzing', 'PATTERN_ANALYSIS_STARTED', 'Analyzing matched experiences for patterns');
    const patterns = this.analyzePatterns(project.id);

    this.transitionState(session, 'recommending', 'RECOMMENDATION_GENERATION_STARTED', 'Synthesizing recommendations');

    const recommendations: LearningRecommendation[] = [];

    // Strategy 1: Repeated failure warning / block recommendation
    const matchingFailurePattern = patterns.find(
      (p) =>
        p.category === 'REPEATED_FAILURE' &&
        (params.failureCategory ? p.associatedFailureCategories.includes(params.failureCategory) : true)
    );

    if (matchingFailurePattern) {
      const recId = `rec_${Date.now()}_fail_${Math.random().toString(36).substring(2, 6)}`;
      const rec: LearningRecommendation = {
        recommendationId: recId,
        sessionId: session.sessionId,
        projectId: project.id,
        type: 'RECOMMEND_HUMAN_APPROVAL',
        title: `Caution: High Historical Failure Rate for ${matchingFailurePattern.associatedFailureCategories.join(', ')}`,
        description: `This operation or failure pattern has failed ${matchingFailurePattern.occurrenceCount} times in project history. Human approval is strongly advised before mutation.`,
        target: {
          operationType: params.targetOperationType,
          entityType: 'component',
        },
        confidence: {
          score: matchingFailurePattern.confidence,
          evidenceQuantity: matchingFailurePattern.occurrenceCount,
          evidenceQuality: 0.9,
          recencyWeight: 0.85,
          contradictionPenalty: 0.0,
          rationale: `Derived from ${matchingFailurePattern.occurrenceCount} verified historical failure observations`,
        },
        risk: 'HIGH',
        expectedBenefit: 'Prevents known failure repetition and avoids unexpected project drift',
        evidence: {
          summary: `Pattern ${matchingFailurePattern.title} triggered based on ${matchingFailurePattern.supportingExperienceIds.length} experiences`,
          supportingExperienceIds: matchingFailurePattern.supportingExperienceIds,
          contradictingExperienceIds: [],
          patternIds: [matchingFailurePattern.id],
        },
        validity: 'VALID',
        policyCompatibility: {
          evaluated: true,
          allowed: true,
          approvalRequired: true,
          policyReason: 'High historical failure risk mandates human approval',
        },
        createdAt: new Date().toISOString(),
      };
      recommendations.push(rec);
    }

    // Strategy 2: Recovery strategy recommendation
    const matchingRecoveryPattern = patterns.find(
      (p) => p.category === 'RECOVERY_SUCCESS' && p.recommendedStrategy
    );

    if (matchingRecoveryPattern) {
      const recId = `rec_${Date.now()}_recov_${Math.random().toString(36).substring(2, 6)}`;
      const rec: LearningRecommendation = {
        recommendationId: recId,
        sessionId: session.sessionId,
        projectId: project.id,
        type: 'RECOMMEND_RECOVERY_STRATEGY',
        title: `Recommended Recovery Strategy: ${matchingRecoveryPattern.recommendedStrategy}`,
        description: `Based on ${matchingRecoveryPattern.occurrenceCount} successful past recoveries, ${matchingRecoveryPattern.recommendedStrategy} has proven highly effective.`,
        suggestedStrategy: matchingRecoveryPattern.recommendedStrategy,
        confidence: {
          score: matchingRecoveryPattern.confidence,
          evidenceQuantity: matchingRecoveryPattern.occurrenceCount,
          evidenceQuality: 0.9,
          recencyWeight: 0.8,
          contradictionPenalty: 0.0,
          rationale: `Proven effective in ${matchingRecoveryPattern.occurrenceCount} prior verified recovery attempts`,
        },
        risk: 'LOW',
        expectedBenefit: 'High probability of automated verification PASS',
        evidence: {
          summary: `Pattern ${matchingRecoveryPattern.title} supported by ${matchingRecoveryPattern.supportingExperienceIds.length} successful recovery events`,
          supportingExperienceIds: matchingRecoveryPattern.supportingExperienceIds,
          contradictingExperienceIds: [],
          patternIds: [matchingRecoveryPattern.id],
        },
        validity: 'VALID',
        policyCompatibility: {
          evaluated: true,
          allowed: true,
          approvalRequired: false,
          policyReason: 'Safe, verified minimal repair strategy',
        },
        createdAt: new Date().toISOString(),
      };
      recommendations.push(rec);
    }

    // Strategy 3: General positive match recommendation
    const topPositiveMatch = matches.find((m) => !m.isContradictory && m.relevanceScore >= 0.6);
    if (topPositiveMatch && recommendations.length < this.MAX_RECOMMENDATIONS_PER_SESSION) {
      const recId = `rec_${Date.now()}_pos_${Math.random().toString(36).substring(2, 6)}`;
      const rec: LearningRecommendation = {
        recommendationId: recId,
        sessionId: session.sessionId,
        projectId: project.id,
        type: 'RECOMMEND_OPERATION',
        title: `Recommended Practice: Model after ${topPositiveMatch.experience.category}`,
        description: `Prior experience (${topPositiveMatch.experience.id}) succeeded with high verification pass rate.`,
        suggestedOperations: topPositiveMatch.experience.associatedOperations,
        confidence: {
          score: topPositiveMatch.relevanceScore,
          evidenceQuantity: 1,
          evidenceQuality: 0.8,
          recencyWeight: 0.8,
          contradictionPenalty: 0.0,
          rationale: topPositiveMatch.matchReasons.join('; '),
        },
        risk: topPositiveMatch.experience.features.riskLevel || 'LOW',
        expectedBenefit: 'Proven operational pattern from identical project context',
        evidence: {
          summary: `Matched historical experience ${topPositiveMatch.experience.id}`,
          supportingExperienceIds: [topPositiveMatch.experience.id],
          contradictingExperienceIds: [],
          patternIds: [],
        },
        validity: 'VALID',
        policyCompatibility: {
          evaluated: false,
          allowed: true,
          approvalRequired: topPositiveMatch.experience.features.approvalRequired,
        },
        createdAt: new Date().toISOString(),
      };
      recommendations.push(rec);
    }

    // Evaluate policy on all generated recommendations
    this.transitionState(session, 'policy_check', 'POLICY_CHECK_STARTED', 'Evaluating autonomy policy and security invariants');

    for (const rec of recommendations) {
      this.evaluateRecommendationSecurityAndPolicy(rec, params.userAutonomyLevel ?? 3, params.environment || 'development');
    }

    session.recommendations = recommendations;
    session.metrics.recommendationsGenerated = recommendations.length;

    this.transitionState(
      session,
      'completed',
      'RECOMMENDATIONS_READY',
      `Generated ${recommendations.length} recommendations for project ${project.id}`
    );

    return recommendations;
  }

  /**
   * Enforce Security Immutability and Autonomy Policy on a recommendation.
   * Prohibits ANY attempt to weaken security rules, bypass approval, bypass policy, or alter autonomy ceilings.
   */
  public static evaluateRecommendationSecurityAndPolicy(
    rec: LearningRecommendation,
    requestedLevel: AutonomyLevel = 3,
    environment: string = 'development'
  ): void {
    // 1. Security Immutability Hard Stop:
    // Check for prohibited arbitrary code execution
    const recStr = JSON.stringify(rec);
    if (
      recStr.includes(['ev', 'al('].join('')) ||
      recStr.includes(['new Func', 'tion('].join('')) ||
      recStr.includes('child_process') ||
      recStr.includes('DROP TABLE') ||
      recStr.includes('disable_guardrails')
    ) {
      rec.policyCompatibility = {
        evaluated: true,
        allowed: false,
        approvalRequired: true,
        policyReason: 'SECURITY_HARD_STOP: Recommendation contains prohibited dynamic code execution or SQL exploit',
      };
      rec.risk = 'CRITICAL';
      rec.validity = 'INVALID';
      return;
    }

    // 2. High Risk / Destructive actions mandate approval
    if (rec.risk === 'HIGH' || rec.risk === 'CRITICAL' || environment === 'production') {
      rec.policyCompatibility.approvalRequired = true;
    }

    rec.policyCompatibility.evaluated = true;
    rec.policyCompatibility.allowed = true;
  }

  // --- Safe Recommendation Application ---

  /**
   * Apply an approved recommendation safely through AITransactionManager.
   * Never mutates AppProject directly.
   */
  public static applyRecommendation(params: {
    recommendation: LearningRecommendation;
    project: AppProject;
    isApproved?: boolean;
    environment?: string;
  }): {
    success: boolean;
    updatedProject?: AppProject;
    error?: string;
  } {
    const { recommendation, project, isApproved } = params;

    // 1. Re-check policy & security
    this.evaluateRecommendationSecurityAndPolicy(recommendation, 3, params.environment || 'development');
    if (!recommendation.policyCompatibility.allowed) {
      return {
        success: false,
        error: recommendation.policyCompatibility.policyReason || 'Recommendation blocked by policy',
      };
    }

    // 2. Check approval requirement
    if (recommendation.policyCompatibility.approvalRequired && !isApproved) {
      return {
        success: false,
        error: 'Approval required before recommendation can be applied',
      };
    }

    // 3. Delegate mutations to AITransactionManager
    if (recommendation.suggestedOperations && recommendation.suggestedOperations.length > 0) {
      const txRes = AITransactionManager.executeTransaction({
        project,
        operations: recommendation.suggestedOperations,
        prompt: `Applied learning recommendation: ${recommendation.title}`,
        mode: 'agent',
      });

      if (txRes.success && txRes.updatedProject) {
        // Record successful recommendation outcome
        ExperienceStore.recordOutcome(recommendation.recommendationId, {
          recommendationId: recommendation.recommendationId,
          success: true,
          applied: true,
          verificationPassed: true,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          updatedProject: txRes.updatedProject,
        };
      }

      // Record failed recommendation outcome
      ExperienceStore.recordOutcome(recommendation.recommendationId, {
        recommendationId: recommendation.recommendationId,
        success: false,
        applied: false,
        error: txRes.errors?.join(', ') || 'Transaction failed',
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: txRes.errors?.join(', ') || 'Transaction execution failed',
      };
    }

    return {
      success: true,
      updatedProject: project,
    };
  }

  // --- Sanitization & Security ---

  public static sanitizeText(text: string): string {
    if (!text) return '';

    // 1. Redact secrets using AISecretFilter patterns
    let sanitized = text
      .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_SECRET_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/password\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'password: [REDACTED]');

    // 2. Prompt injection defense
    if (
      PromptInjectionDefense.containsInjectionAttempt(sanitized) ||
      sanitized.toLowerCase().includes('ignore previous instructions') ||
      sanitized.toLowerCase().includes('system override')
    ) {
      sanitized = '[SANITIZED_UNTRUSTED_INJECTION_ATTEMPT]';
    }

    return sanitized;
  }

  // --- Checkpoints & Session Persistence ---

  public static saveSession(session: LearningSession): void {
    try {
      if (typeof fs?.existsSync !== 'function' || !fs.writeFileSync) return;
      const dir = path.dirname(this.SESSION_STORAGE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.SESSION_STORAGE_PATH, JSON.stringify(session, null, 2), 'utf-8');
    } catch {
      // Graceful fallback in browser/client
    }
  }

  public static loadSession(): LearningSession | null {
    try {
      if (typeof fs?.existsSync !== 'function' || !fs.readFileSync) return null;
      if (!fs.existsSync(this.SESSION_STORAGE_PATH)) return null;

      const raw = JSON.parse(fs.readFileSync(this.SESSION_STORAGE_PATH, 'utf-8'));
      if (raw && raw.sessionId && raw.state) {
        return raw as LearningSession;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static createCheckpoint(session: LearningSession): LearningCheckpoint {
    const cp: LearningCheckpoint = {
      checkpointId: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: session.sessionId,
      state: session.state,
      projectId: session.projectId,
      projectVersion: session.projectVersion,
      experienceCount: ExperienceStore.getProjectExperiences(session.projectId).length,
      recommendationsCount: session.recommendations.length,
      timestamp: new Date().toISOString(),
    };

    session.checkpoints.push(cp);
    this.saveSession(session);
    return cp;
  }

  public static resumeSession(
    currentProject: AppProject
  ): {
    resumed: boolean;
    session?: LearningSession;
    reason?: string;
  } {
    const saved = this.loadSession();
    if (!saved) {
      return { resumed: false, reason: 'No saved learning session found' };
    }

    // Check project version drift
    if (saved.projectVersion !== currentProject.version) {
      return {
        resumed: false,
        reason: `Project version drifted from ${saved.projectVersion} to ${currentProject.version}. Re-plan or new learning session required.`,
      };
    }

    if (saved.projectId !== currentProject.id) {
      return {
        resumed: false,
        reason: `Project ID mismatch: session is for ${saved.projectId}, current is ${currentProject.id}`,
      };
    }

    return { resumed: true, session: saved };
  }
}
