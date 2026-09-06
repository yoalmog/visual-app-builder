// Phase 9 Realtime Scaling, Observability, Metrics & Error Tracking
import crypto from 'crypto';

// ─── 1. Realtime Scaling Provider ─────────────────────────────────────────────

export interface RealtimeConnection {
  connectionId: string;
  userId: string;
  organizationId: string;
  projectId: string;
  channels: string[];
  connectedAt: string;
  lastPingAt: string;
}

export interface RealtimeScalingProvider {
  registerConnection(userId: string, orgId: string, projectId: string): Promise<RealtimeConnection>;
  unregisterConnection(connectionId: string): Promise<boolean>;
  joinChannel(connectionId: string, channel: string): Promise<boolean>;
  leaveChannel(connectionId: string, channel: string): Promise<boolean>;
  broadcastToChannel(channel: string, message: any, excludeConnectionId?: string): Promise<{ deliveredCount: number }>;
  getActiveConnections(projectId?: string): Promise<RealtimeConnection[]>;
  getConnectionQuota(organizationId: string): Promise<{ maxConnections: number; currentConnections: number }>;
}

export class LocalRealtimeScalingProvider implements RealtimeScalingProvider {
  private connections: Map<string, RealtimeConnection> = new Map();
  private maxConnectionsPerOrg = 500;

  async registerConnection(userId: string, orgId: string, projectId: string): Promise<RealtimeConnection> {
    const activeForOrg = Array.from(this.connections.values()).filter((c) => c.organizationId === orgId).length;
    if (activeForOrg >= this.maxConnectionsPerOrg) {
      throw new Error('CAPACITY_EXCEEDED: Realtime connection quota exceeded for organization');
    }

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const conn: RealtimeConnection = {
      connectionId,
      userId,
      organizationId: orgId,
      projectId,
      channels: [`project:${projectId}`],
      connectedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
    };

    this.connections.set(connectionId, conn);
    return conn;
  }

  async unregisterConnection(connectionId: string): Promise<boolean> {
    return this.connections.delete(connectionId);
  }

  async joinChannel(connectionId: string, channel: string): Promise<boolean> {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;
    if (!conn.channels.includes(channel)) conn.channels.push(channel);
    return true;
  }

  async leaveChannel(connectionId: string, channel: string): Promise<boolean> {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;
    conn.channels = conn.channels.filter((c) => c !== channel);
    return true;
  }

  async broadcastToChannel(channel: string, message: any, excludeConnectionId?: string) {
    let count = 0;
    for (const conn of Array.from(this.connections.values())) {
      if (conn.channels.includes(channel) && conn.connectionId !== excludeConnectionId) {
        count++;
      }
    }
    return { deliveredCount: count };
  }

  async getActiveConnections(projectId?: string): Promise<RealtimeConnection[]> {
    let list = Array.from(this.connections.values());
    if (projectId) list = list.filter((c) => c.projectId === projectId);
    return list;
  }

  async getConnectionQuota(organizationId: string) {
    const current = Array.from(this.connections.values()).filter((c) => c.organizationId === organizationId).length;
    return {
      maxConnections: this.maxConnectionsPerOrg,
      currentConnections: current,
    };
  }

  // Realtime convenience methods
  private channelSubscribers: Map<string, Set<string>> = new Map();
  private channelPresences: Map<string, Map<string, any>> = new Map();

  async subscribe(channel: string, clientId: string) {
    if (!this.channelSubscribers.has(channel)) {
      this.channelSubscribers.set(channel, new Set());
    }
    this.channelSubscribers.get(channel)!.add(clientId);
    return { subscribed: true, subscriberCount: this.channelSubscribers.get(channel)!.size };
  }

  async publish(channel: string, event: string, payload: any): Promise<number> {
    const subs = this.channelSubscribers.get(channel);
    return subs ? subs.size : 0;
  }

  async updatePresence(channel: string, userId: string, state: any): Promise<boolean> {
    if (!this.channelPresences.has(channel)) {
      this.channelPresences.set(channel, new Map());
    }
    this.channelPresences.get(channel)!.set(userId, { userId, state, lastSeenAt: new Date().toISOString() });
    return true;
  }

  async getPresence(channel: string): Promise<any[]> {
    const presMap = this.channelPresences.get(channel);
    return presMap ? Array.from(presMap.values()) : [];
  }

  async unsubscribe(channel: string, clientId: string) {
    const subs = this.channelSubscribers.get(channel);
    if (subs) {
      subs.delete(clientId);
      return { subscriberCount: subs.size };
    }
    return { subscriberCount: 0 };
  }
}

// ─── 2. Platform Monitoring Engine ────────────────────────────────────────────

export interface PlatformMetricEntry {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: string;
}

export class PlatformMonitoringEngine {
  private metrics: PlatformMetricEntry[] = [];
  private totalRequests = 0;
  private errorCount = 0;
  private latencies: number[] = [];

  recordLatency(service: string, latencyMs: number) {
    this.metrics.unshift({
      name: `${service}_latency_ms`,
      value: latencyMs,
      tags: { service },
      timestamp: new Date().toISOString(),
    });
    if (this.metrics.length > 1000) this.metrics.pop();
  }

  recordRequest(latencyOrIsError: number | boolean = false, statusCode?: number) {
    this.totalRequests++;
    if (typeof latencyOrIsError === 'number') {
      this.latencies.push(latencyOrIsError);
      if (statusCode && statusCode >= 400) this.errorCount++;
    } else if (latencyOrIsError === true) {
      this.errorCount++;
    }
  }

  getSummary() {
    const avgLatency = this.latencies.length > 0
      ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
      : 20;
    const errorRatePercent = this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0;

    return {
      totalRequests: this.totalRequests,
      errorCount: this.errorCount,
      errorRatePercent,
      averageLatencyMs: avgLatency,
    };
  }

  getOverview() {
    const summary = this.getSummary();
    return {
      averageLatencyMs: summary.averageLatencyMs,
      errorRatePercentage: summary.errorRatePercent,
      totalRequests: summary.totalRequests,
      recentMetrics: this.metrics.slice(0, 10),
    };
  }
}

// ─── 3. Analytics Engine ──────────────────────────────────────────────────────

export interface AnalyticsEvent {
  id: string;
  organizationId: string;
  projectId?: string;
  userId?: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: string;
}

export class AnalyticsEngine {
  private events: AnalyticsEvent[] = [];

  trackEvent(params: Omit<AnalyticsEvent, 'id' | 'timestamp'>): AnalyticsEvent {
    const event: AnalyticsEvent = {
      ...params,
      id: `ana_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(event);
    if (this.events.length > 1000) this.events.pop();
    return event;
  }

  getFunnelMetrics(organizationId: string, steps: string[]): Array<{ step: string; count: number }> {
    const orgEvents = this.events.filter((e) => e.organizationId === organizationId);
    return steps.map((step) => ({
      step,
      count: orgEvents.filter((e) => e.eventName === step).length,
    }));
  }

  async getFunnels(organizationId: string): Promise<Record<string, number>> {
    const orgEvents = this.events.filter((e) => e.organizationId === organizationId);
    return {
      pageView: orgEvents.filter((e) => e.eventName === 'page_view').length,
      componentClick: orgEvents.filter((e) => e.eventName === 'component_click').length,
      formSubmit: orgEvents.filter((e) => e.eventName === 'form_submit').length,
    };
  }
}

// ─── 4. Error Tracking Service ────────────────────────────────────────────────

export interface TrackedErrorGroup {
  id: string;
  fingerprint: string;
  name: string;
  message: string;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: 'unresolved' | 'resolved' | 'ignored';
  environment: string;
  organizationId: string;
}

export class ErrorTrackingService {
  private errorGroups: Map<string, TrackedErrorGroup> = new Map();

  private sanitize(str: string): string {
    // Redact passwords, tokens, secrets, API keys
    return str
      .replace(/(password|token|secret|key|sec_[a-zA-Z0-9]+)=([^&\s]+)/gi, '$1=***REDACTED***')
      .replace(/sec_[a-zA-Z0-9_]+/g, '[REDACTED]');
  }

  captureError(params: {
    organizationId: string;
    message: string;
    stack?: string;
    environment?: string;
    context?: Record<string, any>;
  }): TrackedErrorGroup {
    const cleanMsg = this.sanitize(params.message);
    const fingerprint = crypto.createHash('md5').update(cleanMsg).digest('hex');

    let group = this.errorGroups.get(fingerprint);
    if (group) {
      group.occurrences++;
      group.lastSeenAt = new Date().toISOString();
    } else {
      group = {
        id: fingerprint,
        fingerprint,
        name: 'ApplicationError',
        message: cleanMsg,
        occurrences: 1,
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        status: 'unresolved',
        environment: params.environment || 'production',
        organizationId: params.organizationId,
      };
      this.errorGroups.set(fingerprint, group);
    }
    return group;
  }

  listErrorGroups(organizationId?: string): TrackedErrorGroup[] {
    let list = Array.from(this.errorGroups.values());
    if (organizationId) list = list.filter((g) => g.organizationId === organizationId);
    return list;
  }

  resolveErrorGroup(fingerprint: string): boolean {
    const group = this.errorGroups.get(fingerprint);
    if (!group) return false;
    group.status = 'resolved';
    return true;
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export const defaultRealtimeScalingProvider = new LocalRealtimeScalingProvider();
export const defaultPlatformMonitoringEngine = new PlatformMonitoringEngine();
export const defaultAnalyticsEngine = new AnalyticsEngine();
export const defaultErrorTrackingService = new ErrorTrackingService();
