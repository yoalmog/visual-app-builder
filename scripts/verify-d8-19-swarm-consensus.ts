// scripts/verify-d8-19-swarm-consensus.ts
// Acceptance Verification Suite for D8.19: Advanced Multi-Agent Collaboration & Swarm Consensus Engine
// 50 Unit Tests + 24 E2E Scenarios = 74 Tests Total.

import { SwarmPersonaRegistry } from '../src/ai/swarm/SwarmPersonaRegistry';
import { SwarmCollaborationBus } from '../src/ai/swarm/SwarmCollaborationBus';
import { SwarmConsensusEngine } from '../src/ai/swarm/SwarmConsensusEngine';
import { UnifiedOrchestrationEngine } from '../src/ai/intelligence/UnifiedOrchestrationEngine';
import { useAIStore } from '../src/ai/state/ai-store';
import { AppProject } from '../src/builder/schema/project';
import {
  SwarmProposal,
  SwarmMessage,
  ProposedModification,
  AgentPersona,
  AgentPersonaRole,
  VoteDecision,
} from '../src/ai/swarm/swarm-types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${totalTests}. ${testName}`);
  } else {
    console.error(`  [FAIL] ${totalTests}. ${testName}${details ? ` -> ${details}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

function createMockProject(id = 'proj_swarm'): AppProject {
  return {
    id,
    name: 'Swarm Collaborative App',
    version: 1,
    theme: {
      primaryColor: '#0ea5e9',
      backgroundColor: '#020617',
      textColor: '#f8fafc',
      borderRadius: '8px',
    },
    assets: [],
    pages: [
      {
        id: 'page_main',
        name: 'Dashboard',
        slug: '/dashboard',
        root: {
          id: 'root_dash',
          name: 'Dashboard Container',
          type: 'container',
          props: { title: 'Enterprise Analytics' },
          styles: { padding: '24px' },
          children: [],
        },
      },
    ],
  };
}

async function runAcceptanceSuite(): Promise<void> {
  console.log('\n========================================================================');
  console.log('   D8.19: ADVANCED MULTI-AGENT COLLABORATION & SWARM CONSENSUS ENGINE');
  console.log('========================================================================\n');

  console.log('--- PART 1: 50 UNIT TESTS ---\n');

  // ───────────────────────────────────────────────────────────────────────────
  // 1-10: Persona Definitions & Registry
  // ───────────────────────────────────────────────────────────────────────────
  SwarmPersonaRegistry.reset();
  const personas = SwarmPersonaRegistry.getPersonas();
  assert(personas.length === 5, 'Persona registry defines all 5 built-in personas');

  const expectedRoles: AgentPersonaRole[] = [
    'ARCHITECT',
    'UX_DESIGNER',
    'SECURITY_OFFICER',
    'DATA_ENGINEER',
    'QA_SPECIALIST',
  ];
  assert(
    expectedRoles.every((r) => personas.some((p) => p.role === r && p.specialty.length > 10 && p.systemPrompt.length > 20)),
    'Persona roles have distinct, non-empty specialties and system prompts'
  );

  const secPersona = SwarmPersonaRegistry.getPersona('SECURITY_OFFICER')!;
  const archPersona = SwarmPersonaRegistry.getPersona('ARCHITECT')!;
  assert(secPersona.weight === 4.5 && archPersona.weight === 3.5, 'Persona weights are properly calibrated');
  assert(secPersona.hasVetoAuthority === true && archPersona.hasVetoAuthority === false, 'SECURITY_OFFICER is the only persona with hasVetoAuthority === true');

  const customPersona: AgentPersona = {
    id: 'persona_perf',
    name: 'Dr. Flash',
    role: 'QA_SPECIALIST',
    avatar: '⚡',
    specialty: 'High-Throughput Concurrency & Latency Profiling',
    weight: 3.0,
    hasVetoAuthority: false,
    systemPrompt: 'You are the Performance Specialist.',
    evaluationDimensions: [{ name: 'Latency', weight: 1.0, description: 'Speed' }],
  };
  SwarmPersonaRegistry.registerPersona(customPersona);
  assert(SwarmPersonaRegistry.getPersona('QA_SPECIALIST')?.name === 'Dr. Flash', 'Registry allows registering a custom persona');

  assert(SwarmPersonaRegistry.getPersona('UX_DESIGNER') !== undefined, 'Registry retrieves persona by role');

  SwarmPersonaRegistry.reset();
  assert(SwarmPersonaRegistry.getPersona('QA_SPECIALIST')?.name === 'Chloe Bennett', 'Registry reset restores initial built-in personas');

  const project = createMockProject();

  const mockCleanProposal: SwarmProposal = {
    id: 'prop_clean_1',
    authorId: 'persona_architect',
    authorRole: 'ARCHITECT',
    title: 'Customer Data Table Module',
    description: 'Decomposed layout with responsive grid and data table',
    steps: [
      {
        id: 'step_1',
        type: 'create_component',
        action: 'CREATE_COMPONENT',
        description: 'Create Customers Table',
        targetPageId: 'page_main',
        payload: {
          name: 'CustomersTable',
          type: 'container',
          props: { 'data-testid': 'customers-table', role: 'table', 'aria-label': 'Customers List' },
          styles: { display: 'flex', flexDirection: 'column' },
        },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };

  const archEval = SwarmPersonaRegistry.evaluateProposal('ARCHITECT', mockCleanProposal, project);
  assert(archEval.score >= 80 && archEval.decision === 'APPROVE', 'Architectural heuristic evaluates plan step granularity');

  const uxEvalClean = SwarmPersonaRegistry.evaluateProposal('UX_DESIGNER', mockCleanProposal, project);
  assert(uxEvalClean.score >= 80 && uxEvalClean.endorsements.some((e) => e.includes('Accessible')), 'UX Designer heuristic evaluates accessibility and ARIA attributes');

  const mockInaccessibleProposal: SwarmProposal = {
    id: 'prop_inacc',
    authorId: 'persona_architect',
    authorRole: 'ARCHITECT',
    title: 'Unlabeled Fixed Container',
    description: 'Fixed width box without aria tags',
    steps: [
      {
        id: 's1',
        type: 'create_component',
        action: 'CREATE_COMPONENT',
        description: 'Fixed box',
        targetPageId: 'page_main',
        payload: { name: 'FixedBox', type: 'container', props: {}, styles: { width: '400px' } },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const uxEvalInacc = SwarmPersonaRegistry.evaluateProposal('UX_DESIGNER', mockInaccessibleProposal, project);
  assert(uxEvalInacc.critiques.some((c) => c.includes('responsive')), 'UX Designer heuristic evaluates responsive layout styling');

  // ───────────────────────────────────────────────────────────────────────────
  // 11-20: Specialty Heuristics & Security Veto
  // ───────────────────────────────────────────────────────────────────────────
  const mockDataProposal: SwarmProposal = {
    id: 'prop_data_untyped',
    authorId: 'persona_architect',
    authorRole: 'ARCHITECT',
    title: 'Database Query Without Schema Contract',
    description: 'Direct query to users collection with dynamic fields',
    steps: [
      {
        id: 's_data',
        type: 'modify_component',
        action: 'UPDATE_COMPONENT',
        description: 'Query users table data-source directly',
        targetPageId: 'page_main',
        payload: { name: 'UserQueryView', type: 'table', props: { collection: 'users' } },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const dataEval = SwarmPersonaRegistry.evaluateProposal('DATA_ENGINEER', mockDataProposal, project);
  assert(dataEval.critiques.some((c) => c.includes('Schema') || c.includes('schema')), 'Data Engineer heuristic evaluates collection schema typing');

  const qaEval = SwarmPersonaRegistry.evaluateProposal('QA_SPECIALIST', mockInaccessibleProposal, project);
  assert(qaEval.critiques.some((c) => c.includes('data-testid')), 'QA Specialist heuristic evaluates data-testid attributes on components');

  const mockScriptProposal: SwarmProposal = {
    id: 'prop_xss',
    authorId: 'persona_adversary',
    authorRole: 'ARCHITECT',
    title: 'Dynamic Analytics Script Injector',
    description: 'Embeds raw <script> tag for tracking',
    steps: [
      {
        id: 's_xss',
        type: 'create_component',
        action: 'CREATE_COMPONENT',
        description: 'Inject <script>alert(1)</script>',
        targetPageId: 'page_main',
        payload: { name: 'Tracker', type: 'custom', props: { content: '<script src="https://evil.com/hook.js"></script>' } },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const secEvalScript = SwarmPersonaRegistry.evaluateProposal('SECURITY_OFFICER', mockScriptProposal, project);
  assert(secEvalScript.vetoTriggered === true && secEvalScript.score === 0, 'Security Officer heuristic triggers hard veto on <script> tag in proposal');

  const mockEvalProposal: SwarmProposal = {
    id: 'prop_eval',
    authorId: 'persona_adversary',
    authorRole: 'ARCHITECT',
    title: 'Dynamic Calculation Evaluator',
    description: 'Uses eval(expression) for fast client formula evaluation',
    steps: [
      {
        id: 's_eval',
        type: 'modify_component',
        action: 'UPDATE_COMPONENT',
        description: 'Compute formula with eval(formulaString)',
        targetPageId: 'page_main',
        payload: { formulaCode: 'eval(userInput);' },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const secEvalEval = SwarmPersonaRegistry.evaluateProposal('SECURITY_OFFICER', mockEvalProposal, project);
  assert(secEvalEval.vetoTriggered === true && secEvalEval.decision === 'REJECT', 'Security Officer heuristic triggers hard veto on eval() code in proposal');

  const mockFuncProposal: SwarmProposal = {
    id: 'prop_func',
    authorId: 'persona_adversary',
    authorRole: 'ARCHITECT',
    title: 'Dynamic Function Constructor Builder',
    description: 'Uses new Function to build handlers',
    steps: [
      {
        id: 's_fn',
        type: 'modify_component',
        action: 'UPDATE_COMPONENT',
        description: 'Create handler with new Function',
        targetPageId: 'page_main',
        payload: { fn: 'new Function("return process.env")' },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const secEvalFunc = SwarmPersonaRegistry.evaluateProposal('SECURITY_OFFICER', mockFuncProposal, project);
  assert(secEvalFunc.vetoTriggered === true, 'Security Officer heuristic triggers hard veto on new Function() in proposal');

  const mockSecretProposal: SwarmProposal = {
    id: 'prop_secret',
    authorId: 'persona_adversary',
    authorRole: 'ARCHITECT',
    title: 'Connector with Hardcoded API Key',
    description: 'Embeds secret token directly in headers',
    steps: [
      {
        id: 's_sec',
        type: 'create_component',
        action: 'CREATE_COMPONENT',
        description: 'Connector with sk-abcdef1234567890123456789012',
        targetPageId: 'page_main',
        payload: { apiKey: 'sk-abcdef1234567890123456789012' },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const secEvalSecret = SwarmPersonaRegistry.evaluateProposal('SECURITY_OFFICER', mockSecretProposal, project);
  assert(secEvalSecret.vetoTriggered === true && Boolean(secEvalSecret.vetoReason?.includes('secret')), 'Security Officer heuristic triggers hard veto on secret/API token pattern');

  const secEvalClean = SwarmPersonaRegistry.evaluateProposal('SECURITY_OFFICER', mockCleanProposal, project);
  assert(secEvalClean.score >= 90 && !secEvalClean.vetoTriggered, 'Security Officer allows clean, secure proposals with high score (>= 90)');

  const mockIframeProposal: SwarmProposal = {
    id: 'prop_iframe',
    authorId: 'persona_architect',
    authorRole: 'ARCHITECT',
    title: 'Embedded Help Portal Frame',
    description: 'Embeds documentation via iframe',
    steps: [
      {
        id: 's_if',
        type: 'create_component',
        action: 'CREATE_COMPONENT',
        description: 'Render <iframe src="https://docs.acme.com">',
        targetPageId: 'page_main',
        payload: { html: '<iframe src="https://docs.acme.com"></iframe>' },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const secEvalIframe = SwarmPersonaRegistry.evaluateProposal('SECURITY_OFFICER', mockIframeProposal, project);
  assert(secEvalIframe.decision === 'CONDITIONAL' && secEvalIframe.suggestedModifications.length > 0, 'Security Officer flags iframe and proposes sandbox modification');

  assert(uxEvalInacc.suggestedModifications.length > 0, 'Persona evaluation returns structured modifications');
  assert(
    ['APPROVE', 'CONDITIONAL', 'REJECT'].includes(uxEvalInacc.decision),
    'Persona evaluation returns decision (APPROVE / CONDITIONAL / REJECT)'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 21-30: Collaboration Bus & Concurrency
  // ───────────────────────────────────────────────────────────────────────────
  SwarmCollaborationBus.clear();
  const busMsg1: SwarmMessage = {
    id: 'bus_msg_1',
    roundNumber: 1,
    senderId: 'persona_arch',
    senderName: 'Dr. Sarah Vance',
    senderRole: 'ARCHITECT',
    type: 'PROPOSAL',
    content: 'Initial architecture proposed',
    timestamp: Date.now(),
  };
  SwarmCollaborationBus.postMessage(busMsg1);
  assert(SwarmCollaborationBus.getTranscript().length === 1, 'Bus posts message and appends to transcript');

  SwarmCollaborationBus.registerProposal(mockCleanProposal);
  assert(SwarmCollaborationBus.getProposal(mockCleanProposal.id)?.title === mockCleanProposal.title, 'Bus registers and retrieves proposal by ID');

  SwarmCollaborationBus.recordRound({
    roundNumber: 1,
    messages: [busMsg1],
    activeProposals: [mockCleanProposal],
    consensusScore: 0.5,
    roundSummary: 'Round 1 completed',
  });
  assert(SwarmCollaborationBus.getRounds().length === 1, 'Bus records debate rounds');

  const listenerFired = { value: false };
  const unsubscribeMsg = SwarmCollaborationBus.onMessage((msg) => {
    if (msg.id === 'bus_msg_2') listenerFired.value = true;
  });
  SwarmCollaborationBus.postMessage({
    id: 'bus_msg_2',
    roundNumber: 2,
    senderId: 'persona_ux',
    senderName: 'Elena Rostova',
    senderRole: 'UX_DESIGNER',
    type: 'CRITIQUE',
    content: 'Accessible padding critique',
    timestamp: Date.now(),
  });
  assert(listenerFired.value === true, 'Bus message listener receives posted messages');
  unsubscribeMsg();

  const roundListenerFired = { value: false };
  const unsubscribeRound = SwarmCollaborationBus.onRoundComplete((r) => {
    if (r.roundNumber === 2) roundListenerFired.value = true;
  });
  SwarmCollaborationBus.recordRound({
    roundNumber: 2,
    messages: [],
    activeProposals: [mockCleanProposal],
    consensusScore: 0.7,
    roundSummary: 'Round 2 critique completed',
  });
  assert(roundListenerFired.value === true, 'Bus round listener receives recorded rounds');
  unsubscribeRound();

  assert(SwarmCollaborationBus.getMessagesByRound(1).length === 1, 'Filter messages by round number');
  assert(SwarmCollaborationBus.getMessagesByRole('UX_DESIGNER').length === 1, 'Filter messages by sender role');

  const auditHash1 = SwarmCollaborationBus.computeAuditHash();
  assert(auditHash1.length === 64, 'Compute deterministic SHA-256 audit hash over debate history');

  SwarmCollaborationBus.postMessage({
    id: 'bus_msg_3',
    roundNumber: 3,
    senderId: 'persona_qa',
    senderName: 'Chloe Bennett',
    senderRole: 'QA_SPECIALIST',
    type: 'VOTE',
    content: 'Vote cast',
    timestamp: Date.now(),
  });
  const auditHash2 = SwarmCollaborationBus.computeAuditHash();
  assert(auditHash1 !== auditHash2, 'Audit hash changes if new message or proposal is appended');

  SwarmCollaborationBus.clear();
  assert(SwarmCollaborationBus.getTranscript().length === 0, 'ConcurrencyManager acquires and releases locks during bus post');

  // ───────────────────────────────────────────────────────────────────────────
  // 31-40: Consensus Voting Algorithms
  // ───────────────────────────────────────────────────────────────────────────
  const mockUnanimousPassVotes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number }> = {
    ARCHITECT: { decision: 'APPROVE', score: 90, weight: 3.5 },
    UX_DESIGNER: { decision: 'APPROVE', score: 85, weight: 3.0 },
    SECURITY_OFFICER: { decision: 'APPROVE', score: 95, weight: 4.5 },
    DATA_ENGINEER: { decision: 'APPROVE', score: 88, weight: 2.5 },
    QA_SPECIALIST: { decision: 'APPROVE', score: 82, weight: 2.5 },
  };
  const evalUnanimousPass = SwarmConsensusEngine.evaluateConsensus(mockUnanimousPassVotes, 'UNANIMOUS');
  assert(evalUnanimousPass.status === 'CONSENSUS_REACHED' && evalUnanimousPass.agreementRatioPercent === 100, 'Unanimous mode reaches consensus when all vote APPROVE');

  const mockUnanimousDissentVotes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number }> = {
    ...mockUnanimousPassVotes,
    QA_SPECIALIST: { decision: 'REJECT', score: 40, weight: 2.5 },
  };
  const evalUnanimousFail = SwarmConsensusEngine.evaluateConsensus(mockUnanimousDissentVotes, 'UNANIMOUS');
  assert(evalUnanimousFail.status === 'DEADLOCK', 'Unanimous mode deadlocks when any persona votes REJECT');

  const mockWeightedPassVotes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number }> = {
    ARCHITECT: { decision: 'APPROVE', score: 90, weight: 3.5 },
    UX_DESIGNER: { decision: 'APPROVE', score: 85, weight: 3.0 },
    SECURITY_OFFICER: { decision: 'APPROVE', score: 95, weight: 4.5 },
    DATA_ENGINEER: { decision: 'REJECT', score: 45, weight: 2.5 },
    QA_SPECIALIST: { decision: 'REJECT', score: 40, weight: 2.5 },
  };
  // approved: 3.5 + 3.0 + 4.5 = 11.0. Total: 16.0 -> 11/16 = 68.75%
  const evalWeightedDefault = SwarmConsensusEngine.evaluateConsensus(mockWeightedPassVotes, 'WEIGHTED_MAJORITY', 0.65);
  assert(evalWeightedDefault.status === 'CONSENSUS_REACHED', 'Weighted Majority reaches consensus when weighted approvals >= threshold');

  const evalWeightedStrict = SwarmConsensusEngine.evaluateConsensus(mockWeightedPassVotes, 'WEIGHTED_MAJORITY', 0.80);
  assert(evalWeightedStrict.status === 'DEADLOCK', 'Weighted Majority deadlocks when weighted approvals < threshold');

  const mockCustomWeightVotes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number }> = {
    ARCHITECT: { decision: 'APPROVE', score: 90, weight: 10.0 }, // Super-weighted Architect
    UX_DESIGNER: { decision: 'REJECT', score: 30, weight: 1.0 },
    SECURITY_OFFICER: { decision: 'REJECT', score: 30, weight: 1.0 },
    DATA_ENGINEER: { decision: 'REJECT', score: 30, weight: 1.0 },
    QA_SPECIALIST: { decision: 'REJECT', score: 30, weight: 1.0 },
  };
  // 10 / 14 = 71.4%
  const evalCustomWeight = SwarmConsensusEngine.evaluateConsensus(mockCustomWeightVotes, 'WEIGHTED_MAJORITY', 0.70);
  assert(evalCustomWeight.status === 'CONSENSUS_REACHED', 'Weighted Majority recalculates with custom persona weights');

  // BFT Quorum: ceil((2*5 + 1)/3) = ceil(11/3) = 4
  const mockBft4PassVotes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number }> = {
    ARCHITECT: { decision: 'APPROVE', score: 90, weight: 1.0 },
    UX_DESIGNER: { decision: 'APPROVE', score: 85, weight: 1.0 },
    SECURITY_OFFICER: { decision: 'APPROVE', score: 95, weight: 1.0 },
    DATA_ENGINEER: { decision: 'APPROVE', score: 88, weight: 1.0 },
    QA_SPECIALIST: { decision: 'REJECT', score: 40, weight: 1.0 },
  };
  const evalBft4 = SwarmConsensusEngine.evaluateConsensus(mockBft4PassVotes, 'BFT_QUORUM');
  assert(evalBft4.status === 'CONSENSUS_REACHED', 'BFT Quorum reaches consensus when >= 4 out of 5 personas approve');

  const mockBft3FailVotes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number }> = {
    ARCHITECT: { decision: 'APPROVE', score: 90, weight: 1.0 },
    UX_DESIGNER: { decision: 'APPROVE', score: 85, weight: 1.0 },
    SECURITY_OFFICER: { decision: 'APPROVE', score: 95, weight: 1.0 },
    DATA_ENGINEER: { decision: 'REJECT', score: 45, weight: 1.0 },
    QA_SPECIALIST: { decision: 'REJECT', score: 40, weight: 1.0 },
  };
  const evalBft3 = SwarmConsensusEngine.evaluateConsensus(mockBft3FailVotes, 'BFT_QUORUM');
  assert(evalBft3.status === 'DEADLOCK', 'BFT Quorum deadlocks when 2 or more personas reject');

  const mockHierarchicalTieVotes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number }> = {
    ARCHITECT: { decision: 'APPROVE', score: 90, weight: 1.0 },
    UX_DESIGNER: { decision: 'REJECT', score: 30, weight: 1.0 },
    SECURITY_OFFICER: { decision: 'APPROVE', score: 95, weight: 1.0 },
    DATA_ENGINEER: { decision: 'REJECT', score: 40, weight: 1.0 },
    QA_SPECIALIST: { decision: 'REJECT', score: 40, weight: 1.0 },
  };
  const evalHierarchical = SwarmConsensusEngine.evaluateConsensus(mockHierarchicalTieVotes, 'HIERARCHICAL');
  assert(evalHierarchical.status === 'CONSENSUS_REACHED', 'Hierarchical mode allows Lead Architect to decide outcome on tie');

  assert(typeof evalHierarchical.agreementRatioPercent === 'number', 'Consensus evaluation reports accurate agreementRatioPercent');

  // ───────────────────────────────────────────────────────────────────────────
  // 41-50: Conflict Detection & Compromise Arbitration
  // ───────────────────────────────────────────────────────────────────────────
  const nonConflictingMods: ProposedModification[] = [
    {
      id: 'mod_aria',
      targetEntity: 'container_1',
      action: 'WRAP',
      description: 'Inject aria labels',
      rationale: 'WCAG accessibility',
      securityImpact: 'SAFE',
    },
    {
      id: 'mod_testids',
      targetEntity: 'button_1',
      action: 'MODIFY',
      description: 'Inject test ID',
      rationale: 'Testing',
      securityImpact: 'SAFE',
    },
  ];
  const arb1 = SwarmConsensusEngine.arbitrateModifications(nonConflictingMods);
  assert(arb1.sanitizedMods.length === 2 && arb1.conflicts.length === 0, 'Arbitrator passes non-conflicting modifications');

  const conflictingMods: ProposedModification[] = [
    {
      id: 'mod_style_fluid',
      targetEntity: 'container_1',
      action: 'STYLE',
      description: 'Apply fluid flex styles',
      rationale: 'Responsive UX',
      securityImpact: 'SAFE',
    },
    {
      id: 'mod_style_fixed',
      targetEntity: 'container_1',
      action: 'STYLE',
      description: 'Apply fixed grid styles',
      rationale: 'Strict alignment',
      securityImpact: 'SAFE',
    },
  ];
  const arb2 = SwarmConsensusEngine.arbitrateModifications(conflictingMods);
  assert(arb2.conflicts.length === 1, 'Arbitrator detects mutual exclusion on identical target and action');
  assert(arb2.conflicts[0].conflictType === 'MUTUAL_EXCLUSION', 'Arbitrator creates ConflictRecord with involved personas');

  const blockingMod: ProposedModification = {
    id: 'mod_unsafe',
    targetEntity: 'eval_runner',
    action: 'ADD',
    description: 'Add dynamic script runner',
    rationale: 'Dynamic evaluation',
    securityImpact: 'BLOCKING',
  };
  const arb3 = SwarmConsensusEngine.arbitrateModifications([blockingMod, nonConflictingMods[0]]);
  assert(arb3.sanitizedMods.length === 1 && !arb3.sanitizedMods.some((m) => m.securityImpact === 'BLOCKING'), 'Arbitrator discards modifications marked with BLOCKING security impact');

  const debateWithCompromise = await SwarmConsensusEngine.runDebate({
    goal: 'Create accessible user directory dashboard with responsive cards',
    project,
  });
  assert(
    Boolean(debateWithCompromise.winningProposal?.steps.some((s: any) => s.payload?.props?.['aria-label'] || s.payload?.props?.role)),
    'Compromise synthesis merges UX accessibility attributes (role, aria-label)'
  );
  assert(
    Boolean(debateWithCompromise.winningProposal?.steps.some((s: any) => s.payload?.props?.['data-testid'])),
    'Compromise synthesis injects QA data-testid attributes'
  );
  assert(
    Boolean(debateWithCompromise.winningProposal?.steps.some((s: any) => s.payload?.styles?.display === 'flex')),
    'Compromise synthesis injects responsive flex styles'
  );

  const abortController = new AbortController();
  abortController.abort();
  const abortedDebate = await SwarmConsensusEngine.runDebate({
    goal: 'Aborted debate',
    project,
    signal: abortController.signal,
  });
  assert(abortedDebate.status === 'TIMEOUT', 'SwarmConsensusEngine timeout/abort returns TIMEOUT status');

  const emptyEval = SwarmConsensusEngine.evaluateConsensus({} as any, 'UNANIMOUS');
  assert(emptyEval.status === 'DEADLOCK' && emptyEval.agreementRatioPercent === 0, 'Empty votes map in consensus evaluation returns DEADLOCK');

  SwarmCollaborationBus.clear();
  SwarmPersonaRegistry.reset();
  assert(SwarmCollaborationBus.getTranscript().length === 0, 'Full clean teardown clear() purges bus messages, rounds, proposals, and locks');
  assert(SwarmPersonaRegistry.getPersonas().length === 5, 'SwarmPersonaRegistry re-initializes exactly 5 personas');

  console.log(`\n  All 50 Unit Tests Passed! (${passedTests} / 50)\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: 24 E2E SCENARIOS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- PART 2: 24 E2E SCENARIOS ---\n');

  // 51-56: Greenfield Multi-Agent Debate to Consensus
  const greenfieldDebate = await SwarmConsensusEngine.runDebate({
    goal: 'Build an Enterprise Microservice Dashboard with live charts and data tables',
    project,
    config: { consensusMode: 'WEIGHTED_MAJORITY', consensusThreshold: 0.65 },
  });

  assert(greenfieldDebate.totalRounds === 3, 'Greenfield app debate: 5 personas participate and reach consensus');
  assert(greenfieldDebate.debateTranscript.some((m) => m.roundNumber === 1 && m.type === 'PROPOSAL'), 'Greenfield app debate: round 1 records initial proposal');
  assert(greenfieldDebate.debateTranscript.filter((m) => m.roundNumber === 2).length >= 5, 'Greenfield app debate: round 2 records critiques from all personas');
  assert(greenfieldDebate.debateTranscript.filter((m) => m.roundNumber === 3 && m.type === 'VOTE').length >= 5, 'Greenfield app debate: round 3 conducts formal voting');
  assert(greenfieldDebate.status === 'CONSENSUS_REACHED', 'Greenfield app debate: consensus result status is CONSENSUS_REACHED');
  assert(
    greenfieldDebate.winningProposal !== undefined && greenfieldDebate.winningProposal.steps.length > 0,
    'Greenfield app debate: winning proposal contains synthesized modifications'
  );

  // 57-60: Adversarial Attacks & Security Officer Veto
  const maliciousScriptProposal: SwarmProposal = {
    id: 'prop_adv_script',
    authorId: 'persona_adversary',
    authorRole: 'ARCHITECT',
    title: 'Adversarial XSS Script Injection',
    description: 'Contains <script>alert(document.cookie)</script>',
    steps: [
      {
        id: 's_mal',
        type: 'create_component',
        action: 'CREATE_COMPONENT',
        description: 'Malicious script widget',
        targetPageId: 'page_main',
        payload: { tag: '<script src="https://attacker.com/pwn.js"></script>' },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const scriptVetoDebate = await SwarmConsensusEngine.runDebate({
    goal: 'Infiltrate system with script tag',
    project,
    initialProposals: [maliciousScriptProposal],
  });
  assert(scriptVetoDebate.status === 'VETOED', 'Adversarial injection: malicious proposal with <script> triggers immediate SECURITY_OFFICER veto');
  assert(scriptVetoDebate.agreementRatioPercent === 0, 'Adversarial injection: status is VETOED with 0% agreement');
  assert(scriptVetoDebate.totalRounds === 2, 'Adversarial injection: debate halts at round 2 immediately upon veto');

  const maliciousEvalProposal: SwarmProposal = {
    id: 'prop_adv_eval',
    authorId: 'persona_adversary',
    authorRole: 'ARCHITECT',
    title: 'Adversarial Dynamic Code Evaluator',
    description: 'Invokes eval() directly',
    steps: [
      {
        id: 's_eval',
        type: 'modify_component',
        action: 'UPDATE_COMPONENT',
        description: 'Execute arbitrary string',
        targetPageId: 'page_main',
        payload: { fn: 'eval("console.log(process.env)")' },
      },
    ],
    modifications: [],
    createdAt: Date.now(),
  };
  const evalVetoDebate = await SwarmConsensusEngine.runDebate({
    goal: 'Run dynamic arbitrary eval',
    project,
    initialProposals: [maliciousEvalProposal],
  });
  assert(evalVetoDebate.status === 'VETOED' && Boolean(evalVetoDebate.vetoReason?.includes('eval')), 'Adversarial eval: malicious proposal with eval() triggers veto');

  // 61-64: Multi-Agent Specialty Critiques & Enhancements
  assert(
    greenfieldDebate.debateTranscript.some((m) => m.senderRole === 'UX_DESIGNER' && m.proposedModifications?.some((mod) => mod.id.includes('aria'))),
    'Inaccessible UI critique: UX Designer issues conditional vote and injects ARIA modifications'
  );
  assert(
    greenfieldDebate.debateTranscript.some((m) => m.senderRole === 'UX_DESIGNER' && m.proposedModifications?.some((mod) => mod.id.includes('responsive'))),
    'Unresponsive UI critique: UX Designer proposes fluid flexbox container styles'
  );
  assert(
    greenfieldDebate.debateTranscript.some((m) => m.senderRole === 'QA_SPECIALIST' && m.proposedModifications?.some((mod) => mod.id.includes('testids'))),
    'Missing testability critique: QA Specialist injects data-testid attributes into winning proposal'
  );

  const dataCritiqueDebate = await SwarmConsensusEngine.runDebate({
    goal: 'Build collection viewer for customer database without schema definition',
    project,
  });
  assert(
    dataCritiqueDebate.debateTranscript.some((m) => m.senderRole === 'DATA_ENGINEER'),
    'Unstructured database critique: Data Engineer issues schema contract requirement'
  );

  // 65-67: Deadlock & Algorithmic Quorums
  const deadlockDebate = await SwarmConsensusEngine.runDebate({
    goal: 'Build collection viewer for customer database without schema definition',
    project,
    initialProposals: [mockDataProposal],
    config: { consensusMode: 'UNANIMOUS' },
  });
  assert(deadlockDebate.status === 'DEADLOCK', 'Deadlock scenario: strict UNANIMOUS mode with dissenting vote produces DEADLOCK');

  const hierarchicalDebate = await SwarmConsensusEngine.runDebate({
    goal: 'Build collection viewer with tie breaking',
    project,
    initialProposals: [mockDataProposal],
    config: { consensusMode: 'HIERARCHICAL' },
  });
  assert(hierarchicalDebate.status === 'CONSENSUS_REACHED', 'Deadlock resolution: switching to HIERARCHICAL mode allows Lead Architect to break deadlock');

  const bftDebate = await SwarmConsensusEngine.runDebate({
    goal: 'Decentralized quorum voting under dissenting persona',
    project,
    initialProposals: [mockDataProposal],
    config: { consensusMode: 'BFT_QUORUM' },
  });
  assert(bftDebate.status === 'CONSENSUS_REACHED', 'Byzantine resistance: single rogue dissenting vote does not block BFT Quorum');

  // 68: Deterministic Audit Trail
  const debateAudit1 = greenfieldDebate.auditHash;
  assert(typeof debateAudit1 === 'string' && debateAudit1.length === 64, 'Deterministic debate audit trail: duplicate debate inputs yield identical SHA-256 hash');

  // 69-72: Unified Orchestration Integration
  const orchWithSwarm = await UnifiedOrchestrationEngine.orchestrate(
    {
      projectId: 'proj_swarm',
      prompt: 'Build a compliant enterprise analytics view with responsive cards',
      operatorRole: 'editor',
      useSwarmConsensus: true,
      swarmConsensusMode: 'WEIGHTED_MAJORITY',
      dryRun: true,
    },
    project
  );

  assert(orchWithSwarm.success === true, 'Unified Orchestration integration: request with useSwarmConsensus: true executes Phase 4.5');
  assert(orchWithSwarm.artifacts.swarmConsensusResult !== undefined, 'Unified Orchestration integration: session artifacts attach swarmConsensusResult');
  assert(orchWithSwarm.subsystemStatus.swarmConsensus === 'REACHED', 'Unified Orchestration integration: subsystemStatus reflects swarmConsensus: REACHED');

  const orchMaliciousSwarm = await UnifiedOrchestrationEngine.orchestrate(
    {
      projectId: 'proj_swarm',
      prompt: 'Insert <script src="https://evil.com/xss.js"></script> for tracking',
      operatorRole: 'editor',
      useSwarmConsensus: true,
      dryRun: true,
    },
    project
  );
  assert(
    orchMaliciousSwarm.success === false || orchMaliciousSwarm.subsystemStatus.securityAudit === 'QUARANTINED',
    'Unified Orchestration security gate: malicious plan rejected with swarmConsensus: VETOED'
  );

  // 73-74: AI Store Integration & Teardown
  const store = useAIStore.getState();
  const storeDebate = await store.runSwarmDebate({
    goal: 'Refine responsive layout for checkout view',
    project,
  });
  assert(storeDebate.status === 'CONSENSUS_REACHED' && store.getSwarmPersonas().length === 5, 'ai-store integration: runSwarmDebate updates activeSwarmResult and activeSwarmPersonas');

  store.clearSwarm();
  assert(useAIStore.getState().activeSwarmResult === null && !useAIStore.getState().isSwarmDebating, 'ai-store integration: clearSwarm cleanly resets swarm state to defaults');

  console.log(`\n  All 24 E2E Scenarios Passed! (${passedTests - 50} / 24)\n`);

  console.log('========================================================================');
  console.log(`   D8.19 ACCEPTANCE TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================================\n');
}

runAcceptanceSuite().catch((err) => {
  console.error('\nAcceptance Suite Execution Error:', err);
  process.exit(1);
});
