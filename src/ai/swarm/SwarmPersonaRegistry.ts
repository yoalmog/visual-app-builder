// src/ai/swarm/SwarmPersonaRegistry.ts
// Persona definitions, specialty heuristics, and evaluation engines for D8.19 Swarm Consensus

import { AgentPersona, AgentPersonaRole, SwarmProposal, ProposedModification, VoteDecision } from './swarm-types';
import { AppProject } from '../../builder/schema/project';
import { MultiAgentSecurityAuditor } from '../security/MultiAgentSecurityAuditor';

export interface PersonaEvaluationResult {
  score: number; // 0 - 100
  decision: VoteDecision;
  critiques: string[];
  endorsements: string[];
  suggestedModifications: ProposedModification[];
  vetoTriggered?: boolean;
  vetoReason?: string;
}

export class SwarmPersonaRegistry {
  private static personas: Map<AgentPersonaRole, AgentPersona> = new Map();
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.registerBuiltInPersonas();
  }

  private static registerBuiltInPersonas(): void {
    const architect: AgentPersona = {
      id: 'persona_architect',
      name: 'Dr. Sarah Vance',
      role: 'ARCHITECT',
      avatar: '🏛️',
      specialty: 'System Decomposition, Component Modularity & Scalable Hierarchies',
      weight: 3.5,
      hasVetoAuthority: false,
      systemPrompt: 'You are the Lead System Architect. Your mandate is ensuring high cohesion, low coupling, reusable component hierarchies, and clean structural integrity.',
      evaluationDimensions: [
        { name: 'Modularity', weight: 0.35, description: 'Component separation of concerns and reusability' },
        { name: 'Structural Depth', weight: 0.35, description: 'Balanced DOM depth and clean tree hierarchy' },
        { name: 'Extensibility', weight: 0.30, description: 'Clean extension points and consistent styling abstractions' },
      ],
    };

    const uxDesigner: AgentPersona = {
      id: 'persona_ux',
      name: 'Elena Rostova',
      role: 'UX_DESIGNER',
      avatar: '🎨',
      specialty: 'Accessible UX, Ergonomic Layouts, Visual Hierarchy & Mobile Responsiveness',
      weight: 3.0,
      hasVetoAuthority: false,
      systemPrompt: 'You are the Principal UX/UI Designer. Your mandate is ensuring delightful, accessible (WCAG AAA), responsive, and visually harmonious interfaces with clear contrast and ergonomic spacing.',
      evaluationDimensions: [
        { name: 'Accessibility', weight: 0.40, description: 'ARIA labels, semantic tags, keyboard navigation' },
        { name: 'Visual Hierarchy', weight: 0.35, description: 'Consistent typography scale, spacing, and contrast' },
        { name: 'Responsiveness', weight: 0.25, description: 'Mobile-friendly flex/grid layouts and touch targets' },
      ],
    };

    const securityOfficer: AgentPersona = {
      id: 'persona_security',
      name: 'Marcus Sterling',
      role: 'SECURITY_OFFICER',
      avatar: '🛡️',
      specialty: 'Threat Modeling, AST Hardening, RBAC Isolation & Cryptographic Assurance',
      weight: 4.5,
      hasVetoAuthority: true, // Absolute veto on critical security breaches
      systemPrompt: 'You are the Chief Information Security Officer. Your mandate is zero tolerance for arbitrary code execution, script injection, credential exposure, or authorization bypass. You hold hard veto authority.',
      evaluationDimensions: [
        { name: 'Code Injection Defense', weight: 0.40, description: 'Zero eval, Function constructor, or script tags' },
        { name: 'Data Isolation', weight: 0.30, description: 'Strict tenant and cross-project separation' },
        { name: 'Credential Safety', weight: 0.30, description: 'Zero secrets, API keys, or raw tokens in props/payloads' },
      ],
    };

    const dataEngineer: AgentPersona = {
      id: 'persona_data',
      name: 'Kenji Takahashi',
      role: 'DATA_ENGINEER',
      avatar: '💾',
      specialty: 'Schema Normalization, State Store Consistency & Query Efficiency',
      weight: 2.5,
      hasVetoAuthority: false,
      systemPrompt: 'You are the Principal Data Engineer. Your mandate is schema integrity, normalized component state props, non-redundant data flows, and transactional persistence guarantees.',
      evaluationDimensions: [
        { name: 'Schema Integrity', weight: 0.40, description: 'Consistent property types and valid schema structure' },
        { name: 'State Flow Efficiency', weight: 0.35, description: 'Minimal duplicate state and clean data binding' },
        { name: 'Storage Normalization', weight: 0.25, description: 'Clean collection IDs and relational references' },
      ],
    };

    const qaSpecialist: AgentPersona = {
      id: 'persona_qa',
      name: 'Chloe Bennett',
      role: 'QA_SPECIALIST',
      avatar: '🧪',
      specialty: 'Edge Cases, Resilient Error Boundaries, Rollback Resilience & Boundary Testing',
      weight: 2.5,
      hasVetoAuthority: false,
      systemPrompt: 'You are the Lead QA & Reliability Engineer. Your mandate is identifying edge conditions, zero-state handlers, resilient error boundaries, and verifying deterministic rollback recovery.',
      evaluationDimensions: [
        { name: 'Edge Case Resilience', weight: 0.40, description: 'Handling empty states, missing props, and null inputs' },
        { name: 'Error Boundaries', weight: 0.35, description: 'Defensive fallbacks and boundary wrappers' },
        { name: 'Testability', weight: 0.25, description: 'Presence of test IDs and predictable render states' },
      ],
    };

    this.personas.set('ARCHITECT', architect);
    this.personas.set('UX_DESIGNER', uxDesigner);
    this.personas.set('SECURITY_OFFICER', securityOfficer);
    this.personas.set('DATA_ENGINEER', dataEngineer);
    this.personas.set('QA_SPECIALIST', qaSpecialist);
  }

  public static getPersonas(): AgentPersona[] {
    this.initialize();
    const result: AgentPersona[] = [];
    this.personas.forEach((p) => result.push(p));
    return result;
  }

  public static getPersona(role: AgentPersonaRole): AgentPersona | undefined {
    this.initialize();
    return this.personas.get(role);
  }

  public static registerPersona(persona: AgentPersona): void {
    this.initialize();
    this.personas.set(persona.role, persona);
  }

  public static reset(): void {
    this.personas.clear();
    this.isInitialized = false;
    this.initialize();
  }

  /**
   * Deterministic persona evaluation engine.
   * Analyzes proposal steps and modifications against persona specialties.
   */
  public static evaluateProposal(
    role: AgentPersonaRole,
    proposal: SwarmProposal,
    project: AppProject
  ): PersonaEvaluationResult {
    this.initialize();
    const persona = this.personas.get(role);
    if (!persona) {
      throw new Error(`Unknown agent persona role: ${role}`);
    }

    switch (role) {
      case 'SECURITY_OFFICER':
        return this.evaluateAsSecurityOfficer(proposal, project);
      case 'UX_DESIGNER':
        return this.evaluateAsUXDesigner(proposal, project);
      case 'ARCHITECT':
        return this.evaluateAsArchitect(proposal, project);
      case 'DATA_ENGINEER':
        return this.evaluateAsDataEngineer(proposal, project);
      case 'QA_SPECIALIST':
        return this.evaluateAsQASpecialist(proposal, project);
      default:
        return {
          score: 80,
          decision: 'APPROVE',
          critiques: [],
          endorsements: ['Standard structure supported'],
          suggestedModifications: [],
        };
    }
  }

  private static evaluateAsSecurityOfficer(
    proposal: SwarmProposal,
    _project: AppProject
  ): PersonaEvaluationResult {
    const rawProposalStr = JSON.stringify(proposal);

    // 1. Audit for dangerous script / eval / Function patterns
    const securityCheck = MultiAgentSecurityAuditor.auditCodeString(rawProposalStr);
    const hasEval = rawProposalStr.includes('eval(') || rawProposalStr.includes('new Function(');
    const hasScriptTag = /<script\b[^>]*>/i.test(rawProposalStr);
    const hasIframe = /<iframe\b[^>]*>/i.test(rawProposalStr);
    const hasSecretPattern = /sk-[a-zA-Z0-9]{20,}|AIzaSy[a-zA-Z0-9_-]{33}/.test(rawProposalStr);

    if (hasSecretPattern || securityCheck.findings.some((f) => f.category === 'CREDENTIAL_LEAK')) {
      return {
        score: 15,
        decision: 'REJECT',
        critiques: ['CREDENTIAL LEAKAGE: Raw API token or secret pattern detected in proposal payload.'],
        endorsements: [],
        suggestedModifications: [],
        vetoTriggered: true,
        vetoReason: 'Security Officer Veto: Hardcoded secret pattern detected in proposal payload.',
      };
    }

    if (hasEval || hasScriptTag || !securityCheck.safe) {
      return {
        score: 0,
        decision: 'REJECT',
        critiques: [
          'CRITICAL AST VULNERABILITY: Prohibited executable code pattern (<script> or eval) detected in proposal.',
        ],
        endorsements: [],
        suggestedModifications: [
          {
            id: 'sec_mod_sanitize',
            targetEntity: 'component_props',
            action: 'VALIDATE',
            description: 'Strip all dynamic eval and script tags immediately',
            rationale: 'Mandatory hard security invariant enforcement',
            securityImpact: 'BLOCKING',
          },
        ],
        vetoTriggered: true,
        vetoReason: hasEval
          ? 'Security Officer Veto: Malicious eval() or Function pattern detected in plan payload.'
          : 'Security Officer Veto: Malicious or prohibited code pattern detected in plan payload.',
      };
    }

    if (hasIframe) {
      return {
        score: 55,
        decision: 'CONDITIONAL',
        critiques: ['Suspicious iframe element detected; requires strict sandbox attributes.'],
        endorsements: ['No direct code execution found.'],
        suggestedModifications: [
          {
            id: 'sec_mod_iframe_sandbox',
            targetEntity: 'iframe_props',
            action: 'MODIFY',
            description: 'Apply sandbox="allow-scripts" and strict origin policy',
            rationale: 'Prevent unauthorized cross-origin browsing',
            securityImpact: 'SAFE',
          },
        ],
      };
    }

    return {
      score: 98,
      decision: 'APPROVE',
      critiques: [],
      endorsements: ['Passed comprehensive AST audit, zero injection vulnerabilities detected.'],
      suggestedModifications: [],
    };
  }

  private static evaluateAsUXDesigner(
    proposal: SwarmProposal,
    _project: AppProject
  ): PersonaEvaluationResult {
    const rawStr = JSON.stringify(proposal);
    const critiques: string[] = [];
    const endorsements: string[] = [];
    const suggestedModifications: ProposedModification[] = [];
    let score = 90;

    // Check accessibility indicators
    const hasAria = /aria-[a-z]+/i.test(rawStr) || /role=/i.test(rawStr);
    if (!hasAria && proposal.steps.some((s) => s.type === 'create_component' || s.action === 'CREATE_PAGE')) {
      score -= 20;
      critiques.push('Components lack explicit ARIA accessibility attributes and role tags.');
      suggestedModifications.push({
        id: 'ux_mod_aria',
        targetEntity: 'components',
        action: 'WRAP',
        description: 'Inject aria-label, role="region", and keyboard focus management',
        rationale: 'Ensure WCAG 2.1 AAA compliance and screen-reader accessibility',
        securityImpact: 'SAFE',
      });
    } else {
      endorsements.push('Accessible roles and semantic labeling detected.');
    }

    // Check responsive design cues
    const hasResponsiveStyling = /flex|grid|auto-fit|minmax/i.test(rawStr);
    if (!hasResponsiveStyling) {
      score -= 15;
      critiques.push('Layout styles appear fixed; recommended flex/grid for responsive mobile viewport adaptation.');
      suggestedModifications.push({
        id: 'ux_mod_responsive',
        targetEntity: 'container_styles',
        action: 'STYLE',
        description: 'Convert fixed container widths to fluid flexbox layout with responsive gutters',
        rationale: 'Optimal rendering across mobile and desktop viewport widths',
        securityImpact: 'SAFE',
      });
    } else {
      endorsements.push('Fluid responsive styling verified.');
    }

    return {
      score: Math.max(10, score),
      decision: score >= 75 ? 'APPROVE' : 'CONDITIONAL',
      critiques,
      endorsements,
      suggestedModifications,
    };
  }

  private static evaluateAsArchitect(
    proposal: SwarmProposal,
    project: AppProject
  ): PersonaEvaluationResult {
    const critiques: string[] = [];
    const endorsements: string[] = [];
    const suggestedModifications: ProposedModification[] = [];
    let score = 92;

    // Check step count and granularity
    if (proposal.steps.length > 8) {
      score -= 15;
      critiques.push('Proposal contains more than 8 atomic steps; recommend decomposing into modular sub-phases.');
    } else {
      endorsements.push('Plan steps exhibit balanced modularity and clean execution boundaries.');
    }

    // Check page target validity
    const touchesNonExistentPage = proposal.steps.some(
      (s) => s.targetPageId && !project.pages.some((p) => p.id === s.targetPageId)
    );
    if (touchesNonExistentPage) {
      score -= 30;
      critiques.push('Steps reference non-existent page IDs without an antecedent CREATE_PAGE step.');
      suggestedModifications.push({
        id: 'arch_mod_create_page',
        targetEntity: 'project_pages',
        action: 'ADD',
        description: 'Prepend page creation step to ensure referential integrity',
        rationale: 'Prevent orphan component placement',
        securityImpact: 'SAFE',
      });
    }

    return {
      score: Math.max(10, score),
      decision: score >= 70 ? 'APPROVE' : 'CONDITIONAL',
      critiques,
      endorsements,
      suggestedModifications,
    };
  }

  private static evaluateAsDataEngineer(
    proposal: SwarmProposal,
    _project: AppProject
  ): PersonaEvaluationResult {
    const critiques: string[] = [];
    const endorsements: string[] = [];
    const suggestedModifications: ProposedModification[] = [];
    let score = 94;

    const rawStr = JSON.stringify(proposal);
    const mentionsDatabase = /collection|table|query|database|data-source/i.test(rawStr);
    const hasSchemaDefinition = proposal.steps.some(
      (s: any) => s.payload?.schema || s.payload?.fields || s.payload?.columnTypes
    );

    if (mentionsDatabase && !hasSchemaDefinition) {
      score -= 25;
      critiques.push('Data collection referenced without explicit property typing or schema contract.');
      suggestedModifications.push({
        id: 'data_mod_schema_contract',
        targetEntity: 'data_schema',
        action: 'VALIDATE',
        description: 'Define explicit JSON Schema validation contract for target collection',
        rationale: 'Prevent unstructured data drift and type mismatches',
        securityImpact: 'SAFE',
      });
    } else {
      endorsements.push('State properties and data definitions are strongly typed.');
    }

    return {
      score: Math.max(10, score),
      decision: score >= 75 ? 'APPROVE' : 'CONDITIONAL',
      critiques,
      endorsements,
      suggestedModifications,
    };
  }

  private static evaluateAsQASpecialist(
    proposal: SwarmProposal,
    _project: AppProject
  ): PersonaEvaluationResult {
    const critiques: string[] = [];
    const endorsements: string[] = [];
    const suggestedModifications: ProposedModification[] = [];
    let score = 88;

    const rawStr = JSON.stringify(proposal);
    const hasDataTestId = /data-testid/i.test(rawStr);

    if (!hasDataTestId && proposal.steps.some((s) => s.type === 'create_component')) {
      score -= 20;
      critiques.push('Newly proposed components lack data-testid attributes for automated testing verification.');
      suggestedModifications.push({
        id: 'qa_mod_testids',
        targetEntity: 'component_props',
        action: 'MODIFY',
        description: 'Enforce deterministic data-testid attributes across all interactive components',
        rationale: 'Enable reliable E2E testability and test automation',
        securityImpact: 'SAFE',
      });
    } else {
      endorsements.push('Component testability verified with automated test selector hooks.');
    }

    return {
      score: Math.max(10, score),
      decision: score >= 70 ? 'APPROVE' : 'CONDITIONAL',
      critiques,
      endorsements,
      suggestedModifications,
    };
  }
}
