// D8.14: Dynamic Guardrails & Safety Policy Synthesis Engine
// Autonomous real-time safety boundary synthesis, multi-phase invariant gating,
// live execution watchdog, blast radius containment, and closed-loop telemetry.

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AppProject } from '../../builder/schema/project';
import { AIRisk } from '../../builder/schema/ai';
import {
  GuardrailCategory,
  GuardrailPhase,
  GuardrailSeverity,
  GuardrailAction,
  GuardrailCondition,
  GuardrailRule,
  DynamicGuardrailPolicy,
  GuardrailBreach,
  GuardrailEvaluationResult,
  SafetySynthesisContext,
  GuardrailContainmentEvent,
  GuardrailLiveMetrics,
} from './guardrail-types';
import { AITransactionManager } from '../history/AITransactionManager';
import { ExecutionEventStore } from '../observability/ExecutionEventStore';
import { ExperienceStore } from './ExperienceStore';
import { HumanControlCenter } from './HumanControlCenter';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';
import { AISecretFilter } from '../security/AISecretFilter';

const DEFAULT_MAX_MUTATIONS = 15;
const DEFAULT_MAX_DURATION_MS = 30000;
const CRITICAL_PROTECTED_ENTITIES = ['auth', 'users', 'passwords', 'payments', 'billing', 'admin_credentials'];

export class DynamicGuardrailsEngine {
  private static policies: Map<string, DynamicGuardrailPolicy> = new Map();
  private static projectPolicyMap: Map<string, string> = new Map();
  private static breachLog: GuardrailBreach[] = [];
  private static containmentEvents: GuardrailContainmentEvent[] = [];
  private static storageFilePath = '.phase8/dynamic-guardrails.json';

  // ─────────────────────────────────────────────────────────────
  // 1. POLICY SYNTHESIS
  // ─────────────────────────────────────────────────────────────

  /**
   * Dynamically synthesizes a context-tailored guardrail policy given project scope,
   * goal sensitivity, environmental risk, and historical failure patterns.
   */
  public static synthesizePolicy(context: SafetySynthesisContext): DynamicGuardrailPolicy {
    if (!context.projectId) {
      throw new Error('SafetySynthesisContext must contain a valid projectId.');
    }

    const policyId = `dgp-${context.projectId}-${Date.now()}`;
    const environment = context.environment || 'development';
    const operatorRole = context.operatorRole || 'developer';

    // Determine risk tier
    let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    if (context.riskLevel === 'critical' || environment === 'production') {
      riskTier = 'CRITICAL';
    } else if (context.riskLevel === 'high') {
      riskTier = 'HIGH';
    } else if (context.riskLevel === 'low') {
      riskTier = 'LOW';
    }

    // Historical failure pattern analysis
    let pastIncidentCount = context.priorFailuresCount || 0;
    try {
      const exp = ExperienceStore.query({ projectId: context.projectId, minSuccessScore: 0 });
      const failureExps = exp.experiences.filter(
        (e) => e.successScore < 0.5 || e.category === 'EXECUTION_FAILURE' || e.outcome === 'FAILURE'
      );
      pastIncidentCount += failureExps.length;
    } catch {
      // Store may be empty or uninitialized
    }

    // Adjust mutation budget & duration limits based on risk tier and history
    let maxAllowedMutations = context.maxMutationsLimit !== undefined ? context.maxMutationsLimit : DEFAULT_MAX_MUTATIONS;
    let maxExecutionDurationMs = context.maxDurationMsLimit !== undefined ? context.maxDurationMsLimit : DEFAULT_MAX_DURATION_MS;

    if (context.maxMutationsLimit === undefined) {
      if (riskTier === 'CRITICAL') {
        maxAllowedMutations = 5;
        maxExecutionDurationMs = 15000;
      } else if (riskTier === 'HIGH' || pastIncidentCount > 2) {
        maxAllowedMutations = 8;
        maxExecutionDurationMs = 20000;
      } else if (riskTier === 'LOW') {
        maxAllowedMutations = 25;
        maxExecutionDurationMs = 45000;
      }
    }

    // Sanitize any goal description passed
    const sanitizedGoal = context.goalDescription
      ? AISecretFilter.redactText(PromptInjectionDefense.sanitizeInstruction(context.goalDescription).sanitized)
      : undefined;

    // Synthesize tailored rules
    const rules: GuardrailRule[] = [];

    // 1. Mandatory Hard Security Invariants
    rules.push({
      ruleId: `rule-sec-eval-${Date.now()}-1`,
      name: 'No Arbitrary Eval or Dynamic Code',
      description: 'Strict prohibition against dynamic code eval or Function constructors.',
      category: 'SECURITY_INVARIANT',
      phase: 'PRE_EXECUTION',
      severity: 'CRITICAL',
      enforcementAction: 'BLOCK_AND_ROLLBACK',
      isEnabled: true,
      condition: 'PROHIBITED_CODE_DETECTED',
    });

    rules.push({
      ruleId: `rule-sec-inj-${Date.now()}-2`,
      name: 'Prompt Injection Defense Invariant',
      description: 'Rejects instructions containing adversarial prompt injection signatures.',
      category: 'SECURITY_INVARIANT',
      phase: 'PRE_EXECUTION',
      severity: 'CRITICAL',
      enforcementAction: 'BLOCK_AND_ROLLBACK',
      isEnabled: true,
      condition: 'PROHIBITED_CODE_DETECTED',
    });

    rules.push({
      ruleId: `rule-sec-cred-${Date.now()}-3`,
      name: 'Zero Credential Leakage Boundary',
      description: 'Prevents leakage of sensitive API keys, tokens, or credentials in payload.',
      category: 'SECURITY_INVARIANT',
      phase: 'POST_EXECUTION',
      severity: 'HIGH',
      enforcementAction: 'BLOCK_AND_ROLLBACK',
      isEnabled: true,
      condition: 'CREDENTIAL_LEAKAGE',
    });

    rules.push({
      ruleId: `rule-perm-proj-${Date.now()}-4`,
      name: 'Strict Project Isolation Boundary',
      description: 'Cross-project mutations or entity access are forbidden.',
      category: 'PERMISSION_BOUNDARY',
      phase: 'PRE_EXECUTION',
      severity: 'CRITICAL',
      enforcementAction: 'BLOCK_AND_ROLLBACK',
      isEnabled: true,
      condition: 'CROSS_PROJECT_ACCESS',
      threshold: 0,
    });

    // 2. Rate & Budget Gating
    rules.push({
      ruleId: `rule-rate-mut-${Date.now()}-5`,
      name: 'Mutation Budget Ceiling Gate',
      description: `Limits total atomic mutations in single plan to ${maxAllowedMutations}.`,
      category: 'RATE_AND_BUDGET',
      phase: 'PRE_EXECUTION',
      severity: riskTier === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      enforcementAction: riskTier === 'CRITICAL' ? 'BLOCK_AND_ROLLBACK' : 'CONTAIN_AND_PAUSE',
      isEnabled: true,
      condition: 'MAX_MUTATIONS_EXCEEDED',
      threshold: maxAllowedMutations,
    });

    rules.push({
      ruleId: `rule-rate-live-${Date.now()}-6`,
      name: 'Live Execution Watchdog Throttling',
      description: 'Throttles or pauses runaway loops exceeding operational cadence.',
      category: 'RATE_AND_BUDGET',
      phase: 'LIVE_EXECUTION',
      severity: 'MEDIUM',
      enforcementAction: 'THROTTLE',
      isEnabled: true,
      condition: 'RATE_LIMIT_EXCEEDED',
      threshold: 10, // Max 10 ops/second
    });

    // 3. Blast Radius Containment
    rules.push({
      ruleId: `rule-blast-${Date.now()}-7`,
      name: 'Blast Radius Containment Guard',
      description: 'Blocks mutations spilling into unrelated components or global scopes.',
      category: 'BLAST_RADIUS',
      phase: 'PRE_EXECUTION',
      severity: 'HIGH',
      enforcementAction: 'CONTAIN_AND_PAUSE',
      isEnabled: true,
      condition: 'BLAST_RADIUS_BREACH',
    });

    // 4. Data & Schema Integrity
    rules.push({
      ruleId: `rule-schema-tamper-${Date.now()}-8`,
      name: 'Root Schema Preservation Invariant',
      description: 'Protects root component hierarchy and default routes from destructive removal.',
      category: 'SCHEMA_PRESERVATION',
      phase: 'POST_EXECUTION',
      severity: 'CRITICAL',
      enforcementAction: 'BLOCK_AND_ROLLBACK',
      isEnabled: true,
      condition: 'SCHEMA_TAMPERING',
    });

    rules.push({
      ruleId: `rule-data-crit-${Date.now()}-9`,
      name: 'Critical Data Collection Shield',
      description: 'Guards authentication, payment, and security collections from unauthorized modification.',
      category: 'DATA_INTEGRITY',
      phase: 'PRE_EXECUTION',
      severity: 'CRITICAL',
      enforcementAction: 'BLOCK_AND_ROLLBACK',
      isEnabled: true,
      condition: 'CRITICAL_COLLECTION_TOUCHED',
      targetEntities: [...CRITICAL_PROTECTED_ENTITIES],
    });

    // 5. Role-specific privilege tightening
    if (operatorRole === 'viewer') {
      rules.push({
        ruleId: `rule-role-viewer-${Date.now()}-10`,
        name: 'Viewer Role Read-Only Enforcement',
        description: 'Blocks all state modifications initiated by viewer role.',
        category: 'PERMISSION_BOUNDARY',
        phase: 'PRE_EXECUTION',
        severity: 'CRITICAL',
        enforcementAction: 'BLOCK_AND_ROLLBACK',
        isEnabled: true,
        condition: 'UNAUTHORIZED_TARGET',
      });
    }

    const policy: DynamicGuardrailPolicy = {
      policyId,
      projectId: context.projectId,
      goalId: context.goalId,
      synthesizedAt: new Date().toISOString(),
      riskTier,
      rules,
      activeBlastRadiusEntities: [],
      maxAllowedMutations,
      maxExecutionDurationMs,
      synthesizedFrom: {
        goalDescription: sanitizedGoal,
        pastIncidentCount,
        operatorRole,
        environment,
      },
      version: 1,
    };

    this.policies.set(policyId, policy);
    this.projectPolicyMap.set(context.projectId, policyId);
    this.persistToDisk();

    return policy;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PRE-EXECUTION INVARIANT GATING
  // ─────────────────────────────────────────────────────────────

  /**
   * Evaluates all pre-execution guardrails before transaction initiation.
   */
  public static evaluatePreExecution(params: {
    policyId: string;
    project: AppProject;
    planOrOperations: any;
    operatorRole?: string;
    targetEntities?: string[];
  }): GuardrailEvaluationResult {
    const policy = this.policies.get(params.policyId);
    if (!policy) {
      return {
        passed: false,
        policyId: params.policyId,
        projectId: params.project.id,
        phase: 'PRE_EXECUTION',
        breaches: [],
        recommendedAction: 'BLOCK_AND_ROLLBACK',
        summary: 'Guardrail policy not found.',
        timestamp: new Date().toISOString(),
        evaluatedRulesCount: 0,
        quarantineRequired: true,
      };
    }

    const breaches: GuardrailBreach[] = [];
    const preRules = policy.rules.filter((r) => r.isEnabled && r.phase === 'PRE_EXECUTION');

    // Extract operations
    const operations: any[] = Array.isArray(params.planOrOperations)
      ? params.planOrOperations
      : params.planOrOperations?.steps
      ? params.planOrOperations.steps.map((s: any) => s.operation || s)
      : [];

    const opCount = operations.length;

    for (const rule of preRules) {
      // 1. Check mutation budget
      if (rule.condition === 'MAX_MUTATIONS_EXCEEDED' && rule.threshold !== undefined) {
        if (opCount > rule.threshold) {
          breaches.push({
            breachId: `brch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ruleId: rule.ruleId,
            ruleName: rule.name,
            category: rule.category,
            phase: 'PRE_EXECUTION',
            severity: rule.severity,
            action: rule.enforcementAction,
            condition: rule.condition,
            message: `Planned operations (${opCount}) exceed mutation budget ceiling (${rule.threshold}).`,
            timestamp: new Date().toISOString(),
            contextSnapshot: { opCount, limit: rule.threshold },
          });
        }
      }

      // 2. Check viewer role restriction
      if (rule.condition === 'UNAUTHORIZED_TARGET' && params.operatorRole === 'viewer') {
        if (opCount > 0) {
          breaches.push({
            breachId: `brch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ruleId: rule.ruleId,
            ruleName: rule.name,
            category: rule.category,
            phase: 'PRE_EXECUTION',
            severity: rule.severity,
            action: rule.enforcementAction,
            condition: rule.condition,
            message: 'Viewer role is restricted from applying plan mutations.',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // 3. Check critical collection modification
      if (rule.condition === 'CRITICAL_COLLECTION_TOUCHED' && rule.targetEntities) {
        for (const op of operations) {
          const targetName = (op.collectionName || op.nodeId || op.name || '').toLowerCase();
          const touchedCritical = rule.targetEntities.some((crit) => targetName.includes(crit.toLowerCase()));
          if (touchedCritical) {
            breaches.push({
              breachId: `brch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              ruleId: rule.ruleId,
              ruleName: rule.name,
              category: rule.category,
              phase: 'PRE_EXECUTION',
              severity: rule.severity,
              action: rule.enforcementAction,
              condition: rule.condition,
              targetEntity: targetName,
              message: `Operation touches protected critical collection: "${targetName}".`,
              timestamp: new Date().toISOString(),
            });
            break;
          }
        }
      }

      // 4. Check prompt injection in operations/descriptions
      if (rule.condition === 'PROHIBITED_CODE_DETECTED') {
        for (const op of operations) {
          const rawText = JSON.stringify(op);
          if (PromptInjectionDefense.containsInjectionAttempt(rawText) || /\beval\s*\(/.test(rawText) || /\bFunction\s*\(/.test(rawText)) {
            breaches.push({
              breachId: `brch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              ruleId: rule.ruleId,
              ruleName: rule.name,
              category: rule.category,
              phase: 'PRE_EXECUTION',
              severity: 'CRITICAL',
              action: 'BLOCK_AND_ROLLBACK',
              condition: rule.condition,
              message: 'Prohibited dynamic code execution or prompt injection pattern detected.',
              timestamp: new Date().toISOString(),
            });
            break;
          }
        }
      }

      // 5. Check blast radius
      if (rule.condition === 'BLAST_RADIUS_BREACH' && policy.activeBlastRadiusEntities.length > 0) {
        for (const op of operations) {
          const targetId = op.nodeId || op.pageId || op.id;
          if (targetId && !policy.activeBlastRadiusEntities.includes(targetId)) {
            breaches.push({
              breachId: `brch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              ruleId: rule.ruleId,
              ruleName: rule.name,
              category: rule.category,
              phase: 'PRE_EXECUTION',
              severity: rule.severity,
              action: rule.enforcementAction,
              condition: rule.condition,
              targetEntity: targetId,
              message: `Target entity "${targetId}" is outside defined blast radius boundary.`,
              timestamp: new Date().toISOString(),
            });
            break;
          }
        }
      }

      // 6. Cross project isolation
      if (rule.condition === 'CROSS_PROJECT_ACCESS') {
        for (const op of operations) {
          if (op.projectId && op.projectId !== params.project.id) {
            breaches.push({
              breachId: `brch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              ruleId: rule.ruleId,
              ruleName: rule.name,
              category: rule.category,
              phase: 'PRE_EXECUTION',
              severity: 'CRITICAL',
              action: 'BLOCK_AND_ROLLBACK',
              condition: rule.condition,
              message: `Cross-project operation rejected: target project ${op.projectId} != ${params.project.id}`,
              timestamp: new Date().toISOString(),
            });
            break;
          }
        }
      }
    }

    this.recordBreaches(breaches);

    const recommendedAction = this.determineRecommendedAction(breaches);
    const passed = breaches.length === 0;

    return {
      passed,
      policyId: params.policyId,
      projectId: params.project.id,
      phase: 'PRE_EXECUTION',
      breaches,
      recommendedAction,
      summary: passed
        ? `Pre-execution guardrails passed (${preRules.length} evaluated).`
        : `Pre-execution guardrails breached: ${breaches.map((b) => b.message).join(' | ')}`,
      timestamp: new Date().toISOString(),
      evaluatedRulesCount: preRules.length,
      quarantineRequired: breaches.some((b) => b.severity === 'CRITICAL'),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. LIVE EXECUTION WATCHDOG
  // ─────────────────────────────────────────────────────────────

  /**
   * Live execution watchdog evaluating running operation metrics and rate limits.
   */
  public static evaluateLiveExecution(params: {
    policyId: string;
    liveMetrics: GuardrailLiveMetrics;
    currentOperation?: any;
  }): GuardrailEvaluationResult {
    const policy = this.policies.get(params.policyId);
    if (!policy) {
      return {
        passed: false,
        policyId: params.policyId,
        projectId: 'unknown',
        phase: 'LIVE_EXECUTION',
        breaches: [],
        recommendedAction: 'CONTAIN_AND_PAUSE',
        summary: 'Policy not found',
        timestamp: new Date().toISOString(),
        evaluatedRulesCount: 0,
        quarantineRequired: false,
      };
    }

    const breaches: GuardrailBreach[] = [];
    const liveRules = policy.rules.filter((r) => r.isEnabled && r.phase === 'LIVE_EXECUTION');

    for (const rule of liveRules) {
      // Rate limit check
      if (rule.condition === 'RATE_LIMIT_EXCEEDED' && rule.threshold !== undefined) {
        if (params.liveMetrics.opsPerSecond > rule.threshold) {
          breaches.push({
            breachId: `brch-live-rate-${Date.now()}`,
            ruleId: rule.ruleId,
            ruleName: rule.name,
            category: rule.category,
            phase: 'LIVE_EXECUTION',
            severity: rule.severity,
            action: rule.enforcementAction,
            condition: rule.condition,
            message: `Execution rate (${params.liveMetrics.opsPerSecond.toFixed(1)} ops/s) exceeds threshold (${rule.threshold} ops/s).`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Timeout watchdog check
      if (rule.condition === 'TIMEOUT_EXCEEDED' || params.liveMetrics.currentDurationMs > policy.maxExecutionDurationMs) {
        breaches.push({
          breachId: `brch-live-time-${Date.now()}`,
          ruleId: rule.ruleId,
          ruleName: 'Execution Timeout Watchdog',
          category: 'RATE_AND_BUDGET',
          phase: 'LIVE_EXECUTION',
          severity: 'HIGH',
          action: 'CONTAIN_AND_PAUSE',
          condition: rule.condition,
          message: `Execution duration (${params.liveMetrics.currentDurationMs}ms) exceeded maximum ceiling (${policy.maxExecutionDurationMs}ms).`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.recordBreaches(breaches);
    const recommendedAction = this.determineRecommendedAction(breaches);
    const passed = breaches.length === 0;

    return {
      passed,
      policyId: params.policyId,
      projectId: policy.projectId,
      phase: 'LIVE_EXECUTION',
      breaches,
      recommendedAction,
      summary: passed ? 'Live execution metrics nominal.' : `Live guardrails triggered: ${breaches.length} alert(s).`,
      timestamp: new Date().toISOString(),
      evaluatedRulesCount: liveRules.length,
      quarantineRequired: breaches.some((b) => b.severity === 'CRITICAL'),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. POST-EXECUTION INVARIANT VERIFICATION
  // ─────────────────────────────────────────────────────────────

  /**
   * Evaluates post-execution state invariants: schema preservation, secret leakage,
   * structural hierarchy preservation.
   */
  public static evaluatePostExecution(params: {
    policyId: string;
    projectBefore: AppProject;
    projectAfter: AppProject;
    affectedEntities?: string[];
  }): GuardrailEvaluationResult {
    const policy = this.policies.get(params.policyId);
    if (!policy) {
      return {
        passed: false,
        policyId: params.policyId,
        projectId: params.projectBefore?.id || 'unknown',
        phase: 'POST_EXECUTION',
        breaches: [],
        recommendedAction: 'BLOCK_AND_ROLLBACK',
        summary: 'Policy not found',
        timestamp: new Date().toISOString(),
        evaluatedRulesCount: 0,
        quarantineRequired: true,
      };
    }

    const breaches: GuardrailBreach[] = [];
    const postRules = policy.rules.filter((r) => r.isEnabled && r.phase === 'POST_EXECUTION');

    for (const rule of postRules) {
      // 1. Schema tampering: Root component deletion or empty page set
      if (rule.condition === 'SCHEMA_TAMPERING') {
        if (!params.projectAfter.pages || params.projectAfter.pages.length === 0) {
          breaches.push({
            breachId: `brch-post-schema-${Date.now()}`,
            ruleId: rule.ruleId,
            ruleName: rule.name,
            category: rule.category,
            phase: 'POST_EXECUTION',
            severity: 'CRITICAL',
            action: 'BLOCK_AND_ROLLBACK',
            condition: rule.condition,
            message: 'All pages removed in mutation; invariant broken.',
            timestamp: new Date().toISOString(),
          });
        } else {
          // Check if any page lost its root component
          for (const page of params.projectAfter.pages) {
            if (!page.root) {
              breaches.push({
                breachId: `brch-post-root-${Date.now()}-${page.id}`,
                ruleId: rule.ruleId,
                ruleName: rule.name,
                category: rule.category,
                phase: 'POST_EXECUTION',
                severity: 'CRITICAL',
                action: 'BLOCK_AND_ROLLBACK',
                condition: rule.condition,
                targetEntity: page.id,
                message: `Page "${page.name}" (${page.id}) root component destroyed in mutation.`,
                timestamp: new Date().toISOString(),
              });
              break;
            }
          }
        }
      }

      // 2. Zero credential leakage: Inspect project string contents
      if (rule.condition === 'CREDENTIAL_LEAKAGE') {
        const serialized = JSON.stringify(params.projectAfter);
        const redacted = AISecretFilter.redactText(serialized);
        if (redacted !== serialized) {
          breaches.push({
            breachId: `brch-post-cred-${Date.now()}`,
            ruleId: rule.ruleId,
            ruleName: rule.name,
            category: rule.category,
            phase: 'POST_EXECUTION',
            severity: 'HIGH',
            action: 'BLOCK_AND_ROLLBACK',
            condition: rule.condition,
            message: 'Potential raw credential or API key token embedded into project state.',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    this.recordBreaches(breaches);
    const recommendedAction = this.determineRecommendedAction(breaches);
    const passed = breaches.length === 0;

    return {
      passed,
      policyId: params.policyId,
      projectId: policy.projectId,
      phase: 'POST_EXECUTION',
      breaches,
      recommendedAction,
      summary: passed
        ? 'Post-execution invariants preserved cleanly.'
        : `Post-execution guardrail violation: ${breaches.map((b) => b.message).join(' | ')}`,
      timestamp: new Date().toISOString(),
      evaluatedRulesCount: postRules.length,
      quarantineRequired: breaches.some((b) => b.severity === 'CRITICAL'),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 5. REAL-TIME CONTAINMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Enforces containment action on breach: rolls back in-flight transaction,
   * pauses active HITL session, logs telemetry to ExecutionEventStore, and reinforces ExperienceStore.
   */
  public static enforceContainment(params: {
    projectId: string;
    breach: GuardrailBreach;
    inFlightTxId?: string;
    sessionId?: string;
  }): GuardrailContainmentEvent {
    const containmentId = `cont-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();

    // If BLOCK_AND_ROLLBACK and transaction in flight, trigger rollback
    if (params.breach.action === 'BLOCK_AND_ROLLBACK' && params.inFlightTxId) {
      AITransactionManager.rollback(params.inFlightTxId);
    }

    // If containment or block action and session provided, halt HITL session
    if (
      (params.breach.action === 'CONTAIN_AND_PAUSE' || params.breach.action === 'BLOCK_AND_ROLLBACK') &&
      params.sessionId
    ) {
      try {
        if (HumanControlCenter.getSession(params.sessionId)) {
          HumanControlCenter.pauseExecution(
            params.sessionId,
            `Guardrail Containment Triggered: ${params.breach.message}`
          );
        }
      } catch {
        // Session not yet created in HumanControlCenter
      }
    }

    // Provenance hash
    const provenanceHash = crypto
      .createHash('sha256')
      .update(`${containmentId}:${params.projectId}:${params.breach.ruleId}:${params.breach.action}:${timestamp}`)
      .digest('hex');

    const event: GuardrailContainmentEvent = {
      containmentId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      triggerBreach: params.breach,
      actionTaken: params.breach.action,
      rolledBackTransactionId: params.inFlightTxId,
      pausedSessionId: params.sessionId,
      timestamp,
      provenanceHash,
    };

    this.containmentEvents.push(event);

    // Record high-priority observability event
    ExecutionEventStore.appendEvent({
      eventId: `evt-guard-contain-${Date.now()}`,
      sequenceNumber: Date.now(),
      timestamp: { iso: timestamp, epochMs: Date.now() },
      eventType: 'SAFETY_VIOLATION_DETECTED' as any,
      status: 'BLOCKED',
      source: 'DECISION_ENGINE',
      severity: params.breach.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      correlation: {
        traceId: `trc-guard-${containmentId}`,
        sessionId: params.sessionId || `sess-guard-${params.projectId}`,
        projectId: params.projectId,
      },
      metadata: {
        containmentId,
        ruleId: params.breach.ruleId,
        ruleName: params.breach.ruleName,
        category: params.breach.category,
        action: params.breach.action,
        reason: params.breach.message,
      },
      outcome: {
        status: 'BLOCKED',
        summary: `Containment engaged: ${params.breach.action} on rule ${params.breach.ruleName}`,
      },
    });

    // Reinforce learning into ExperienceStore
    try {
      ExperienceStore.insert({
        id: `exp-guard-${containmentId}`,
        projectId: params.projectId,
        category: 'EXECUTION_FAILURE',
        outcome: 'FAILURE',
        validity: 'VALID',
        description: `Guardrail breach prevented: ${params.breach.ruleName} - ${params.breach.message}`,
        successScore: 0.1,
        context: { projectId: params.projectId, projectVersion: 1, schemaVersion: 1, environment: 'development' },
        features: {
          version: '1.0.0',
          operationTypes: ['modify_component'],
          componentTypes: ['Container'],
          mutationCount: 1,
          operationCount: 1,
          riskLevel: 'HIGH',
          approvalRequired: false,
          rollbackOccurred: true,
          tags: ['guardrail', 'containment'],
        },
        provenance: {
          source: 'execution',
          projectId: params.projectId,
          projectVersion: 1,
          schemaVersion: 1,
          environment: 'development',
          actor: 'system',
          timestamp: new Date().toISOString(),
          sanitized: true,
        },
        evidence: [params.breach.ruleId],
      } as any);
    } catch {
      // Experience store may be mocked or offline
    }

    this.persistToDisk();
    return event;
  }

  // ─────────────────────────────────────────────────────────────
  // 6. POLICY & RULE MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  public static getPolicy(policyId: string): DynamicGuardrailPolicy | undefined {
    return this.policies.get(policyId);
  }

  public static getPolicyByProject(projectId: string): DynamicGuardrailPolicy | undefined {
    const policyId = this.projectPolicyMap.get(projectId);
    return policyId ? this.policies.get(policyId) : undefined;
  }

  public static updateRule(policyId: string, ruleId: string, updates: Partial<GuardrailRule>): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    const rule = policy.rules.find((r) => r.ruleId === ruleId);
    if (!rule) return false;

    // Hard security invariant protection: Cannot disable or relax no-eval / prompt-injection
    if (
      (rule.name.includes('Eval') || rule.name.includes('Injection')) &&
      updates.isEnabled === false
    ) {
      throw new Error('Hard security invariant rules cannot be disabled.');
    }

    Object.assign(rule, updates);
    this.persistToDisk();
    return true;
  }

  public static addCustomRule(policyId: string, rule: GuardrailRule): void {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    policy.rules.push(rule);
    this.persistToDisk();
  }

  public static setBlastRadiusEntities(policyId: string, entityIds: string[]): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      policy.activeBlastRadiusEntities = [...entityIds];
      this.persistToDisk();
    }
  }

  public static getBreaches(projectId?: string): GuardrailBreach[] {
    if (!projectId) return [...this.breachLog];
    return this.breachLog.filter((b) => b.contextSnapshot?.projectId === projectId);
  }

  public static getContainmentEvents(projectId?: string): GuardrailContainmentEvent[] {
    if (!projectId) return [...this.containmentEvents];
    return this.containmentEvents.filter((c) => c.projectId === projectId);
  }

  public static clear(): void {
    this.policies.clear();
    this.projectPolicyMap.clear();
    this.breachLog = [];
    this.containmentEvents = [];
  }

  // ─────────────────────────────────────────────────────────────
  // 7. INTERNAL UTILITIES
  // ─────────────────────────────────────────────────────────────

  private static recordBreaches(breaches: GuardrailBreach[]): void {
    if (breaches.length > 0) {
      this.breachLog.push(...breaches);
    }
  }

  private static determineRecommendedAction(breaches: GuardrailBreach[]): GuardrailAction {
    if (breaches.length === 0) return 'ALLOW';

    const actions = breaches.map((b) => b.action);
    if (actions.includes('BLOCK_AND_ROLLBACK')) return 'BLOCK_AND_ROLLBACK';
    if (actions.includes('CONTAIN_AND_PAUSE')) return 'CONTAIN_AND_PAUSE';
    if (actions.includes('THROTTLE')) return 'THROTTLE';
    if (actions.includes('WARN')) return 'WARN';
    return 'ALLOW';
  }

  private static persistToDisk(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const data = {
        policies: Array.from(this.policies.values()),
        breachesCount: this.breachLog.length,
        containmentCount: this.containmentEvents.length,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // In-memory fallback
    }
  }
}
