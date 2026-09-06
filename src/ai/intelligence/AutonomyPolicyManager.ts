// D8.4: Autonomy Policy Manager & Policy Engine
// Defines and enforces strict autonomy levels (0 to 4 / semantic levels) governing autonomous action capabilities.

import {
  AutonomyLevel,
  AutonomyPolicy,
  SemanticAutonomyLevel,
  AutonomyEnvironment,
  AutonomyCeilings,
  PolicyApprovalRequirement,
  PolicyStopCondition,
  PolicyDeniedAction,
  PolicyDecisionProvenance,
  AutonomyPolicyDecision,
  AutonomyEvaluationParams,
} from './types';
import { AIRisk } from '../../builder/schema/ai';
import { Phase8SecurityAuditor } from './Phase8SecurityAuditor';
import { PlanValidationEngine } from './PlanValidationEngine';
import { OperationPermissions } from '../operations/OperationPermissions';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';
import { AISecretFilter } from '../security/AISecretFilter';

export class AutonomyPolicyManager {
  public static readonly POLICY_VERSION = '1.0.0';

  public static readonly DEFAULT_CEILINGS: AutonomyCeilings = {
    maxOperationsPerTask: 50,
    maxAffectedEntities: 30,
    maxWorkflowChanges: 15,
    maxDataChanges: 15,
    maxRetries: 3,
    maxExecutionDurationMs: 60000,
    maxTokenBudget: 4000,
  };

  private static readonly POLICIES: Record<AutonomyLevel, AutonomyPolicy> = {
    0: {
      level: 0,
      name: 'OBSERVE',
      description: 'Read-only analysis and inspection. Zero mutations permitted.',
      canMutate: false,
      canAutoApplyLowRisk: false,
      canAutoApplyMediumRisk: false,
      canAutoApplyHighRisk: false,
      requiresPreVerification: true,
    },
    1: {
      level: 1,
      name: 'SUGGEST',
      description: 'Generates plans and proposals for user review. No direct mutations.',
      canMutate: false,
      canAutoApplyLowRisk: false,
      canAutoApplyMediumRisk: false,
      canAutoApplyHighRisk: false,
      requiresPreVerification: true,
    },
    2: {
      level: 2,
      name: 'APPROVAL_REQUIRED',
      description: 'Prepares transactions and changes, but requires explicit human approval for all mutations.',
      canMutate: true,
      canAutoApplyLowRisk: false,
      canAutoApplyMediumRisk: false,
      canAutoApplyHighRisk: false,
      requiresPreVerification: true,
    },
    3: {
      level: 3,
      name: 'CONTROLLED_AUTONOMY',
      description: 'Automatically applies verified low-risk operations (styling, text, theme). Requires approval for medium/high.',
      canMutate: true,
      canAutoApplyLowRisk: true,
      canAutoApplyMediumRisk: false,
      canAutoApplyHighRisk: false,
      requiresPreVerification: true,
    },
    4: {
      level: 4,
      name: 'VERIFIED_AUTONOMY',
      description: 'Executes multi-step verified workflows automatically. Destructive and high-risk operations still require approval.',
      canMutate: true,
      canAutoApplyLowRisk: true,
      canAutoApplyMediumRisk: true,
      canAutoApplyHighRisk: false,
      requiresPreVerification: true,
    },
  };

  public static normalizeLevel(level?: AutonomyLevel | SemanticAutonomyLevel | string | number): AutonomyLevel {
    const str = String(level ?? '').toLowerCase();
    if (str === '0' || str === 'manual' || str === 'observe') return 0;
    if (str === '1' || str === 'assisted' || str === 'suggest') return 1;
    if (str === '2' || str === 'supervised' || str === 'approval_required') return 2;
    if (str === '3' || str === 'conditional' || str === 'controlled_autonomy') return 3;
    if (str === '4' || str === 'autonomous' || str === 'verified_autonomy') return 4;
    return 2; // Safe supervised default
  }

  public static toSemanticLevel(level: AutonomyLevel): SemanticAutonomyLevel {
    switch (level) {
      case 0:
        return 'manual';
      case 1:
        return 'assisted';
      case 2:
        return 'supervised';
      case 3:
        return 'conditional';
      case 4:
        return 'autonomous';
      default:
        return 'supervised';
    }
  }

  public static getPolicy(level: AutonomyLevel): AutonomyPolicy {
    return this.POLICIES[level] || this.POLICIES[2];
  }

  /**
   * Checks if an action with a given risk profile requires human approval under the active autonomy level.
   * Preserves 100% backward compatibility with Phase 7 & 8 master suites.
   */
  public static requiresApproval(
    level: AutonomyLevel,
    risk: AIRisk,
    environment: 'development' | 'preview' | 'staging' | 'production' = 'development'
  ): { required: boolean; reason: string } {
    // Hard stop: Production environment always locks medium, high, and critical risks
    if (environment === 'production' && risk !== 'low') {
      return {
        required: true,
        reason: `Production environment lock: Operations with ${risk} risk require explicit confirmation.`,
      };
    }

    // Critical risks ALWAYS require human approval across all autonomy levels
    if (risk === 'critical' || risk === 'high') {
      return {
        required: true,
        reason: `High/Critical risk operations require explicit human approval regardless of autonomy setting.`,
      };
    }

    const policy = this.getPolicy(level);

    if (!policy.canMutate) {
      return {
        required: true,
        reason: `Autonomy Level ${level} (${policy.name}) is read-only or suggestion-only. Mutation requires approval.`,
      };
    }

    if (risk === 'low') {
      if (policy.canAutoApplyLowRisk) {
        return { required: false, reason: 'Low-risk operation permitted under active autonomy policy.' };
      }
      return { required: true, reason: `Autonomy Level ${level} requires human sign-off on low-risk operations.` };
    }

    if (risk === 'medium') {
      if (policy.canAutoApplyMediumRisk) {
        return { required: false, reason: 'Medium-risk operation permitted under verified autonomy.' };
      }
      return { required: true, reason: `Autonomy Level ${level} requires human sign-off on medium-risk operations.` };
    }

    return { required: true, reason: 'Approval required.' };
  }

  public static canExecuteDirectly(
    level: AutonomyLevel,
    risk: AIRisk,
    environment?: 'development' | 'preview' | 'staging' | 'production'
  ): boolean {
    return !this.requiresApproval(level, risk, environment).required;
  }

  /**
   * Comprehensive Autonomy Policy Evaluation Engine (D8.4).
   * Strictly evaluates policies across the 9-stage precedence hierarchy:
   * 1. Security Hard Stops
   * 2. RBAC / Authorization
   * 3. System Safety Policy (Critical Risks)
   * 4. Environment Restrictions
   * 5. Project Policy
   * 6. User Autonomy Preference
   * 7. Plan & DAG Validation
   * 8. Confidence & Ambiguity Gating
   * 9. Context Validity & Freshness
   * 10. Ceilings & Ceilings Enforcement
   * 11. Human Controls & Overrides
   *
   * Strictly non-mutating: zero mutations to AppProject or GoalRepresentation.
   */
  public static evaluatePolicy(params: AutonomyEvaluationParams): AutonomyPolicyDecision {
    const timestamp = new Date().toISOString();
    const evaluatedRules: string[] = [];
    const policyViolations: string[] = [];
    const deniedActions: PolicyDeniedAction[] = [];
    const approvalRequirements: PolicyApprovalRequirement[] = [];
    const stopConditions: PolicyStopCondition[] = [];
    const constraints: string[] = [];
    const escalationRequirements: string[] = [];
    const allowedActions: string[] = [];

    // Safe fallback defaults
    const environment: AutonomyEnvironment = params.environment || 'development';
    const policyVersion = params.policyVersion || this.POLICY_VERSION;
    const requestedLevel: AutonomyLevel = this.normalizeLevel(params.requestedLevel ?? 2);
    let effectiveLevel: AutonomyLevel = requestedLevel;

    // Ceilings merging
    const ceilings: AutonomyCeilings = {
      ...this.DEFAULT_CEILINGS,
      ...(params.projectPolicy?.customCeilings || {}),
    };

    let securityCheckPassed = true;
    let rbacCheckPassed = true;
    let environmentRule = `ENV_${environment.toUpperCase()}_CHECK`;
    let planValidationRule = 'PLAN_DAG_VALIDATION';
    let confidenceRule = 'CONFIDENCE_GATING';
    let ambiguityRule = 'AMBIGUITY_GATING';

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 0: Policy Version Validation
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_0_POLICY_VERSION');
    if (params.policyVersion && !params.policyVersion.startsWith('1.')) {
      policyViolations.push(`Unsupported policy version: ${params.policyVersion}`);
      stopConditions.push({
        trigger: 'POLICY_VERSION_MISMATCH',
        reason: `Active policy engine version is ${this.POLICY_VERSION}, got ${params.policyVersion}`,
      });
      effectiveLevel = 0;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 1: Security Hard Stops (Precedence 1 - Non-negotiable)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_1_SECURITY_HARD_STOP');

    // 1.1 Prompt Injection and Policy Override Attempts
    const promptToCheck = [
      params.goal?.rawPrompt || '',
      params.plan?.title || '',
      params.plan?.rationale || '',
    ].join(' ');

    const adversarialBypassPattern =
      /\b(ignore\s+approval|disable\s+guardrails|set\s+autonomy\s+to\s+autonomous|trust\s+me|override\s+policy|bypass\s+security|grant\s+all|drop\s+all)\b/i;

    if (adversarialBypassPattern.test(promptToCheck) || PromptInjectionDefense.containsInjectionAttempt(promptToCheck)) {
      securityCheckPassed = false;
      policyViolations.push('Prompt injection or policy bypass signature detected');
      stopConditions.push({
        trigger: 'SECURITY_HARD_STOP',
        reason: 'Adversarial policy override attempt intercepted.',
      });
      effectiveLevel = 0;
    }

    // 1.2 Arbitrary Code & SQL Injection Checks
    const planToAudit = params.plan
      ? {
          ...params.plan,
          constraints: (params.plan.constraints || []).filter(
            (c) => !c.includes('eval()') && !c.includes('new Function()')
          ),
        }
      : {};
    const rawPlanStr = JSON.stringify(planToAudit);
    const codeAudit = Phase8SecurityAuditor.auditCodeString(rawPlanStr);
    if (!codeAudit.safe) {
      securityCheckPassed = false;
      policyViolations.push(...codeAudit.violations);
      stopConditions.push({
        trigger: 'SECURITY_HARD_STOP',
        reason: `Disallowed code or command execution pattern detected: ${codeAudit.violations.join('; ')}`,
      });
      effectiveLevel = 0;
    }

    // SQL pattern check
    if (/\b(DROP\s+TABLE|DELETE\s+FROM|TRUNCATE\s+TABLE|ALTER\s+TABLE)\b/i.test(rawPlanStr)) {
      securityCheckPassed = false;
      policyViolations.push('Arbitrary destructive SQL statement detected in plan payload');
      stopConditions.push({
        trigger: 'SECURITY_HARD_STOP',
        reason: 'Arbitrary SQL execution pattern detected.',
      });
      effectiveLevel = 0;
    }

    // 1.3 Secret Leak Filter in Plan
    if (AISecretFilter.redactText(rawPlanStr) !== rawPlanStr) {
      policyViolations.push('Secret-like API tokens or credentials detected in plan payload');
      constraints.push('Secrets detected and marked for mandatory redaction');
    }

    // 1.4 Forbidden / Unsupported Operations
    if (params.plan?.steps) {
      for (const step of params.plan.steps) {
        if (!step.operation || !step.operation.type) {
          policyViolations.push(`Step ${step.stepId} contains undefined or invalid operation`);
          securityCheckPassed = false;
          stopConditions.push({
            trigger: 'FORBIDDEN_OPERATION',
            reason: `Step ${step.stepId} lacks a valid typed operation`,
          });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 2: RBAC / Authorization (Precedence 2)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_2_RBAC_AUTHORIZATION');
    if (params.userRoles) {
      const ops = (params.plan?.steps || []).map((s) => s.operation).filter(Boolean);
      const authResult = OperationPermissions.authorizeOperations(ops, params.userRoles);
      if (!authResult.authorized) {
        rbacCheckPassed = false;
        for (const unauth of authResult.unauthorizedOperations) {
          deniedActions.push({
            target: unauth.opId,
            reason: `User roles lack required permission: ${unauth.requiredPermission}`,
            rule: 'RBAC_PERMISSION_DENIED',
          });
        }
        policyViolations.push('User roles lack required permissions for one or more operations');
        stopConditions.push({
          trigger: 'RBAC_DENIAL',
          reason: `Unauthorized operations: ${authResult.unauthorizedOperations.map((o) => o.requiredPermission).join(', ')}`,
        });
        effectiveLevel = 0;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 3: System Safety Policy & Risk Gating (Precedence 3)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_3_SYSTEM_SAFETY_RISK');
    const riskLevels: Record<AIRisk, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    let highestStepRisk: AIRisk = 'low';

    for (const step of params.plan?.steps || []) {
      const sRisk = step.riskLevel || step.operation?.risk || 'low';
      if (riskLevels[sRisk] > riskLevels[highestStepRisk]) {
        highestStepRisk = sRisk;
      }
    }

    const overallRisk: AIRisk =
      params.goal?.riskAssessment && riskLevels[params.goal.riskAssessment] > riskLevels[highestStepRisk]
        ? params.goal.riskAssessment
        : highestStepRisk;

    if (params.humanOverride?.action !== 'approve') {
      if (overallRisk === 'critical') {
        escalationRequirements.push('Critical risk operations require executive approval and cannot be automated.');
        approvalRequirements.push({
          risk: 'critical',
          reason: 'Critical risk operations (e.g. destructive permissions or publishing) always require approval.',
          affectedResources: ['critical_system_resources'],
          policyRule: 'CRITICAL_RISK_MANDATORY_APPROVAL',
        });
        effectiveLevel = Math.min(effectiveLevel, 2) as AutonomyLevel;
      } else if (overallRisk === 'high') {
        approvalRequirements.push({
          risk: 'high',
          reason: 'High-risk mutations require approval before execution.',
          affectedResources: ['high_risk_resources'],
          policyRule: 'HIGH_RISK_APPROVAL_REQUIRED',
        });
        effectiveLevel = Math.min(effectiveLevel, 2) as AutonomyLevel;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 4: Environment Restrictions (Precedence 4)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_4_ENVIRONMENT_RESTRICTIONS');
    if (environment === 'production') {
      environmentRule = 'ENV_PRODUCTION_LOCK';
      if (overallRisk !== 'low') {
        approvalRequirements.push({
          risk: overallRisk,
          reason: `Production environment lock: Operations with ${overallRisk} risk require explicit confirmation.`,
          affectedResources: ['production_environment'],
          policyRule: 'ENV_PROD_LOCK',
        });
        effectiveLevel = Math.min(effectiveLevel, 2) as AutonomyLevel;
      }
    } else if (environment === 'staging') {
      environmentRule = 'ENV_STAGING_LOCK';
      if (overallRisk === 'high' || overallRisk === 'critical') {
        approvalRequirements.push({
          risk: overallRisk,
          reason: `Staging environment lock: ${overallRisk} risk operations require sign-off.`,
          affectedResources: ['staging_environment'],
          policyRule: 'ENV_STAGING_LOCK',
        });
        effectiveLevel = Math.min(effectiveLevel, 2) as AutonomyLevel;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 5: Project Policy (Precedence 5)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_5_PROJECT_POLICY');
    if (params.projectPolicy) {
      if (params.projectPolicy.readOnly) {
        effectiveLevel = 0;
        constraints.push('Project policy is set to read-only.');
        deniedActions.push({
          target: 'project_mutation',
          reason: 'Project policy enforces read-only mode.',
          rule: 'PROJECT_READ_ONLY',
        });
        stopConditions.push({
          trigger: 'PROJECT_READ_ONLY',
          reason: 'Project policy enforces read-only mode.',
        });
      }

      if (params.projectPolicy.maxLevelAllowed !== undefined) {
        const pMax = this.normalizeLevel(params.projectPolicy.maxLevelAllowed);
        if (effectiveLevel > pMax) {
          effectiveLevel = pMax;
          constraints.push(`Project policy capped autonomy to Level ${pMax}`);
        }
      }

      if (params.projectPolicy.disallowedOperations?.length && params.plan?.steps) {
        for (const step of params.plan.steps) {
          if (params.projectPolicy.disallowedOperations.includes(step.operation?.type)) {
            deniedActions.push({
              target: step.stepId,
              reason: `Operation type '${step.operation?.type}' is explicitly disallowed by project policy`,
              rule: 'PROJECT_DISALLOWED_OPERATION',
            });
            stopConditions.push({
              trigger: 'PROJECT_DISALLOWED_OPERATION',
              reason: `Disallowed operation '${step.operation?.type}' in step ${step.stepId}`,
            });
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 6: Plan & DAG Validation (Precedence 6)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_6_PLAN_DAG_VALIDATION');
    if (params.plan) {
      const planValidation = PlanValidationEngine.validatePlan(params.plan);
      if (!planValidation.valid) {
        planValidationRule = 'PLAN_VALIDATION_FAILED';
        policyViolations.push(...planValidation.errors);
        stopConditions.push({
          trigger: 'INVALID_PLAN',
          reason: `Plan structural validation failed: ${planValidation.errors.join('; ')}`,
        });
        effectiveLevel = 0;
      }

      if (planValidation.hasCyclicDependencies) {
        stopConditions.push({
          trigger: 'CYCLIC_DEPENDENCY',
          reason: 'Circular dependency cycle detected in plan steps.',
        });
        effectiveLevel = 0;
      }

      if (planValidation.missingDependencies && planValidation.missingDependencies.length > 0) {
        stopConditions.push({
          trigger: 'UNRESOLVED_DEPENDENCIES',
          reason: `Unresolved dependency references: ${planValidation.missingDependencies.join(', ')}`,
        });
        effectiveLevel = 0;
      }

      // Acceptance criteria check
      if (params.plan.acceptanceCoverage) {
        const uncovered = params.plan.acceptanceCoverage.filter((c) => c.coverageStatus === 'not_covered');
        if (uncovered.length > 0) {
          constraints.push(
            `Incomplete acceptance criteria coverage: ${uncovered.map((u) => u.criterionId).join(', ')}`
          );
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 7: Confidence & Ambiguity Gating (Precedence 7)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_7_CONFIDENCE_AMBIGUITY');
    // 7.1 Ambiguity Gating
    const criticalAmbiguities = (params.goal?.ambiguityDetails || []).filter((a) =>
      ['unspecified_scope', 'conflicting_requirement', 'unspecified_target'].includes(a.category)
    );

    if (criticalAmbiguities.length > 0) {
      ambiguityRule = 'CRITICAL_AMBIGUITY_HALT';
      const reasons = criticalAmbiguities.map((a) => a.description).join('; ');
      stopConditions.push({
        trigger: 'CRITICAL_AMBIGUITY',
        reason: `Critical requirement ambiguities require user clarification: ${reasons}`,
      });
      effectiveLevel = Math.min(effectiveLevel, 1) as AutonomyLevel;
    }

    // 7.2 Confidence Gating
    const planConfidence = params.plan?.confidenceScore ?? params.goal?.confidenceScore ?? 1.0;
    let confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

    if (planConfidence < 0.5) {
      confidenceTier = 'LOW';
      confidenceRule = 'LOW_CONFIDENCE_GATE';
      constraints.push('Low confidence score (< 0.5) gates execution to manual/assisted.');
      effectiveLevel = Math.min(effectiveLevel, 1) as AutonomyLevel;
    } else if (planConfidence < 0.75) {
      confidenceTier = 'MEDIUM';
      confidenceRule = 'MEDIUM_CONFIDENCE_GATE';
      constraints.push('Medium confidence score (< 0.75) caps execution to conditional autonomy.');
      effectiveLevel = Math.min(effectiveLevel, 3) as AutonomyLevel;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 8: Context Validity & Freshness (Precedence 8)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_8_CONTEXT_VALIDITY');
    if (params.context) {
      // Check token budget ceiling
      if (params.context.totalTokens > ceilings.maxTokenBudget) {
        constraints.push(
          `Context total tokens (${params.context.totalTokens}) exceeds budget ceiling (${ceilings.maxTokenBudget})`
        );
      }

      // Check context item freshness (> 24 hours)
      const nowMs = Date.now();
      const staleItems = params.context.items.filter((item) => {
        if (!item.freshnessTimestamp) return false;
        const itemMs = new Date(item.freshnessTimestamp).getTime();
        return nowMs - itemMs > 24 * 60 * 60 * 1000;
      });

      if (staleItems.length > 0) {
        constraints.push(`Context contains ${staleItems.length} stale items older than 24h.`);
        effectiveLevel = Math.min(effectiveLevel, 2) as AutonomyLevel;
      }

      // Check duplicate entity warnings
      if (params.context.duplicateEntityWarnings && params.context.duplicateEntityWarnings.length > 0) {
        constraints.push(
          `Duplicate entity warnings present: ${params.context.duplicateEntityWarnings.join('; ')}`
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 9: Ceilings & Limit Enforcement (Precedence 9)
    // ─────────────────────────────────────────────────────────────────────────────
    evaluatedRules.push('RULE_9_CEILINGS_LIMITS');
    const stepCount = params.plan?.steps?.length || 0;
    if (stepCount > ceilings.maxOperationsPerTask) {
      stopConditions.push({
        trigger: 'OPERATION_LIMIT_EXCEEDED',
        reason: `Plan step count (${stepCount}) exceeds ceiling of ${ceilings.maxOperationsPerTask}`,
      });
    }

    // Unique affected entities
    const affectedEntities = new Set<string>();
    let workflowChangeCount = 0;
    let dataChangeCount = 0;

    for (const step of params.plan?.steps || []) {
      if (step.expectedResult?.entityId) {
        affectedEntities.add(step.expectedResult.entityId);
      }
      if (step.operation?.type === 'create_workflow' || step.operation?.type === 'add_workflow_action') {
        workflowChangeCount++;
      }
      if (
        step.operation?.type === 'create_collection' ||
        step.operation?.type === 'add_field' ||
        step.operation?.type === 'create_relationship'
      ) {
        dataChangeCount++;
      }
    }

    if (affectedEntities.size > ceilings.maxAffectedEntities) {
      stopConditions.push({
        trigger: 'AFFECTED_ENTITIES_CEILING_EXCEEDED',
        reason: `Affected entity count (${affectedEntities.size}) exceeds ceiling of ${ceilings.maxAffectedEntities}`,
      });
    }

    if (workflowChangeCount > ceilings.maxWorkflowChanges) {
      constraints.push(`Workflow changes count (${workflowChangeCount}) exceeds ceiling.`);
      effectiveLevel = Math.min(effectiveLevel, 2) as AutonomyLevel;
    }

    if (dataChangeCount > ceilings.maxDataChanges) {
      constraints.push(`Data schema changes count (${dataChangeCount}) exceeds ceiling.`);
      effectiveLevel = Math.min(effectiveLevel, 2) as AutonomyLevel;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 10: Human Controls & Directives (Precedence 10)
    // ─────────────────────────────────────────────────────────────────────────────
    let humanDirectiveApplied: string | undefined;
    if (params.humanOverride) {
      evaluatedRules.push('RULE_10_HUMAN_DIRECTIVE');
      const action = params.humanOverride.action;
      humanDirectiveApplied = `HUMAN_${action.toUpperCase()}`;

      if (action === 'stop') {
        effectiveLevel = 0;
        stopConditions.push({
          trigger: 'HUMAN_STOP',
          reason: params.humanOverride.reason || 'Operator issued emergency stop directive',
        });
      } else if (action === 'cancel') {
        effectiveLevel = 0;
        stopConditions.push({
          trigger: 'HUMAN_CANCEL',
          reason: params.humanOverride.reason || 'Operator cancelled task execution',
        });
      } else if (action === 'pause') {
        stopConditions.push({
          trigger: 'HUMAN_PAUSE',
          reason: params.humanOverride.reason || 'Operator paused execution',
        });
      } else if (action === 'reject') {
        effectiveLevel = 0;
        stopConditions.push({
          trigger: 'HUMAN_REJECT',
          reason: params.humanOverride.reason || 'Operator rejected execution proposal',
        });
      } else if (action === 'downgrade') {
        if (params.humanOverride.targetLevel !== undefined) {
          const targetNorm = this.normalizeLevel(params.humanOverride.targetLevel);
          effectiveLevel = Math.min(effectiveLevel, targetNorm) as AutonomyLevel;
          constraints.push(`Operator explicitly downgraded autonomy level to ${effectiveLevel}`);
        }
      } else if (action === 'upgrade') {
        if (params.humanOverride.targetLevel !== undefined) {
          const targetNorm = this.normalizeLevel(params.humanOverride.targetLevel);
          // Only upgrade if security and RBAC checks pass
          if (securityCheckPassed && rbacCheckPassed) {
            effectiveLevel = targetNorm;
            constraints.push(`Operator explicitly upgraded autonomy level to ${effectiveLevel}`);
          }
        }
      } else if (action === 'approve') {
        // Operator approved pending execution
        constraints.push('Operator granted explicit approval for pending operations');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 11: Granular Step Evaluation & Allowed Actions
    // ─────────────────────────────────────────────────────────────────────────────
    for (const step of params.plan?.steps || []) {
      if (!step.operation) continue;
      const stepRisk = step.riskLevel || step.operation?.risk || 'low';
      const appCheck = this.requiresApproval(effectiveLevel, stepRisk, environment);

      // If human override approved this step specifically
      const isExplicitlyApproved =
        params.humanOverride?.action === 'approve' &&
        (!params.humanOverride.approvedStepIds || params.humanOverride.approvedStepIds.includes(step.stepId));

      if (appCheck.required && !isExplicitlyApproved) {
        approvalRequirements.push({
          stepId: step.stepId,
          opId: step.operation?.id,
          operationType: step.operation?.type,
          risk: stepRisk,
          reason: appCheck.reason,
          affectedResources: [step.expectedResult?.entityId || step.stepId],
          policyRule: 'STEP_RISK_APPROVAL_POLICY',
        });
      } else {
        allowedActions.push(step.stepId);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 12: Final Decision Synthesis & Rationale
    // ─────────────────────────────────────────────────────────────────────────────
    let decision: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'ESCALATE' | 'STOP';
    let rationale = '';

    const nonRbacStop = stopConditions.find((s) => s.trigger !== 'RBAC_DENIAL');
    if (nonRbacStop) {
      decision = 'STOP';
      rationale = `Execution halted by stop condition: ${nonRbacStop.reason}`;
    } else if (!securityCheckPassed || !rbacCheckPassed || deniedActions.length > 0) {
      decision = 'DENY';
      rationale = `Execution denied due to authorization/RBAC denial: ${deniedActions.map((d) => d.reason).join('; ')}`;
    } else if (stopConditions.length > 0) {
      decision = 'STOP';
      rationale = `Execution halted by stop condition: ${stopConditions[0].reason}`;
    } else if (approvalRequirements.length > 0) {
      decision = 'REQUIRE_APPROVAL';
      rationale = `Human approval required: ${approvalRequirements[0].reason}`;
    } else if (effectiveLevel >= 3) {
      decision = 'ALLOW';
      rationale = `Autonomous execution allowed under Level ${effectiveLevel} (${this.getPolicy(effectiveLevel).name}).`;
    } else {
      decision = 'REQUIRE_APPROVAL';
      rationale = `Autonomy level ${effectiveLevel} requires human sign-off before mutation.`;
    }

    const provenance: PolicyDecisionProvenance = {
      evaluatedRules,
      securityCheckPassed,
      rbacCheckPassed,
      environmentRule,
      planValidationRule,
      confidenceRule,
      ambiguityRule,
      humanDirectiveApplied,
      evaluatorTimestamp: timestamp,
    };

    return {
      requestedAutonomyLevel: requestedLevel,
      effectiveAutonomyLevel: effectiveLevel,
      semanticLevel: this.toSemanticLevel(effectiveLevel),
      decision,
      approvalRequired: decision === 'REQUIRE_APPROVAL',
      approvalRequirements,
      allowedActions,
      deniedActions,
      riskLevel: overallRisk,
      policyViolations,
      constraints,
      ceilings,
      escalationRequirements,
      stopConditions,
      confidence: planConfidence,
      confidenceTier,
      rationale,
      provenance,
      timestamp,
      policyVersion,
    };
  }
}
