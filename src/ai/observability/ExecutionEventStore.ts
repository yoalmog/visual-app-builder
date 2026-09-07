// D8.10: Execution Event Store
// Append-only, project-isolated, secret-redacted, persistent event store for AI Execution Timeline.

import {
  ExecutionEvent,
  ExecutionEventId,
  ExecutionTraceId,
  ExecutionTimelineQuery,
  ExecutionTimelineQueryResult,
  ExecutionRetentionPolicy,
  ExecutionRedactionResult,
  ExecutionCheckpoint,
} from './observability-types';
import { AISecretFilter } from '../security/AISecretFilter';

const DEFAULT_RETENTION_POLICY: ExecutionRetentionPolicy = {
  maxEventsPerTrace: 500,
  maxPersistedTraces: 100,
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class ExecutionEventStore {
  private static events: ExecutionEvent[] = [];
  private static checkpoints: Map<string, ExecutionCheckpoint> = new Map();
  private static retentionPolicy: ExecutionRetentionPolicy = { ...DEFAULT_RETENTION_POLICY };
  private static eventsRedactedCount: number = 0;
  private static eventsDroppedCount: number = 0;
  private static isInitialized: boolean = false;
  private static storageFilePath: string = '.phase8/execution-events.json';

  /**
   * Initializes the event store and restores persisted events from disk if available.
   */
  public static initialize(customFilePath?: string): void {
    if (customFilePath) {
      this.storageFilePath = customFilePath;
    }
    this.loadFromDisk();
    this.isInitialized = true;
  }

  /**
   * Appends an event to the store with validation, sanitization, secret redaction, and project scoping.
   */
  public static appendEvent(event: ExecutionEvent): { success: boolean; event?: ExecutionEvent; error?: string } {
    if (!event.correlation?.projectId) {
      return { success: false, error: 'Event missing mandatory projectId in correlation context.' };
    }

    if (!event.eventId || !event.eventType || !event.timestamp) {
      return { success: false, error: 'Malformed event: missing required eventId, eventType, or timestamp.' };
    }

    // Idempotency: Reject exact duplicate eventId
    if (this.events.some((e) => e.eventId === event.eventId)) {
      return { success: false, error: `Duplicate event rejected: ${event.eventId}` };
    }

    // Sanitize & Redact secrets
    const redactionRes = this.sanitizeAndRedact(event);
    const sanitizedEvent: ExecutionEvent = {
      ...event,
      metadata: redactionRes.sanitizedMetadata,
      redacted: redactionRes.redacted || event.redacted,
    };

    if (redactionRes.redacted) {
      this.eventsRedactedCount++;
    }

    // Retention check per trace
    const traceEvents = this.events.filter((e) => e.correlation.traceId === event.correlation.traceId);
    if (traceEvents.length >= this.retentionPolicy.maxEventsPerTrace) {
      this.eventsDroppedCount++;
      return { success: false, error: `Trace ${event.correlation.traceId} exceeded maximum events retention limit.` };
    }

    this.events.push(sanitizedEvent);
    this.persistToDisk();

    return { success: true, event: sanitizedEvent };
  }

  public static query(params: any): ExecutionTimelineQueryResult {
    return this.queryEvents(params.filter ? params : { filter: params });
  }

  /**
   * Queries events with mandatory project isolation and multi-dimensional filtering.
   */
  public static queryEvents(query: ExecutionTimelineQuery): ExecutionTimelineQueryResult {
    if (!query.filter?.projectId) {
      throw new Error('Project isolation violation: queries must specify a projectId.');
    }

    const { filter } = query;
    let filtered = this.events.filter((e) => e.correlation.projectId === filter.projectId);

    if (filter.traceId) {
      filtered = filtered.filter((e) => e.correlation.traceId === filter.traceId);
    }
    if (filter.sessionId) {
      filtered = filtered.filter((e) => e.correlation.sessionId === filter.sessionId);
    }
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      filtered = filtered.filter((e) => filter.eventTypes!.includes(e.eventType));
    }
    if (filter.statuses && filter.statuses.length > 0) {
      filtered = filtered.filter((e) => filter.statuses!.includes(e.status));
    }
    if (filter.severities && filter.severities.length > 0) {
      filtered = filtered.filter((e) => filter.severities!.includes(e.severity));
    }
    if (filter.startTime !== undefined) {
      filtered = filtered.filter((e) => e.timestamp.epochMs >= filter.startTime!);
    }
    if (filter.endTime !== undefined) {
      filtered = filtered.filter((e) => e.timestamp.epochMs <= filter.endTime!);
    }
    if (filter.transactionId) {
      filtered = filtered.filter((e) => e.correlation.transactionId === filter.transactionId);
    }
    if (filter.operationId) {
      filtered = filtered.filter((e) => e.correlation.operationId === filter.operationId);
    }
    if (filter.decisionId) {
      filtered = filtered.filter((e) => e.correlation.decisionId === filter.decisionId);
    }
    if (filter.verificationId) {
      filtered = filtered.filter((e) => e.correlation.verificationId === filter.verificationId);
    }
    if (filter.recoveryId) {
      filtered = filtered.filter((e) => e.correlation.recoveryId === filter.recoveryId);
    }
    if (filter.minDurationMs !== undefined) {
      filtered = filtered.filter((e) => (e.duration?.durationMs || 0) >= filter.minDurationMs!);
    }

    // Sort
    const sortBy = query.sortBy || 'sequenceNumber';
    const sortOrder = query.sortOrder || 'asc';
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'sequenceNumber') {
        cmp = a.sequenceNumber - b.sequenceNumber;
      } else if (sortBy === 'timestamp') {
        cmp = a.timestamp.epochMs - b.timestamp.epochMs;
      } else if (sortBy === 'duration') {
        cmp = (a.duration?.durationMs || 0) - (b.duration?.durationMs || 0);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    const totalCount = filtered.length;
    const offset = query.offset || 0;
    const limit = query.limit || totalCount;
    const paged = filtered.slice(offset, offset + limit);

    return {
      events: paged,
      totalCount,
      hasMore: offset + limit < totalCount,
      appliedFilter: filter,
    };
  }

  /**
   * Retrieves all events for a trace ensuring project scope validation.
   */
  public static getEventsForTrace(traceId: ExecutionTraceId, projectId: string): ExecutionEvent[] {
    if (!projectId) {
      throw new Error('Project isolation violation: projectId must be supplied.');
    }
    // Strict isolation: only return events matching both traceId AND projectId
    return this.events.filter((e) => e.correlation.traceId === traceId && e.correlation.projectId === projectId);
  }

  /**
   * Alias for getEventsForTrace for D8.11 explainability engine.
   */
  public static getTraceEvents(traceId: ExecutionTraceId, projectId: string): ExecutionEvent[] {
    return this.getEventsForTrace(traceId, projectId);
  }


  /**
   * Checks whether any cross-project event exists for the given trace.
   */
  public static validateTraceProjectIsolation(traceId: ExecutionTraceId, requestingProjectId: string): boolean {
    const traceEvents = this.events.filter((e) => e.correlation.traceId === traceId);
    if (traceEvents.length === 0) return true;
    return traceEvents.every((e) => e.correlation.projectId === requestingProjectId);
  }

  /**
   * Saves a checkpoint for crash recovery.
   */
  public static saveCheckpoint(checkpoint: ExecutionCheckpoint, projectId: string): void {
    if (!checkpoint.checkpointId || !checkpoint.traceId) {
      throw new Error('Invalid checkpoint data.');
    }
    // Verify project isolation
    const traceEvents = this.events.filter((e) => e.correlation.traceId === checkpoint.traceId);
    if (traceEvents.length > 0 && traceEvents[0].correlation.projectId !== projectId) {
      throw new Error('Project isolation violation: cannot checkpoint trace of another project.');
    }
    this.checkpoints.set(checkpoint.checkpointId, checkpoint);
  }

  /**
   * Retrieves a checkpoint by ID.
   */
  public static getCheckpoint(checkpointId: string): ExecutionCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * Sanitizes and redacts secrets from event metadata, outcome, and evidence.
   */
  public static sanitizeAndRedact(event: ExecutionEvent): ExecutionRedactionResult {
    let redacted = false;
    let redactedCount = 0;

    const rawMetadataStr = JSON.stringify(event.metadata || {});
    const redactedMetadata = AISecretFilter.redactObject(event.metadata || {});
    const cleanMetadataStr = JSON.stringify(redactedMetadata);

    if (rawMetadataStr !== cleanMetadataStr) {
      redacted = true;
      redactedCount++;
    }

    // Neutralize prompt injection attempts or executable code strings
    const neutralizedMetadata = this.neutralizeInjectionAttempts(redactedMetadata);

    return {
      redacted,
      redactedFieldCount: redactedCount,
      sanitizedMetadata: neutralizedMetadata as Record<string, unknown>,
    };
  }

  /**
   * Neutralizes prompt injection strings or arbitrary executable code inside objects.
   */
  private static neutralizeInjectionAttempts(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.cleanseDangerousPayload(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.neutralizeInjectionAttempts(item));
    }

    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      cleaned[k] = this.neutralizeInjectionAttempts(v);
    }
    return cleaned;
  }

  /**
   * Cleanses potential code execution or prompt injection strings.
   */
  private static cleanseDangerousPayload(text: string): string {
    let sanitized = text;
    // Disarm eval or Function injection
    if (/\beval\s*\(|\bnew\s+Function\s*\(|\bFunction\s*\(/i.test(sanitized)) {
      sanitized = sanitized.replace(/\beval\s*\(|\bnew\s+Function\s*\(|\bFunction\s*\(/gi, '[BLOCKED_EXECUTION]');
    }
    // Disarm child_process or exec
    if (/\bchild_process\b|\bexecSync\b|\bspawnSync\b/i.test(sanitized)) {
      sanitized = sanitized.replace(/\bchild_process\b|\bexecSync\b|\bspawnSync\b/gi, '[BLOCKED_SHELL]');
    }
    // Disarm SQL injections
    if (/;\s*DROP\s+TABLE|;\s*DELETE\s+FROM|UNION\s+SELECT/i.test(sanitized)) {
      sanitized = sanitized.replace(/;\s*DROP\s+TABLE|;\s*DELETE\s+FROM|UNION\s+SELECT/gi, '[BLOCKED_SQL]');
    }
    return sanitized;
  }

  /**
   * Persists events to disk safely (Node.js environments only).
   */
  private static persistToDisk(): void {
    if (typeof window !== 'undefined') return; // Skip in browser

    try {
      // Dynamic import to prevent bundlers from failing in browser builds
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        savedAt: new Date().toISOString(),
        totalEvents: this.events.length,
        eventsRedactedCount: this.eventsRedactedCount,
        eventsDroppedCount: this.eventsDroppedCount,
        events: this.events,
        checkpoints: Array.from(this.checkpoints.entries()),
      };

      fs.writeFileSync(this.storageFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Gracefully handle file system errors
    }
  }

  /**
   * Loads events from disk safely.
   */
  private static loadFromDisk(): void {
    if (typeof window !== 'undefined') return;

    try {
      const fs = require('fs');
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.events)) {
          this.events = parsed.events;
        }
        if (Array.isArray(parsed.checkpoints)) {
          this.checkpoints = new Map(parsed.checkpoints);
        }
        if (typeof parsed.eventsRedactedCount === 'number') {
          this.eventsRedactedCount = parsed.eventsRedactedCount;
        }
        if (typeof parsed.eventsDroppedCount === 'number') {
          this.eventsDroppedCount = parsed.eventsDroppedCount;
        }
      }
    } catch {
      // Gracefully continue with in-memory store
    }
  }

  public static getRedactedCount(): number {
    return this.eventsRedactedCount;
  }

  public static getDroppedCount(): number {
    return this.eventsDroppedCount;
  }

  public static getAllEventsCount(): number {
    return this.events.length;
  }

  public static clear(): void {
    this.events = [];
    this.checkpoints.clear();
    this.eventsRedactedCount = 0;
    this.eventsDroppedCount = 0;
    this.persistToDisk();
  }
}
