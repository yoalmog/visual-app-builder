// src/ai/swarm/swarm-types.ts
// Core types and interfaces for D8.19: Advanced Multi-Agent Collaboration & Swarm Consensus Engine

import { AppProject } from '../../builder/schema/project';
import { PlanStep } from '../intelligence/types';

export type AgentPersonaRole =
  | 'ARCHITECT'
  | 'UX_DESIGNER'
  | 'SECURITY_OFFICER'
  | 'DATA_ENGINEER'
  | 'QA_SPECIALIST';

export interface EvaluationDimension {
  name: string;
  weight: number; // 0.0 - 1.0
  description: string;
}

export interface AgentPersona {
  id: string;
  name: string;
  role: AgentPersonaRole;
  avatar: string;
  systemPrompt: string;
  specialty: string;
  weight: number; // 1.0 - 5.0
  evaluationDimensions: EvaluationDimension[];
  hasVetoAuthority: boolean;
}

export type SwarmMessageType =
  | 'PROPOSAL'
  | 'CRITIQUE'
  | 'COUNTER_PROPOSAL'
  | 'ENDORSEMENT'
  | 'VOTE'
  | 'COMPROMISE';

export type VoteDecision = 'APPROVE' | 'REJECT' | 'ABSTAIN' | 'CONDITIONAL';

export interface ProposedModification {
  id: string;
  targetEntity: string;
  action: 'ADD' | 'MODIFY' | 'DELETE' | 'WRAP' | 'STYLE' | 'VALIDATE';
  description: string;
  rationale: string;
  proposedValue?: any;
  securityImpact?: 'SAFE' | 'POTENTIALLY_RISKY' | 'BLOCKING';
}

export interface SwarmPlanStep {
  stepId?: string;
  id?: string;
  title?: string;
  description: string;
  type?: string;
  action?: string;
  targetPageId?: string;
  payload?: any;
  operation?: any;
  [key: string]: any;
}

export interface SwarmProposal {
  id: string;
  authorId: string;
  authorRole: AgentPersonaRole;
  title: string;
  description: string;
  steps: SwarmPlanStep[];
  modifications: ProposedModification[];
  createdAt: number;
}

export interface SwarmMessage {
  id: string;
  roundNumber: number;
  senderId: string;
  senderName: string;
  senderRole: AgentPersonaRole;
  type: SwarmMessageType;
  targetProposalId?: string;
  content: string;
  score?: number; // 0 - 100
  voteDecision?: VoteDecision;
  conditions?: string[];
  proposedModifications?: ProposedModification[];
  timestamp: number;
}

export type SwarmConsensusMode =
  | 'UNANIMOUS'
  | 'WEIGHTED_MAJORITY'
  | 'BFT_QUORUM'
  | 'HIERARCHICAL';

export interface ConflictRecord {
  id: string;
  conflictType: 'SECURITY_VS_UX' | 'PERFORMANCE_VS_RELIABILITY' | 'SCHEMA_DIVERGENCE' | 'MUTUAL_EXCLUSION';
  involvedPersonas: AgentPersonaRole[];
  conflictingProposals: string[];
  resolutionSummary: string;
  compromiseModifications: ProposedModification[];
}

export interface SwarmDebateRound {
  roundNumber: number;
  messages: SwarmMessage[];
  activeProposals: SwarmProposal[];
  consensusScore: number; // 0.0 - 1.0
  roundSummary: string;
}

export interface SwarmConsensusResult {
  sessionId: string;
  status: 'CONSENSUS_REACHED' | 'DEADLOCK' | 'TIMEOUT' | 'VETOED';
  consensusMode: SwarmConsensusMode;
  winningProposal?: SwarmProposal;
  totalRounds: number;
  agreementRatioPercent: number; // 0 - 100
  votesByPersona: Record<AgentPersonaRole, {
    decision: VoteDecision;
    score: number;
    weight: number;
    rationale?: string;
  }>;
  synthesizedModifications: ProposedModification[];
  conflictResolutions: ConflictRecord[];
  debateTranscript: SwarmMessage[];
  auditHash: string; // SHA-256 deterministic hash
  timestamp: number;
  vetoReason?: string;
}

export interface SwarmConfig {
  maxRounds?: number;
  consensusMode?: SwarmConsensusMode;
  consensusThreshold?: number; // 0.5 - 1.0 (default 0.70)
  timeoutMs?: number;
  enabledPersonas?: AgentPersonaRole[];
  customPersonaWeights?: Partial<Record<AgentPersonaRole, number>>;
}
