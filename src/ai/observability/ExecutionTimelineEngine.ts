// D8.10: Execution Timeline Engine
// Core observability engine managing traces, spans, causality, metrics, hotspots, checkpoints, and crash recovery.

import {
  ExecutionTrace,
  ExecutionTraceId,
  ExecutionSessionId,
  ExecutionEvent,
  ExecutionEventType,
  ExecutionEventStatus,
  ExecutionEventSource,
  ExecutionEventSeverity,
  ExecutionSpan,
  ExecutionSpanId,
  ExecutionSpanKind,
  ExecutionSpanStatus,
  ExecutionStage,
  ExecutionMetrics,
  ExecutionTraceSummary,
  ExecutionCheckpoint,
  ExecutionObservabilityState,
  ExecutionTraceLink,
  ExecutionTimeline,
  ExecutionTimelineQuery,
  ExecutionTimelineQueryResult,
  ExecutionTraceContext,
} from './observability-types';
import { ExecutionEventStore } from './ExecutionEventStore';

export class ExecutionTimelineEngine {
  private static activeTraces: Map<ExecutionTraceId, ExecutionTrace> = new Map();
  private static activeSpans: Map<ExecutionSpanId, ExecutionSpan> = new Map();
  private static traceLinks: ExecutionTraceLink[] = [];
  private static globalSequenceNumber: number = 0;
  private static currentState: ExecutionObservabilityState = 'IDLE';

  /**
   * Initializes the engine and loads underlying event store.
   */
  public static initialize(): void {
    ExecutionEventStore.initialize();
    this.currentState = 'IDLE';
  }

  /**
   * Starts a new traceable execution lifecycle.
   */
  public static startTrace(params: {
    traceId?: ExecutionTraceId;
    projectId: string;
    sessionId: ExecutionSessionId;
    requestId?: string;
    context?: Partial<ExecutionTraceContext>;
  }): ExecutionTrace {
    if (!params.projectId) {
      throw new Error('Project isolation violation: projectId is required to start an execution trace.');
    }

    const traceId: ExecutionTraceId = params.traceId || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();

    const traceContext: ExecutionTraceContext = {
      environment: params.context?.environment || 'development',
      autonomyLevel: params.context?.autonomyLevel !== undefined ? params.context.autonomyLevel : 2,
      userRoles: params.context?.userRoles || ['developer'],
      projectVersion: params.context?.projectVersion || 1,
    };

    const initialMetrics: ExecutionMetrics = {
      latency: {
        totalDurationMs: 0,
        planningDurationMs: 0,
        decisionDurationMs: 0,
        policyDurationMs: 0,
        approvalWaitMs: 0,
        transactionDurationMs: 0,
        operationDurationMs: 0,
        verificationDurationMs: 0,
        recoveryDurationMs: 0,
        providerDurationMs: 0,
      },
      operations: {
        totalOperations: 0,
        completedOperations: 0,
        failedOperations: 0,
        retriedOperations: 0,
      },
      failures: {
        failureCount: 0,
        rollbackCount: 0,
        policyRejections: 0,
        approvalRejections: 0,
      },
      verification: {
        verificationCount: 0,
        verificationPassed: false,
        checksTotal: 0,
        checksPassed: 0,
        unexpectedMutations: 0,
      },
      recovery: {
        recoveryTriggered: false,
        recoveryAttempts: 0,
        recoverySucceeded: false,
      },
      decisions: {
        candidatesConsidered: 0,
        decisionConfidence: 1.0,
        decisionRisk: 'LOW',
      },
      resources: {
        affectedResourceTypes: [],
        affectedResourceIds: [],
        pageCount: 0,
        componentCount: 0,
      },
      totalEvents: 0,
      eventsDropped: 0,
      eventsRedacted: 0,
    };

    const trace: ExecutionTrace = {
      traceId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      requestId: params.requestId,
      startTime,
      status: 'STARTED',
      completeness: 'PARTIAL',
      context: traceContext,
      events: [],
      spans: [],
      metrics: initialMetrics,
      checkpoints: [],
    };

    this.activeTraces.set(traceId, trace);
    this.currentState = 'CAPTURING';

    // Record initial TRACE_STARTED event
    this.recordEvent({
      eventType: 'TRACE_STARTED',
      status: 'STARTED',
      source: 'SYSTEM',
      severity: 'INFO',
      correlation: {
        traceId,
        sessionId: params.sessionId,
        projectId: params.projectId,
        requestId: params.requestId,
      },
      metadata: { environment: traceContext.environment },
    });

    return trace;
  }

  /**
   * Records an execution event with causal ordering and secret redaction.
   */
  public static recordEvent(eventData: {
    eventId?: string;
    eventType: ExecutionEventType;
    status: ExecutionEventStatus;
    source: ExecutionEventSource;
    severity: ExecutionEventSeverity;
    correlation: {
      traceId: ExecutionTraceId;
      sessionId: ExecutionSessionId;
      projectId: string;
      requestId?: string;
      transactionId?: string;
      operationId?: string;
      decisionId?: string;
      verificationId?: string;
      recoveryId?: string;
      learningSessionId?: string;
      spanId?: string;
      parentEventId?: string;
    };
    causality?: {
      causeType: 'USER_REQUEST' | 'DECISION' | 'POLICY' | 'APPROVAL' | 'TRANSACTION' | 'OPERATION' | 'VERIFICATION_FAILURE' | 'RECOVERY_TRIGGER' | 'ROLLBACK_TRIGGER' | 'USER_CORRECTION';
      causedByEventId?: string;
      causedByEntityId?: string;
      description: string;
    };
    duration?: { durationMs: number; cpuTimeMs?: number };
    metadata?: Record<string, unknown>;
    evidence?: {
      summary: string;
      dimensions?: string[];
      passedChecks?: number;
      totalChecks?: number;
    };
    outcome?: {
      status: ExecutionEventStatus;
      summary: string;
      error?: string;
    };
  }): ExecutionEvent {
    // Validate project isolation
    if (!eventData.correlation?.projectId) {
      throw new Error('Project isolation violation: event missing projectId.');
    }

    const trace = this.activeTraces.get(eventData.correlation.traceId);
    if (trace && trace.projectId !== eventData.correlation.projectId) {
      throw new Error('Project isolation violation: event projectId does not match active trace projectId.');
    }

    // Assign sequence and timestamps
    this.globalSequenceNumber++;
    const now = Date.now();
    const eventId = eventData.eventId || `evt_${now}_${this.globalSequenceNumber}`;

    const fullEvent: ExecutionEvent = {
      eventId,
      sequenceNumber: this.globalSequenceNumber,
      timestamp: {
        iso: new Date(now).toISOString(),
        epochMs: now,
      },
      eventType: eventData.eventType,
      status: eventData.status,
      source: eventData.source,
      severity: eventData.severity,
      correlation: eventData.correlation,
      causality: eventData.causality,
      duration: eventData.duration,
      metadata: eventData.metadata || {},
      evidence: eventData.evidence,
      outcome: eventData.outcome,
    };

    // Append to central store
    const storeRes = ExecutionEventStore.appendEvent(fullEvent);
    const finalizedEvent = storeRes.event || fullEvent;

    // Associate with active trace if present
    if (trace) {
      trace.events.push(finalizedEvent);
      trace.metrics.totalEvents++;
      if (finalizedEvent.redacted) {
        trace.metrics.eventsRedacted++;
      }

      // Update metrics based on event category
      this.updateTraceMetrics(trace, finalizedEvent);
    }

    // Associate with active span if spanId provided
    if (eventData.correlation.spanId) {
      const span = this.activeSpans.get(eventData.correlation.spanId);
      if (span) {
        span.eventIds.push(finalizedEvent.eventId);
      }
    }

    return finalizedEvent;
  }

  /**
   * Starts a bounded execution span.
   */
  public static startSpan(params: {
    spanId?: ExecutionSpanId;
    traceId: ExecutionTraceId;
    kind: ExecutionSpanKind;
    name: string;
    parentSpanId?: ExecutionSpanId;
    attributes?: Record<string, unknown>;
  }): ExecutionSpan {
    const trace = this.activeTraces.get(params.traceId);
    if (!trace) {
      throw new Error(`Cannot start span: active trace not found for ${params.traceId}`);
    }

    const spanId: ExecutionSpanId = params.spanId || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const startTime = Date.now();

    const span: ExecutionSpan = {
      spanId,
      traceId: params.traceId,
      parentSpanId: params.parentSpanId,
      kind: params.kind,
      name: params.name,
      startTime,
      status: 'RUNNING',
      attributes: params.attributes || {},
      eventIds: [],
      projectId: trace.projectId,
    };

    this.activeSpans.set(spanId, span);
    trace.spans.push(span);

    return span;
  }

  /**
   * Ends an active span, calculating elapsed duration.
   */
  public static endSpan(
    spanId: ExecutionSpanId,
    status: ExecutionSpanStatus = 'COMPLETED',
    error?: string
  ): ExecutionSpan {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      throw new Error(`Span not found: ${spanId}`);
    }

    span.endTime = Date.now();
    span.durationMs = Math.max(0, span.endTime - span.startTime);
    span.status = status;
    span.error = error;

    this.activeSpans.delete(spanId);
    return span;
  }

  /**
   * Concludes an execution trace, summarizing events, durations, and verification result.
   */
  public static endTrace(
    traceId: ExecutionTraceId,
    finalStatus?: ExecutionEventStatus
  ): ExecutionTraceSummary {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      throw new Error(`Active trace not found for traceId: ${traceId}`);
    }

    trace.endTime = Date.now();
    trace.durationMs = Math.max(0, trace.endTime - trace.startTime);
    trace.metrics.latency.totalDurationMs = trace.durationMs;

    // Determine final status & completeness
    const hasFailedEvents = trace.events.some((e) => e.status === 'FAILED');
    const hasBlockedEvents = trace.events.some((e) => e.status === 'BLOCKED');
    const hasCancelledEvents = trace.events.some((e) => e.status === 'CANCELLED');
    const hasVerificationPassed = trace.events.some((e) => e.eventType === 'VERIFICATION_PASSED');
    const hasVerificationFailed = trace.events.some((e) => e.eventType === 'VERIFICATION_FAILED');

    let calculatedStatus: ExecutionEventStatus = 'COMPLETED';
    if (finalStatus) {
      calculatedStatus = finalStatus;
    } else if (hasCancelledEvents) {
      calculatedStatus = 'CANCELLED';
    } else if (hasBlockedEvents) {
      calculatedStatus = 'BLOCKED';
    } else if (hasFailedEvents || hasVerificationFailed) {
      calculatedStatus = 'FAILED';
    } else if (hasVerificationPassed) {
      calculatedStatus = 'PASSED';
    }

    trace.status = calculatedStatus;

    // Completeness determination: An execution trace without verification is PARTIAL / UNCERTAIN
    let completeness: 'COMPLETE' | 'PARTIAL' | 'TRUNCATED' | 'UNCERTAIN' | 'FAILED' = 'COMPLETE';
    if (calculatedStatus === 'FAILED') {
      completeness = 'FAILED';
    } else if (trace.events.some((e) => e.eventType === 'TRACE_TRUNCATED')) {
      completeness = 'TRUNCATED';
    } else if (!hasVerificationPassed && !hasVerificationFailed && !hasBlockedEvents) {
      completeness = 'PARTIAL';
    }

    trace.completeness = completeness;

    // Identify performance hotspots
    const hotspots: string[] = [];
    if (trace.metrics.latency.providerDurationMs > 2000) {
      hotspots.push(`Slow provider latency: ${trace.metrics.latency.providerDurationMs}ms`);
    }
    if (trace.metrics.latency.planningDurationMs > 1500) {
      hotspots.push(`Slow planning duration: ${trace.metrics.latency.planningDurationMs}ms`);
    }
    if (trace.metrics.latency.transactionDurationMs > 1000) {
      hotspots.push(`Slow transaction duration: ${trace.metrics.latency.transactionDurationMs}ms`);
    }
    if (trace.metrics.latency.verificationDurationMs > 800) {
      hotspots.push(`Slow verification duration: ${trace.metrics.latency.verificationDurationMs}ms`);
    }
    if (trace.metrics.latency.approvalWaitMs > 10000) {
      hotspots.push(`Extended operator approval wait: ${trace.metrics.latency.approvalWaitMs}ms`);
    }

    // Extract policy, approval, verification outcomes
    const policyResult = trace.events.some((e) => e.eventType === 'POLICY_CHECK_FAILED')
      ? 'BLOCKED'
      : trace.events.some((e) => e.eventType === 'POLICY_CHECK_PASSED')
      ? 'PASSED'
      : 'NOT_APPLICABLE';

    const approvalResult = trace.events.some((e) => e.eventType === 'APPROVAL_DENIED')
      ? 'DENIED'
      : trace.events.some((e) => e.eventType === 'APPROVAL_GRANTED')
      ? 'GRANTED'
      : 'NOT_REQUIRED';

    const verificationResult = hasVerificationPassed
      ? 'PASS'
      : hasVerificationFailed
      ? 'FAIL'
      : trace.events.some((e) => e.eventType === 'VERIFICATION_UNCERTAIN')
      ? 'UNCERTAIN'
      : 'SKIPPED';

    const recoveryResult = trace.events.some((e) => e.eventType === 'RECOVERY_COMPLETED')
      ? 'SUCCEEDED'
      : trace.events.some((e) => e.eventType === 'RECOVERY_FAILED')
      ? 'FAILED'
      : 'NOT_TRIGGERED';

    const summary: ExecutionTraceSummary = {
      traceId: trace.traceId,
      projectId: trace.projectId,
      sessionId: trace.sessionId,
      requestId: trace.requestId,
      startTime: new Date(trace.startTime).toISOString(),
      endTime: new Date(trace.endTime).toISOString(),
      durationMs: trace.durationMs,
      finalStatus: trace.status,
      completeness: trace.completeness,
      operationsCount: trace.metrics.operations.totalOperations,
      transactionCount: trace.events.filter((e) => e.eventType === 'TRANSACTION_STARTED').length,
      policyResult,
      approvalResult,
      verificationResult,
      recoveryResult,
      learningResult: trace.events.some((e) => e.eventType === 'EXPERIENCE_RECORDED') ? 'RECORDED' : 'SKIPPED',
      warnings: [],
      errors: trace.events.filter((e) => e.outcome?.error).map((e) => e.outcome!.error!),
      performanceHotspots: hotspots,
      affectedResources: Array.from(
        new Set(trace.metrics.resources.affectedResourceIds.map((id, idx) => `${trace.metrics.resources.affectedResourceTypes[idx] || 'entity'}:${id}`))
      ).map((s) => {
        const [type, id] = s.split(':');
        return { type, id };
      }),
      provenance: {
        creator: 'EXECUTION_ENGINE',
        timestamp: new Date().toISOString(),
        systemVersion: '1.0.0',
        traceId: trace.traceId,
        projectId: trace.projectId,
      },
    };

    trace.summary = summary;

    // Record TRACE_COMPLETED event
    this.recordEvent({
      eventType: calculatedStatus === 'FAILED' ? 'TRACE_FAILED' : 'TRACE_COMPLETED',
      status: calculatedStatus,
      source: 'SYSTEM',
      severity: calculatedStatus === 'FAILED' ? 'HIGH' : 'INFO',
      correlation: {
        traceId: trace.traceId,
        sessionId: trace.sessionId,
        projectId: trace.projectId,
        requestId: trace.requestId,
      },
      duration: { durationMs: trace.durationMs },
      metadata: { completeness, hotspotsCount: hotspots.length },
    });

    this.currentState = calculatedStatus === 'FAILED' ? 'FAILED' : 'COMPLETED';
    return summary;
  }

  /**
   * Links two traces causally (e.g. user correction creating a new trace).
   */
  public static recordTraceLink(link: ExecutionTraceLink): void {
    this.traceLinks.push(link);

    // Record causal correction event
    if (link.relationship === 'CORRECTION') {
      const fromTrace = this.activeTraces.get(link.fromTraceId);
      if (fromTrace) {
        this.recordEvent({
          eventType: 'EVENT_CORRECTION_RECORDED',
          status: 'COMPLETED',
          source: 'USER',
          severity: 'INFO',
          correlation: {
            traceId: link.toTraceId,
            sessionId: fromTrace.sessionId,
            projectId: fromTrace.projectId,
          },
          causality: {
            causeType: 'USER_CORRECTION',
            causedByEntityId: link.fromTraceId,
            description: `User correction on trace ${link.fromTraceId}: ${link.reason}`,
          },
          metadata: { originalTraceId: link.fromTraceId, reason: link.reason },
        });
      }
    }
  }

  /**
   * Creates an execution checkpoint for crash recovery.
   */
  public static createCheckpoint(
    traceId: ExecutionTraceId,
    stage: ExecutionStage,
    metadata: Record<string, unknown> = {}
  ): ExecutionCheckpoint {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const lastEvent = trace.events[trace.events.length - 1];
    const checkpoint: ExecutionCheckpoint = {
      checkpointId: `chk_${Date.now()}_${trace.checkpoints.length + 1}`,
      traceId,
      timestamp: new Date().toISOString(),
      stage,
      sequenceNumber: this.globalSequenceNumber,
      lastCommittedEventId: lastEvent ? lastEvent.eventId : 'initial',
      transactionState: trace.events.some((e) => e.eventType === 'TRANSACTION_COMMITTED')
        ? 'COMMITTED'
        : trace.events.some((e) => e.eventType === 'TRANSACTION_STARTED')
        ? 'ACTIVE'
        : 'IDLE',
      verificationState: trace.events.some((e) => e.eventType === 'VERIFICATION_PASSED')
        ? 'PASS'
        : trace.events.some((e) => e.eventType === 'VERIFICATION_FAILED')
        ? 'FAIL'
        : 'PENDING',
      metadata,
    };

    trace.checkpoints.push(checkpoint);
    ExecutionEventStore.saveCheckpoint(checkpoint, trace.projectId);

    // Record CHECKPOINT_CREATED event
    this.recordEvent({
      eventType: 'CHECKPOINT_CREATED',
      status: 'COMPLETED',
      source: 'SYSTEM',
      severity: 'INFO',
      correlation: {
        traceId,
        sessionId: trace.sessionId,
        projectId: trace.projectId,
      },
      metadata: { checkpointId: checkpoint.checkpointId, stage },
    });

    return checkpoint;
  }

  /**
   * Restores an execution session safely after crash or interruption.
   * If state is ambiguous or unverified, sets status to UNCERTAIN (never fake PASS).
   */
  public static restoreFromCheckpoint(
    checkpointId: string,
    projectId: string
  ): { success: boolean; trace?: ExecutionTrace; status: 'RESTORED' | 'UNCERTAIN' | 'INVALID'; reason?: string } {
    const checkpoint = ExecutionEventStore.getCheckpoint(checkpointId);
    if (!checkpoint) {
      return { success: false, status: 'INVALID', reason: `Checkpoint not found: ${checkpointId}` };
    }

    // Validate project isolation
    const events = ExecutionEventStore.getEventsForTrace(checkpoint.traceId, projectId);
    if (events.length === 0) {
      return { success: false, status: 'INVALID', reason: 'No events found for trace in this project.' };
    }

    // Check if verification was ambiguous at checkpoint
    const isUncertain = checkpoint.verificationState === 'PENDING' || checkpoint.transactionState === 'ACTIVE';

    const restoredTrace: ExecutionTrace = {
      traceId: checkpoint.traceId,
      projectId,
      sessionId: events[0]?.correlation?.sessionId || 'restored_session',
      startTime: events[0]?.timestamp?.epochMs || Date.now(),
      status: isUncertain ? 'UNCERTAIN' : 'PASSED',
      completeness: isUncertain ? 'UNCERTAIN' : 'COMPLETE',
      context: {
        environment: 'development',
        autonomyLevel: 2,
        projectVersion: 1,
      },
      events: [...events],
      spans: [],
      metrics: {
        latency: { totalDurationMs: 0, planningDurationMs: 0, decisionDurationMs: 0, policyDurationMs: 0, approvalWaitMs: 0, transactionDurationMs: 0, operationDurationMs: 0, verificationDurationMs: 0, recoveryDurationMs: 0, providerDurationMs: 0 },
        operations: { totalOperations: 0, completedOperations: 0, failedOperations: 0, retriedOperations: 0 },
        failures: { failureCount: 0, rollbackCount: 0, policyRejections: 0, approvalRejections: 0 },
        verification: { verificationCount: 0, verificationPassed: checkpoint.verificationState === 'PASS', checksTotal: 0, checksPassed: 0, unexpectedMutations: 0 },
        recovery: { recoveryTriggered: false, recoveryAttempts: 0, recoverySucceeded: false },
        decisions: { candidatesConsidered: 0, decisionConfidence: 1.0, decisionRisk: 'LOW' },
        resources: { affectedResourceTypes: [], affectedResourceIds: [], pageCount: 0, componentCount: 0 },
        totalEvents: events.length,
        eventsDropped: 0,
        eventsRedacted: 0,
      },
      checkpoints: [checkpoint],
    };

    this.activeTraces.set(checkpoint.traceId, restoredTrace);

    // Record CHECKPOINT_RESTORED event
    this.recordEvent({
      eventType: 'CHECKPOINT_RESTORED',
      status: isUncertain ? 'UNCERTAIN' : 'COMPLETED',
      source: 'SYSTEM',
      severity: isUncertain ? 'MEDIUM' : 'INFO',
      correlation: {
        traceId: checkpoint.traceId,
        sessionId: restoredTrace.sessionId,
        projectId,
      },
      metadata: { checkpointId, ambiguity: isUncertain ? 'Transaction or verification active during crash' : 'Clean checkpoint' },
    });

    return {
      success: true,
      trace: restoredTrace,
      status: isUncertain ? 'UNCERTAIN' : 'RESTORED',
      reason: isUncertain ? 'Checkpoint was mid-execution; restored safely with UNCERTAIN status.' : 'Clean restoration completed.',
    };
  }

  /**
   * Builds an ExecutionTimeline view from an active or stored trace.
   */
  public static getTimeline(traceId: ExecutionTraceId, projectId: string): ExecutionTimeline | null {
    if (!ExecutionEventStore.validateTraceProjectIsolation(traceId, projectId)) {
      throw new Error('Project isolation violation: cannot view timeline for another project.');
    }

    const trace = this.activeTraces.get(traceId);
    if (trace && trace.projectId === projectId) {
      return {
        traceId: trace.traceId,
        projectId: trace.projectId,
        events: trace.events,
        spans: trace.spans,
        summary: trace.summary || this.buildInterimSummary(trace),
        completeness: trace.completeness,
      };
    }

    // Try retrieving persisted events
    const storedEvents = ExecutionEventStore.getEventsForTrace(traceId, projectId);
    if (storedEvents.length === 0) return null;

    const interimTrace: ExecutionTrace = {
      traceId,
      projectId,
      sessionId: storedEvents[0].correlation.sessionId,
      startTime: storedEvents[0].timestamp.epochMs,
      status: 'COMPLETED',
      completeness: 'COMPLETE',
      context: { environment: 'development', autonomyLevel: 2, projectVersion: 1 },
      events: storedEvents,
      spans: [],
      metrics: {
        latency: { totalDurationMs: 0, planningDurationMs: 0, decisionDurationMs: 0, policyDurationMs: 0, approvalWaitMs: 0, transactionDurationMs: 0, operationDurationMs: 0, verificationDurationMs: 0, recoveryDurationMs: 0, providerDurationMs: 0 },
        operations: { totalOperations: 0, completedOperations: 0, failedOperations: 0, retriedOperations: 0 },
        failures: { failureCount: 0, rollbackCount: 0, policyRejections: 0, approvalRejections: 0 },
        verification: { verificationCount: 0, verificationPassed: true, checksTotal: 0, checksPassed: 0, unexpectedMutations: 0 },
        recovery: { recoveryTriggered: false, recoveryAttempts: 0, recoverySucceeded: false },
        decisions: { candidatesConsidered: 0, decisionConfidence: 1.0, decisionRisk: 'LOW' },
        resources: { affectedResourceTypes: [], affectedResourceIds: [], pageCount: 0, componentCount: 0 },
        totalEvents: storedEvents.length,
        eventsDropped: 0,
        eventsRedacted: 0,
      },
      checkpoints: [],
    };

    return {
      traceId,
      projectId,
      events: storedEvents,
      spans: [],
      summary: this.buildInterimSummary(interimTrace),
      completeness: storedEvents.some((e) => e.eventType === 'VERIFICATION_PASSED') ? 'COMPLETE' : 'PARTIAL',
    };
  }

  /**
   * Retrieves an execution trace with project isolation validation.
   */
  public static getTrace(traceId: ExecutionTraceId, projectId?: string): ExecutionTrace | undefined {
    const trace = this.activeTraces.get(traceId);
    if (trace) {
      if (projectId && trace.projectId !== projectId) {
        return undefined; // Reject cross-project access
      }
      return trace;
    }

    if (!projectId) return undefined;
    const storedEvents = ExecutionEventStore.getEventsForTrace(traceId, projectId);
    if (storedEvents.length === 0) return undefined;

    return {
      traceId,
      projectId,
      sessionId: storedEvents[0].correlation.sessionId,
      startTime: storedEvents[0].timestamp.epochMs,
      status: 'COMPLETED',
      completeness: storedEvents.some((e) => e.eventType === 'VERIFICATION_PASSED') ? 'COMPLETE' : 'PARTIAL',
      context: { environment: 'development', autonomyLevel: 2, projectVersion: 1 },
      events: storedEvents,
      spans: [],
      metrics: {
        latency: { totalDurationMs: 0, planningDurationMs: 0, decisionDurationMs: 0, policyDurationMs: 0, approvalWaitMs: 0, transactionDurationMs: 0, operationDurationMs: 0, verificationDurationMs: 0, recoveryDurationMs: 0, providerDurationMs: 0 },
        operations: { totalOperations: 0, completedOperations: 0, failedOperations: 0, retriedOperations: 0 },
        failures: { failureCount: 0, rollbackCount: 0, policyRejections: 0, approvalRejections: 0 },
        verification: { verificationCount: 0, verificationPassed: true, checksTotal: 0, checksPassed: 0, unexpectedMutations: 0 },
        recovery: { recoveryTriggered: false, recoveryAttempts: 0, recoverySucceeded: false },
        decisions: { candidatesConsidered: 0, decisionConfidence: 1.0, decisionRisk: 'LOW' },
        resources: { affectedResourceTypes: [], affectedResourceIds: [], pageCount: 0, componentCount: 0 },
        totalEvents: storedEvents.length,
        eventsDropped: 0,
        eventsRedacted: 0,
      },
      checkpoints: [],
    };
  }


  /**
   * Queries stored traces and events.
   */
  public static query(query: ExecutionTimelineQuery): ExecutionTimelineQueryResult {
    return ExecutionEventStore.queryEvents(query);
  }

  /**
   * Helper to build interim summary when trace is in progress.
   */
  private static buildInterimSummary(trace: ExecutionTrace): ExecutionTraceSummary {
    return {
      traceId: trace.traceId,
      projectId: trace.projectId,
      sessionId: trace.sessionId,
      requestId: trace.requestId,
      startTime: new Date(trace.startTime).toISOString(),
      finalStatus: trace.status,
      completeness: trace.completeness,
      operationsCount: trace.metrics.operations.totalOperations,
      transactionCount: trace.events.filter((e) => e.eventType === 'TRANSACTION_STARTED').length,
      policyResult: 'PASSED',
      approvalResult: 'NOT_REQUIRED',
      verificationResult: trace.events.some((e) => e.eventType === 'VERIFICATION_PASSED') ? 'PASS' : 'SKIPPED',
      warnings: [],
      errors: [],
      performanceHotspots: [],
      affectedResources: [],
      provenance: {
        creator: 'EXECUTION_ENGINE',
        timestamp: new Date().toISOString(),
        systemVersion: '1.0.0',
        traceId: trace.traceId,
        projectId: trace.projectId,
      },
    };
  }

  /**
   * Helper to dynamically update trace metrics as events arrive.
   */
  private static updateTraceMetrics(trace: ExecutionTrace, event: ExecutionEvent): void {
    const duration = event.duration?.durationMs || 0;

    switch (event.eventType) {
      case 'PLAN_CREATED':
      case 'PLAN_VALIDATED':
        trace.metrics.latency.planningDurationMs += duration;
        break;
      case 'DECISION_SELECTED':
        trace.metrics.latency.decisionDurationMs += duration;
        if (typeof event.metadata.candidatesCount === 'number') {
          trace.metrics.decisions.candidatesConsidered = event.metadata.candidatesCount;
        }
        if (typeof event.metadata.confidence === 'number') {
          trace.metrics.decisions.decisionConfidence = event.metadata.confidence;
        }
        if (typeof event.metadata.strategyType === 'string') {
          trace.metrics.decisions.selectedStrategy = event.metadata.strategyType;
        }
        break;
      case 'POLICY_CHECK_STARTED':
      case 'POLICY_CHECK_PASSED':
        trace.metrics.latency.policyDurationMs += duration;
        break;
      case 'POLICY_CHECK_FAILED':
        trace.metrics.failures.policyRejections++;
        break;
      case 'APPROVAL_REQUIRED':
        trace.metrics.latency.approvalWaitMs += duration;
        break;
      case 'APPROVAL_DENIED':
        trace.metrics.failures.approvalRejections++;
        break;
      case 'TRANSACTION_STARTED':
      case 'TRANSACTION_COMMITTED':
        trace.metrics.latency.transactionDurationMs += duration;
        break;
      case 'TRANSACTION_ROLLED_BACK':
        trace.metrics.failures.rollbackCount++;
        break;
      case 'OPERATION_STARTED':
        trace.metrics.operations.totalOperations++;
        if (event.correlation.operationId) {
          trace.metrics.resources.affectedResourceIds.push(event.correlation.operationId);
        }
        break;
      case 'OPERATION_COMPLETED':
        trace.metrics.operations.completedOperations++;
        trace.metrics.latency.operationDurationMs += duration;
        break;
      case 'OPERATION_FAILED':
        trace.metrics.operations.failedOperations++;
        trace.metrics.failures.failureCount++;
        break;
      case 'VERIFICATION_PASSED':
        trace.metrics.verification.verificationPassed = true;
        trace.metrics.verification.verificationCount++;
        trace.metrics.latency.verificationDurationMs += duration;
        if (event.evidence?.totalChecks) {
          trace.metrics.verification.checksTotal = event.evidence.totalChecks;
          trace.metrics.verification.checksPassed = event.evidence.passedChecks || 0;
        }
        break;
      case 'VERIFICATION_FAILED':
        trace.metrics.verification.verificationPassed = false;
        trace.metrics.verification.verificationCount++;
        trace.metrics.failures.failureCount++;
        trace.metrics.latency.verificationDurationMs += duration;
        break;
      case 'RECOVERY_STARTED':
        trace.metrics.recovery.recoveryTriggered = true;
        trace.metrics.recovery.recoveryAttempts++;
        break;
      case 'RECOVERY_COMPLETED':
        trace.metrics.recovery.recoverySucceeded = true;
        trace.metrics.latency.recoveryDurationMs += duration;
        if (typeof event.metadata.strategy === 'string') {
          trace.metrics.recovery.strategyUsed = event.metadata.strategy;
        }
        break;
      case 'RECOVERY_FAILED':
        trace.metrics.recovery.recoverySucceeded = false;
        break;
      default:
        break;
    }
  }

  public static getActiveTrace(traceId: ExecutionTraceId): ExecutionTrace | undefined {
    return this.activeTraces.get(traceId);
  }

  public static getActiveTraceCount(): number {
    return this.activeTraces.size;
  }

  public static getGlobalSequenceNumber(): number {
    return this.globalSequenceNumber;
  }

  public static clear(): void {
    this.activeTraces.clear();
    this.activeSpans.clear();
    this.traceLinks = [];
    this.globalSequenceNumber = 0;
    this.currentState = 'IDLE';
    ExecutionEventStore.clear();
  }
}
