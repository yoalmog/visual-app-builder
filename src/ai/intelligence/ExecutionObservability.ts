// D8.9 & D8.10: Execution Observability & Timeline
// Structured telemetry, chronological timeline tracking, and safe logging with secret redaction.

import { ObservabilityEvent, ExecutionTimelineItem } from './types';
import { AISecretFilter } from '../security/AISecretFilter';

export class ExecutionObservability {
  private static events: ObservabilityEvent[] = [];
  private static timeline: ExecutionTimelineItem[] = [];

  /**
   * Records a telemetry event with automatic secret redaction.
   */
  public static recordEvent(event: ObservabilityEvent): void {
    const safeDetails = AISecretFilter.redactObject(event.details || {});

    const cleanEvent: ObservabilityEvent = {
      ...event,
      details: safeDetails,
      error: event.error ? AISecretFilter.redactText(event.error) : undefined,
    };

    this.events.push(cleanEvent);

    // Map to timeline item
    this.timeline.push({
      id: `time_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: cleanEvent.timestamp,
      actor: cleanEvent.actor,
      category: cleanEvent.category,
      summary: `${cleanEvent.actor} [${cleanEvent.category}]: ${JSON.stringify(cleanEvent.details).slice(0, 100)}`,
      details: cleanEvent.details,
    });
  }

  public static getEvents(sessionId?: string): ObservabilityEvent[] {
    if (!sessionId) return [...this.events];
    return this.events.filter((e) => e.sessionId === sessionId);
  }

  public static getTimeline(sessionId?: string): ExecutionTimelineItem[] {
    return [...this.timeline];
  }

  public static clear(): void {
    this.events = [];
    this.timeline = [];
  }
}
