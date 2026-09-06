// D8.1: Goal Understanding Engine
// Transforms raw natural-language development objectives into structured, verifiable GoalRepresentations.
// Governed by the OBSERVE -> PLAN -> VERIFY -> ACT -> MEASURE -> ADAPT cycle.
// This engine produces intermediate structured representations without mutating project state.

import {
  GoalRepresentation,
  GoalType,
  GoalIntent,
  AmbiguityDetail,
  AcceptanceCriterion,
  GoalProvenance,
  ConfidenceAssessment,
} from './types';
import { AIRisk } from '../../builder/schema/ai';
import { AppProject } from '../../builder/schema/project';
import { PromptInjectionDefense } from '../security/PromptInjectionDefense';
import { AISecretFilter } from '../security/AISecretFilter';

export class GoalUnderstandingEngine {
  public static readonly VERSION = '1.0.0';

  /**
   * Understands, sanitizes, normalizes, and structures a user's development objective.
   * Pure inspection: NEVER mutates project state or executes operations.
   */
  public static parseGoal(prompt: string, project?: AppProject): GoalRepresentation {
    const rawInput = prompt || '';
    const transformations: string[] = [];

    // 1. Security & Secret Redaction
    const redactedPrompt = AISecretFilter.redactText(rawInput);
    const secretsRedacted = redactedPrompt !== rawInput;
    if (secretsRedacted) {
      transformations.push('secret_redaction');
    }

    // 2. Prompt Injection Defense
    const injectionCheck = PromptInjectionDefense.sanitizeInstruction(redactedPrompt);
    const sanitizedPrompt = injectionCheck.sanitized;
    if (!injectionCheck.safe) {
      transformations.push('prompt_injection_sanitization');
    }

    transformations.push('clause_tokenization', 'entity_extraction', 'intent_normalization');

    const trimmed = sanitizedPrompt.trim();
    const lower = trimmed.toLowerCase();

    // 3. Handle Empty / Invalid Prompts
    if (trimmed.length === 0) {
      return this.buildEmptyGoal(rawInput, transformations);
    }

    // 4. Intent & GoalType Classification
    const intent = this.classifyIntent(lower);
    const goalType = this.classifyGoalType(lower, intent);

    // 5. Target Entity Extraction & Affected Areas
    const targetEntities = this.extractEntities(lower);
    const affectedAreas = this.identifyAffectedAreas(lower, targetEntities, goalType);

    // 6. Ambiguity Analysis (First-Class Result)
    const ambiguityDetails = this.analyzeAmbiguities(trimmed, lower, targetEntities, intent);
    const ambiguities = ambiguityDetails.map((a) => a.description);

    // 7. Requirements (Explicit vs Inferred)
    const explicitRequirements = this.extractExplicitRequirements(trimmed);
    const inferredRequirements = this.inferRequirements(goalType, intent, targetEntities, project);

    // 8. Constraints Extraction (System + User Stated)
    const constraints = this.extractConstraints(lower, project);

    // 9. Assumptions Generation
    const assumptions = this.generateAssumptions(goalType, targetEntities, intent);

    // 10. Unknowns Identification
    const unknowns = this.identifyUnknowns(lower, goalType, targetEntities);

    // 11. Acceptance Criteria Derivation
    const acceptanceCriteria = this.deriveAcceptanceCriteria(
      goalType,
      intent,
      targetEntities,
      explicitRequirements,
      inferredRequirements
    );

    // 12. Risk Assessment
    const riskAssessment = this.assessRisk(lower, goalType, intent, injectionCheck.safe);

    // 13. Confidence Assessment
    const confidence = this.calculateConfidence(
      trimmed,
      ambiguityDetails,
      unknowns,
      targetEntities,
      injectionCheck.safe
    );

    // 14. Normalized Goal & Requested Outcome
    const normalizedGoal = this.synthesizeNormalizedGoal(intent, targetEntities, goalType, trimmed);
    const requestedOutcome = this.synthesizeRequestedOutcome(intent, targetEntities, affectedAreas);

    const provenance: GoalProvenance = {
      source: 'user_prompt',
      derivationMethod: 'heuristic_nlp_goal_parser_v1',
      transformations,
      sanitized: !injectionCheck.safe,
      secretsRedacted,
    };

    return {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      version: this.VERSION,
      goalType,
      intent,
      rawPrompt: redactedPrompt,
      normalizedGoal,
      intentSummary: `Intent [${intent.toUpperCase()}] targeting [${targetEntities.join(', ') || 'general layout'}]`,
      requestedOutcome,
      targetEntities,
      affectedAreas,
      explicitRequirements,
      inferredRequirements,
      assumptions,
      unknowns,
      constraints,
      ambiguities,
      ambiguityDetails,
      acceptanceCriteria,
      riskAssessment,
      confidenceScore: confidence.score,
      confidence,
      provenance,
      securityAssessment: {
        safe: injectionCheck.safe,
        flaggedReason: injectionCheck.flaggedReason,
        secretsRedactedCount: secretsRedacted ? 1 : 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INTENT & GOAL TYPE CLASSIFICATION
  // ─────────────────────────────────────────────────────────────────────────────

  public static classifyIntent(lower: string): GoalIntent {
    if (lower.includes('refactor') || lower.includes('restructure') || lower.includes('reorganize') || lower.includes('modularize')) {
      return 'refactor';
    }
    if (lower.includes('fix') || lower.includes('broken') || lower.includes('bug') || lower.includes('crash') || lower.includes('resolv')) {
      return 'fix';
    }
    if (lower.includes('debug') || lower.includes('why is') || lower.includes('troubleshoot') || lower.includes('trace') || lower.includes('diagnos')) {
      return 'debug';
    }
    if (lower.includes('optimize') || lower.includes('performance') || lower.includes('speed') || lower.includes('latency') || lower.includes('faster')) {
      return 'optimize';
    }
    if (lower.includes('delete') || lower.includes('remove') || lower.includes('drop') || lower.includes('truncate') || lower.includes('clear')) {
      return 'remove';
    }
    if (lower.includes('test') || lower.includes('assert') || lower.includes('verify') || lower.includes('spec')) {
      return 'test';
    }
    if (lower.includes('explain') || lower.includes('how does') || lower.includes('what is') || lower.includes('describe')) {
      return 'explain';
    }
    if (lower.includes('inspect') || lower.includes('list') || lower.includes('show') || lower.includes('view') || lower.includes('find')) {
      return 'inspect';
    }
    if (lower.includes('configure') || lower.includes('setting') || lower.includes('toggle') || lower.includes('enable') || lower.includes('disable')) {
      return 'configure';
    }
    if (lower.includes('migrate') || lower.includes('upgrade') || lower.includes('schema v')) {
      return 'migrate';
    }
    if (
      lower.includes('update') ||
      lower.includes('change') ||
      lower.includes('modify') ||
      lower.includes('edit') ||
      lower.includes('resize') ||
      lower.includes('style') ||
      lower.includes('make this')
    ) {
      return 'modify';
    }
    return 'create';
  }

  public static classifyGoalType(lower: string, intent: GoalIntent): GoalType {
    if (intent === 'refactor') return 'REFACTOR';
    if (intent === 'fix') return 'FIX_BUG';
    if (intent === 'debug') return 'DEBUG_ERROR';
    if (intent === 'explain') return 'EXPLAIN';
    if (intent === 'inspect') return 'INSPECT';
    if (intent === 'configure') return 'CONFIGURE';
    if (intent === 'migrate') return 'MIGRATE';
    if (intent === 'remove') return 'REMOVE';

    if (lower.includes('security') || lower.includes('audit') || lower.includes('permission') || lower.includes('rbac')) {
      return 'SECURITY_AUDIT';
    }
    if (intent === 'optimize') {
      return 'OPTIMIZE_PERFORMANCE';
    }
    if (
      lower.includes('theme') ||
      lower.includes('color') ||
      lower.includes('background') ||
      lower.includes('font') ||
      lower.includes('style') ||
      lower.includes('mobile') ||
      lower.includes('responsive') ||
      lower.includes('dark mode') ||
      lower.includes('blue') ||
      lower.includes('red')
    ) {
      return 'REFINE_UI';
    }
    if (
      lower.includes('build') &&
      (lower.includes('app') ||
        lower.includes('platform') ||
        lower.includes('crm') ||
        lower.includes('restaurant') ||
        lower.includes('system') ||
        lower.includes('dashboard') ||
        lower.includes('portal'))
    ) {
      return 'BUILD_APPLICATION';
    }
    return 'CREATE_FEATURE';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ENTITIES & AFFECTED AREAS
  // ─────────────────────────────────────────────────────────────────────────────

  private static extractEntities(lower: string): string[] {
    const entities = new Set<string>();
    const vocabulary = [
      'dashboard', 'table', 'menu', 'pricing', 'form', 'chart', 'kpi', 'button',
      'navbar', 'sidebar', 'orders', 'users', 'customers', 'products', 'product',
      'suppliers', 'supplier', 'inventory', 'deals', 'checkout', 'booking', 'footer',
      'hero', 'modal', 'card', 'header', 'logo', 'link', 'links', 'item', 'items',
      'collection', 'workflow', 'variable', 'theme', 'palette', 'page', 'dropdown'
    ];

    for (const term of vocabulary) {
      if (lower.includes(term)) {
        entities.add(term);
      }
    }

    return Array.from(entities);
  }

  private static identifyAffectedAreas(
    lower: string,
    entities: string[],
    goalType: GoalType
  ): Array<'pages' | 'collections' | 'workflows' | 'components' | 'theme' | 'settings'> {
    const areas = new Set<'pages' | 'collections' | 'workflows' | 'components' | 'theme' | 'settings'>();

    if (goalType === 'BUILD_APPLICATION' || lower.includes('page') || lower.includes('route') || lower.includes('view')) {
      areas.add('pages');
    }
    if (
      entities.includes('collection') ||
      entities.includes('orders') ||
      entities.includes('products') ||
      entities.includes('deals') ||
      entities.includes('users') ||
      lower.includes('database') ||
      lower.includes('field')
    ) {
      areas.add('collections');
    }
    if (entities.includes('workflow') || entities.includes('form') || lower.includes('submit') || lower.includes('action')) {
      areas.add('workflows');
    }
    if (
      entities.includes('button') ||
      entities.includes('card') ||
      entities.includes('chart') ||
      entities.includes('kpi') ||
      entities.includes('table') ||
      entities.includes('hero') ||
      entities.includes('modal')
    ) {
      areas.add('components');
    }
    if (goalType === 'REFINE_UI' || lower.includes('theme') || lower.includes('color') || lower.includes('font') || lower.includes('dark mode')) {
      areas.add('theme');
    }
    if (goalType === 'CONFIGURE' || lower.includes('env') || lower.includes('settings')) {
      areas.add('settings');
    }

    if (areas.size === 0) {
      areas.add('components');
    }

    return Array.from(areas);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AMBIGUITY DETECTION (FIRST CLASS RESULT)
  // ─────────────────────────────────────────────────────────────────────────────

  private static analyzeAmbiguities(
    prompt: string,
    lower: string,
    entities: string[],
    intent: GoalIntent
  ): AmbiguityDetail[] {
    const ambiguities: AmbiguityDetail[] = [];

    // 1. Unspecified Scope / Vague Requests
    const vagueTerms = ['make it better', 'add some stuff', 'improve this', 'do something', 'update it'];
    for (const term of vagueTerms) {
      if (lower.includes(term)) {
        ambiguities.push({
          category: 'unspecified_scope',
          description: `Vague objective phrase "${term}" detected without concrete specifications.`,
          impact: 'Cannot reliably determine completion criteria without assuming user intent.',
          suggestedClarification: 'Please specify the exact components, styling, or functionality to improve.',
        });
      }
    }

    // 2. Conflicting Requirements
    const hasDelete = lower.includes('delete') || lower.includes('remove');
    const hasKeep = lower.includes('keep') || lower.includes('preserve') || lower.includes('remain visible');
    if (hasDelete && hasKeep) {
      for (const ent of entities) {
        if (lower.includes(`delete`) && lower.includes(ent) && lower.includes(`keep`) && lower.includes(ent)) {
          ambiguities.push({
            category: 'conflicting_requirement',
            description: `Conflicting instructions detected regarding "${ent}": request indicates both deletion and preservation.`,
            impact: 'Mutually exclusive operations would result in inconsistent application state.',
            suggestedClarification: `Confirm whether ${ent} should be retained or removed.`,
          });
        }
      }
      if (ambiguities.length === 0 && (lower.includes('delete') || lower.includes('remove')) && lower.includes('keep')) {
        ambiguities.push({
          category: 'conflicting_requirement',
          description: 'Prompt contains conflicting directives to both delete and preserve entities.',
          impact: 'Risk of unintended mutation or deletion of desired assets.',
          suggestedClarification: 'Clarify which specific items should be deleted and which should remain.',
        });
      }
    }

    // 3. Unspecified Target
    if (
      (intent === 'modify' || intent === 'remove') &&
      entities.length === 0 &&
      !lower.includes('page') &&
      !lower.includes('theme')
    ) {
      ambiguities.push({
        category: 'unspecified_target',
        description: 'Operation requested without identifying the target component, page, or entity.',
        impact: 'Action cannot be safely mapped to a specific node in the application tree.',
        suggestedClarification: 'Select a component on the canvas or state the exact name of the element to modify.',
      });
    }

    // 4. Missing Requirement / Unspecified Behavior
    if (entities.includes('table') && !lower.includes('column') && !lower.includes('field') && !lower.includes('data')) {
      ambiguities.push({
        category: 'missing_requirement',
        description: 'Table component requested but specific schema columns and fields are unspecified.',
        impact: 'Will require falling back on generic placeholder schemas.',
        suggestedClarification: 'Provide the list of columns or data fields to display in the table.',
      });
    }

    return ambiguities;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REQUIREMENTS & CONSTRAINTS EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────────

  private static extractExplicitRequirements(prompt: string): string[] {
    const clauses = prompt
      .split(/[\n,;]+|\band\b/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    if (clauses.length > 0) {
      return clauses.map((c) => `Explicit request: "${c}"`);
    }
    return [`Explicit request: "${prompt}"`];
  }

  private static inferRequirements(
    goalType: GoalType,
    intent: GoalIntent,
    entities: string[],
    project?: AppProject
  ): string[] {
    const inferred: string[] = [];

    if (goalType === 'BUILD_APPLICATION') {
      inferred.push('Create foundational page hierarchy with root container and responsive layout');
      inferred.push('Ensure navigation header/navbar links all generated views');
    }

    if (entities.includes('orders') || entities.includes('products') || entities.includes('deals')) {
      inferred.push('Provision structured database collection with appropriate field schemas and primary keys');
    }

    if (entities.includes('form') || entities.includes('checkout') || entities.includes('booking')) {
      inferred.push('Bind form submission button to mutation workflow action');
    }

    if (intent === 'refactor') {
      inferred.push('Preserve existing data bindings, props, and visual behavior during structural refactoring');
    }

    if (intent === 'fix') {
      inferred.push('Validate null/undefined edge cases in component state handler');
    }

    if (project && project.pages.length === 1) {
      inferred.push('Preserve existing home page while adding new views');
    }

    return inferred;
  }

  private static extractConstraints(lower: string, project?: AppProject): string[] {
    const constraints = [
      'Schema version 7 compatibility enforced',
      'Hard stop: Zero eval(), new Function(), or arbitrary dynamic code execution allowed',
      'Transactional atomic rollback guaranteed on failure',
    ];

    // Explicit user stated constraints
    if (lower.includes('read-only') || lower.includes('read only')) {
      constraints.push('User constraint: Data access must remain strictly read-only without write mutations');
    }
    if (lower.includes('max') || lower.includes('limit')) {
      const match = lower.match(/(max|maximum|limit)\s*(\d+)/);
      if (match) {
        constraints.push(`User constraint: Enforce ceiling of ${match[2]} items`);
      }
    }
    if (lower.includes('local data') || lower.includes('local storage') || lower.includes('offline')) {
      constraints.push('User constraint: Use local in-memory data collection without external network API calls');
    }

    if (project?.environments?.activeEnvironment === 'production') {
      constraints.push('Production environment lock: All destructive operations require human approval');
    }

    return constraints;
  }

  private static generateAssumptions(goalType: GoalType, entities: string[], intent: GoalIntent): string[] {
    const assumptions = [
      'Strict adherence to COMPONENT_REGISTRY types without arbitrary JSX injection',
      'Changes are applied immutably through two-phase AITransactionManager',
    ];

    if (entities.includes('pricing')) {
      assumptions.push('Default 3-tier pricing structure (Starter, Professional, Enterprise)');
    }

    if (goalType === 'REFINE_UI' || intent === 'modify') {
      assumptions.push('Preserve existing component hierarchy and modify only target layout/style props');
    }

    return assumptions;
  }

  private static identifyUnknowns(lower: string, goalType: GoalType, entities: string[]): string[] {
    const unknowns: string[] = [];

    if (goalType === 'BUILD_APPLICATION' && !lower.includes('auth')) {
      unknowns.push('Authentication provider and user session requirements unspecified');
    }

    if (entities.includes('checkout') && !lower.includes('stripe') && !lower.includes('payment')) {
      unknowns.push('Payment processor gateway credentials unspecified (defaulting to simulated mock checkout)');
    }

    return unknowns;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACCEPTANCE CRITERIA
  // ─────────────────────────────────────────────────────────────────────────────

  private static deriveAcceptanceCriteria(
    goalType: GoalType,
    intent: GoalIntent,
    entities: string[],
    explicitReqs: string[],
    inferredReqs: string[]
  ): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];
    let counter = 1;

    // Derived from explicit entities
    for (const ent of entities) {
      criteria.push({
        id: `ac_${counter++}`,
        description: `Verify presence and operational state of ${ent}`,
        observableTarget: ent,
        expectedState: intent === 'remove' ? 'absent' : 'present_and_configured',
        testable: true,
        provenance: 'explicit',
      });
    }

    // Derived from intent
    if (goalType === 'BUILD_APPLICATION') {
      criteria.push({
        id: `ac_${counter++}`,
        description: 'Verify page route exists and responds without render crashes',
        observableTarget: 'pages.route',
        expectedState: 'route_resolves',
        testable: true,
        provenance: 'inferred',
      });
    }

    if (intent === 'fix') {
      criteria.push({
        id: `ac_${counter++}`,
        description: 'Target component handles edge cases without throwing runtime exceptions',
        observableTarget: 'component.errorBoundary',
        expectedState: 'zero_runtime_errors',
        testable: true,
        provenance: 'explicit',
      });
    }

    if (criteria.length === 0) {
      criteria.push({
        id: `ac_${counter++}`,
        description: 'Verify project schema passes Schema v7 structural validation',
        observableTarget: 'project.version',
        expectedState: 'v7_valid',
        testable: true,
        provenance: 'inferred',
      });
    }

    return criteria;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RISK & CONFIDENCE
  // ─────────────────────────────────────────────────────────────────────────────

  private static assessRisk(lower: string, goalType: GoalType, intent: GoalIntent, isSafe: boolean): AIRisk {
    if (!isSafe) return 'critical';

    if (
      intent === 'remove' ||
      lower.includes('delete') ||
      lower.includes('drop') ||
      lower.includes('truncate') ||
      lower.includes('destroy')
    ) {
      return 'high';
    }

    if (
      goalType === 'BUILD_APPLICATION' ||
      lower.includes('collection') ||
      lower.includes('workflow') ||
      lower.includes('database')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private static calculateConfidence(
    prompt: string,
    ambiguities: AmbiguityDetail[],
    unknowns: string[],
    entities: string[],
    isSafe: boolean
  ): ConfidenceAssessment {
    if (!isSafe) {
      return {
        score: 0.1,
        level: 'LOW',
        rationale: 'Confidence severely degraded due to flagged prompt injection signature.',
      };
    }

    let score = 0.95;

    // Deduct for ambiguities
    score -= ambiguities.length * 0.2;

    // Deduct for conflicting requirements
    if (ambiguities.some((a) => a.category === 'conflicting_requirement')) {
      score -= 0.3;
    }

    // Deduct for unspecified scope (vague objectives like "make it better")
    if (ambiguities.some((a) => a.category === 'unspecified_scope')) {
      score -= 0.45;
    }

    // Deduct for unspecified target in modification
    if (ambiguities.some((a) => a.category === 'unspecified_target')) {
      score -= 0.25;
    }

    // Deduct for unknowns
    score -= unknowns.length * 0.05;

    // Reward specificity
    if (entities.length >= 3) {
      score += 0.05;
    }

    const bounded = Math.max(0.1, Math.min(1.0, Math.round(score * 100) / 100));
    let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    let rationale = 'High confidence: Clear intent, identified target entities, and zero major ambiguities.';

    if (bounded < 0.6) {
      level = 'LOW';
      rationale = `Low confidence (${bounded}): Significant ambiguities or missing specifications detected.`;
    } else if (bounded < 0.85) {
      level = 'MEDIUM';
      rationale = `Medium confidence (${bounded}): Minor unknowns present; standard defaults will be inferred.`;
    }

    return {
      score: bounded,
      level,
      rationale,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NORMALIZATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private static synthesizeNormalizedGoal(
    intent: GoalIntent,
    entities: string[],
    goalType: GoalType,
    rawPrompt: string
  ): string {
    const target = entities.length > 0 ? entities.join(', ') : 'target elements';
    switch (intent) {
      case 'create':
        return `Create and provision ${target} per specification`;
      case 'modify':
        return `Modify properties and layout of ${target}`;
      case 'refactor':
        return `Refactor structure of ${target} maintaining interface contracts`;
      case 'fix':
        return `Fix runtime defect in ${target}`;
      case 'debug':
        return `Diagnose error in ${target}`;
      case 'remove':
        return `Safely remove ${target} from application`;
      case 'optimize':
        return `Optimize performance and responsiveness of ${target}`;
      default:
        return `Execute ${intent} operation targeting ${target}`;
    }
  }

  private static synthesizeRequestedOutcome(
    intent: GoalIntent,
    entities: string[],
    affectedAreas: string[]
  ): string {
    return `Verified ${intent} outcome affecting [${affectedAreas.join(', ')}] with updated Schema v7 representation.`;
  }

  private static buildEmptyGoal(rawPrompt: string, transformations: string[]): GoalRepresentation {
    return {
      id: `goal_${Date.now()}_empty`,
      version: this.VERSION,
      goalType: 'INSPECT',
      intent: 'inspect',
      rawPrompt,
      normalizedGoal: 'Empty or invalid prompt received',
      intentSummary: 'No actionable goal specified',
      requestedOutcome: 'No mutation requested',
      targetEntities: [],
      affectedAreas: [],
      explicitRequirements: [],
      inferredRequirements: [],
      assumptions: [],
      unknowns: ['Prompt was empty or whitespace only'],
      constraints: ['Schema version 7 compatibility enforced'],
      ambiguities: ['Prompt is empty; cannot infer intent or target'],
      ambiguityDetails: [
        {
          category: 'insufficient_context',
          description: 'Input prompt contains no characters or instructions.',
          impact: 'No development operations can be synthesized.',
          suggestedClarification: 'Please enter a description of what you want to build or change.',
        },
      ],
      acceptanceCriteria: [],
      riskAssessment: 'low',
      confidenceScore: 0.0,
      confidence: {
        score: 0.0,
        level: 'LOW',
        rationale: 'Zero confidence: No instructions provided.',
      },
      provenance: {
        source: 'user_prompt',
        derivationMethod: 'empty_fallback',
        transformations,
        sanitized: false,
        secretsRedacted: false,
      },
      securityAssessment: {
        safe: true,
        secretsRedactedCount: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
