// src/ai/swarm/SwarmCollaborationBus.ts
// Central pub/sub collaboration bus and concurrent state blackboard for D8.19 Swarm Consensus

import { SwarmMessage, SwarmDebateRound, SwarmProposal } from './swarm-types';
import { ConcurrencyManager } from '../intelligence/ConcurrencyManager';
import crypto from 'crypto';

export type SwarmMessageHandler = (message: SwarmMessage) => void;
export type SwarmRoundHandler = (round: SwarmDebateRound) => void;

export class SwarmCollaborationBus {
  private static messages: SwarmMessage[] = [];
  private static rounds: SwarmDebateRound[] = [];
  private static proposals: Map<string, SwarmProposal> = new Map();
  private static messageListeners: Set<SwarmMessageHandler> = new Set();
  private static roundListeners: Set<SwarmRoundHandler> = new Set();

  /**
   * Posts a message to the swarm blackboard with concurrency protection.
   */
  public static postMessage(message: SwarmMessage): void {
    const lockKey = `swarm_bus_${message.roundNumber}`;
    const holder = `persona_${message.senderId}_${Date.now()}`;

    // Acquire lightweight non-blocking lock
    ConcurrencyManager.acquireLock(lockKey, holder, 5000);
    try {
      this.messages.push(message);
      this.messageListeners.forEach((listener) => {
        try {
          listener(message);
        } catch (err) {
          console.warn(`[SwarmCollaborationBus] Listener error: ${(err as any).message}`);
        }
      });
    } finally {
      ConcurrencyManager.releaseLock(lockKey, holder);
    }
  }

  /**
   * Registers a proposal on the shared blackboard.
   */
  public static registerProposal(proposal: SwarmProposal): void {
    this.proposals.set(proposal.id, proposal);
  }

  public static getProposal(id: string): SwarmProposal | undefined {
    return this.proposals.get(id);
  }

  public static getAllProposals(): SwarmProposal[] {
    const list: SwarmProposal[] = [];
    this.proposals.forEach((p) => list.push(p));
    return list;
  }

  /**
   * Records the completion of a debate round.
   */
  public static recordRound(round: SwarmDebateRound): void {
    this.rounds.push(round);
    this.roundListeners.forEach((listener) => {
      try {
        listener(round);
      } catch (err) {
        console.warn(`[SwarmCollaborationBus] Round listener error: ${(err as any).message}`);
      }
    });
  }

  public static getTranscript(): SwarmMessage[] {
    return [...this.messages];
  }

  public static getMessagesByRound(roundNumber: number): SwarmMessage[] {
    return this.messages.filter((m) => m.roundNumber === roundNumber);
  }

  public static getMessagesByRole(role: string): SwarmMessage[] {
    return this.messages.filter((m) => m.senderRole === role);
  }

  public static getRounds(): SwarmDebateRound[] {
    return [...this.rounds];
  }

  public static onMessage(handler: SwarmMessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  public static onRoundComplete(handler: SwarmRoundHandler): () => void {
    this.roundListeners.add(handler);
    return () => this.roundListeners.delete(handler);
  }

  /**
   * Computes a deterministic SHA-256 audit hash over the entire debate history.
   */
  public static computeAuditHash(): string {
    const payload = JSON.stringify({
      messages: this.messages.map((m) => ({
        id: m.id,
        round: m.roundNumber,
        sender: m.senderId,
        role: m.senderRole,
        type: m.type,
        decision: m.voteDecision,
        score: m.score,
      })),
      proposals: Array.from(this.proposals.keys()).sort(),
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  public static clear(): void {
    this.messages = [];
    this.rounds = [];
    this.proposals.clear();
    this.messageListeners.clear();
    this.roundListeners.clear();
    ConcurrencyManager.clear();
  }
}
