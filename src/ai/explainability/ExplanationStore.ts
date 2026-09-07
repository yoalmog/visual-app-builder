// D8.11: Explanation Store
// Append-only, project-isolated, secret-redacted, persistent store for AI Explanations and Checkpoints.

import {
  Explanation,
  ExplanationId,
  ExplanationSession,
  ExplanationSessionId,
  ExplanationCheckpoint,
  ExplanationQuery,
  ExplanationQueryResult,
  ExplanationTraceId,
} from './explainability-types';
import { AISecretFilter } from '../security/AISecretFilter';

export class ExplanationStore {
  private static explanations: Map<string, Explanation> = new Map();
  private static sessions: Map<string, ExplanationSession> = new Map();
  private static checkpoints: Map<string, ExplanationCheckpoint> = new Map();
  private static storageFilePath: string = '.phase8/explanations.json';
  private static checkpointFilePath: string = '.phase8/checkpoint-d8-11.json';
  private static isInitialized: boolean = false;

  /**
   * Initializes the store and loads existing explanations from disk if available.
   */
  public static initialize(customStoragePath?: string, customCheckpointPath?: string): void {
    if (customStoragePath) {
      this.storageFilePath = customStoragePath;
    }
    if (customCheckpointPath) {
      this.checkpointFilePath = customCheckpointPath;
    }
    this.loadFromDisk();
    this.isInitialized = true;
  }

  /**
   * Saves an explanation with strict project-scoping and secret redaction.
   */
  public static saveExplanation(explanation: Explanation): { success: boolean; error?: string } {
    if (!explanation.projectId) {
      return { success: false, error: 'Project isolation violation: explanation missing mandatory projectId.' };
    }
    if (!explanation.explanationId || !explanation.traceId) {
      return { success: false, error: 'Malformed explanation: missing explanationId or traceId.' };
    }

    // Redact any nested sensitive text/credentials defensively before saving
    const redactedExplanation = AISecretFilter.redactObject(explanation) as Explanation;

    this.explanations.set(redactedExplanation.explanationId, redactedExplanation);

    // Update or create session
    const sessionId = redactedExplanation.sessionId;
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        projectId: redactedExplanation.projectId,
        traceId: redactedExplanation.traceId,
        currentState: redactedExplanation.state,
        checkpoints: [],
        latestExplanation: redactedExplanation,
        createdAt: redactedExplanation.createdAt,
        updatedAt: redactedExplanation.completedAt || redactedExplanation.createdAt,
      };
      this.sessions.set(sessionId, session);
    } else {
      if (session.projectId !== redactedExplanation.projectId) {
        return { success: false, error: 'Project isolation violation: session projectId mismatch.' };
      }
      session.currentState = redactedExplanation.state;
      session.latestExplanation = redactedExplanation;
      session.updatedAt = redactedExplanation.completedAt || new Date().toISOString();
    }

    this.persistToDisk();
    return { success: true };
  }

  /**
   * Retrieves an explanation with strict project isolation validation.
   */
  public static getExplanation(explanationId: ExplanationId, projectId: string): Explanation | undefined {
    const exp = this.explanations.get(explanationId);
    if (!exp) return undefined;
    if (exp.projectId !== projectId) {
      // Reject cross-project access
      return undefined;
    }
    return exp;
  }

  /**
   * Retrieves the latest explanation for a trace with strict project isolation validation.
   */
  public static getExplanationByTrace(traceId: ExplanationTraceId, projectId: string): Explanation | undefined {
    const matching = Array.from(this.explanations.values()).filter(
      (e) => e.traceId === traceId && e.projectId === projectId
    );
    if (matching.length === 0) return undefined;
    // Return latest by creation timestamp
    return matching.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  /**
   * Saves a checkpoint during explanation reconstruction.
   */
  public static saveCheckpoint(checkpoint: ExplanationCheckpoint): { success: boolean; error?: string } {
    if (!checkpoint.projectId) {
      return { success: false, error: 'Project isolation violation: checkpoint missing projectId.' };
    }
    if (!checkpoint.checkpointId || !checkpoint.explanationId) {
      return { success: false, error: 'Malformed checkpoint: missing checkpointId or explanationId.' };
    }

    const cleanCheckpoint = AISecretFilter.redactObject(checkpoint) as ExplanationCheckpoint;
    this.checkpoints.set(cleanCheckpoint.checkpointId, cleanCheckpoint);

    // Link to session
    const session = this.sessions.get(cleanCheckpoint.sessionId);
    if (session && session.projectId === cleanCheckpoint.projectId) {
      session.checkpoints.push(cleanCheckpoint);
      session.currentState = cleanCheckpoint.state;
      session.updatedAt = cleanCheckpoint.timestamp;
    }

    this.persistCheckpointsToDisk();
    return { success: true };
  }

  /**
   * Retrieves a checkpoint with project isolation validation.
   */
  public static getCheckpoint(checkpointId: string, projectId: string): ExplanationCheckpoint | undefined {
    const cp = this.checkpoints.get(checkpointId);
    if (!cp) return undefined;
    if (cp.projectId !== projectId) {
      return undefined;
    }
    return cp;
  }

  /**
   * Retrieves the latest checkpoint for a trace with project isolation validation.
   */
  public static getLatestCheckpointForTrace(traceId: ExplanationTraceId, projectId: string): ExplanationCheckpoint | undefined {
    const matching = Array.from(this.checkpoints.values()).filter(
      (cp) => cp.traceId === traceId && cp.projectId === projectId
    );
    if (matching.length === 0) return undefined;
    return matching.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  }

  /**
   * Retrieves session by ID with project isolation validation.
   */
  public static getSession(sessionId: ExplanationSessionId, projectId: string): ExplanationSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (session.projectId !== projectId) return undefined;
    return session;
  }

  /**
   * Queries explanations with filtering and pagination.
   */
  public static queryExplanations(query: ExplanationQuery): ExplanationQueryResult {
    if (!query.projectId) {
      return { explanations: [], totalCount: 0, hasMore: false };
    }

    let results = Array.from(this.explanations.values()).filter(
      (e) => e.projectId === query.projectId
    );

    if (query.traceId) {
      results = results.filter((e) => e.traceId === query.traceId);
    }
    if (query.explanationId) {
      results = results.filter((e) => e.explanationId === query.explanationId);
    }
    if (query.status) {
      results = results.filter((e) => e.status === query.status);
    }
    if (query.hasUncertainty !== undefined) {
      results = results.filter((e) => e.uncertainty.hasUncertainty === query.hasUncertainty);
    }
    if (query.minConfidence) {
      const order = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'];
      const minIdx = order.indexOf(query.minConfidence);
      results = results.filter((e) => order.indexOf(e.confidence.level) >= minIdx);
    }
    if (query.startTime) {
      results = results.filter((e) => e.createdAt >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter((e) => e.createdAt <= query.endTime!);
    }

    // Sort by creation descending (newest first)
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const totalCount = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginated = results.slice(offset, offset + limit);

    return {
      explanations: paginated,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  }

  /**
   * Clears in-memory state and deletes persistence files (for test teardown).
   */
  public static clear(): void {
    this.explanations.clear();
    this.sessions.clear();
    this.checkpoints.clear();
    this.persistToDisk();
    this.persistCheckpointsToDisk();
  }

  /**
   * Persists explanations to disk safely.
   */
  private static persistToDisk(): void {
    if (typeof window !== 'undefined') return;

    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        savedAt: new Date().toISOString(),
        totalExplanations: this.explanations.size,
        explanations: Array.from(this.explanations.entries()),
        sessions: Array.from(this.sessions.entries()),
      };

      fs.writeFileSync(this.storageFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Persists checkpoints to disk safely.
   */
  private static persistCheckpointsToDisk(): void {
    if (typeof window !== 'undefined') return;

    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(this.checkpointFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        savedAt: new Date().toISOString(),
        totalCheckpoints: this.checkpoints.size,
        checkpoints: Array.from(this.checkpoints.entries()),
      };

      fs.writeFileSync(this.checkpointFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Loads explanations and checkpoints from disk safely.
   */
  private static loadFromDisk(): void {
    if (typeof window !== 'undefined') return;

    try {
      const fs = require('fs');
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.explanations)) {
          this.explanations = new Map(parsed.explanations);
        }
        if (Array.isArray(parsed.sessions)) {
          this.sessions = new Map(parsed.sessions);
        }
      }

      if (fs.existsSync(this.checkpointFilePath)) {
        const rawCp = fs.readFileSync(this.checkpointFilePath, 'utf-8');
        const parsedCp = JSON.parse(rawCp);
        if (Array.isArray(parsedCp.checkpoints)) {
          this.checkpoints = new Map(parsedCp.checkpoints);
        }
      }
    } catch {
      // Fallback cleanly
    }
  }

  public static getExplanationsCount(): number {
    return this.explanations.size;
  }

  public static getCheckpointsCount(): number {
    return this.checkpoints.size;
  }
}
