// src/ai/swarm/SwarmConsensusEngine.ts
// Multi-Agent Debate Coordinator, Consensus Voting & Dispute Arbitration Engine for D8.19

import {
  AgentPersonaRole,
  SwarmConsensusMode,
  SwarmConsensusResult,
  SwarmProposal,
  SwarmConfig,
  SwarmMessage,
  SwarmDebateRound,
  ProposedModification,
  ConflictRecord,
  VoteDecision,
} from './swarm-types';
import { AppProject } from '../../builder/schema/project';
import { SwarmPersonaRegistry } from './SwarmPersonaRegistry';
import { SwarmCollaborationBus } from './SwarmCollaborationBus';
import crypto from 'crypto';

export class SwarmConsensusEngine {
  private static readonly DEFAULT_CONFIG: Required<SwarmConfig> = {
    maxRounds: 3,
    consensusMode: 'WEIGHTED_MAJORITY',
    consensusThreshold: 0.7,
    timeoutMs: 15000,
    enabledPersonas: ['ARCHITECT', 'UX_DESIGNER', 'SECURITY_OFFICER', 'DATA_ENGINEER', 'QA_SPECIALIST'],
    customPersonaWeights: {},
  };

  /**
   * Executes a multi-round debate among specialized agent personas to reach consensus.
   */
  public static async runDebate(params: {
    goal: string;
    project: AppProject;
    initialProposals?: SwarmProposal[];
    config?: SwarmConfig;
    signal?: AbortSignal;
  }): Promise<SwarmConsensusResult> {
    const sessionId = `swarm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const config: Required<SwarmConfig> = {
      ...this.DEFAULT_CONFIG,
      ...(params.config || {}),
      customPersonaWeights: {
        ...this.DEFAULT_CONFIG.customPersonaWeights,
        ...(params.config?.customPersonaWeights || {}),
      },
    };

    SwarmCollaborationBus.clear();
    SwarmPersonaRegistry.initialize();

    const activeRoles = config.enabledPersonas;
    const initialProposals = params.initialProposals && params.initialProposals.length > 0
      ? [...params.initialProposals]
      : [this.synthesizeDefaultProposal(params.goal, params.project)];

    for (const p of initialProposals) {
      SwarmCollaborationBus.registerProposal(p);
    }

    let currentProposal = initialProposals[0];
    const transcript: SwarmMessage[] = [];
    const conflictResolutions: ConflictRecord[] = [];
    let synthesizedModifications: ProposedModification[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // ROUND 1: INITIAL PROPOSAL BROADCAST
    // ─────────────────────────────────────────────────────────────────────────
    const round1Messages: SwarmMessage[] = [];
    for (const p of initialProposals) {
      const authorPersona = SwarmPersonaRegistry.getPersona(p.authorRole);
      const msg: SwarmMessage = {
        id: `msg_r1_${p.id}`,
        roundNumber: 1,
        senderId: p.authorId,
        senderName: authorPersona?.name || p.authorRole,
        senderRole: p.authorRole,
        type: 'PROPOSAL',
        targetProposalId: p.id,
        content: `Proposal submitted for goal: "${p.title}". Outlining ${p.steps.length} atomic steps.`,
        proposedModifications: p.modifications,
        timestamp: Date.now(),
      };
      SwarmCollaborationBus.postMessage(msg);
      round1Messages.push(msg);
      transcript.push(msg);
    }

    const round1: SwarmDebateRound = {
      roundNumber: 1,
      messages: round1Messages,
      activeProposals: initialProposals,
      consensusScore: 0.5,
      roundSummary: `Initial proposals presented by ${initialProposals.map((p) => p.authorRole).join(', ')}.`,
    };
    SwarmCollaborationBus.recordRound(round1);

    if (params.signal?.aborted) {
      return this.createAbortedResult(sessionId, config.consensusMode, currentProposal, transcript);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ROUND 2: CONCURRENT CRITIQUE, EVALUATION & VETO CHECK
    // ─────────────────────────────────────────────────────────────────────────
    const round2Messages: SwarmMessage[] = [];
    const proposedModsAccumulator: ProposedModification[] = [];
    let vetoOccurred = false;
    let vetoReason: string | undefined;

    for (const role of activeRoles) {
      const persona = SwarmPersonaRegistry.getPersona(role)!;
      const evalResult = SwarmPersonaRegistry.evaluateProposal(role, currentProposal, params.project);

      // Check if security officer vetoed
      if (evalResult.vetoTriggered) {
        vetoOccurred = true;
        vetoReason = evalResult.vetoReason || `${role} issued a binding veto against the proposal.`;
        const vetoMsg: SwarmMessage = {
          id: `msg_veto_${role}_${Date.now()}`,
          roundNumber: 2,
          senderId: persona.id,
          senderName: persona.name,
          senderRole: role,
          type: 'CRITIQUE',
          targetProposalId: currentProposal.id,
          content: `VETO ISSUED: ${vetoReason}`,
          score: evalResult.score,
          voteDecision: 'REJECT',
          proposedModifications: evalResult.suggestedModifications,
          timestamp: Date.now(),
        };
        SwarmCollaborationBus.postMessage(vetoMsg);
        round2Messages.push(vetoMsg);
        transcript.push(vetoMsg);
        break; // Hard veto immediately halts progression
      }

      proposedModsAccumulator.push(...evalResult.suggestedModifications);

      const critiqueContent = [
        ...evalResult.critiques.map((c) => `[CRITIQUE] ${c}`),
        ...evalResult.endorsements.map((e) => `[ENDORSEMENT] ${e}`),
      ].join(' | ');

      const msg: SwarmMessage = {
        id: `msg_r2_${role}_${Date.now()}`,
        roundNumber: 2,
        senderId: persona.id,
        senderName: persona.name,
        senderRole: role,
        type: evalResult.decision === 'APPROVE' ? 'ENDORSEMENT' : 'CRITIQUE',
        targetProposalId: currentProposal.id,
        content: critiqueContent || `Evaluated by ${persona.name}.`,
        score: evalResult.score,
        voteDecision: evalResult.decision,
        conditions: evalResult.critiques,
        proposedModifications: evalResult.suggestedModifications,
        timestamp: Date.now(),
      };

      SwarmCollaborationBus.postMessage(msg);
      round2Messages.push(msg);
      transcript.push(msg);
    }

    const round2: SwarmDebateRound = {
      roundNumber: 2,
      messages: round2Messages,
      activeProposals: [currentProposal],
      consensusScore: vetoOccurred ? 0.0 : 0.65,
      roundSummary: vetoOccurred ? `Debate halted due to ${vetoReason}` : 'Critiques and suggested modifications logged.',
    };
    SwarmCollaborationBus.recordRound(round2);

    if (vetoOccurred) {
      const auditHash = SwarmCollaborationBus.computeAuditHash();
      return {
        sessionId,
        status: 'VETOED',
        consensusMode: config.consensusMode,
        winningProposal: undefined,
        totalRounds: 2,
        agreementRatioPercent: 0,
        votesByPersona: this.summarizeVotes(round2Messages, config),
        synthesizedModifications: [],
        conflictResolutions: [],
        debateTranscript: transcript,
        auditHash,
        timestamp: Date.now(),
        vetoReason,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ROUND 3: DISPUTE ARBITRATION, COMPROMISE SYNTHESIS & FORMAL VOTING
    // ─────────────────────────────────────────────────────────────────────────
    const { sanitizedMods, conflicts } = this.arbitrateModifications(proposedModsAccumulator);
    synthesizedModifications = sanitizedMods;
    conflictResolutions.push(...conflicts);

    // Apply synthesized modifications into refined proposal
    currentProposal = this.applyModificationsToProposal(currentProposal, synthesizedModifications);
    SwarmCollaborationBus.registerProposal(currentProposal);

    const round3Messages: SwarmMessage[] = [];
    const voteMap: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number; rationale?: string }> = {} as any;

    for (const role of activeRoles) {
      const persona = SwarmPersonaRegistry.getPersona(role)!;
      const weight = config.customPersonaWeights[role] ?? persona.weight;

      // Re-evaluate against the newly refined compromise proposal
      const recheck = SwarmPersonaRegistry.evaluateProposal(role, currentProposal, params.project);
      const voteDecision: VoteDecision = recheck.score >= 70 ? 'APPROVE' : recheck.score >= 50 ? 'CONDITIONAL' : 'REJECT';

      voteMap[role] = {
        decision: voteDecision,
        score: recheck.score,
        weight,
        rationale: recheck.endorsements[0] || recheck.critiques[0] || 'Vote cast on compromise proposal',
      };

      const voteMsg: SwarmMessage = {
        id: `msg_r3_vote_${role}_${Date.now()}`,
        roundNumber: 3,
        senderId: persona.id,
        senderName: persona.name,
        senderRole: role,
        type: 'VOTE',
        targetProposalId: currentProposal.id,
        content: `Formal vote cast: ${voteDecision} with score ${recheck.score}/100.`,
        score: recheck.score,
        voteDecision,
        timestamp: Date.now(),
      };

      SwarmCollaborationBus.postMessage(voteMsg);
      round3Messages.push(voteMsg);
      transcript.push(voteMsg);
    }

    const consensusEval = this.evaluateConsensus(voteMap, config.consensusMode, config.consensusThreshold);

    const round3: SwarmDebateRound = {
      roundNumber: 3,
      messages: round3Messages,
      activeProposals: [currentProposal],
      consensusScore: consensusEval.agreementRatioPercent / 100,
      roundSummary: `Consensus evaluation: ${consensusEval.status} (${consensusEval.agreementRatioPercent}% agreement under ${config.consensusMode}).`,
    };
    SwarmCollaborationBus.recordRound(round3);

    const auditHash = SwarmCollaborationBus.computeAuditHash();

    return {
      sessionId,
      status: consensusEval.status,
      consensusMode: config.consensusMode,
      winningProposal: consensusEval.status === 'CONSENSUS_REACHED' ? currentProposal : undefined,
      totalRounds: 3,
      agreementRatioPercent: consensusEval.agreementRatioPercent,
      votesByPersona: voteMap,
      synthesizedModifications,
      conflictResolutions,
      debateTranscript: transcript,
      auditHash,
      timestamp: Date.now(),
    };
  }

  /**
   * Evaluates consensus under chosen algorithmic rule.
   */
  public static evaluateConsensus(
    votes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number }>,
    mode: SwarmConsensusMode,
    threshold = 0.7
  ): { status: 'CONSENSUS_REACHED' | 'DEADLOCK'; agreementRatioPercent: number } {
    const roles = Object.keys(votes) as AgentPersonaRole[];
    if (roles.length === 0) {
      return { status: 'DEADLOCK', agreementRatioPercent: 0 };
    }

    let totalWeight = 0;
    let approvedWeight = 0;
    let approveCount = 0;
    let rejectCount = 0;

    for (const role of roles) {
      const v = votes[role];
      totalWeight += v.weight;
      if (v.decision === 'APPROVE' || v.decision === 'CONDITIONAL') {
        approvedWeight += v.weight;
        approveCount++;
      } else if (v.decision === 'REJECT') {
        rejectCount++;
      }
    }

    const agreementRatio = totalWeight > 0 ? approvedWeight / totalWeight : 0;
    const agreementRatioPercent = Math.round(agreementRatio * 1000) / 10;

    switch (mode) {
      case 'UNANIMOUS': {
        const unanimousPass = roles.every((r) => votes[r].decision === 'APPROVE');
        return {
          status: unanimousPass ? 'CONSENSUS_REACHED' : 'DEADLOCK',
          agreementRatioPercent: unanimousPass ? 100 : agreementRatioPercent,
        };
      }

      case 'WEIGHTED_MAJORITY': {
        const passed = agreementRatio >= threshold;
        return {
          status: passed ? 'CONSENSUS_REACHED' : 'DEADLOCK',
          agreementRatioPercent,
        };
      }

      case 'BFT_QUORUM': {
        // Byzantine Fault Tolerance quorum: requires >= ceil((2N + 1) / 3) approvals
        const bftThreshold = Math.ceil((2 * roles.length + 1) / 3);
        const passed = approveCount >= bftThreshold;
        return {
          status: passed ? 'CONSENSUS_REACHED' : 'DEADLOCK',
          agreementRatioPercent,
        };
      }

      case 'HIERARCHICAL': {
        // Lead Architect breaks tie or decides if agreement is at least 50%
        const archVote = votes['ARCHITECT'];
        const passed = archVote
          ? archVote.decision === 'APPROVE' || archVote.decision === 'CONDITIONAL'
          : agreementRatio >= 0.5;
        return {
          status: passed ? 'CONSENSUS_REACHED' : 'DEADLOCK',
          agreementRatioPercent,
        };
      }

      default:
        return {
          status: agreementRatio >= threshold ? 'CONSENSUS_REACHED' : 'DEADLOCK',
          agreementRatioPercent,
        };
    }
  }

  /**
   * Conflict detection and arbitration.
   */
  public static arbitrateModifications(modifications: ProposedModification[]): {
    sanitizedMods: ProposedModification[];
    conflicts: ConflictRecord[];
  } {
    const sanitizedMods: ProposedModification[] = [];
    const conflicts: ConflictRecord[] = [];
    const seenActionsByTarget = new Map<string, ProposedModification>();

    for (const mod of modifications) {
      // Discard unsafe / blocking modifications
      if (mod.securityImpact === 'BLOCKING') {
        continue;
      }

      const key = `${mod.targetEntity}:${mod.action}`;
      if (seenActionsByTarget.has(key)) {
        const existing = seenActionsByTarget.get(key)!;
        // Conflict detected
        const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        conflicts.push({
          id: conflictId,
          conflictType: 'MUTUAL_EXCLUSION',
          involvedPersonas: ['UX_DESIGNER', 'ARCHITECT'],
          conflictingProposals: [existing.description, mod.description],
          resolutionSummary: `Arbitrated in favor of safer action: ${existing.description}`,
          compromiseModifications: [existing],
        });
      } else {
        seenActionsByTarget.set(key, mod);
        sanitizedMods.push(mod);
      }
    }

    return { sanitizedMods, conflicts };
  }

  /**
   * Synthesizes a baseline proposal from goal and project.
   */
  private static synthesizeDefaultProposal(goal: string, project: AppProject): SwarmProposal {
    const targetPage = project.pages[0] || { id: 'page_main', name: 'Main' };
    return {
      id: `prop_base_${Date.now()}`,
      authorId: 'persona_architect',
      authorRole: 'ARCHITECT',
      title: goal.length > 50 ? goal.substring(0, 47) + '...' : goal,
      description: `Baseline architecture formulated by System Architect for: ${goal}`,
      steps: [
        {
          stepId: 'step_1',
          id: 'step_1',
          type: 'create_component',
          action: 'CREATE_COMPONENT',
          description: `Create primary component for ${goal}`,
          targetPageId: targetPage.id,
          payload: {
            name: 'GeneratedContainer',
            type: 'container',
            props: { title: 'Container' },
            styles: { padding: '16px' },
          },
        },
      ],
      modifications: [],
      createdAt: Date.now(),
    };
  }

  /**
   * Injects synthesized modifications into proposal steps.
   */
  private static applyModificationsToProposal(
    proposal: SwarmProposal,
    modifications: ProposedModification[]
  ): SwarmProposal {
    const cloned = JSON.parse(JSON.stringify(proposal)) as SwarmProposal;
    cloned.modifications = modifications;

    for (const mod of modifications) {
      if (mod.action === 'MODIFY' || mod.action === 'WRAP' || mod.action === 'STYLE') {
        cloned.steps.forEach((step) => {
          if (step.payload) {
            if (mod.id.includes('aria')) {
              step.payload.props = {
                ...(step.payload.props || {}),
                role: 'region',
                'aria-label': step.payload.name || 'Component Section',
              };
            }
            if (mod.id.includes('testids')) {
              step.payload.props = {
                ...(step.payload.props || {}),
                'data-testid': step.payload['data-testid'] || `cmp-${Date.now()}`,
              };
            }
            if (mod.id.includes('responsive')) {
              step.payload.styles = {
                ...(step.payload.styles || {}),
                display: 'flex',
                flexWrap: 'wrap',
              };
            }
          }
        });
      }
    }

    return cloned;
  }

  private static summarizeVotes(
    messages: SwarmMessage[],
    config: Required<SwarmConfig>
  ): Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number; rationale?: string }> {
    const votes: Record<AgentPersonaRole, { decision: VoteDecision; score: number; weight: number; rationale?: string }> = {} as any;
    for (const msg of messages) {
      const persona = SwarmPersonaRegistry.getPersona(msg.senderRole);
      const weight = config.customPersonaWeights[msg.senderRole] ?? persona?.weight ?? 2.5;
      votes[msg.senderRole] = {
        decision: msg.voteDecision || 'ABSTAIN',
        score: msg.score ?? 50,
        weight,
        rationale: msg.content,
      };
    }
    return votes;
  }

  private static createAbortedResult(
    sessionId: string,
    mode: SwarmConsensusMode,
    proposal: SwarmProposal,
    transcript: SwarmMessage[]
  ): SwarmConsensusResult {
    return {
      sessionId,
      status: 'TIMEOUT',
      consensusMode: mode,
      winningProposal: undefined,
      totalRounds: 1,
      agreementRatioPercent: 0,
      votesByPersona: {} as any,
      synthesizedModifications: [],
      conflictResolutions: [],
      debateTranscript: transcript,
      auditHash: crypto.createHash('sha256').update(sessionId).digest('hex'),
      timestamp: Date.now(),
    };
  }
}
